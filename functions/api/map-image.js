import { corsHeaders, jsonResponse } from './_shared';

const MAP_IMAGE_KEY = 'mapImage';
const MAP_META_KEY = 'mapImageMeta';
const DEFAULT_IMAGE = '/assets/default-map.webp';
const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  try {
    // ?info 查询参数返回 JSON 元数据（用于控制台查看底图信息）
    if (url.searchParams.has('info')) {
      const meta = await env.MAPAPP.get(MAP_META_KEY, 'json');
      if (!meta) {
        return jsonResponse({ hasCustom: false, defaultImage: DEFAULT_IMAGE });
      }
      return jsonResponse({ hasCustom: true, meta });
    }

    const imageData = await env.MAPAPP.get(MAP_IMAGE_KEY, 'arrayBuffer');
    const meta = await env.MAPAPP.get(MAP_META_KEY, 'json');

    if (!imageData || !meta) {
      return Response.redirect(`${url.origin}${DEFAULT_IMAGE}`, 302);
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
    return Response.redirect(`${url.origin}${DEFAULT_IMAGE}`, 302);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

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

    await env.MAPAPP.put(MAP_IMAGE_KEY, arrayBuffer);
    await env.MAPAPP.put(MAP_META_KEY, JSON.stringify({
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
  const { env } = context;

  try {
    await env.MAPAPP.delete(MAP_IMAGE_KEY);
    await env.MAPAPP.delete(MAP_META_KEY);
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