const LIST_KEY = 'landmarks:list';

async function getAllLandmarks(env) {
  try {
    const listData = await env.LANDMARKS.get(LIST_KEY, 'json');
    if (listData && Array.isArray(listData)) {
      return listData;
    }
  } catch (e) {
    console.error('Failed to get landmarks from KV:', e);
  }
  return [];
}

async function saveAllLandmarks(env, landmarks) {
  await env.LANDMARKS.put(LIST_KEY, JSON.stringify(landmarks, null, 2));
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

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
      updatedAt: Date.now()
    };

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