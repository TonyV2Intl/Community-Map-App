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

async function getAuthToken(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const authCookie = cookieHeader.split('; ').find(c => c.startsWith('auth_token='));
  return authCookie ? authCookie.split('=')[1] : null;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.includes('.') || path.includes('/js/') || path.includes('/css/') || path.includes('/assets/')) {
    return next();
  }

  if (path === '/console-login' || path === '/console-login/') {
    const asset = await env.ASSETS.fetch(new Request(`${url.origin}/console-login.html`));
    return asset;
  }

  if (path === '/console' || path === '/console/' || path.startsWith('/console-edit')) {
    const token = await getAuthToken(request);
    const isAuthenticated = await verifyToken(env, token);
    
    if (!isAuthenticated) {
      return Response.redirect(`${url.origin}/console-login`, 302);
    }
  }

  if (path.startsWith('/api/') && !path.startsWith('/api/auth')) {
    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const token = await getAuthToken(request);
      const isAuthenticated = await verifyToken(env, token);
      
      if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      }
    }
  }

  if (path === '/console' || path === '/console/') {
    const asset = await env.ASSETS.fetch(new Request(`${url.origin}/console.html`));
    return asset;
  }

  if (path.startsWith('/console-edit')) {
    const asset = await env.ASSETS.fetch(new Request(`${url.origin}/console-edit.html`));
    return asset;
  }

  return next();
}