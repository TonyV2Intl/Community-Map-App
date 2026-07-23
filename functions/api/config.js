import { CONFIG_KEY, getDefaultConfig, corsHeaders, jsonResponse } from './_shared';

export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method === 'GET') {
        let config = null;
        
        // 从 KV 获取配置
        try {
            const kvConfig = await env.LANDMARKS.get(CONFIG_KEY);
            if (kvConfig) {
                config = JSON.parse(kvConfig);
            }
        } catch (e) {
            console.error('从KV读取配置失败:', e);
        }
        
        // 如果 KV 中没有，从默认配置文件获取
        if (!config) {
            config = await getDefaultConfig(env);
        }
        
        // 返回配置，baidu_ak 从环境变量获取
        return jsonResponse({
            region: config.region || '上海',
            boundaryBuffer: config.boundaryBuffer !== undefined ? config.boundaryBuffer : 0.1,
            baidu_ak: env.BAIDU_AK || ''
        });
    }
    
    if (request.method === 'POST') {
        // 保存配置到 KV（保存 region 和 boundaryBuffer）
        try {
            const body = await request.json();
            const config = {
                region: body.region || '上海',
                boundaryBuffer: body.boundaryBuffer !== undefined ? parseFloat(body.boundaryBuffer) : 0.1
            };
            
            await env.LANDMARKS.put(CONFIG_KEY, JSON.stringify(config));
            
            return jsonResponse({ success: true });
        } catch (e) {
            console.error('保存配置失败:', e);
            return jsonResponse({ success: false, error: e.message }, 500);
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
}