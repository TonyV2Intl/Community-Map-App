import { verifyToken } from './api/_shared';

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

  if (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/tts')) {
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
    
    if (path.startsWith('/api/kv-debug') && method === 'GET') {
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