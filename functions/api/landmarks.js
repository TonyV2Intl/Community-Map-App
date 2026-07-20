import { getAllLandmarks, saveAllLandmarks, generateId, corsHeaders, jsonResponse } from './_shared';

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
      icon: data.icon || 'fa-location-dot',
      color: data.color || '#4285f4',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      enabled: data.enabled !== false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    landmarks.push(newLandmark);
    await saveAllLandmarks(env, landmarks);

    return jsonResponse(newLandmark, 201);
  } catch (e) {
    console.error('POST /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}