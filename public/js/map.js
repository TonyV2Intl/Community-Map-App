let landmarks = [];
let currentLandmark = null;
let mapConfig = {
    region: '上海'
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
const ZOOM_FACTOR = 1.25;
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
    const newScale = Math.min(MAX_SCALE, scale * ZOOM_FACTOR);
    zoomAtCenter(newScale);
}

function zoomOut() {
    const newScale = Math.max(minScale, scale / ZOOM_FACTOR);
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

function renderMarkers() {
    markersContainer.replaceChildren();
    const enabledLandmarks = landmarks.filter(l => l.enabled !== false);
    enabledLandmarks.forEach(landmark => {
        const marker = document.createElement('div');
        marker.className = 'landmark-marker';
        marker.style.left = landmark.x + '%';
        marker.style.top = landmark.y + '%';
        marker.title = landmark.name;
        marker.setAttribute('data-name', escapeHtml(landmark.name));

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
            openDetail(landmark.name);
            focusOnLandmark(landmark);
        });

        markersContainer.appendChild(marker);
    });
}

function openDetail(name) {
    const landmark = landmarks.find(l => l.name === name);
    if (!landmark) return;

    // 保存当前地标用于导航
    currentLandmark = landmark;

    // 重置导航平台面板
    resetNavPanel();

    // 高德地图需要经纬度，否则禁用
    var hasCoords = landmark.lat != null && landmark.lng != null;
    document.getElementById('amap-nav-btn').disabled = !hasCoords;
    document.getElementById('amap-copy-btn').disabled = !hasCoords;

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

function toggleNavPanel() {
    var panel = document.getElementById('nav-platforms');
    panel.classList.toggle('show');
}

function closeNavPanel() {
    var panel = document.getElementById('nav-platforms');
    if (panel) panel.classList.remove('show');
}

function resetNavPanel() {
    var panel = document.getElementById('nav-platforms');
    if (panel) {
        panel.classList.remove('show');
    }
}

function handleNavigate(platform) {
    if (!currentLandmark) return;
    
    var destLat = currentLandmark.lat || null;
    var destLng = currentLandmark.lng || null;
    var destination = encodeURIComponent(currentLandmark.name);

    // 百度地图：需要起点坐标；高德/腾讯：让地图自行获取
    if (platform === 'baidu') {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    navigateWithPlatform(platform, position.coords.longitude, position.coords.latitude, destination, destLng, destLat);
                },
                function(error) {
                    console.warn('获取位置失败:', error);
                    showToast('无法获取当前位置，请手动设置起点');
                    navigateWithPlatform(platform, null, null, destination, destLng, destLat);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            showToast('您的浏览器不支持地理定位');
            navigateWithPlatform(platform, null, null, destination, destLng, destLat);
        }
    } else {
        navigateWithPlatform(platform, null, null, destination, destLng, destLat);
    }
}

function convertCoord(lng, lat, fromCRS, toCRS) {
    if (typeof gcoord === 'undefined' || !gcoord.transform) {
        console.warn('gcoord 未加载，跳过坐标转换');
        return [lng, lat];
    }
    try {
        return gcoord.transform([lng, lat], fromCRS, toCRS);
    } catch (e) {
        console.error('坐标转换失败:', e);
        return [lng, lat];
    }
}

function navigateWithPlatform(platform, originLng, originLat, destination, destLng, destLat) {
    var navUrl;
    switch (platform) {
        case 'baidu':
            navUrl = buildBaiduNavUrl(originLng, originLat, destination, destLng, destLat);
            break;
        case 'amap':
            navUrl = buildAmapNavUrl(originLng, originLat, destination, destLng, destLat);
            break;
        case 'tencent':
            navUrl = buildTencentNavUrl(originLng, originLat, destination, destLng, destLat);
            break;
        default:
            navUrl = buildBaiduNavUrl(originLng, originLat, destination, destLng, destLat);
    }
    window.open(navUrl, '_blank');
}

function buildBaiduNavUrl(originLng, originLat, destination, destLng, destLat) {
    var baseUrl = 'https://api.map.baidu.com/direction';
    var params = [];
    params.push('destination=' + destination);
    params.push('mode=walking');
    params.push('destination_region=' + encodeURIComponent(mapConfig.region));
    params.push('output=html');
    params.push('src=' + encodeURIComponent(window.location.hostname));

    if (originLng !== null && originLat !== null) {
        var bdCoord = convertCoord(originLng, originLat, gcoord.WGS84, gcoord.BD09);
        params.push('origin=latlng:' + bdCoord[1] + ',' + bdCoord[0] + '|name:我的位置');
    }
    
    return baseUrl + '?' + params.join('&');
}

function buildAmapNavUrl(originLng, originLat, destination, destLng, destLat) {
    var baseUrl = 'https://uri.amap.com/navigation';
    var params = [];

    if (destLng !== null && destLng !== undefined && destLat !== null && destLat !== undefined) {
        params.push('to=' + destLng + ',' + destLat + ',' + encodeURIComponent(destination));
    } else {
        params.push('to=' + destination);
    }
    params.push('mode=walk');
    params.push('src=' + encodeURIComponent(window.location.hostname));
    
    return baseUrl + '?' + params.join('&');
}

function buildTencentNavUrl(originLng, originLat, destination, destLng, destLat) {
    var baseUrl = 'https://apis.map.qq.com/uri/v1/routeplan';
    var params = [];
    params.push('type=walk');
    params.push('to=' + destination);

    if (destLng !== null && destLng !== undefined && destLat !== null && destLat !== undefined) {
        // GCJ-02 → WGS84，配合 coord_type=1
        if (typeof gcoord !== 'undefined' && gcoord.transform) {
            var wgsCoord = gcoord.transform([destLng, destLat], gcoord.GCJ02, gcoord.WGS84);
            params.push('tocoord=' + wgsCoord[1] + ',' + wgsCoord[0]);
            params.push('coord_type=1');
        } else {
            // gcoord 未加载，直接使用 GCJ-02（腾讯默认坐标系）
            params.push('tocoord=' + destLat + ',' + destLng);
        }
    }
    
    return baseUrl + '?' + params.join('&');
}

function copyNavUrl(platform) {
    if (!currentLandmark) return;
    
    var destLat = currentLandmark.lat || null;
    var destLng = currentLandmark.lng || null;
    var destination = encodeURIComponent(currentLandmark.name);

    // 百度地图：需要起点坐标；高德/腾讯：让地图自行获取
    if (platform === 'baidu') {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    var navUrl = getNavUrl(platform, position.coords.longitude, position.coords.latitude, destination, destLng, destLat);
                    doCopy(navUrl);
                },
                function(error) {
                    console.warn('获取位置失败:', error);
                    var navUrl = getNavUrl(platform, null, null, destination, destLng, destLat);
                    doCopy(navUrl);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            var navUrl = getNavUrl(platform, null, null, destination, destLng, destLat);
            doCopy(navUrl);
        }
    } else {
        var navUrl = getNavUrl(platform, null, null, destination, destLng, destLat);
        doCopy(navUrl);
    }
}

function getNavUrl(platform, originLng, originLat, destination, destLng, destLat) {
    switch (platform) {
        case 'baidu':
            return buildBaiduNavUrl(originLng, originLat, destination, destLng, destLat);
        case 'amap':
            return buildAmapNavUrl(originLng, originLat, destination, destLng, destLat);
        case 'tencent':
            return buildTencentNavUrl(originLng, originLat, destination, destLng, destLat);
        default:
            return buildBaiduNavUrl(originLng, originLat, destination, destLng, destLat);
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
    stopSpeak();
    document.getElementById('detail-modal').classList.remove('show');
    document.body.style.overflow = '';
}

let isSpeaking = false;

function toggleSpeak() {
    if (isSpeaking) {
        stopSpeak();
        return;
    }
    if (!currentLandmark) return;
    if (!window.speechSynthesis) {
        showToast('您的浏览器不支持语音朗读');
        return;
    }

    const text = (currentLandmark.name || '') + '。' + (currentLandmark.description || '暂无介绍');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;

    utterance.onstart = function() {
        isSpeaking = true;
        updateSpeakButton(true);
    };

    utterance.onend = function() {
        isSpeaking = false;
        updateSpeakButton(false);
    };

    utterance.onerror = function(e) {
        if (e.error !== 'interrupted') {
            console.error('语音朗读错误:', e.error);
            showToast('朗读失败');
        }
        isSpeaking = false;
        updateSpeakButton(false);
    };

    window.speechSynthesis.speak(utterance);
}

function stopSpeak() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (isSpeaking) {
        isSpeaking = false;
        updateSpeakButton(false);
    }
}

function updateSpeakButton(speaking) {
    const btn = document.getElementById('speak-btn');
    const icon = document.getElementById('speak-icon');
    const label = document.getElementById('speak-label');
    if (!btn || !icon || !label) return;
    if (speaking) {
        icon.className = 'fa-solid fa-stop';
        label.textContent = '停止朗读';
        btn.classList.add('speaking');
    } else {
        icon.className = 'fa-solid fa-volume-high';
        label.textContent = '朗读介绍';
        btn.classList.remove('speaking');
    }
}

function goToLandmark(name) {
    const landmark = landmarks.find(l => l.name === name);
    if (landmark) {
        openDetail(name);
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
        item.setAttribute('data-name', landmark.name);
        item.onclick = function() {
            handleMenuClick(landmark.name);
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

function handleMenuClick(name) {
    toggleMenu();
    goToLandmark(name);
}

function handleMenuSearch(value) {
    renderMenuItems(value);
}

async function loadLandmarks() {
    try {
        const res = await fetch(mapApiUrl('/api/landmarks'));
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
    img.src = mapApiUrl('/api/map-image');
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
        const res = await fetch(mapApiUrl('/api/config'));
        if (res.ok) {
            const config = await res.json();
            if (config.region) mapConfig.region = config.region;
            if (config.boundaryBuffer !== undefined) BOUNDARY_BUFFER = parseFloat(config.boundaryBuffer);
            if (config.title) updatePageTitle(config.title);
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
            if (config.boundaryBuffer !== undefined) BOUNDARY_BUFFER = parseFloat(config.boundaryBuffer);
            if (config.title) updatePageTitle(config.title);
        }
    } catch (e) {
        console.warn('加载配置失败，使用默认配置', e);
    }
}

function updatePageTitle(title) {
    document.title = '社区地图 - ' + title;
    const titleEl = document.getElementById('map-title');
    if (titleEl) titleEl.textContent = title;
    const imgEl = document.getElementById('map-img');
    if (imgEl) imgEl.alt = title + '底图';
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
