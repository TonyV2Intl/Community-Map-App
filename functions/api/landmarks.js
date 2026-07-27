import { getAllLandmarks, saveAllLandmarks, corsHeaders, jsonResponse, geocodeAddress, buildTtsCacheKey, deleteTtsCacheByKey } from './_shared';

const MAX_TEXT_LENGTH = 5000;

async function getTtsVoice(env) {
    try {
        const config = await env.MAPAPP.get('config');
        if (config) {
            return JSON.parse(config).ttsVoice || '';
        }
    } catch (e) {
        // 忽略配置读取错误
    }
    return '';
}

async function clearLandmarkCache(env, landmark) {
    const text = (landmark.description || landmark.name).trim();
    if (!text) return;
    
    const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
    const voice = await getTtsVoice(env);
    const cacheKey = await buildTtsCacheKey(truncated, voice);
    await deleteTtsCacheByKey(env, cacheKey);
}

export async function onRequestGet(context) {
  const env = context.env;
  const url = new URL(context.request.url);
  const name = url.searchParams.get('name');

  try {
    const landmarks = await getAllLandmarks(env);
    
    if (name) {
      const decodedName = decodeURIComponent(name);
      const landmark = landmarks.find(l => l.name === decodedName);
      if (!landmark) {
        return jsonResponse({ error: 'Landmark not found' }, 404);
      }
      return jsonResponse(landmark);
    }
    
    return jsonResponse(landmarks);
  } catch (e) {
    console.error('GET /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    const data = await request.json();

    if (!data.name || !data.name.trim()) {
      return jsonResponse({ error: 'Name is required' }, 400);
    }

    const landmarks = await getAllLandmarks(env);
    const name = data.name.trim();
    
    // 检查名称是否重复
    if (landmarks.some(l => l.name === name)) {
      return jsonResponse({ error: `地标 "${name}" 已存在` }, 409);
    }

    const newLandmark = {
      name: name,
      address: data.address || '',
      x: Number(data.x) || 50,
      y: Number(data.y) || 50,
      lat: data.lat !== undefined && data.lat !== null && data.lat !== '' ? Number(data.lat) : null,
      lng: data.lng !== undefined && data.lng !== null && data.lng !== '' ? Number(data.lng) : null,
      icon: data.icon || 'fa-location-dot',
      color: data.color || '#4285f4',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      enabled: data.enabled !== false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 自动地理编码：有地址但无经纬度时，尝试获取
    if (newLandmark.address && (newLandmark.lat === null || newLandmark.lng === null)) {
      try {
        const geo = await geocodeAddress(env, newLandmark.address);
        if (geo) {
          newLandmark.lat = geo.lat;
          newLandmark.lng = geo.lng;
        }
      } catch (e) {
        console.warn('自动地理编码失败:', e);
      }
    }

    landmarks.push(newLandmark);
    await saveAllLandmarks(env, landmarks);

    return jsonResponse(newLandmark, 201);
  } catch (e) {
    console.error('POST /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestPut(context) {
  const request = context.request;
  const env = context.env;
  const url = new URL(context.request.url);
  const name = url.searchParams.get('name');

  try {
    // 单个地标更新（有 name 参数）
    if (name) {
      const data = await request.json();
      const landmarks = await getAllLandmarks(env);
      const decodedName = decodeURIComponent(name);
      const index = landmarks.findIndex(l => l.name === decodedName);

      if (index === -1) {
        return jsonResponse({ error: 'Landmark not found' }, 404);
      }

      // 如果修改了名称，检查新名称是否与其他地标重复
      if (data.name && data.name.trim() !== decodedName) {
        const newName = data.name.trim();
        if (landmarks.some(l => l.name === newName)) {
          return jsonResponse({ error: `地标 "${newName}" 已存在` }, 409);
        }
      }

      // 字段白名单：只允许更新这些字段
      const allowedFields = ['name', 'address', 'x', 'y', 'lat', 'lng', 'icon', 'color', 'description', 'imageUrl', 'enabled'];
      const updated = { ...landmarks[index] };
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updated[field] = data[field];
        }
      }
      
      // 特殊处理经纬度
      updated.lat = data.lat !== undefined && data.lat !== null && data.lat !== '' ? Number(data.lat) : landmarks[index].lat;
      updated.lng = data.lng !== undefined && data.lng !== null && data.lng !== '' ? Number(data.lng) : landmarks[index].lng;
      updated.updatedAt = Date.now();

      // 自动地理编码：有地址但无经纬度时，尝试获取
      const addr = updated.address;
      if (addr && (updated.lat === null || updated.lat === undefined || updated.lng === null || updated.lng === undefined)) {
        try {
          const geo = await geocodeAddress(env, addr);
          if (geo) {
            updated.lat = geo.lat;
            updated.lng = geo.lng;
          }
        } catch (e) {
          console.warn('自动地理编码失败:', e);
        }
      }

      // 如果介绍文字发生变化，清除对应缓存
      if (updated.description !== landmarks[index].description) {
          await clearLandmarkCache(env, landmarks[index]);
      }
      
      landmarks[index] = updated;
      await saveAllLandmarks(env, landmarks);

      return jsonResponse(updated);
    }

    // 批量导入（无 name 参数）
    const data = await request.json();

    if (!Array.isArray(data)) {
      return jsonResponse({ error: 'Data must be an array of landmarks' }, 400);
    }

    const validLandmarks = data.map(item => {
      if (!item.name || !item.name.trim()) {
        return null;
      }
      return {
        name: item.name.trim(),
        address: item.address || '',
        x: Number(item.x) || 50,
        y: Number(item.y) || 50,
        lat: item.lat !== undefined && item.lat !== null && item.lat !== '' ? Number(item.lat) : null,
        lng: item.lng !== undefined && item.lng !== null && item.lng !== '' ? Number(item.lng) : null,
        icon: item.icon || 'fa-location-dot',
        color: item.color || '#4285f4',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        enabled: item.enabled !== false,
        createdAt: item.createdAt || Date.now(),
        updatedAt: Date.now()
      };
    }).filter(item => item !== null);

    // 检查重复名称
    const nameSet = new Set();
    for (const lm of validLandmarks) {
      if (nameSet.has(lm.name)) {
        return jsonResponse({ error: `导入数据中存在重复名称: "${lm.name}"` }, 409);
      }
      nameSet.add(lm.name);
    }

    // 自动地理编码：为缺少经纬度的地标批量获取
    for (const lm of validLandmarks) {
      if (lm.address && (lm.lat === null || lm.lng === null)) {
        try {
          const geo = await geocodeAddress(env, lm.address);
          if (geo) {
            lm.lat = geo.lat;
            lm.lng = geo.lng;
          }
        } catch (e) {
          console.warn(`自动地理编码失败 [${lm.name}]:`, e);
        }
      }
    }

    await saveAllLandmarks(env, validLandmarks);

    return jsonResponse({ success: true, count: validLandmarks.length });
  } catch (e) {
    console.error('PUT /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestDelete(context) {
  const env = context.env;
  const url = new URL(context.request.url);
  const name = url.searchParams.get('name');

  if (!name) {
    return jsonResponse({ error: 'Name parameter is required' }, 400);
  }

  try {
    const landmarks = await getAllLandmarks(env);
    const decodedName = decodeURIComponent(name);
    const index = landmarks.findIndex(l => l.name === decodedName);

    if (index === -1) {
      return jsonResponse({ error: 'Landmark not found' }, 404);
    }

    // 删除地标的同时清除其缓存
    await clearLandmarkCache(env, landmarks[index]);
    
    landmarks.splice(index, 1);
    await saveAllLandmarks(env, landmarks);

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('DELETE /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
