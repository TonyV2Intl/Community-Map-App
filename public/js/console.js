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
    let emptyEl = document.getElementById('empty-state');
    const loadingEl = document.getElementById('loading-state');
    const searchQuery = document.getElementById('search-input').value;

    const data = filteredLandmarks.length > 0 || searchQuery
        ? filteredLandmarks
        : landmarks;

    if (data.length === 0) {
        const isSearching = searchQuery.trim() !== '';
        const iconClass = isSearching ? 'fa-magnifying-glass' : 'fa-map';
        const message = isSearching ? '未找到匹配地标' : '暂无地标数据';

        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'empty-state';
            emptyEl.id = 'empty-state';
            emptyEl.innerHTML = `<i class="fa-regular ${iconClass}" style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;"></i><p>${message}</p>`;
            listEl.appendChild(emptyEl);
        } else {
            emptyEl.innerHTML = `<i class="fa-regular ${iconClass}" style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;"></i><p>${message}</p>`;
        }
        emptyEl.style.display = 'flex';
        return;
    }

    if (emptyEl) {
        emptyEl.style.display = 'none';
    }
    
    const itemsHtml = data.map(landmark => {
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

    listEl.innerHTML = itemsHtml;
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

async function handleLogout() {
    try {
        const res = await fetch('/api/auth', {
            method: 'DELETE'
        });
        if (res.ok) {
            window.location.href = '/console-login';
        } else {
            showToast('登出失败，请重试');
        }
    } catch (e) {
        console.error('登出失败:', e);
        showToast('登出失败，请检查网络');
    }
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

function exportData() {
    if (landmarks.length === 0) {
        showToast('暂无数据可导出');
        return;
    }

    const data = JSON.stringify(landmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `landmarks-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('数据导出成功');
}

function triggerImport() {
    document.getElementById('import-file').click();
}

async function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            showToast('无效的JSON文件');
            input.value = '';
            return;
        }

        if (!Array.isArray(data)) {
            showToast('文件格式错误：应为数组');
            input.value = '';
            return;
        }

        if (data.length === 0) {
            showToast('文件内容为空');
            input.value = '';
            return;
        }

        const res = await fetch('/api/landmarks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const result = await res.json();
            showToast(`导入成功，共 ${result.count} 个地标`);
            await loadLandmarks();
        } else {
            const err = await res.json();
            showToast('导入失败：' + (err.error || '未知错误'));
        }
    } catch (e) {
        console.error('导入失败:', e);
        showToast('导入失败，请检查文件');
    }

    input.value = '';
}

async function loadLandmarks() {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl) {
        loadingEl.style.display = 'flex';
    }
    
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
    
    if (loadingEl) {
        loadingEl.style.display = 'none';
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
        } else if (document.getElementById('kv-modal').classList.contains('show')) {
            closeKvModal();
        }
    }
});

async function viewKvRaw() {
    const modal = document.getElementById('kv-modal');
    const body = document.getElementById('kv-modal-body');
    
    body.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--cmap-primary);"></i><p>加载中...</p></div>';
    modal.classList.add('show');
    
    try {
        const res = await fetch('/api/kv-debug');
        const data = await res.json();
        
        if (data.error) {
            body.innerHTML = `<div class="empty-kv"><i class="fa-solid fa-exclamation-circle" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><p>${data.error}</p></div>`;
            return;
        }
        
        if (!data.exists || !data.raw) {
            body.innerHTML = `<div class="empty-kv"><i class="fa-solid fa-database" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><p>KV 值为空</p></div>`;
            return;
        }
        
        body.innerHTML = `<pre>${escapeHtml(data.raw)}</pre>`;
    } catch (e) {
        console.error('获取KV失败:', e);
        body.innerHTML = `<div class="empty-kv"><i class="fa-solid fa-exclamation-circle" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><p>获取失败: ${e.message}</p></div>`;
    }
}

function closeKvModal() {
    document.getElementById('kv-modal').classList.remove('show');
}

function copyKvValue() {
    const body = document.getElementById('kv-modal-body');
    const pre = body.querySelector('pre');
    if (!pre) {
        showToast('没有可复制的内容');
        return;
    }
    
    navigator.clipboard.writeText(pre.textContent).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败');
    });
}

async function clearKvValue() {
    if (!confirm('确定要清除所有KV值吗？此操作将删除所有地标数据，且无法恢复！')) {
        return;
    }
    
    try {
        const res = await fetch('/api/kv-debug', { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message);
            viewKvRaw();
            loadLandmarks();
        } else {
            showToast('清除失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('清除KV失败:', e);
        showToast('清除失败: ' + e.message);
    }
}



document.getElementById('kv-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeKvModal();
    }
});

loadLandmarks();
