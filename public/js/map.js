let landmarks = [];
let currentLandmark = null;
let mapConfig = {
    region: '上海',
    baidu_ak: ''
};

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function validateColor(color) {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    return hexPattern.test(color) ? color : '#4285f4';
}

const viewport = document.getElementById('map-viewport');
const wrapper = document.getElementById('map-transform-wrapper');
const markersContainer = document.getElementById('markers-container');

function applyTransform() {
    wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    markersContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    markersContainer.style.transformOrigin = '0 0';
    markersContainer.style.setProperty('--map-scale', scale);
}

const MAX_SCALE = 5;
let BOUNDARY_BUFFER = 0.1;
let scale = 1;
let translateX = 0;
let translateY = 0;
let minScale = 1;

function getMinScale() {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const img = document.querySelector('#map-transform-wrapper img');
    const iw = img ? img.naturalWidth || img.offsetWidth : 0;
    const ih = img ? img.naturalHeight || img.offsetHeight : 0;
    if (!iw || !ih) return 1;
    return Math.min(vw / iw, vh / ih);
}

let isDragging = false;
let startX = 0;
let startY = 0;
let touchStartX = 0;
let touchStartY = 0;
let initialPinchDist = 0;
let initialScale = 1;
let initialTranslateX = 0;
let initialTranslateY = 0;
let lastMidX = 0;
let lastMidY = 0;
let activeTouches = 0;
let mouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;

function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(t1, t2) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
}

function clampBounds() {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const img = document.querySelector('#map-transform-wrapper img');
    const iw = img ? img.naturalWidth || img.offsetWidth : 0;
    const ih = img ? img.naturalHeight || img.offsetHeight : 0;
    
    if (!iw || !ih) return;
    
    const ww = iw * scale;
    const wh = ih * scale;

    // 当图片小于视口时，强制居中
    if (ww <= vw) {
        translateX = (vw - ww) / 2;
    } else {
        const bufferW = ww * BOUNDARY_BUFFER;
        const minTranslateX = vw - ww - bufferW;
        const maxTranslateX = bufferW;
        translateX = Math.max(minTranslateX, Math.min(maxTranslateX, translateX));
    }

    if (wh <= vh) {
        translateY = (vh - wh) / 2;
    } else {
        const bufferH = wh * BOUNDARY_BUFFER;
        const minTranslateY = vh - wh - bufferH;
        const maxTranslateY = bufferH;
        translateY = Math.max(minTranslateY, Math.min(maxTranslateY, translateY));
    }
}



function centerMap() {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const img = document.querySelector('#map-transform-wrapper img');
    const iw = img ? img.naturalWidth || img.offsetWidth : wrapper.offsetWidth;
    const ih = img ? img.naturalHeight || img.offsetHeight : wrapper.offsetHeight;
    
    if (!iw || !ih) return;
    
    minScale = Math.min(vw / iw, vh / ih);
    scale = minScale;
    translateX = (vw - iw * scale) / 2;
    translateY = (vh - ih * scale) / 2;
    applyTransform();
}

function zoomIn() {
    const newScale = Math.min(MAX_SCALE, scale * 1.25);
    zoomAtCenter(newScale);
}

function zoomOut() {
    const newScale = Math.max(minScale, scale / 1.25);
    // 如果缩放到最小级别，直接居中显示
    if (newScale <= minScale) {
        centerMap();
    } else {
        zoomAtCenter(newScale);
    }
}

function zoomAtCenter(newScale) {
    const img = document.querySelector('#map-transform-wrapper img');
    const iw = img ? img.naturalWidth || img.offsetWidth : 0;
    const ih = img ? img.naturalHeight || img.offsetHeight : 0;
    if (!iw || !ih) return;

    const rect = viewport.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;

    const imgCenterX = (iw * scale) / 2 + translateX;
    const imgCenterY = (ih * scale) / 2 + translateY;

    translateX = imgCenterX - (iw * newScale) / 2;
    translateY = imgCenterY - (ih * newScale) / 2;
    scale = newScale;
    clampBounds();
    applyTransform();
}

viewport.addEventListener('touchstart', function(e) {
    activeTouches = e.touches.length;

    if (activeTouches === 1) {
        isDragging = false;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (activeTouches === 2) {
        isDragging = false;
        initialPinchDist = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        lastMidX = getMidpoint(e.touches[0], e.touches[1]).x;
        lastMidY = getMidpoint(e.touches[0], e.touches[1]).y;
    }
}, { passive: true });

viewport.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1 && activeTouches === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            isDragging = true;
        }
        if (isDragging) {
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            clampBounds();
            applyTransform();
        }
    } else if (e.touches.length === 2) {
            const dist = getDistance(e.touches[0], e.touches[1]);
            const mid = getMidpoint(e.touches[0], e.touches[1]);

            const rect = viewport.getBoundingClientRect();
            const mx = mid.x - rect.left;
            const my = mid.y - rect.top;

            const newScale = Math.min(MAX_SCALE, Math.max(minScale, initialScale * (dist / initialPinchDist)));
            // 如果缩放到最小级别，直接居中显示
            if (newScale <= minScale) {
                centerMap();
            } else {
                scale = newScale;
                const ratio = scale / initialScale;
                translateX = mx - ratio * (mx - initialTranslateX);
                translateY = my - ratio * (my - initialTranslateY);
                clampBounds();
                applyTransform();
            }
        }
}, { passive: true });

viewport.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
        activeTouches = e.touches.length;
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else {
            isDragging = false;
        }
    }
}, { passive: true });

viewport.addEventListener('mousedown', function(e) {
    mouseDown = true;
    mouseStartX = e.clientX - translateX;
    mouseStartY = e.clientY - translateY;
    viewport.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', function(e) {
    if (!mouseDown) return;
    translateX = e.clientX - mouseStartX;
    translateY = e.clientY - mouseStartY;
    clampBounds();
    applyTransform();
});

window.addEventListener('mouseup', function() {
    if (mouseDown) {
        mouseDown = false;
        viewport.style.cursor = 'grab';
    }
});

viewport.addEventListener('wheel', function(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(minScale, scale * factor));

    // 如果缩放到最小级别，直接居中显示
    if (newScale <= minScale) {
        centerMap();
    } else {
        const rect = viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const ratio = newScale / scale;
        translateX = mx - ratio * (mx - translateX);
        translateY = my - ratio * (my - translateY);
        scale = newScale;

        clampBounds();
        applyTransform();
    }
}, { passive: false });

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

function renderMarkers() {
    markersContainer.replaceChildren();
    const enabledLandmarks = landmarks.filter(l => l.enabled !== false);
    enabledLandmarks.forEach(landmark => {
        const marker = document.createElement('div');
        marker.className = 'landmark-marker';
        marker.style.left = landmark.x + '%';
        marker.style.top = landmark.y + '%';
        marker.title = landmark.name;
        marker.setAttribute('data-id', escapeHtml(landmark.id));

        const iconClass = getIconClass(landmark.icon);
        const color = validateColor(landmark.color);

        // 创建marker内容
        const markerIcon = document.createElement('div');
        markerIcon.className = 'marker-icon';
        const markerIconInner = document.createElement('div');
        markerIconInner.className = 'marker-icon-inner';
        markerIconInner.style.background = color;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${iconClass}`;
        icon.style.fontSize = '16px';
        markerIconInner.appendChild(icon);
        markerIcon.appendChild(markerIconInner);

        const markerLabel = document.createElement('div');
        markerLabel.className = 'marker-label';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = landmark.name || '';
        markerLabel.appendChild(labelSpan);

        marker.appendChild(markerIcon);
        marker.appendChild(markerLabel);

        marker.addEventListener('click', function(e) {
            e.stopPropagation();
            openDetail(landmark.id);
            focusOnLandmark(landmark);
        });

        markersContainer.appendChild(marker);
    });
}

function openDetail(id) {
    const landmark = landmarks.find(l => l.id === id);
    if (!landmark) return;

    // 保存当前地标用于导航
    currentLandmark = landmark;

    document.getElementById('detail-title').textContent = landmark.name;
    document.getElementById('detail-description').textContent = landmark.description || '暂无介绍';
    document.getElementById('detail-address').textContent = landmark.address || '';

    const imageEl = document.getElementById('detail-image');
    imageEl.replaceChildren();
    if (landmark.imageUrl) {
        let validatedUrl;
        try {
            validatedUrl = new URL(landmark.imageUrl);
            if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            const placeholder = document.createElement('i');
            placeholder.className = 'fa-regular fa-image detail-image-placeholder';
            placeholder.style.fontSize = '40px';
            imageEl.appendChild(placeholder);
            return;
        }
        const img = document.createElement('img');
        img.src = validatedUrl.href;
        img.alt = landmark.name || '';
        imageEl.appendChild(img);
    } else {
        const placeholder = document.createElement('i');
        placeholder.className = 'fa-regular fa-image detail-image-placeholder';
        placeholder.style.fontSize = '40px';
        imageEl.appendChild(placeholder);
    }

    document.getElementById('detail-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function handleNavigate() {
    if (!currentLandmark) return;
    
    const destination = currentLandmark.address 
        ? encodeURIComponent(currentLandmark.address)
        : encodeURIComponent(currentLandmark.name);
    
    // 如果配置了百度AK，使用App调起协议
    if (mapConfig.baidu_ak) {
        navigateWithApp(destination);
    } else {
        // 未配置AK，使用网页版链接
        navigateWithWeb(destination);
    }
}

async function navigateWithApp(destination) {
    // 先地理编码获取目的地坐标
    try {
        const geocodeUrl = `https://api.map.baidu.com/geocoding/v3/?address=${destination}&city=${encodeURIComponent(mapConfig.region)}&output=json&ak=${mapConfig.baidu_ak}`;
        const res = await fetch(geocodeUrl);
        const data = await res.json();
        
        if (data.status !== 0 || !data.result || !data.result.location) {
            console.warn('地理编码失败:', data.message);
            navigateWithWeb(destination);
            return;
        }
        
        const destLat = data.result.location.lat;
        const destLng = data.result.location.lng;
        
        // 获取用户当前位置
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async function(position) {
                    const originLat = position.coords.latitude;
                    const originLng = position.coords.longitude;
                    
                    // 将WGS84坐标转换为BD09LL坐标
                    try {
                        const convUrl = `https://api.map.baidu.com/geoconv/v1/?coords=${originLng},${originLat}&from=1&to=5&output=json&ak=${mapConfig.baidu_ak}`;
                        const convRes = await fetch(convUrl);
                        const convData = await convRes.json();
                        
                        let originBdLat = originLat;
                        let originBdLng = originLng;
                        
                        if (convData.status === 0 && convData.result && convData.result.length > 0) {
                            originBdLat = convData.result[0].y;
                            originBdLng = convData.result[0].x;
                        }
                        
                        // 构建App调起链接
                        openBaiduMapApp(originBdLat, originBdLng, destLat, destLng);
                    } catch (e) {
                        console.warn('坐标转换失败:', e);
                        openBaiduMapApp(originLat, originLng, destLat, destLng);
                    }
                },
                function(error) {
                    console.warn('获取位置失败:', error);
                    // 不带起点，直接导航到目的地
                    openBaiduMapApp(null, null, destLat, destLng);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            openBaiduMapApp(null, null, destLat, destLng);
        }
    } catch (e) {
        console.error('导航失败:', e);
        navigateWithWeb(destination);
    }
}

function openBaiduMapApp(originLat, originLng, destLat, destLng) {
    // 构建调起链接
    // iOS: baidumap://map/walknavi?destination=纬度,经度&coord_type=bd09ll&src=ios.companyName.appName
    // Android: bdapp://map/walknavi?destination=纬度,经度&coord_type=bd09ll&src=andr.companyName.appName
    
    let iosUrl = `baidumap://map/walknavi?destination=${destLat},${destLng}&coord_type=bd09ll&src=ios.community.map.app`;
    let androidUrl = `bdapp://map/walknavi?destination=${destLat},${destLng}&coord_type=bd09ll&src=andr.community.map.app`;
    
    if (originLat !== null && originLng !== null) {
        iosUrl += `&origin=${originLat},${originLng}&origin_coord_type=bd09ll`;
        androidUrl += `&origin=${originLat},${originLng}&origin_coord_type=bd09ll`;
    }
    
    // 尝试调起App
    const link = document.createElement('a');
    link.href = iosUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 如果iOS App未安装，尝试Android链接
    setTimeout(() => {
        const link2 = document.createElement('a');
        link2.href = androidUrl;
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
    }, 300);
}

function navigateWithWeb(destination) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const origin = `latlng:${position.coords.latitude},${position.coords.longitude}|name:我的位置`;
                const navUrl = `http://api.map.baidu.com/direction?origin=${origin}&destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
                window.open(navUrl, '_blank');
            },
            function(error) {
                console.warn('获取位置失败:', error);
                showToast('无法获取当前位置，请手动设置起点');
                const navUrl = `http://api.map.baidu.com/direction?destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
                window.open(navUrl, '_blank');
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        showToast('您的浏览器不支持地理定位');
        const navUrl = `http://api.map.baidu.com/direction?destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
        window.open(navUrl, '_blank');
    }
}

function copyNavUrl() {
    if (!currentLandmark) return;
    
    const destination = currentLandmark.address 
        ? encodeURIComponent(currentLandmark.address)
        : encodeURIComponent(currentLandmark.name);
    
    // 获取用户当前位置作为起点
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const origin = `latlng:${position.coords.latitude},${position.coords.longitude}|name:我的位置`;
                const navUrl = `http://api.map.baidu.com/direction?origin=${origin}&destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
                doCopy(navUrl);
            },
            function(error) {
                console.warn('获取位置失败:', error);
                // 位置获取失败时，不带起点参数
                const navUrl = `http://api.map.baidu.com/direction?destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
                doCopy(navUrl);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // 浏览器不支持地理定位时，不带起点参数
        const navUrl = `http://api.map.baidu.com/direction?destination=${destination}&mode=walking&region=${mapConfig.region}&output=html`;
        doCopy(navUrl);
    }
}

function doCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('导航链接已复制');
        }).catch(function(err) {
            console.error('复制失败:', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('导航链接已复制');
        } else {
            showToast('复制失败，请手动复制');
        }
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制');
    }
    
    document.body.removeChild(textarea);
}

function closeDetail() {
    document.getElementById('detail-modal').classList.remove('show');
    document.body.style.overflow = '';
}

function goToLandmark(id) {
    const landmark = landmarks.find(l => l.id === id);
    if (landmark) {
        openDetail(id);
        focusOnLandmark(landmark);
    }
}

function focusOnLandmark(landmark) {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const img = document.querySelector('#map-transform-wrapper img');
    const ww = img ? img.naturalWidth || img.offsetWidth : wrapper.offsetWidth;
    const wh = img ? img.naturalHeight || img.offsetHeight : wrapper.offsetHeight;

    const markerX = (landmark.x / 100) * ww * scale;
    const markerY = (landmark.y / 100) * wh * scale;

    translateX = vw / 2 - markerX;
    translateY = vh / 2 - markerY;

    clampBounds();
    applyTransform();
}

function toggleMenu() {
    const overlay = document.getElementById('menu-overlay');
    overlay.classList.toggle('show');
    if (overlay.classList.contains('show')) {
        document.getElementById('menu-search-input').value = '';
        renderMenuItems();
    }
}

function renderMenuItems(filterText = '') {
    const container = document.getElementById('menu-content');
    let enabledLandmarks = landmarks.filter(l => l.enabled !== false);
    
    if (filterText) {
        const query = filterText.toLowerCase().trim();
        enabledLandmarks = enabledLandmarks.filter(l => 
            (l.name && l.name.toLowerCase().includes(query)) ||
            (l.address && l.address.toLowerCase().includes(query)) ||
            (l.category && l.category.toLowerCase().includes(query))
        );
    }
    
    if (enabledLandmarks.length === 0) {
        const message = filterText ? '未找到匹配的地标' : '暂无地标';
        container.replaceChildren();
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-map-marker';
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '12px';
        icon.style.opacity = '0.5';
        emptyDiv.appendChild(icon);
        const p = document.createElement('p');
        p.textContent = message;
        emptyDiv.appendChild(p);
        container.appendChild(emptyDiv);
        return;
    }
    
    container.replaceChildren();
    enabledLandmarks.forEach(landmark => {
        const iconClass = getIconClass(landmark.icon);
        const color = validateColor(landmark.color);
        
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.setAttribute('data-id', landmark.id);
        item.onclick = function() {
            handleMenuClick(landmark.id);
        };
        
        const itemIcon = document.createElement('div');
        itemIcon.className = 'menu-item-icon';
        itemIcon.style.background = color;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${iconClass}`;
        icon.style.fontSize = '14px';
        itemIcon.appendChild(icon);
        item.appendChild(itemIcon);
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'menu-item-info';
        
        const itemName = document.createElement('div');
        itemName.className = 'menu-item-name';
        itemName.textContent = landmark.name || '';
        itemInfo.appendChild(itemName);
        
        const itemAddress = document.createElement('div');
        itemAddress.className = 'menu-item-address';
        itemAddress.textContent = landmark.address || '';
        itemInfo.appendChild(itemAddress);
        
        item.appendChild(itemInfo);
        
        const arrow = document.createElement('i');
        arrow.className = 'fa-solid fa-chevron-right menu-item-arrow';
        item.appendChild(arrow);
        
        container.appendChild(item);
    });
}

function handleMenuClick(id) {
    toggleMenu();
    goToLandmark(id);
}

function handleMenuSearch(value) {
    renderMenuItems(value);
}

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

async function loadLandmarks() {
    try {
        const res = await fetch('/api/landmarks');
        if (res.ok) {
            const data = await res.json();
            landmarks = data;
        } else {
            console.warn('API请求失败');
            landmarks = [];
            showToast('数据加载失败');
        }
    } catch (e) {
        console.warn('加载地标失败', e);
        landmarks = [];
        showToast('数据加载失败，请检查网络');
    }
    renderMarkers();
}

if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}

function init() {
    const img = document.querySelector('#map-transform-wrapper img');
    function onImageReady() {
        const iw = img.naturalWidth || img.offsetWidth;
        const ih = img.naturalHeight || img.offsetHeight;
        if (iw && ih) {
            wrapper.style.width = iw + 'px';
            wrapper.style.height = ih + 'px';
            markersContainer.style.width = iw + 'px';
            markersContainer.style.height = ih + 'px';
        }
        centerMap();
    }
    if (img.complete) {
        onImageReady();
    } else {
        img.addEventListener('load', onImageReady);
    }
    loadConfig();
    loadLandmarks();
}

async function loadConfig() {
    // 优先从 API 获取配置（可能已在控制台修改）
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();
            if (config.region) mapConfig.region = config.region;
            if (config.baidu_ak) mapConfig.baidu_ak = config.baidu_ak;
            if (config.boundaryBuffer !== undefined) BOUNDARY_BUFFER = parseFloat(config.boundaryBuffer);
            return;
        }
    } catch (e) {
        console.warn('从API加载配置失败，尝试从JSON文件加载', e);
    }
    
    // 从 JSON 文件加载默认配置
    try {
        const res = await fetch('/assets/default-config.json');
        if (res.ok) {
            const data = await res.json();
            const config = data.config || {};
            if (config.region) mapConfig.region = config.region;

            // baidu_ak 仅从环境变量获取，不在文件中存储
        }
    } catch (e) {
        console.warn('加载配置失败，使用默认配置', e);
    }
}

window.addEventListener('resize', function() {
    const newMinScale = getMinScale();
    if (newMinScale !== minScale) {
        minScale = newMinScale;
        if (scale < minScale) {
            scale = minScale;
            centerMap();
            return;
        }
    }
    clampBounds();
    applyTransform();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('detail-modal').classList.contains('show')) {
            closeDetail();
        }
    }
});
