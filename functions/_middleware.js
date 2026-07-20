export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.includes('.') || path.includes('/js/') || path.includes('/css/') || path.includes('/assets/')) {
    return next();
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