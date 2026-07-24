import { geocodeAddress, corsHeaders, jsonResponse, verifyToken } from './_shared';

export async function onRequestGet(context) {
  const { request, env } = context;

  // 验证认证
  const cookieHeader = request.headers.get('Cookie') || '';
  const authCookie = cookieHeader.split('; ').find(c => c.startsWith('auth_token='));
  const token = authCookie ? authCookie.split('=')[1] : null;
  const isAuthenticated = await verifyToken(env, token);

  if (!isAuthenticated) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  if (!address || !address.trim()) {
    return jsonResponse({ error: 'address 参数为必填项' }, 400);
  }

  try {
    const result = await geocodeAddress(env, address);
    if (result) {
      return jsonResponse(result);
    }
    return jsonResponse({ error: '地理编码服务不可用，请检查 TIANDITU_KEY 配置' }, 502);
  } catch (e) {
    console.error('GET /api/geocode error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}