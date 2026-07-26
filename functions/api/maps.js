import {
  getMapsIndex,
  saveMapsIndex,
  getMapMeta,
  slugExists,
  validateSlug,
  DEFAULT_SLUG,
  DEFAULT_REGION,
  DEFAULT_BOUNDARY_BUFFER,
  DEFAULT_TITLE,
  mapLandmarksKey,
  mapConfigKey,
  mapImageKey,
  mapImageMetaKey,
  corsHeaders,
  jsonResponse
} from './_shared';

// GET /api/maps          列出所有地图
// GET /api/maps?slug=xxx 返回单个地图元数据
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const index = await getMapsIndex(env);

    if (slug) {
      const meta = index.find(m => m.slug === slug) || null;
      if (!meta) {
        return jsonResponse({ error: 'Map not found' }, 404);
      }
      return jsonResponse(meta);
    }

    return jsonResponse(index);
  } catch (e) {
    console.error('GET /api/maps error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// POST /api/maps  Body: { slug, title }
export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const data = await request.json();
    const slug = (data.slug || '').trim();
    const title = (data.title || '').trim();

    if (!validateSlug(slug)) {
      return jsonResponse({ error: 'slug 格式无效，仅允许小写字母、数字和连字符，长度 1-64' }, 400);
    }

    if (!title) {
      return jsonResponse({ error: 'title 不能为空' }, 400);
    }

    if (await slugExists(env, slug)) {
      return jsonResponse({ error: `地图 "${slug}" 已存在` }, 409);
    }

    const now = Date.now();

    // 初始化空地标列表
    await env.MAPAPP.put(mapLandmarksKey(slug), JSON.stringify([], null, 2));

    // 初始化默认配置
    const config = {
      region: DEFAULT_REGION,
      boundaryBuffer: DEFAULT_BOUNDARY_BUFFER,
      title: title
    };
    await env.MAPAPP.put(mapConfigKey(slug), JSON.stringify(config));

    // 不初始化底图，GET /api/map-image?map=xxx 会回退到默认底图

    // 追加到 maps:index
    const index = await getMapsIndex(env);
    index.push({
      slug: slug,
      title: title,
      createdAt: now,
      updatedAt: now
    });
    await saveMapsIndex(env, index);

    return jsonResponse({ slug, title, createdAt: now, updatedAt: now }, 201);
  } catch (e) {
    console.error('POST /api/maps error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// PUT /api/maps?slug=xxx  Body: { title?, newSlug? }
export async function onRequestPut(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const oldSlug = url.searchParams.get('slug');

  if (!oldSlug) {
    return jsonResponse({ error: 'slug parameter is required' }, 400);
  }

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const meta = await getMapMeta(env, oldSlug);
    if (!meta) {
      return jsonResponse({ error: 'Map not found' }, 404);
    }

    const data = await request.json();
    const newSlug = data.newSlug ? data.newSlug.trim() : null;
    const newTitle = data.title ? data.title.trim() : null;

    // 处理 slug 重命名
    if (newSlug && newSlug !== oldSlug) {
      if (!validateSlug(newSlug)) {
        return jsonResponse({ error: 'newSlug 格式无效' }, 400);
      }
      if (await slugExists(env, newSlug)) {
        return jsonResponse({ error: `地图 "${newSlug}" 已存在` }, 409);
      }

      // 读取旧数据
      const landmarks = await env.MAPAPP.get(mapLandmarksKey(oldSlug), 'json');
      const config = await env.MAPAPP.get(mapConfigKey(oldSlug), 'json');
      const imageData = await env.MAPAPP.get(mapImageKey(oldSlug), 'arrayBuffer');
      const imageMeta = await env.MAPAPP.get(mapImageMetaKey(oldSlug), 'json');

      // 写入新键
      if (landmarks) {
        await env.MAPAPP.put(mapLandmarksKey(newSlug), JSON.stringify(landmarks, null, 2));
      } else {
        await env.MAPAPP.put(mapLandmarksKey(newSlug), JSON.stringify([], null, 2));
      }
      if (config) {
        await env.MAPAPP.put(mapConfigKey(newSlug), JSON.stringify(config));
      }
      if (imageData) {
        await env.MAPAPP.put(mapImageKey(newSlug), imageData);
      }
      if (imageMeta) {
        await env.MAPAPP.put(mapImageMetaKey(newSlug), JSON.stringify(imageMeta));
      }

      // 删除旧键
      await env.MAPAPP.delete(mapLandmarksKey(oldSlug));
      await env.MAPAPP.delete(mapConfigKey(oldSlug));
      await env.MAPAPP.delete(mapImageKey(oldSlug));
      await env.MAPAPP.delete(mapImageMetaKey(oldSlug));
    }

    // 更新 maps:index
    const index = await getMapsIndex(env);
    const idx = index.findIndex(m => m.slug === oldSlug);
    if (idx === -1) {
      return jsonResponse({ error: 'Map not found in index' }, 404);
    }

    const finalSlug = newSlug && newSlug !== oldSlug ? newSlug : oldSlug;
    const finalTitle = newTitle || index[idx].title;

    index[idx] = {
      ...index[idx],
      slug: finalSlug,
      title: finalTitle,
      updatedAt: Date.now()
    };
    await saveMapsIndex(env, index);

    return jsonResponse(index[idx]);
  } catch (e) {
    console.error('PUT /api/maps error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// DELETE /api/maps?slug=xxx
export async function onRequestDelete(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return jsonResponse({ error: 'slug parameter is required' }, 400);
  }

  if (slug === DEFAULT_SLUG) {
    return jsonResponse({ error: '默认地图不可删除' }, 400);
  }

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const meta = await getMapMeta(env, slug);
    if (!meta) {
      return jsonResponse({ error: 'Map not found' }, 404);
    }

    // 删除该地图的所有数据
    await env.MAPAPP.delete(mapLandmarksKey(slug));
    await env.MAPAPP.delete(mapConfigKey(slug));
    await env.MAPAPP.delete(mapImageKey(slug));
    await env.MAPAPP.delete(mapImageMetaKey(slug));

    // 从 maps:index 移除
    const index = await getMapsIndex(env);
    const newIndex = index.filter(m => m.slug !== slug);
    await saveMapsIndex(env, newIndex);

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('DELETE /api/maps error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
