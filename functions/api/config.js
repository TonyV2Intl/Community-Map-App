import { CONFIG_KEY, DEFAULT_REGION, DEFAULT_BOUNDARY_BUFFER, DEFAULT_TITLE, DEFAULT_TTS_ENGINE, DEFAULT_TTS_VOICE, corsHeaders, jsonResponse, incrementTtsCacheVersion } from './_shared';

const DEFAULT_QUICK_ICONS = [
    'fa-location-dot', 'fa-hospital', 'fa-film', 'fa-hotel',
    'fa-landmark', 'fa-tree', 'fa-utensils', 'fa-music',
    'fa-book', 'fa-shop', 'fa-school', 'fa-building',
    'fa-mosque', 'fa-church', 'fa-museum', 'fa-monument'
];

const DEFAULT_QUICK_COLORS = [
    '#4285f4', '#ea4335', '#34a853', '#fbbc05',
    '#8e44ad', '#0e1115', '#f538a0', '#16a085'
];

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
                ttsVoice: DEFAULT_TTS_VOICE,
                quickIcons: DEFAULT_QUICK_ICONS,
                quickColors: DEFAULT_QUICK_COLORS
            });
        }
        
        return jsonResponse({
            region: config.region || DEFAULT_REGION,
            boundaryBuffer: config.boundaryBuffer !== undefined ? config.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER,
            title: config.title || DEFAULT_TITLE,
            ttsEngine: config.ttsEngine || DEFAULT_TTS_ENGINE,
            ttsVoice: config.ttsVoice !== undefined ? config.ttsVoice : DEFAULT_TTS_VOICE,
            quickIcons: config.quickIcons && Array.isArray(config.quickIcons) ? config.quickIcons : DEFAULT_QUICK_ICONS,
            quickColors: config.quickColors && Array.isArray(config.quickColors) ? config.quickColors : DEFAULT_QUICK_COLORS
        });
    }
    
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            
            // 读取现有配置以便合并部分更新
            let existingConfig = {};
            try {
                const kvConfig = await env.MAPAPP.get(CONFIG_KEY);
                if (kvConfig) {
                    existingConfig = JSON.parse(kvConfig);
                }
            } catch (e) {
                // 忽略读取错误，使用默认值
            }
            
            const config = {
                region: body.region !== undefined ? body.region : (existingConfig.region || DEFAULT_REGION),
                boundaryBuffer: body.boundaryBuffer !== undefined ? parseFloat(body.boundaryBuffer) : (existingConfig.boundaryBuffer !== undefined ? existingConfig.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER),
                title: body.title !== undefined ? body.title : (existingConfig.title || DEFAULT_TITLE),
                ttsEngine: body.ttsEngine !== undefined ? body.ttsEngine : (existingConfig.ttsEngine || DEFAULT_TTS_ENGINE),
                ttsVoice: body.ttsVoice !== undefined ? body.ttsVoice : (existingConfig.ttsVoice !== undefined ? existingConfig.ttsVoice : DEFAULT_TTS_VOICE),
                quickIcons: body.quickIcons !== undefined && Array.isArray(body.quickIcons) ? body.quickIcons : (existingConfig.quickIcons || DEFAULT_QUICK_ICONS),
                quickColors: body.quickColors !== undefined && Array.isArray(body.quickColors) ? body.quickColors : (existingConfig.quickColors || DEFAULT_QUICK_COLORS)
            };
            
            await env.MAPAPP.put(CONFIG_KEY, JSON.stringify(config));
            
            // 配置变更后失效 TTS 缓存
            await incrementTtsCacheVersion(env);
            
            return jsonResponse({ success: true });
        } catch (e) {
            console.error('保存配置失败:', e);
            return jsonResponse({ success: false, error: e.message }, 500);
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
}
