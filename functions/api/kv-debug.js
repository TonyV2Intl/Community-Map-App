import { LIST_KEY, CONFIG_KEY, corsHeaders, jsonResponse } from './_shared';

export async function onRequestGet(context) {
  const env = context.env;

  try {
    if (!env.LANDMARKS) {
      return jsonResponse({ error: 'LANDMARKS KV namespace not configured' }, 500);
    }

    const rawValue = await env.LANDMARKS.get(LIST_KEY);
    const configValue = await env.LANDMARKS.get(CONFIG_KEY);
    
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
    if (!env.LANDMARKS) {
      return jsonResponse({ error: 'LANDMARKS KV namespace not configured' }, 500);
    }

    await env.LANDMARKS.delete(LIST_KEY);
    await env.LANDMARKS.delete(CONFIG_KEY);
    
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
    if (!env.LANDMARKS) {
      return jsonResponse({ error: 'LANDMARKS KV namespace not configured' }, 500);
    }

    const body = await request.json();
    
    if (body.raw !== undefined) {
      // 更新地标数据
      if (body.raw === null || body.raw === '') {
        await env.LANDMARKS.delete(LIST_KEY);
      } else {
        await env.LANDMARKS.put(LIST_KEY, body.raw);
      }
    }
    
    if (body.config !== undefined) {
      // 更新配置数据
      if (body.config === null) {
        await env.LANDMARKS.delete(CONFIG_KEY);
      } else {
        await env.LANDMARKS.put(CONFIG_KEY, JSON.stringify(body.config));
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