let landmarks = [];
let currentLandmark = null;
let mapConfig = {
    region: '上海',
    ttsEngine: 'auto',
    ttsVoice: ''
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
    var destination = currentLandmark.name;

    // 所有平台均尝试获取起点坐标：百度需 BD09，高德需 GCJ-02，腾讯使用 WGS84
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
    params.push('destination=' + encodeURIComponent(destination));
    params.push('mode=walking');
    params.push('region=' + encodeURIComponent(mapConfig.region));
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
        params.push('to=' + encodeURIComponent(destination));
    }
    if (originLng !== null && originLat !== null) {
        // WGS84 → GCJ-02
        var gcjCoord = convertCoord(originLng, originLat, gcoord.WGS84, gcoord.GCJ02);
        params.push('from=' + gcjCoord[0] + ',' + gcjCoord[1] + ',' + encodeURIComponent('我的位置'));
    }
    params.push('mode=walk');
    params.push('src=' + encodeURIComponent(window.location.hostname));
    
    return baseUrl + '?' + params.join('&');
}

function buildTencentNavUrl(originLng, originLat, destination, destLng, destLat) {
    var baseUrl = 'https://apis.map.qq.com/uri/v1/routeplan';
    var params = [];
    params.push('type=walk');
    params.push('to=' + encodeURIComponent(destination));

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

    if (originLng !== null && originLat !== null) {
        // 腾讯 coord_type=1 接受 WGS84，直接传入
        params.push('from=' + encodeURIComponent('我的位置'));
        params.push('fromcoord=' + originLat + ',' + originLng);
        if (params.indexOf('coord_type=1') === -1) {
            params.push('coord_type=1');
        }
    }
    
    return baseUrl + '?' + params.join('&');
}

function copyNavUrl(platform) {
    if (!currentLandmark) return;
    
    var destLat = currentLandmark.lat || null;
    var destLng = currentLandmark.lng || null;
    var destination = currentLandmark.name;

    // 所有平台均尝试获取起点坐标
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
let currentAudio = null;
let currentReject = null;
let voicesReady = false;

function isWeChatBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    return /MicroMessenger/i.test(ua);
}

function preloadVoices() {
    if (!window.speechSynthesis) return Promise.reject(new Error('no-speech'));
    if (voicesReady) return Promise.resolve();

    return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesReady = true;
            resolve();
            return;
        }

        const onVoicesChanged = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) {
                voicesReady = true;
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            }
            resolve();
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

        // 500ms 超时，不阻塞朗读
        setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            voicesReady = true;
            resolve();
        }, 500);
    });
}

function hasChineseVoice() {
    if (!window.speechSynthesis) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.some(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
}

// 极小的静音 WAV，用于在用户手势内解锁 Audio 元素
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

async function toggleSpeak() {
    if (isSpeaking) {
        stopSpeak();
        return;
    }
    if (!currentLandmark) return;

    const engine = mapConfig.ttsEngine || 'auto';

    if (engine === 'disabled') {
        showToast('朗读功能已被管理员禁用');
        return;
    }

    const text = (currentLandmark.name || '') + '。' + (currentLandmark.description || '暂无介绍');
    const nativeAvailable = !!window.speechSynthesis;
    const voice = mapConfig.ttsVoice || '';
    const isWeChat = isWeChatBrowser();

    // 浏览器原生 TTS：微信环境下 speechSynthesis 也被屏蔽
    // 非微信环境且指定 browser 模式，或 auto 模式下没有可用的语音
    if (engine === 'browser' && !isWeChat) {
        if (!nativeAvailable) {
            showToast('当前浏览器不支持语音朗读');
            return;
        }
        try {
            await preloadVoices();
            await speakNative(text);
        } catch (e) {
            console.error('浏览器 TTS 失败:', e);
            showToast('浏览器朗读失败');
        }
        return;
    }

    // 关键：在用户手势同步上下文内创建并解锁 Audio 元素
    // 这样即使后续 await fetch() 脱离手势链，play() 仍能在微信浏览器中工作
    const audio = new Audio(SILENT_WAV);
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    currentAudio = audio;
    // 预热：播放静音 WAV 以激活音频通道，不立即 pause 以确保 X5 内核解锁
    try {
        const playPromise = audio.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(() => {});
        }
    } catch (_) {}

    // 微信环境 + browser 引擎：已降级到服务器 TTS
    if (engine === 'browser' && isWeChat) {
        console.info('微信环境跳过浏览器 TTS，改用服务器朗读');
    }

    // 服务器 TTS（微信/非微信通用）
    try {
        await speakServer(text, voice, audio, isWeChat);
        return;
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.warn('服务器 TTS 失败:', e.message);
    }

    // 降级：尝试浏览器 TTS（仅非微信环境，微信的 speechSynthesis 也被屏蔽）
    if (!isWeChat && nativeAvailable) {
        try {
            await preloadVoices();
            await speakNative(text);
            return;
        } catch (e) {
            console.error('浏览器 TTS 也失败:', e);
        }
    }

    showToast('语音朗读暂不可用');
}

function speakNative(text) {
    return new Promise((resolve, reject) => {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;

        const voices = synth.getVoices();
        const zhVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
        if (zhVoice) {
            utterance.voice = zhVoice;
        }

        utterance.onstart = function() {
            isSpeaking = true;
            updateSpeakButton(true);
            resolve();
        };

        utterance.onend = function() {
            isSpeaking = false;
            updateSpeakButton(false);
        };

        utterance.onerror = function(e) {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('Native TTS error:', e.error);
            }
            isSpeaking = false;
            updateSpeakButton(false);
            reject(new Error(e.error || 'native-error'));
        };

        synth.speak(utterance);
    });
}

async function speakServer(text, voice, audio, isWeChat) {
    isSpeaking = true;
    updateSpeakButton(true);

    const body = { text };
    if (voice) body.voice = voice;

    const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let detail = '';
        try {
            const err = await response.json();
            if (err && err.error) detail = err.error;
        } catch (_) {
            // 忽略 JSON 解析错误
        }
        const msg = detail || '服务器错误 (HTTP ' + response.status + ')';
        throw new Error(msg);
    }

    const blob = await response.blob();

    // 微信浏览器兼容：使用 FileReader 转为 DataURL
    // 某些版本微信的 blob: URL 存在识别问题
    if (isWeChat) {
        const dataUrl = await blobToDataURL(blob);
        audio.src = dataUrl;
    } else {
        const url = URL.createObjectURL(blob);
        audio.src = url;
    }

    return new Promise((resolve, reject) => {
        audio.onended = function() {
            isSpeaking = false;
            updateSpeakButton(false);
            currentReject = null;
            cleanupAudio();
            resolve();
        };

        audio.onerror = function() {
            isSpeaking = false;
            updateSpeakButton(false);
            currentReject = null;
            cleanupAudio();
            reject(new Error('朗读播放失败'));
        };

        currentReject = reject;
        audio.currentTime = 0;
        // 重新加载以确保 X5 内核正确处理 src 变更
        audio.load();
        audio.play().catch(reject);
    });
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('DataURL 转换失败'));
        reader.readAsDataURL(blob);
    });
}

function stopSpeak() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (currentAudio) {
        try { currentAudio.pause(); } catch (_) {}
        try { currentAudio.currentTime = 0; } catch (_) {}
        cleanupAudio();
    }
    if (currentReject) {
        try { currentReject(new DOMException('Aborted', 'AbortError')); } catch (_) {}
        currentReject = null;
    }
    if (isSpeaking) {
        isSpeaking = false;
        updateSpeakButton(false);
    }
}

function cleanupAudio() {
    if (currentAudio) {
        if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudio.src);
        }
        currentAudio = null;
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
    function onImageError() {
        wrapper.style.width = '800px';
        wrapper.style.height = '600px';
        markersContainer.style.width = '800px';
        markersContainer.style.height = '600px';
        centerMap();
    }
    if (img.complete) {
        onImageReady();
    } else {
        img.addEventListener('load', onImageReady);
        img.addEventListener('error', onImageError);
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
            if (config.boundaryBuffer !== undefined) BOUNDARY_BUFFER = parseFloat(config.boundaryBuffer);
            if (config.title) updatePageTitle(config.title);
            if (config.ttsEngine) mapConfig.ttsEngine = config.ttsEngine;
            if (config.ttsVoice !== undefined) mapConfig.ttsVoice = config.ttsVoice;
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
