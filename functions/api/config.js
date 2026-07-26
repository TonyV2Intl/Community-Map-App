import {
  mapConfigKey,
  resolveMapSlug,
  DEFAULT_SLUG,
  DEFAULT_REGION,
  DEFAULT_BOUNDARY_BUFFER,
  DEFAULT_TITLE,
  getDefaultConfig,
  corsHeaders,
  jsonResponse
} from './_shared';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { slug, error, status } = resolveMapSlug(url);
  if (error) return jsonResponse({ error }, status);

  if (request.method === 'GET') {
    let config = null;

    // 从 KV 获取该地图的配置
    try {
      const kvConfig = await env.MAPAPP.get(mapConfigKey(slug));
      if (kvConfig) {
        config = JSON.parse(kvConfig);
      }
    } catch (e) {
      console.error('从KV读取配置失败:', e);
    }

    // 如果 KV 中没有配置
    if (!config) {
      // default slug 回退到 default-config.json
      if (slug === DEFAULT_SLUG) {
        const defaultCfg = await getDefaultConfig(env);
        return jsonResponse({
          region: defaultCfg.region || DEFAULT_REGION,
          boundaryBuffer: defaultCfg.boundaryBuffer !== undefined ? defaultCfg.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER,
          title: defaultCfg.title || DEFAULT_TITLE
        });
      }
      // 其他地图返回通用默认值
      return jsonResponse({
        region: DEFAULT_REGION,
        boundaryBuffer: DEFAULT_BOUNDARY_BUFFER,
        title: DEFAULT_TITLE
      });
    }

    // 返回配置
    return jsonResponse({
      region: config.region || DEFAULT_REGION,
      boundaryBuffer: config.boundaryBuffer !== undefined ? config.boundaryBuffer : DEFAULT_BOUNDARY_BUFFER,
      title: config.title || DEFAULT_TITLE
    });
  }

  if (request.method === 'POST') {
    // 保存配置到 KV（保存 region、boundaryBuffer 和 title）
    try {
      const body = await request.json();
      const config = {
        region: body.region || DEFAULT_REGION,
        boundaryBuffer: body.boundaryBuffer !== undefined ? parseFloat(body.boundaryBuffer) : DEFAULT_BOUNDARY_BUFFER,
        title: body.title || DEFAULT_TITLE
      };

      await env.MAPAPP.put(mapConfigKey(slug), JSON.stringify(config));

      return jsonResponse({ success: true });
    } catch (e) {
      console.error('保存配置失败:', e);
      return jsonResponse({ success: false, error: e.message }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
