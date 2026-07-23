import { getAllLandmarks, saveAllLandmarks, generateId, corsHeaders, jsonResponse, geocodeAddress } from './_shared';

export async function onRequestGet(context) {
  const env = context.env;

  try {
    const landmarks = await getAllLandmarks(env);
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

    const newLandmark = {
      id: data.id || generateId(),
      name: data.name.trim(),
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

  try {
    const data = await request.json();

    if (!Array.isArray(data)) {
      return jsonResponse({ error: 'Data must be an array of landmarks' }, 400);
    }

    const validLandmarks = data.map(item => {
      if (!item.name || !item.name.trim()) {
        return null;
      }
      return {
        id: item.id || generateId(),
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

export async function onRequestDelete() {
  return jsonResponse({ error: 'Use DELETE /api/landmarks/:id to delete a single landmark', success: false }, 400);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}