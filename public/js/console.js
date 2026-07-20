let landmarks = [];
let filteredLandmarks = [];
let deleteTargetId = null;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateColor(color) {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    return hexPattern.test(color) ? color : '#4285f4';
}

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
        const color = validateColor(landmark.color);
        const escapedName = escapeHtml(landmark.name || '');
        const escapedAddress = escapeHtml(landmark.address || '');
        return `
            <div class="landmark-item" data-id="${escapeHtml(landmark.id)}">
                <div class="landmark-icon" style="background: ${color};">
                    <i class="fa-solid ${iconClass}" style="font-size: 12px; color: white;"></i>
                </div>
                <div class="landmark-info" data-id="${escapeHtml(landmark.id)}">
                    <div class="landmark-name">${escapedName}</div>
                    <div class="landmark-address">${escapedAddress}</div>
                </div>
                <div class="landmark-actions">
                    <button type="button" class="edit-btn" data-id="${escapeHtml(landmark.id)}">编辑</button>
                    <button type="button" class="delete-btn" aria-label="删除" data-id="${escapeHtml(landmark.id)}" data-name="${escapedName}">
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
        window.location.href = `/console-edit?id=${encodeURIComponent(id)}`;
    } else {
        window.location.href = '/console-edit';
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
            console.warn('API请求失败');
            landmarks = [];
            showToast('数据加载失败');
        }
    } catch (e) {
        console.warn('加载地标失败', e);
        landmarks = [];
        showToast('数据加载失败，请检查网络');
    }
    renderList();
}

document.getElementById('landmark-list').addEventListener('click', function(e) {
    const target = e.target.closest('.landmark-info, .edit-btn');
    if (target) {
        const id = target.getAttribute('data-id');
        if (id) {
            goToEdit(id);
        }
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const name = deleteBtn.getAttribute('data-name');
        if (id && name) {
            showDeleteConfirm(id, name);
        }
    }
});

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
