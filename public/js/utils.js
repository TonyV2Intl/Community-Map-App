// 多地图前端工具函数

// 从 /m/{slug} 路径解析当前地图 slug（地图页用）
function getCurrentMapSlug() {
  const m = window.location.pathname.match(/^\/m\/([^\/]+)/);
  return m ? decodeURIComponent(m[1]) : 'default';
}

// 控制台/编辑页：从 URL ?map= 读取，回退到 sessionStorage，再回退 default
function getConsoleMapSlug() {
  const p = new URLSearchParams(window.location.search).get('map');
  if (p) {
    sessionStorage.setItem('currentMapSlug', p);
    return p;
  }
  return sessionStorage.getItem('currentMapSlug') || 'default';
}

// 切换控制台当前编辑的地图
function switchEditMap(slug) {
  sessionStorage.setItem('currentMapSlug', slug);
  const url = new URL(window.location.href);
  url.searchParams.set('map', slug);
  history.pushState({}, '', url.toString());
}

// 给 API URL 追加 map 参数
function mapApiUrl(path) {
  const slug = window.location.pathname.startsWith('/m/')
    ? getCurrentMapSlug()
    : getConsoleMapSlug();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}map=${encodeURIComponent(slug)}`;
}

// 验证颜色格式，无效则返回默认
function validateColor(color) {
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  return hexPattern.test(color) ? color : '#4285f4';
}

// 图标 class 映射
function getIconClass(icon) {
  const iconMap = {
    'fa-location-dot': 'fa-location-dot',
    'fa-hospital': 'fa-hospital',
    'fa-film': 'fa-film',
    'fa-hotel': 'fa-hotel',
    'fa-landmark': 'fa-landmark',
    'fa-tree': 'fa-tree',
    'fa-utensils': 'fa-utensils',
    'fa-music': 'fa-music',
    'fa-book': 'fa-book',
    'fa-shop': 'fa-shop',
    'fa-school': 'fa-school',
    'fa-building': 'fa-building',
    'fa-mosque': 'fa-mosque',
    'fa-church': 'fa-church',
    'fa-museum': 'fa-museum',
    'fa-monument': 'fa-monument'
  };
  return iconMap[icon] || 'fa-location-dot';
}

// Toast 提示
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
