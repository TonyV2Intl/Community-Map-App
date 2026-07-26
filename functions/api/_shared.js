export const LIST_KEY = 'landmarks:list';
export const CONFIG_KEY = 'config';
export const DEFAULT_REGION = '上海';
export const DEFAULT_BOUNDARY_BUFFER = 0.1;
export const DEFAULT_TITLE = '瑞金二路街道便民地图';

// 多地图相关常量
export const MAPS_INDEX_KEY = 'maps:index';
export const DEFAULT_SLUG = 'default';
export const SLUG_PATTERN = /^[a-z0-9-]+$/;
export const DEFAULT_IMAGE_PATH = '/assets/default-map.webp';

let defaultConfigCache = null;

// Cloudflare Pages Functions 中 env.ASSETS.fetch 的 URL 主机名会被忽略，
// 实际始终路由到当前项目的静态资源，此处仅作为占位符
const ASSETS_BASE = 'http://localhost';

async function getDefaultConfig(env) {
  if (defaultConfigCache) {
    return defaultConfigCache;
  }

  if (!env.ASSETS) {
    console.warn('ASSETS not available, using fallback config');
    return {
      region: DEFAULT_REGION
    };
  }

  try {
    const response = await env.ASSETS.fetch(new Request(`${ASSETS_BASE}/assets/default-config.json`));
    if (!response.ok) {
      throw new Error(`Failed to fetch default config: ${response.status}`);
    }
    const data = await response.json();
    defaultConfigCache = data.config || {
      region: DEFAULT_REGION
    };
    return defaultConfigCache;
  } catch (e) {
    console.error('Failed to read default config from file:', e);
    return {
      region: DEFAULT_REGION
    };
  }
}

export async function getDefaultLandmarks(env) {
  if (!env.ASSETS) {
    console.warn('ASSETS not available, returning empty array');
    return [];
  }

  try {
    const response = await env.ASSETS.fetch(new Request(`${ASSETS_BASE}/assets/default-config.json`));
    if (!response.ok) {
      throw new Error(`Failed to fetch default config: ${response.status}`);
    }
    const data = await response.json();
    return data.landmarks || [];
  } catch (e) {
    console.error('Failed to read default landmarks from file:', e);
    return [];
  }
}

export { getDefaultConfig };

export async function getAllLandmarks(env) {
  if (!env.MAPAPP) {
    console.warn('MAPAPP KV namespace not configured, using default data');
    return await getDefaultLandmarks(env);
  }

  let listData;
  let readFailed = false;
  
  try {
    listData = await env.MAPAPP.get(LIST_KEY, 'json');
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

  // KV 为空时返回空数组，不再自动加载默认配置
  return [];
}

export async function saveAllLandmarks(env, landmarks) {
  if (!env.MAPAPP) {
    console.warn('MAPAPP KV namespace not configured, cannot save data');
    return;
  }
  await env.MAPAPP.put(LIST_KEY, JSON.stringify(landmarks, null, 2));
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
    const url = `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(ds)}&tk=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error('天地图地理编码请求失败:', response.status, body);
      return null;
    }
    const data = await response.json();
    if (data.status === '0' && data.location) {
      return {
        lng: data.location.lon,
        lat: data.location.lat
      };
    }
    console.warn('天地图地理编码未找到结果:', JSON.stringify(data));
    return null;
  } catch (e) {
    console.error('天地图地理编码异常:', e.message);
    return null;
  }
}

// ============ 多地图相关工具函数 ============

// 校验 slug 格式：[a-z0-9-]+，长度 1-64
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length < 1 || slug.length > 64) return false;
  return SLUG_PATTERN.test(slug);
}

// 多地图键名生成器
export function mapLandmarksKey(slug) {
  return `map:${slug}:landmarks`;
}

export function mapConfigKey(slug) {
  return `map:${slug}:config`;
}

export function mapImageKey(slug) {
  return `map:${slug}:mapImage`;
}

export function mapImageMetaKey(slug) {
  return `map:${slug}:mapImageMeta`;
}

// 地图索引管理
export async function getMapsIndex(env) {
  if (!env.MAPAPP) return [];
  try {
    const data = await env.MAPAPP.get(MAPS_INDEX_KEY, 'json');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to get maps index from KV:', e);
    return [];
  }
}

export async function saveMapsIndex(env, index) {
  if (!env.MAPAPP) {
    console.warn('MAPAPP KV namespace not configured, cannot save maps index');
    return;
  }
  await env.MAPAPP.put(MAPS_INDEX_KEY, JSON.stringify(index, null, 2));
}

export async function getMapMeta(env, slug) {
  const index = await getMapsIndex(env);
  return index.find(m => m.slug === slug) || null;
}

export async function slugExists(env, slug) {
  const index = await getMapsIndex(env);
  return index.some(m => m.slug === slug);
}

// 按 map 读写地标
// 对 default slug，KV 为空时 fallback 到 default-config.json（只读视图，不写入 KV）
export async function getMapLandmarks(env, slug) {
  if (!env.MAPAPP) {
    return slug === DEFAULT_SLUG ? await getDefaultLandmarks(env) : [];
  }

  let listData;
  try {
    listData = await env.MAPAPP.get(mapLandmarksKey(slug), 'json');
  } catch (e) {
    console.error(`Failed to get landmarks for map "${slug}" from KV:`, e);
    return slug === DEFAULT_SLUG ? await getDefaultLandmarks(env) : [];
  }

  if (listData && Array.isArray(listData) && listData.length > 0) {
    return listData;
  }

  // default slug 在 KV 为空时 fallback 到默认配置
  if (slug === DEFAULT_SLUG) {
    return await getDefaultLandmarks(env);
  }

  return [];
}

export async function saveMapLandmarks(env, slug, landmarks) {
  if (!env.MAPAPP) {
    console.warn('MAPAPP KV namespace not configured, cannot save data');
    return;
  }
  await env.MAPAPP.put(mapLandmarksKey(slug), JSON.stringify(landmarks, null, 2));
}

// 从 URL 解析 map 参数
// 缺省返回 default，非法返回错误对象
export function resolveMapSlug(url) {
  const slug = url.searchParams.get('map') || DEFAULT_SLUG;
  if (!validateSlug(slug)) {
    return { error: 'Invalid map slug', status: 400 };
  }
  return { slug };
}