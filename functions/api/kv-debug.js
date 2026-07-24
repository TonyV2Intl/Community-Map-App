import { LIST_KEY, CONFIG_KEY, DEFAULT_REGION, DEFAULT_BOUNDARY_BUFFER, corsHeaders, jsonResponse } from './_shared';

export async function onRequestGet(context) {
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const rawValue = await env.MAPAPP.get(LIST_KEY);
    const configValue = await env.MAPAPP.get(CONFIG_KEY);
    
    return jsonResponse({
      key: LIST_KEY,
      raw: rawValue,
      exists: !!rawValue,
      config: configValue ? JSON.parse(configValue) : null
    });
  } catch (e) {
    console.error('GET /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    // 清除地标数据和配置
    await env.MAPAPP.delete(LIST_KEY);
    await env.MAPAPP.delete(CONFIG_KEY);
    
    return jsonResponse({
      success: true,
      message: 'KV 值已清除'
    });
  } catch (e) {
    console.error('DELETE /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const body = await request.json();

    // 还原默认配置：从 default-config.json 读取并写入 KV
    if (body.restoreDefaults) {
      if (!env.ASSETS) {
        return jsonResponse({ error: 'ASSETS not available' }, 500);
      }

      const assetsRes = await env.ASSETS.fetch(new Request('http://localhost/assets/default-config.json'));
      if (!assetsRes.ok) {
        return jsonResponse({ error: '无法读取默认配置文件' }, 500);
      }

      const defaultData = await assetsRes.json();
      const landmarks = defaultData.landmarks || [];
      const config = defaultData.config || { region: DEFAULT_REGION, boundaryBuffer: DEFAULT_BOUNDARY_BUFFER };

      await env.MAPAPP.put(LIST_KEY, JSON.stringify(landmarks, null, 2));
      await env.MAPAPP.put(CONFIG_KEY, JSON.stringify(config));

      return jsonResponse({
        success: true,
        message: `已还原默认配置（${landmarks.length} 个地标）`
      });
    }
    
    if (body.raw !== undefined) {
      // 更新地标数据
      if (body.raw === null || body.raw === '') {
        await env.MAPAPP.delete(LIST_KEY);
      } else {
        await env.MAPAPP.put(LIST_KEY, body.raw);
      }
    }
    
    if (body.config !== undefined) {
      // 更新配置数据
      if (body.config === null) {
        await env.MAPAPP.delete(CONFIG_KEY);
      } else {
        await env.MAPAPP.put(CONFIG_KEY, JSON.stringify(body.config));
      }
    }
    
    return jsonResponse({
      success: true,
      message: 'KV 值已更新'
    });
  } catch (e) {
    console.error('POST /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}