import { corsHeaders } from './_shared';

const MAX_TEXT_LENGTH = 500;

const TTS_MODELS = [
  '@cf/myshell-ai/melotts',
  '@cf/meta/melotts'
];

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AI || typeof env.AI.run !== 'function') {
    return jsonError('AI 绑定未配置，请在 Cloudflare Pages 设置中添加 Workers AI 绑定', 503);
  }

  let text = '';
  try {
    const body = await request.json();
    text = (body.text || '').trim();
  } catch (e) {
    return jsonError('请求体必须是合法的 JSON 格式', 400);
  }

  if (!text) {
    return jsonError('文本内容不能为空', 400);
  }

  const truncated = text.length > MAX_TEXT_LENGTH
    ? text.substring(0, MAX_TEXT_LENGTH)
    : text;

  let lastError = null;
  let result = null;

  for (const model of TTS_MODELS) {
    try {
      result = await env.AI.run(model, {
        prompt: truncated,
        lang: 'zh'
      });
      if (result) {
        console.log('[TTS] 模型调用成功:', model);
        break;
      }
    } catch (e) {
      console.warn('[TTS] 模型', model, '失败:', e.message);
      lastError = e;
      result = null;
    }
  }

  if (!result) {
    return jsonError(
      '所有 TTS 模型均调用失败: ' + (lastError ? lastError.message : '未知错误'),
      502,
      { models: TTS_MODELS.map(m => ({ model: m })) }
    );
  }

  try {
    const audioBuffer = extractAudioBuffer(result);

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      const info = inspectResult(result);
      console.warn('[TTS] 模型返回为空或无法识别格式:', info);
      return jsonError('TTS 返回内容为空或无法解析', 502, { resultInfo: info });
    }

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error('[TTS] 音频数据解析失败:', e);
    return jsonError('TTS 音频数据解析失败: ' + e.message, 502);
  }
}

function extractAudioBuffer(result) {
  if (!result) return null;

  if (result instanceof Response) {
    return result.arrayBuffer();
  }

  if (result instanceof ArrayBuffer) {
    return result;
  }

  if (ArrayBuffer.isView(result) && result.buffer) {
    return result.buffer;
  }

  if (typeof result === 'object') {
    // 常见的 base64 封装格式
    if (typeof result.audio === 'string') {
      return base64ToBuffer(result.audio);
    }
    if (typeof result.data === 'string') {
      return base64ToBuffer(result.data);
    }
    // 嵌套结构
    if (result.audio && typeof result.audio === 'object' && typeof result.audio.data === 'string') {
      return base64ToBuffer(result.audio.data);
    }
    if (result.data && typeof result.data === 'object' && typeof result.data.audio === 'string') {
      return base64ToBuffer(result.data.audio);
    }
  }

  // 兜底：如果 result 本身就是字符串（base64）
  if (typeof result === 'string') {
    return base64ToBuffer(result);
  }

  throw new Error('无法识别的 AI 返回格式');
}

function inspectResult(result) {
  if (!result) return 'null';
  if (result instanceof Response) return 'Response';
  if (result instanceof ArrayBuffer) return `ArrayBuffer(${result.byteLength})`;
  if (ArrayBuffer.isView(result)) return `${result.constructor.name}(${result.length})`;
  if (typeof result === 'object') {
    const keys = Object.keys(result);
    return `object[${keys.join(',')}]`;
  }
  return typeof result;
}

function base64ToBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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
