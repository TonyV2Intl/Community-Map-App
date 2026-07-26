import { corsHeaders, getTtsCacheVersion, buildTtsCacheKey, TTS_CACHE_TTL } from './_shared';

const MAX_TEXT_LENGTH = 5000;

export async function onRequestPost(context) {
  const { request, env } = context;

  let text = '';
  let requestedVoice = '';
  try {
    const body = await request.json();
    text = (body.text || '').trim();
    requestedVoice = (body.voice || '').trim();
  } catch (e) {
    return jsonError('请求体必须是合法的 JSON 格式', 400);
  }

  if (!text) {
    return jsonError('文本内容不能为空', 400);
  }

  const truncated = text.length > MAX_TEXT_LENGTH
    ? text.substring(0, MAX_TEXT_LENGTH)
    : text;

  const lang = detectLang(truncated);
  const voice = requestedVoice || selectVoice(lang);

  // 1. 读取缓存版本并检查缓存
  const version = await getTtsCacheVersion(env);
  const cacheKey = buildTtsCacheKey(version, truncated, voice);

  try {
    const cached = await env.MAPAPP.get(cacheKey, 'arrayBuffer');
    if (cached && cached.byteLength > 0) {
      console.log('[TTS Cache] 命中:', cacheKey);
      return new Response(cached, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.byteLength.toString(),
          'Accept-Ranges': 'bytes',
          ...corsHeaders()
        }
      });
    }
  } catch (e) {
    console.warn('[TTS Cache] 读取缓存失败:', e.message);
  }

  // 2. 缓存未命中，调用 Edge TTS
  const payload = {
    model: 'tts-1',
    input: truncated,
    voice,
    response_format: 'mp3',
    speed: 1.0,
    pitch: 1.0,
    style: 'general'
  };

  const ttsHeaders = {
    'Content-Type': 'application/json'
  };
  if (env.EDGE_TTS_KEY) {
    ttsHeaders['Authorization'] = 'Bearer ' + env.EDGE_TTS_KEY;
  }

  // 优先使用 Service Binding（env.EDGE_TTS），降级为 URL 方式
  let response;
  if (env.EDGE_TTS) {
    console.log('[Edge TTS] 使用 Service Binding');
    try {
      response = await env.EDGE_TTS.fetch('https://edge-tts/v1/audio/speech', {
        method: 'POST',
        headers: ttsHeaders,
        body: JSON.stringify(payload)
      });
      console.log('[Edge TTS] 响应状态:', response.status);
    } catch (e) {
      console.error('[Edge TTS] Service Binding 调用失败:', e);
      return jsonError('Edge TTS Service Binding 调用失败: ' + e.message, 502);
    }
  } else {
    let edgeTtsUrl = (env.EDGE_TTS_URL || '').trim().replace(/\/$/, '');
    if (!edgeTtsUrl) {
      return jsonError('Edge TTS 服务未配置，请在 Cloudflare 中设置服务绑定 EDGE_TTS 或环境变量 EDGE_TTS_URL', 503);
    }
    if (!/^https?:\/\//.test(edgeTtsUrl)) {
      edgeTtsUrl = 'https://' + edgeTtsUrl;
    }
    console.log('[Edge TTS] 请求 URL:', edgeTtsUrl + '/v1/audio/speech');
    try {
      response = await fetch(edgeTtsUrl + '/v1/audio/speech', {
        method: 'POST',
        headers: ttsHeaders,
        body: JSON.stringify(payload)
      });
      console.log('[Edge TTS] 响应状态:', response.status);
    } catch (e) {
      console.error('[Edge TTS] 网络异常:', e);
      return jsonError('Edge TTS 服务不可达: ' + e.message, 502);
    }
  }

  if (!response.ok) {
    const body = await response.text();
    let detail = '';
    try {
      const err = JSON.parse(body);
      detail = err.error?.message || err.message || body;
    } catch (_) {
      detail = body;
    }
    console.error('[Edge TTS] 请求失败:', response.status, detail);
    return jsonError('Edge TTS 服务错误 (HTTP ' + response.status + '): ' + detail, 502);
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    return jsonError('Edge TTS 返回空音频', 502);
  }

  // 3. 写入缓存
  try {
    await env.MAPAPP.put(cacheKey, audioBuffer, { expirationTtl: TTS_CACHE_TTL });
    console.log('[TTS Cache] 写入:', cacheKey, '大小:', audioBuffer.byteLength, '字节');
  } catch (e) {
    console.warn('[TTS Cache] 写入缓存失败:', e.message);
  }

  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
      'Accept-Ranges': 'bytes',
      ...corsHeaders()
    }
  });
}

function detectLang(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  return 'en';
}

function selectVoice(lang) {
  const voices = {
    zh: 'zh-CN-XiaoxiaoNeural',
    en: 'en-US-JennyNeural',
    ja: 'ja-JP-NanamiNeural',
    ko: 'ko-KR-SunHiNeural'
  };
  return voices[lang] || voices.zh;
}

function jsonError(message, status, extra) {
  const body = { error: message };
  if (extra) {
    Object.assign(body, extra);
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
