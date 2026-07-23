import { getAllLandmarks, saveAllLandmarks, corsHeaders, jsonResponse, geocodeAddress } from '../_shared';

export async function onRequestGet(context) {
  const env = context.env;
  const params = context.params;
  const id = params.id;

  try {
    const landmarks = await getAllLandmarks(env);
    const landmark = landmarks.find(function(l) { return l.id === id; });

    if (!landmark) {
      return jsonResponse({ error: 'Landmark not found' }, 404);
    }

    return jsonResponse(landmark);
  } catch (e) {
    console.error('GET /api/landmarks/:id error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestPut(context) {
  const request = context.request;
  const env = context.env;
  const params = context.params;
  const id = params.id;

  try {
    const data = await request.json();
    const landmarks = await getAllLandmarks(env);
    const index = landmarks.findIndex(function(l) { return l.id === id; });

    if (index === -1) {
      return jsonResponse({ error: 'Landmark not found' }, 404);
    }

    const updated = {
      ...landmarks[index],
      ...data,
      id: id,
      lat: data.lat !== undefined && data.lat !== null && data.lat !== '' ? Number(data.lat) : landmarks[index].lat,
      lng: data.lng !== undefined && data.lng !== null && data.lng !== '' ? Number(data.lng) : landmarks[index].lng,
      updatedAt: Date.now()
    };

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

    landmarks[index] = updated;
    await saveAllLandmarks(env, landmarks);

    return jsonResponse(updated);
  } catch (e) {
    console.error('PUT /api/landmarks/:id error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestDelete(context) {
  const env = context.env;
  const params = context.params;
  const id = params.id;

  try {
    const landmarks = await getAllLandmarks(env);
    const index = landmarks.findIndex(function(l) { return l.id === id; });

    if (index === -1) {
      return jsonResponse({ error: 'Landmark not found' }, 404);
    }

    landmarks.splice(index, 1);
    await saveAllLandmarks(env, landmarks);

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('DELETE /api/landmarks/:id error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}