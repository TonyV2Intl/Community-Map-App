import {
  MAPS_INDEX_KEY,
  DEFAULT_SLUG,
  DEFAULT_REGION,
  DEFAULT_BOUNDARY_BUFFER,
  DEFAULT_TITLE,
  mapLandmarksKey,
  mapConfigKey,
  mapImageKey,
  mapImageMetaKey,
  getMapsIndex,
  saveMapsIndex,
  corsHeaders,
  jsonResponse
} from './_shared';

// 旧全局键（迁移清理用）
const LEGACY_KEYS = ['landmarks:list', 'config', 'mapImage', 'mapImageMeta'];

export async function onRequestGet(context) {
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const mapsIndex = await getMapsIndex(env);

    // 收集每个地图的详细信息
    const mapsDetail = [];
    for (const map of mapsIndex) {
      // 获取地标数量
      let landmarksCount = 0;
      try {
        const lmData = await env.MAPAPP.get(mapLandmarksKey(map.slug), 'json');
        landmarksCount = Array.isArray(lmData) ? lmData.length : 0;
      } catch (_) {}

      // 获取配置
      let config = null;
      try {
        config = await env.MAPAPP.get(mapConfigKey(map.slug), 'json');
      } catch (_) {}

      // 获取底图元数据
      let imageMeta = null;
      let hasCustomImage = false;
      try {
        imageMeta = await env.MAPAPP.get(mapImageMetaKey(map.slug), 'json');
        hasCustomImage = !!(imageMeta && imageMeta.size);
      } catch (_) {}

      mapsDetail.push({
        slug: map.slug,
        title: map.title,
        createdAt: map.createdAt,
        updatedAt: map.updatedAt,
        landmarksCount,
        config: config || { region: DEFAULT_REGION, boundaryBuffer: DEFAULT_BOUNDARY_BUFFER, title: map.title },
        hasCustomImage,
        imageMeta: imageMeta || null
      });
    }

    return jsonResponse({
      maps: mapsDetail,
      raw: JSON.stringify(mapsDetail, null, 2),
      exists: mapsIndex.length > 0
    });
  } catch (e) {
    console.error('GET /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    // 遍历删除所有 map:* 键
    let cursor;
    do {
      const list = await env.MAPAPP.list({ cursor, prefix: 'map:' });
      for (const k of list.keys) {
        await env.MAPAPP.delete(k.name);
      }
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    // 删除 maps:index
    await env.MAPAPP.delete(MAPS_INDEX_KEY);

    // 清理旧全局键
    for (const k of LEGACY_KEYS) {
      await env.MAPAPP.delete(k);
    }

    return jsonResponse({
      success: true,
      message: '所有地图数据已清除'
    });
  } catch (e) {
    console.error('DELETE /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    if (!env.MAPAPP) {
      return jsonResponse({ error: 'MAPAPP KV namespace not configured' }, 500);
    }

    const body = await request.json();

    // 还原默认配置：从 default-config.json 读取并写入 KV
    if (body.restoreDefaults) {
      if (!env.ASSETS) {
        return jsonResponse({ error: 'ASSETS not available' }, 500);
      }

      const assetsRes = await env.ASSETS.fetch(new Request('http://localhost/assets/default-config.json'));
      if (!assetsRes.ok) {
        return jsonResponse({ error: '无法读取默认配置文件' }, 500);
      }

      const defaultData = await assetsRes.json();
      const landmarks = defaultData.landmarks || [];
      const config = defaultData.config || {
        region: DEFAULT_REGION,
        boundaryBuffer: DEFAULT_BOUNDARY_BUFFER,
        title: DEFAULT_TITLE
      };
      const now = Date.now();

      // 1. 写入 maps:index（重置为只含 default）
      const mapsIndex = [{
        slug: DEFAULT_SLUG,
        title: config.title || DEFAULT_TITLE,
        createdAt: now,
        updatedAt: now
      }];
      await saveMapsIndex(env, mapsIndex);

      // 2. 写入 map:default:landmarks 和 map:default:config
      await env.MAPAPP.put(mapLandmarksKey(DEFAULT_SLUG), JSON.stringify(landmarks, null, 2));
      await env.MAPAPP.put(mapConfigKey(DEFAULT_SLUG), JSON.stringify(config));

      // 3. 清除 map:default 的自定义底图（恢复默认底图）
      await env.MAPAPP.delete(mapImageKey(DEFAULT_SLUG));
      await env.MAPAPP.delete(mapImageMetaKey(DEFAULT_SLUG));

      // 4. 清理旧全局键
      for (const k of LEGACY_KEYS) {
        await env.MAPAPP.delete(k);
      }

      return jsonResponse({
        success: true,
        message: `已还原默认配置（${landmarks.length} 个地标）`
      });
    }

    return jsonResponse({ error: 'Unsupported operation' }, 400);
  } catch (e) {
    console.error('POST /api/kv-debug error:', e);
    return jsonResponse({ error: 'Internal server error', details: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
