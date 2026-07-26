import {
  mapImageKey,
  mapImageMetaKey,
  resolveMapSlug,
  DEFAULT_IMAGE_PATH,
  corsHeaders,
  jsonResponse
} from './_shared';

const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const { slug, error, status } = resolveMapSlug(url);
  if (error) return jsonResponse({ error }, status);

  try {
    // ?info 查询参数返回 JSON 元数据（用于控制台查看底图信息）
    if (url.searchParams.has('info')) {
      const meta = await env.MAPAPP.get(mapImageMetaKey(slug), 'json');
      if (!meta) {
        return jsonResponse({ hasCustom: false, defaultImage: DEFAULT_IMAGE_PATH });
      }
      return jsonResponse({ hasCustom: true, meta });
    }

    const imageData = await env.MAPAPP.get(mapImageKey(slug), 'arrayBuffer');
    const meta = await env.MAPAPP.get(mapImageMetaKey(slug), 'json');

    if (!imageData || !meta) {
      return Response.redirect(`${url.origin}${DEFAULT_IMAGE_PATH}`, 302);
    }

    return new Response(imageData, {
      headers: {
        'Content-Type': meta.type || 'image/webp',
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders()
      }
    });
  } catch (e) {
    console.error('GET /api/map-image error:', e);
    return Response.redirect(`${url.origin}${DEFAULT_IMAGE_PATH}`, 302);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { slug, error, status } = resolveMapSlug(url);
  if (error) return jsonResponse({ error }, status);

  try {
    const contentType = request.headers.get('Content-Type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ error: '需要 multipart/form-data' }, 400);
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: '未找到上传的图片文件' }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonResponse({ error: '仅支持 webp、png、jpeg 格式' }, 400);
    }

    if (file.size > MAX_SIZE) {
      return jsonResponse({ error: '图片大小不能超过 10MB' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();

    await env.MAPAPP.put(mapImageKey(slug), arrayBuffer);
    await env.MAPAPP.put(mapImageMetaKey(slug), JSON.stringify({
      type: file.type,
      size: file.size,
      name: file.name,
      updatedAt: Date.now()
    }));

    return jsonResponse({ success: true, type: file.type, size: file.size });
  } catch (e) {
    console.error('POST /api/map-image error:', e);
    return jsonResponse({ error: '上传失败' }, 500);
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const { slug, error, status } = resolveMapSlug(url);
  if (error) return jsonResponse({ error }, status);

  try {
    await env.MAPAPP.delete(mapImageKey(slug));
    await env.MAPAPP.delete(mapImageMetaKey(slug));
    return jsonResponse({ success: true });
  } catch (e) {
    console.error('DELETE /api/map-image error:', e);
    return jsonResponse({ error: '删除失败' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
