let landmarks = [];

const viewport = document.getElementById('map-viewport');
const wrapper = document.getElementById('map-transform-wrapper');
const markersContainer = document.getElementById('markers-container');

const MIN_SCALE = 1;
const MAX_SCALE = 3;
let scale = 1;
let translateX = 0;
let translateY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;
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
    const ww = wrapper.offsetWidth * scale;
    const wh = wrapper.offsetHeight * scale;

    if (ww <= vw) {
        translateX = (vw - ww) / 2;
    } else {
        const maxPan = (ww - vw) / 2;
        translateX = Math.max(-maxPan, Math.min(maxPan, translateX));
    }

    if (wh <= vh) {
        translateY = (vh - wh) / 2;
    } else {
        const maxPanY = (wh - vh) / 2;
        translateY = Math.max(-maxPanY, Math.min(maxPanY, translateY));
    }
}

function applyTransform() {
    wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function centerMap() {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const ww = wrapper.offsetWidth;
    const wh = wrapper.offsetHeight;
    scale = Math.min(vw / ww, 1);
    translateX = (vw - ww * scale) / 2;
    translateY = (vh - wh * scale) / 2;
    applyTransform();
}

function zoomIn() {
    const newScale = Math.min(MAX_SCALE, scale + 0.25);
    zoomAtCenter(newScale);
}

function zoomOut() {
    const newScale = Math.max(MIN_SCALE, scale - 0.25);
    zoomAtCenter(newScale);
}

function zoomAtCenter(newScale) {
    const rect = viewport.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const ratio = newScale / scale;
    translateX = mx - ratio * (mx - translateX);
    translateY = my - ratio * (my - translateY);
    scale = newScale;
    clampBounds();
    applyTransform();
}

viewport.addEventListener('touchstart', function(e) {
    e.preventDefault();
    activeTouches = e.touches.length;

    if (activeTouches === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    } else if (activeTouches === 2) {
        isDragging = false;
        initialPinchDist = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        lastMidX = getMidpoint(e.touches[0], e.touches[1]).x;
        lastMidY = getMidpoint(e.touches[0], e.touches[1]).y;
    }
}, { passive: false });

viewport.addEventListener('touchmove', function(e) {
    e.preventDefault();

    if (e.touches.length === 1 && activeTouches === 1 && isDragging) {
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        clampBounds();
        applyTransform();
    } else if (e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        const mid = getMidpoint(e.touches[0], e.touches[1]);

        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale * (dist / initialPinchDist)));
        translateX = initialTranslateX + (mid.x - lastMidX);
        translateY = initialTranslateY + (mid.y - lastMidY);

        clampBounds();
        applyTransform();
    }
}, { passive: false });

viewport.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
        activeTouches = e.touches.length;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        } else {
            isDragging = false;
        }
    }
}, { passive: false });

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
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

    const rect = viewport.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ratio = newScale / scale;
    translateX = mx - ratio * (mx - translateX);
    translateY = my - ratio * (my - translateY);
    scale = newScale;

    clampBounds();
    applyTransform();
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
    markersContainer.innerHTML = '';
    landmarks.forEach(landmark => {
        const marker = document.createElement('div');
        marker.className = 'landmark-marker';
        marker.style.left = landmark.x + '%';
        marker.style.top = landmark.y + '%';
        marker.title = landmark.name;
        marker.setAttribute('data-id', landmark.id);

        const iconClass = getIconClass(landmark.icon);
        const color = landmark.color || 'var(--cmap-primary)';

        marker.innerHTML = `
            <div class="marker-icon">
                <div class="marker-icon-inner" style="background: ${color};">
                    <i class="fa-solid ${iconClass}" style="font-size: 16px;"></i>
                </div>
            </div>
            <div class="marker-label">
                <span>${landmark.name}</span>
            </div>
        `;

        marker.addEventListener('click', function(e) {
            e.stopPropagation();
            openDetail(landmark.id);
        });

        markersContainer.appendChild(marker);
    });
}

function openDetail(id) {
    const landmark = landmarks.find(l => l.id === id);
    if (!landmark) return;

    document.getElementById('detail-title').textContent = landmark.name;
    document.getElementById('detail-description').textContent = landmark.description || '暂无介绍';
    document.getElementById('detail-address').textContent = landmark.address || '';

    const imageEl = document.getElementById('detail-image');
    if (landmark.imageUrl) {
        imageEl.innerHTML = `<img src="${landmark.imageUrl}" alt="${landmark.name}" />`;
    } else {
        imageEl.innerHTML = '<i class="fa-regular fa-image detail-image-placeholder" style="font-size: 40px;"></i>';
    }

    document.getElementById('detail-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    document.getElementById('detail-modal').classList.remove('show');
    document.body.style.overflow = '';
}

function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    overlay.classList.toggle('show');
    if (overlay.classList.contains('show')) {
        document.getElementById('search-input').focus();
    } else {
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').innerHTML = '';
    }
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!query.trim()) {
        resultsContainer.innerHTML = '';
        return;
    }

    const results = landmarks.filter(l =>
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        (l.address && l.address.toLowerCase().includes(query.toLowerCase()))
    );

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>未找到相关地标</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.map(landmark => {
        const iconClass = getIconClass(landmark.icon);
        const color = landmark.color || 'var(--cmap-primary)';
        return `
            <div class="search-result-item" onclick="goToLandmark('${landmark.id}')">
                <div class="search-result-icon" style="background: ${color};">
                    <i class="fa-solid ${iconClass}" style="font-size: 14px;"></i>
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${landmark.name}</div>
                    <div class="search-result-addr">${landmark.address || ''}</div>
                </div>
                <i class="fa-solid fa-chevron-right" style="color: var(--cmap-muted-foreground); font-size: 14px;"></i>
            </div>
        `;
    }).join('');
}

function goToLandmark(id) {
    toggleSearch();
    const landmark = landmarks.find(l => l.id === id);
    if (landmark) {
        openDetail(id);
        focusOnLandmark(landmark);
    }
}

function focusOnLandmark(landmark) {
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    const ww = wrapper.offsetWidth;
    const wh = wrapper.offsetHeight;

    const targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, 1.5));
    const markerX = (landmark.x / 100) * ww * targetScale;
    const markerY = (landmark.y / 100) * wh * targetScale;

    translateX = vw / 2 - markerX;
    translateY = vh / 2 - markerY + 50;
    scale = targetScale;

    clampBounds();
    applyTransform();
}

function toggleMenu() {
    showToast('菜单功能开发中');
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
            console.warn('API请求失败，使用默认数据');
            landmarks = getDefaultLandmarks();
        }
    } catch (e) {
        console.warn('加载地标失败，使用默认数据', e);
        landmarks = getDefaultLandmarks();
    }
    renderMarkers();
}

function getDefaultLandmarks() {
    return [
        {
            id: 'zhou-gongguan',
            name: '周公馆',
            address: '黄浦区思南路73号',
            x: 38,
            y: 28,
            icon: 'fa-location-dot',
            color: '#4285f4',
            description: '周公馆位于上海市黄浦区思南路73号，是中国共产党早期在上海的重要活动场所。1946年至1947年间，周恩来同志曾在此办公和居住。现为全国重点文物保护单位，是上海市重要的红色旅游景点。'
        },
        {
            id: 'guotai-cinema',
            name: '国泰电影院',
            address: '黄浦区淮海中路870号',
            x: 52,
            y: 22,
            icon: 'fa-film',
            color: '#4285f4',
            description: '国泰电影院始建于1930年，是上海著名的历史建筑之一，具有装饰艺术风格。'
        },
        {
            id: 'ruijin-hospital',
            name: '瑞金医院',
            address: '黄浦区瑞金二路197号',
            x: 32,
            y: 42,
            icon: 'fa-hospital',
            color: '#34a853',
            description: '上海交通大学医学院附属瑞金医院，是一所集医疗、教学、科研为一体的三级甲等综合性医院。'
        },
        {
            id: 'garden-hotel',
            name: '花园饭店',
            address: '黄浦区茂名南路58号',
            x: 55,
            y: 35,
            icon: 'fa-hotel',
            color: '#4285f4',
            description: '上海花园饭店是一座五星级豪华酒店，位于原法国俱乐部旧址。'
        },
        {
            id: 'culture-plaza',
            name: '上海文化广场',
            address: '黄浦区永嘉路36号',
            x: 48,
            y: 55,
            icon: 'fa-music',
            color: '#8e44ad',
            description: '上海文化广场是集演出、展览、会议等功能于一体的大型文化艺术中心。'
        },
        {
            id: 'sinan-mansion',
            name: '思南公馆',
            address: '黄浦区思南路55号',
            x: 42,
            y: 45,
            icon: 'fa-landmark',
            color: '#ea4335',
            description: '思南公馆是上海市中心唯一一个以成片花园洋房的保留保护为宗旨的项目。'
        },
        {
            id: 'sun-yat-sen',
            name: '孙中山纪念馆',
            address: '黄浦区香山路7号',
            x: 35,
            y: 60,
            icon: 'fa-monument',
            color: '#ea4335',
            description: '孙中山故居是孙中山和宋庆龄在上海的寓所，现为全国重点文物保护单位。'
        },
        {
            id: 'yuyangli',
            name: '渔阳里',
            address: '黄浦区淮海中路567弄',
            x: 60,
            y: 40,
            icon: 'fa-building',
            color: '#ea4335',
            description: '渔阳里是中国社会主义青年团中央机关旧址，具有重要的历史意义。'
        }
    ];
}

if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}

function init() {
    centerMap();
    loadLandmarks();
}

window.addEventListener('resize', function() {
    clampBounds();
    applyTransform();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('detail-modal').classList.contains('show')) {
            closeDetail();
        }
        if (document.getElementById('search-overlay').classList.contains('show')) {
            toggleSearch();
        }
    }
});
