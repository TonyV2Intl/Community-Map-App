let landmarks = [];
let filteredLandmarks = [];
let deleteTargetId = null;

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

function renderList() {
    const listEl = document.getElementById('landmark-list');
    const emptyEl = document.getElementById('empty-state');

    const data = filteredLandmarks.length > 0 || document.getElementById('search-input').value
        ? filteredLandmarks
        : landmarks;

    if (data.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'flex';
        return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = data.map(landmark => {
        const iconClass = getIconClass(landmark.icon);
        const color = landmark.color || '#4285f4';
        return `
            <div class="landmark-item" data-id="${landmark.id}">
                <div class="landmark-icon" style="background: ${color};">
                    <i class="fa-solid ${iconClass}" style="font-size: 12px; color: white;"></i>
                </div>
                <div class="landmark-info" onclick="goToEdit('${landmark.id}')">
                    <div class="landmark-name">${landmark.name}</div>
                    <div class="landmark-address">${landmark.address || ''}</div>
                </div>
                <div class="landmark-actions">
                    <button type="button" class="edit-btn" onclick="goToEdit('${landmark.id}')">编辑</button>
                    <button type="button" class="delete-btn" aria-label="删除" onclick="showDeleteConfirm('${landmark.id}', '${landmark.name}')">
                        <i class="fa-regular fa-trash-can" style="font-size: 14px;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateStats();
}

function updateStats() {
    document.getElementById('stat-total').textContent = landmarks.length;
    document.getElementById('stat-visible').textContent = landmarks.filter(l => l.enabled !== false).length;
}

function handleSearch(query) {
    if (!query.trim()) {
        filteredLandmarks = [];
    } else {
        filteredLandmarks = landmarks.filter(l =>
            l.name.toLowerCase().includes(query.toLowerCase()) ||
            (l.address && l.address.toLowerCase().includes(query.toLowerCase()))
        );
    }
    renderList();
}

function goToEdit(id) {
    if (id) {
        window.location.href = `/console-edit.html?id=${encodeURIComponent(id)}`;
    } else {
        window.location.href = '/console-edit.html';
    }
}

function goBack() {
    window.location.href = '/';
}

function showDeleteConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('confirm-message').textContent =
        `确定要删除「${name}」吗？此操作不可撤销。`;
    document.getElementById('confirm-dialog').classList.add('show');
}

function cancelDelete() {
    deleteTargetId = null;
    document.getElementById('confirm-dialog').classList.remove('show');
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    try {
        const res = await fetch(`/api/landmarks/${deleteTargetId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            landmarks = landmarks.filter(l => l.id !== deleteTargetId);
            filteredLandmarks = filteredLandmarks.filter(l => l.id !== deleteTargetId);
            renderList();
            showToast('删除成功');
        } else {
            showToast('删除失败，请重试');
        }
    } catch (e) {
        console.error('删除失败:', e);
        showToast('删除失败，请检查网络');
    }

    cancelDelete();
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
    renderList();
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

document.getElementById('confirm-dialog').addEventListener('click', function(e) {
    if (e.target === this) {
        cancelDelete();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('confirm-dialog').classList.contains('show')) {
            cancelDelete();
        }
    }
});

loadLandmarks();
