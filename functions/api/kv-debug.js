import { LIST_KEY, corsHeaders, jsonResponse } from './_shared';

export async function onRequestGet(context) {
  const env = context.env;

  try {
    if (!env.LANDMARKS) {
      return jsonResponse({ error: 'LANDMARKS KV namespace not configured' }, 500);
    }

    const rawValue = await env.LANDMARKS.get(LIST_KEY);
    
    return jsonResponse({
      key: LIST_KEY,
      raw: rawValue,
      exists: !!rawValue
    });
  } catch (e) {
    console.error('GET /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}