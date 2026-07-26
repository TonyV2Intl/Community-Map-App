import { CONFIG_KEY, DEFAULT_REGION, DEFAULT_BOUNDARY_BUFFER, DEFAULT_TITLE, DEFAULT_TTS_ENGINE, DEFAULT_TTS_VOICE, corsHeaders, jsonResponse } from './_shared';

export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method === 'GET') {
        let config = null;
        
        try {
            const kvConfig = await env.MAPAPP.get(CONFIG_KEY);
            if (kvConfig) {
                config = JSON.parse(kvConfig);
            }
        } catch (e) {
            console.error('从KV读取配置失败:', e);
        }
        
        if (!config) {
            return jsonResponse({
                region: DEFAULT_REGION,
                boundaryBuffer: DEFAULT_BOUNDARY_BUFFER,
                title: DEFAULT_TITLE,
                ttsEngine: DEFAULT_TTS_ENGINE,
                ttsVoice: DEFAULT_TTS_VOICE
            });
        }
        
        return jsonResponse({
            region: config.region || DEFAULT_REGION,
            boundaryBuffer: config.boundaryBuffer !== undefined ? config.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER,
            title: config.title || DEFAULT_TITLE,
            ttsEngine: config.ttsEngine || DEFAULT_TTS_ENGINE,
            ttsVoice: config.ttsVoice !== undefined ? config.ttsVoice : DEFAULT_TTS_VOICE
        });
    }
    
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const config = {
                region: body.region || DEFAULT_REGION,
                boundaryBuffer: body.boundaryBuffer !== undefined ? parseFloat(body.boundaryBuffer) : DEFAULT_BOUNDARY_BUFFER,
                title: body.title || DEFAULT_TITLE,
                ttsEngine: body.ttsEngine || DEFAULT_TTS_ENGINE,
                ttsVoice: body.ttsVoice !== undefined ? body.ttsVoice : DEFAULT_TTS_VOICE
            };
            
            await env.MAPAPP.put(CONFIG_KEY, JSON.stringify(config));
            
            return jsonResponse({ success: true });
        } catch (e) {
            console.error('保存配置失败:', e);
            return jsonResponse({ success: false, error: e.message }, 500);
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
}
