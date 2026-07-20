function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

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

async function verifyToken(env, token) {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 2) return false;
  
  const timestamp = parseInt(parts[0]);
  const hash = parts[1];
  
  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false;
  
  const secret = env.ADMIN_PASSWORD || '';
  const raw = `${secret}:${timestamp}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === expectedHash;
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

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export { verifyToken };