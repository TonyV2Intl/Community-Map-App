import { getAllLandmarks, buildTtsCacheKey, deleteTtsCacheByKey, listTtsCacheKeys, corsHeaders, jsonResponse } from './_shared';

const MAX_TEXT_LENGTH = 5000;
const MAX_BATCH_SIZE = 10; // 单次最多处理10个地标，避免超时

export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        const landmarks = await getAllLandmarks(env);
        const cacheKeys = await listTtsCacheKeys(env);
        
        // 获取配置中的语音设置
        let ttsVoice = '';
        try {
            const config = await env.MAPAPP.get('config');
            if (config) {
                ttsVoice = JSON.parse(config).ttsVoice || '';
            }
        } catch (e) {
            // 忽略配置读取错误
        }
        
        // 检查每个地标的缓存状态
        const cacheStatus = await Promise.all(landmarks.map(async (lm) => {
            const text = (lm.description || lm.name).trim();
            if (!text) {
                return {
                    name: lm.name,
                    hasText: false,
                    cached: false,
                    cacheKey: null
                };
            }
            
            const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
            const cacheKey = await buildTtsCacheKey(truncated, ttsVoice);
            const cached = cacheKeys.includes(cacheKey);
            
            return {
                name: lm.name,
                hasText: true,
                textLength: text.length,
                cached,
                cacheKey
            };
        }));
        
        const cachedCount = cacheStatus.filter(item => item.cached).length;
        const totalWithText = cacheStatus.filter(item => item.hasText).length;
        
        return jsonResponse({
            success: true,
            totalLandmarks: landmarks.length,
            totalWithText,
            cachedCount,
            uncachedCount: totalWithText - cachedCount,
            cacheStatus
        });
    } catch (e) {
        console.error('[TTS Cache API] 获取缓存状态失败:', e);
        return jsonResponse({ success: false, error: e.message }, 500);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { name, rebuild } = body;
        
        const landmarks = await getAllLandmarks(env);
        
        // 获取配置中的语音设置
        let ttsVoice = '';
        try {
            const config = await env.MAPAPP.get('config');
            if (config) {
                ttsVoice = JSON.parse(config).ttsVoice || '';
            }
        } catch (e) {
            // 忽略配置读取错误
        }
        
        let targets = [];
        if (name) {
            // 只处理指定地标
            const lm = landmarks.find(l => l.name === name);
            if (!lm) {
                return jsonResponse({ success: false, error: `地标 "${name}" 不存在` }, 404);
            }
            targets = [lm];
        } else {
            // 处理所有有介绍文字的地标
            targets = landmarks.filter(lm => (lm.description || lm.name).trim());
        }
        
        // 限制批量处理大小，避免超时
        const actualTargets = targets.slice(0, MAX_BATCH_SIZE);
        
        const results = [];
        for (const lm of actualTargets) {
            const text = (lm.description || lm.name).trim();
            const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
            const cacheKey = await buildTtsCacheKey(truncated, ttsVoice);
            
            if (rebuild) {
                // 重建模式：先删除旧缓存
                await deleteTtsCacheByKey(env, cacheKey);
            }
            
            // 检查是否已经有缓存（重建模式下刚删除，不会命中）
            let cached = null;
            try {
                cached = await env.MAPAPP.get(cacheKey, 'arrayBuffer');
            } catch (e) {
                // 忽略读取错误
            }
            
            if (cached && cached.byteLength > 0) {
                results.push({
                    name: lm.name,
                    status: 'cached',
                    message: '缓存已存在，跳过'
                });
                continue;
            }
            
            // 调用 Edge TTS 生成音频
            const audioBuffer = await generateAudio(env, truncated, ttsVoice);
            
            if (!audioBuffer) {
                results.push({
                    name: lm.name,
                    status: 'error',
                    message: '音频生成失败'
                });
                continue;
            }
            
            // 写入缓存
            try {
                await env.MAPAPP.put(cacheKey, audioBuffer, { expirationTtl: 86400 });
                results.push({
                    name: lm.name,
                    status: 'built',
                    size: audioBuffer.byteLength,
                    message: '缓存构建成功'
                });
            } catch (e) {
                results.push({
                    name: lm.name,
                    status: 'error',
                    message: '写入缓存失败: ' + e.message
                });
            }
        }
        
        const successCount = results.filter(r => r.status === 'built' || r.status === 'cached').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        
        const response = {
            success: true,
            total: targets.length,
            processed: actualTargets.length,
            remaining: targets.length - actualTargets.length,
            successCount: successCount,
            errorCount: errorCount,
            results
        };
        
        if (targets.length > MAX_BATCH_SIZE) {
            response.message = `本次处理了 ${MAX_BATCH_SIZE} 个地标，还有 ${targets.length - MAX_BATCH_SIZE} 个待处理，请继续执行`;
        }
        
        return jsonResponse(response);
    } catch (e) {
        console.error('[TTS Cache API] 构建缓存失败:', e);
        return jsonResponse({ success: false, error: e.message }, 500);
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    
    try {
        const url = new URL(request.url);
        const name = url.searchParams.get('name');
        
        if (name) {
            // 删除指定地标的缓存
            const landmarks = await getAllLandmarks(env);
            const lm = landmarks.find(l => l.name === decodeURIComponent(name));
            
            if (!lm) {
                return jsonResponse({ success: false, error: `地标 "${name}" 不存在` }, 404);
            }
            
            // 获取配置中的语音设置
            let ttsVoice = '';
            try {
                const config = await env.MAPAPP.get('config');
                if (config) {
                    ttsVoice = JSON.parse(config).ttsVoice || '';
                }
            } catch (e) {
                // 忽略配置读取错误
            }
            
            const text = (lm.description || lm.name).trim();
            if (!text) {
                return jsonResponse({ success: true, deleted: 0, message: '该地标没有介绍文字，无需清除缓存' });
            }
            
            const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
            const cacheKey = await buildTtsCacheKey(truncated, ttsVoice);
            const deleted = await deleteTtsCacheByKey(env, cacheKey);
            
            return jsonResponse({
                success: true,
                deleted: deleted ? 1 : 0,
                name: lm.name,
                message: deleted ? '缓存已清除' : '缓存不存在'
            });
        } else {
            // 删除所有 TTS 缓存
            const cacheKeys = await listTtsCacheKeys(env);
            let deletedCount = 0;
            
            for (const key of cacheKeys) {
                try {
                    await env.MAPAPP.delete(key);
                    deletedCount++;
                } catch (e) {
                    console.warn('[TTS Cache API] 删除缓存失败:', key, e.message);
                }
            }
            
            return jsonResponse({
                success: true,
                deleted: deletedCount,
                message: `已清除 ${deletedCount} 个缓存`
            });
        }
    } catch (e) {
        console.error('[TTS Cache API] 清除缓存失败:', e);
        return jsonResponse({ success: false, error: e.message }, 500);
    }
}

async function generateAudio(env, text, voice) {
    const payload = {
        model: 'tts-1',
        input: text,
        voice: voice || selectVoice(detectLang(text)),
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

    let response;
    if (env.EDGE_TTS) {
        try {
            response = await env.EDGE_TTS.fetch('https://edge-tts/v1/audio/speech', {
                method: 'POST',
                headers: ttsHeaders,
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('[TTS Cache API] Service Binding 调用失败:', e);
            return null;
        }
    } else {
        let edgeTtsUrl = (env.EDGE_TTS_URL || '').trim().replace(/\/$/, '');
        if (!edgeTtsUrl) {
            console.error('[TTS Cache API] Edge TTS 服务未配置');
            return null;
        }
        if (!/^https?:\/\//.test(edgeTtsUrl)) {
            edgeTtsUrl = 'https://' + edgeTtsUrl;
        }
        try {
            response = await fetch(edgeTtsUrl + '/v1/audio/speech', {
                method: 'POST',
                headers: ttsHeaders,
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('[TTS Cache API] 网络异常:', e);
            return null;
        }
    }

    if (!response.ok) {
        const body = await response.text();
        console.error('[TTS Cache API] 请求失败:', response.status, body);
        return null;
    }

    const audioBuffer = await response.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
        console.error('[TTS Cache API] 返回空音频');
        return null;
    }

    return audioBuffer;
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

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders()
    });
}
