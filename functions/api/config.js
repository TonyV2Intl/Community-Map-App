import { CONFIG_KEY, DEFAULT_REGION, DEFAULT_BOUNDARY_BUFFER, DEFAULT_TITLE, DEFAULT_TTS_ENGINE, DEFAULT_TTS_VOICE, corsHeaders, jsonResponse } from './_shared';

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
            
            // 输入验证
            if (typeof body !== 'object' || body === null) {
                return jsonResponse({ success: false, error: '请求体必须是对象' }, 400);
            }
            
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
            
            // 验证 region（必填且不能过长）
            const region = body.region !== undefined ? String(body.region).trim() : (existingConfig.region || DEFAULT_REGION);
            if (!region) {
                return jsonResponse({ success: false, error: '区域不能为空' }, 400);
            }
            if (region.length > 100) {
                return jsonResponse({ success: false, error: '区域名称过长' }, 400);
            }
            
            // 验证 boundaryBuffer（必须在合理范围内）
            let boundaryBuffer = existingConfig.boundaryBuffer !== undefined ? existingConfig.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER;
            if (body.boundaryBuffer !== undefined) {
                const parsed = parseFloat(body.boundaryBuffer);
                if (!isNaN(parsed) && parsed >= 0 && parsed <= 0.5) {
                    boundaryBuffer = parsed;
                } else {
                    return jsonResponse({ success: false, error: '边界缓冲值必须在 0-0.5 之间' }, 400);
                }
            }
            
            // 验证 title（不能过长）
            const title = body.title !== undefined ? String(body.title).trim() : (existingConfig.title || DEFAULT_TITLE);
            if (title.length > 100) {
                return jsonResponse({ success: false, error: '标题过长' }, 400);
            }
            
            // 验证 ttsEngine（必须是有效值）
            const validEngines = ['auto', 'browser', 'server', 'disabled'];
            const ttsEngine = body.ttsEngine !== undefined 
                ? (validEngines.includes(body.ttsEngine) ? body.ttsEngine : DEFAULT_TTS_ENGINE)
                : (existingConfig.ttsEngine || DEFAULT_TTS_ENGINE);
            
            // 验证 ttsVoice（字符串，不能过长）
            let ttsVoice = existingConfig.ttsVoice !== undefined ? existingConfig.ttsVoice : DEFAULT_TTS_VOICE;
            if (body.ttsVoice !== undefined) {
                ttsVoice = String(body.ttsVoice);
                if (ttsVoice.length > 100) {
                    return jsonResponse({ success: false, error: '语音名称过长' }, 400);
                }
            }
            
            // 验证 quickIcons（必须是字符串数组）
            let quickIcons = existingConfig.quickIcons || DEFAULT_QUICK_ICONS;
            if (body.quickIcons !== undefined) {
                if (!Array.isArray(body.quickIcons)) {
                    return jsonResponse({ success: false, error: '快捷图标必须是数组' }, 400);
                }
                quickIcons = body.quickIcons.map(item => String(item)).filter(item => item.length > 0 && item.length <= 50);
                if (quickIcons.length === 0) {
                    quickIcons = DEFAULT_QUICK_ICONS;
                }
            }
            
            // 验证 quickColors（必须是颜色值数组）
            const colorPattern = /^#[0-9a-fA-F]{6}$/;
            let quickColors = existingConfig.quickColors || DEFAULT_QUICK_COLORS;
            if (body.quickColors !== undefined) {
                if (!Array.isArray(body.quickColors)) {
                    return jsonResponse({ success: false, error: '快捷颜色必须是数组' }, 400);
                }
                quickColors = body.quickColors.filter(item => colorPattern.test(item));
                if (quickColors.length === 0) {
                    quickColors = DEFAULT_QUICK_COLORS;
                }
            }
            
            const config = {
                region,
                boundaryBuffer,
                title,
                ttsEngine,
                ttsVoice,
                quickIcons,
                quickColors
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
