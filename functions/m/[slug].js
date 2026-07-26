import { validateSlug, DEFAULT_SLUG, getMapMeta } from '../api/_shared';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const slug = params.slug;
  const url = new URL(request.url);

  // 校验 slug 格式；非法则回退到 default
  if (!validateSlug(slug)) {
    return Response.redirect(`${url.origin}/m/${DEFAULT_SLUG}`, 302);
  }

  // default slug 跳过存在性检查（避免首次部署无限重定向）
  if (slug !== DEFAULT_SLUG) {
    const meta = await getMapMeta(env, slug);
    if (!meta) {
      return Response.redirect(`${url.origin}/m/${DEFAULT_SLUG}`, 302);
    }
  }

  // 拉取静态 index.html
  const asset = await env.ASSETS.fetch(new Request('http://localhost/index.html'));

  // 透传响应，显式设置 Content-Type 与 no-cache
  return new Response(asset.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
