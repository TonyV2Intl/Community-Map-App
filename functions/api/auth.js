import { corsHeaders, jsonResponse, verifyToken } from './_shared';

async function generateToken(env) {
  const secret = env.ADMIN_PASSWORD || '';
  const timestamp = Date.now();
  const raw = `${secret}:${timestamp}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}:${hashBase64}`;
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    const data = await request.json();
    const password = data.password || '';
    const expectedPassword = env.ADMIN_PASSWORD || '';

    if (!expectedPassword) {
      return jsonResponse({ error: '管理员密码未配置' }, 500);
    }

    if (password !== expectedPassword) {
      return jsonResponse({ error: '密码错误' }, 401);
    }

    const token = await generateToken(env);
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; SameSite=${isLocal ? 'Lax' : 'Strict'}${isLocal ? '' : '; Secure'}`,
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error('POST /api/auth error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestGet(context) {
  const env = context.env;
  const request = context.request;
  
  const cookieHeader = request.headers.get('Cookie') || '';
  const authCookie = cookieHeader.split('; ').find(c => c.startsWith('auth_token='));
  const token = authCookie ? authCookie.split('=')[1] : null;
  
  const isAuthenticated = await verifyToken(env, token);
  
  return jsonResponse({ authenticated: isAuthenticated });
}

export async function onRequestDelete(context) {
  const request = context.request;
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `auth_token=; HttpOnly; Path=/; SameSite=${isLocal ? 'Lax' : 'Strict'}${isLocal ? '' : '; Secure'}; Max-Age=0`,
      ...corsHeaders()
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export { verifyToken };