export const LIST_KEY = 'landmarks:list';
export const CONFIG_KEY = 'config';

let defaultConfigCache = null;

async function getDefaultConfig(env) {
  if (defaultConfigCache) {
    return defaultConfigCache;
  }

  if (!env.ASSETS) {
    console.warn('ASSETS not available, using fallback config');
    return {
      region: '上海'
    };
  }

  try {
    const response = await env.ASSETS.fetch(new Request('http://localhost/assets/default-config.json'));
    if (!response.ok) {
      throw new Error(`Failed to fetch default config: ${response.status}`);
    }
    const data = await response.json();
    defaultConfigCache = data.config || {
      region: '上海'
    };
    return defaultConfigCache;
  } catch (e) {
    console.error('Failed to read default config from file:', e);
    return {
      region: '上海'
    };
  }
}

export async function getDefaultLandmarks(env) {
  if (!env.ASSETS) {
    console.warn('ASSETS not available, using fallback defaults');
    return [
      {
        id: 'zhou-gongguan',
        name: '周公馆',
        address: '黄浦区思南路73号',
        x: 69.5,
        y: 55.2,
        icon: 'fa-location-dot',
        color: '#4285f4',
        description: '周公馆位于上海市黄浦区思南路73号，是中国共产党早期在上海的重要活动场所。',
        imageUrl: '',
        enabled: true,
        createdAt: 1718900000000,
        updatedAt: Date.now()
      }
    ];
  }

  try {
    const response = await env.ASSETS.fetch(new Request('http://localhost/assets/default-config.json'));
    if (!response.ok) {
      throw new Error(`Failed to fetch default config: ${response.status}`);
    }
    const data = await response.json();
    return data.landmarks || [
      {
        id: 'zhou-gongguan',
        name: '周公馆',
        address: '黄浦区思南路73号',
        x: 69.5,
        y: 55.2,
        icon: 'fa-location-dot',
        color: '#4285f4',
        description: '周公馆位于上海市黄浦区思南路73号，是中国共产党早期在上海的重要活动场所。',
        imageUrl: '',
        enabled: true,
        createdAt: 1718900000000,
        updatedAt: Date.now()
      }
    ];
  } catch (e) {
    console.error('Failed to read default landmarks from file:', e);
    return [
      {
        id: 'zhou-gongguan',
        name: '周公馆',
        address: '黄浦区思南路73号',
        x: 69.5,
        y: 55.2,
        icon: 'fa-location-dot',
        color: '#4285f4',
        description: '周公馆位于上海市黄浦区思南路73号，是中国共产党早期在上海的重要活动场所。',
        imageUrl: '',
        enabled: true,
        createdAt: 1718900000000,
        updatedAt: Date.now()
      }
    ];
  }
}

export { getDefaultConfig };

export async function getAllLandmarks(env) {
  if (!env.LANDMARKS) {
    console.warn('LANDMARKS KV namespace not configured, using default data');
    return await getDefaultLandmarks(env);
  }

  let listData;
  let readFailed = false;
  
  try {
    listData = await env.LANDMARKS.get(LIST_KEY, 'json');
  } catch (e) {
    console.error('Failed to get landmarks from KV:', e);
    readFailed = true;
  }

  if (readFailed) {
    return await getDefaultLandmarks(env);
  }

  if (listData && Array.isArray(listData) && listData.length > 0) {
    return listData;
  }

  const defaults = await getDefaultLandmarks(env);
  
  try {
    await env.LANDMARKS.put(LIST_KEY, JSON.stringify(defaults, null, 2));
  } catch (e) {
    console.error('Failed to put landmarks to KV:', e);
  }
  
  return defaults;
}

export async function saveAllLandmarks(env, landmarks) {
  if (!env.LANDMARKS) {
    console.warn('LANDMARKS KV namespace not configured, cannot save data');
    return;
  }
  await env.LANDMARKS.put(LIST_KEY, JSON.stringify(landmarks, null, 2));
}

export function generateId() {
  return 'lm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export async function verifyToken(env, token) {
  if (!token) return false;

  const secret = env.ADMIN_PASSWORD;
  if (!secret) {
    console.error('ADMIN_PASSWORD not configured');
    return false;
  }

  const parts = token.split(':');
  if (parts.length !== 2) return false;

  const timestamp = parseInt(parts[0]);
  const hash = parts[1];

  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false;

  const raw = `${secret}:${timestamp}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === expectedHash;
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function jsonResponse(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

export async function geocodeAddress(env, address) {
  const key = env.TIANDITU_KEY;
  if (!key) {
    console.warn('TIANDITU_KEY 未配置，跳过地理编码');
    return null;
  }

  if (!address || !address.trim()) {
    return null;
  }

  try {
    const ds = JSON.stringify({ keyWord: address.trim() });
    const url = `http://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(ds)}&tk=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('天地图地理编码请求失败:', response.status);
      return null;
    }
    const data = await response.json();
    if (data.status === '0' && data.location) {
      return {
        lng: data.location.lon,
        lat: data.location.lat
      };
    }
    console.warn('天地图地理编码未找到结果:', data.msg || '未知错误');
    return null;
  } catch (e) {
    console.error('天地图地理编码异常:', e);
    return null;
  }
}