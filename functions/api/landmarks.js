const DEFAULT_LANDMARKS = [
  {
    id: 'zhou-gongguan',
    name: '周公馆',
    address: '黄浦区思南路73号',
    x: 38,
    y: 28,
    icon: 'fa-location-dot',
    color: '#4285f4',
    description: '周公馆位于上海市黄浦区思南路73号，是中国共产党早期在上海的重要活动场所。1946年至1947年间，周恩来同志曾在此办公和居住。现为全国重点文物保护单位，是上海市重要的红色旅游景点。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'guotai-cinema',
    name: '国泰电影院',
    address: '黄浦区淮海中路870号',
    x: 52,
    y: 22,
    icon: 'fa-film',
    color: '#4285f4',
    description: '国泰电影院始建于1930年，是上海著名的历史建筑之一，具有装饰艺术风格。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'ruijin-hospital',
    name: '瑞金医院',
    address: '黄浦区瑞金二路197号',
    x: 32,
    y: 42,
    icon: 'fa-hospital',
    color: '#34a853',
    description: '上海交通大学医学院附属瑞金医院，是一所集医疗、教学、科研为一体的三级甲等综合性医院。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'garden-hotel',
    name: '花园饭店',
    address: '黄浦区茂名南路58号',
    x: 55,
    y: 35,
    icon: 'fa-hotel',
    color: '#4285f4',
    description: '上海花园饭店是一座五星级豪华酒店，位于原法国俱乐部旧址。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'culture-plaza',
    name: '上海文化广场',
    address: '黄浦区永嘉路36号',
    x: 48,
    y: 55,
    icon: 'fa-music',
    color: '#8e44ad',
    description: '上海文化广场是集演出、展览、会议等功能于一体的大型文化艺术中心。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'sinan-mansion',
    name: '思南公馆',
    address: '黄浦区思南路55号',
    x: 42,
    y: 45,
    icon: 'fa-landmark',
    color: '#ea4335',
    description: '思南公馆是上海市中心唯一一个以成片花园洋房的保留保护为宗旨的项目。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'sun-yat-sen',
    name: '孙中山纪念馆',
    address: '黄浦区香山路7号',
    x: 35,
    y: 60,
    icon: 'fa-monument',
    color: '#ea4335',
    description: '孙中山故居是孙中山和宋庆龄在上海的寓所，现为全国重点文物保护单位。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'yuyangli',
    name: '渔阳里',
    address: '黄浦区淮海中路567弄',
    x: 60,
    y: 40,
    icon: 'fa-building',
    color: '#ea4335',
    description: '渔阳里是中国社会主义青年团中央机关旧址，具有重要的历史意义。',
    imageUrl: '',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const LIST_KEY = 'landmarks:list';

async function getAllLandmarks(env) {
  try {
    const listData = await env.LANDMARKS.get(LIST_KEY, 'json');
    if (listData && Array.isArray(listData) && listData.length > 0) {
      return listData;
    }
  } catch (e) {
    console.error('Failed to get landmarks from KV:', e);
  }

  await env.LANDMARKS.put(LIST_KEY, JSON.stringify(DEFAULT_LANDMARKS));
  return DEFAULT_LANDMARKS;
}

async function saveAllLandmarks(env, landmarks) {
  await env.LANDMARKS.put(LIST_KEY, JSON.stringify(landmarks));
}

function generateId() {
  return 'lm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const landmarks = await getAllLandmarks(env);
    return jsonResponse(landmarks);
  } catch (e) {
    console.error('GET /api/landmarks error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

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
