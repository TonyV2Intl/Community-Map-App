const LIST_KEY = 'landmarks:list';
const CONFIG_KEY = 'config';

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
            listEl.appendChild(emptyEl);
        }
        emptyEl.replaceChildren();
        const icon = document.createElement('i');
        icon.className = `fa-regular ${iconClass}`;
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '12px';
        icon.style.opacity = '0.5';
        emptyEl.appendChild(icon);
        const p = document.createElement('p');
        p.textContent = message;
        emptyEl.appendChild(p);
        emptyEl.style.display = 'flex';
        return;
    }

    if (emptyEl) {
        emptyEl.style.display = 'none';
    }
    
    listEl.replaceChildren();
    
    data.forEach(landmark => {
        const iconClass = getIconClass(landmark.icon);
        const color = validateColor(landmark.color);
        const isDisabled = landmark.enabled === false;
        
        const item = document.createElement('div');
        item.className = 'landmark-item' + (isDisabled ? ' disabled' : '');
        item.setAttribute('data-id', landmark.id);
        
        // landmark-icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'landmark-icon';
        iconDiv.style.background = color;
        const icon = document.createElement('i');
        icon.className = `fa-solid ${iconClass}`;
        icon.style.fontSize = '12px';
        icon.style.color = 'white';
        iconDiv.appendChild(icon);
        item.appendChild(iconDiv);
        
        // landmark-info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'landmark-info';
        infoDiv.setAttribute('data-id', landmark.id);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'landmark-name';
        nameDiv.textContent = landmark.name || '';
        infoDiv.appendChild(nameDiv);
        
        const addressDiv = document.createElement('div');
        addressDiv.className = 'landmark-address';
        addressDiv.textContent = landmark.address || '';
        infoDiv.appendChild(addressDiv);
        
        item.appendChild(infoDiv);
        
        // landmark-actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'landmark-actions';
        
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'edit-btn';
        editBtn.setAttribute('data-id', landmark.id);
        editBtn.textContent = '编辑';
        actionsDiv.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', '删除');
        deleteBtn.setAttribute('data-id', landmark.id);
        deleteBtn.setAttribute('data-name', landmark.name || '');
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fa-regular fa-trash-can';
        deleteIcon.style.fontSize = '14px';
        deleteBtn.appendChild(deleteIcon);
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(actionsDiv);
        
        listEl.appendChild(item);
    });

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
    
    // 创建加载状态
    body.replaceChildren();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-state';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    spinner.style.fontSize = '24px';
    spinner.style.color = 'var(--cmap-primary)';
    loadingDiv.appendChild(spinner);
    const loadingP = document.createElement('p');
    loadingP.textContent = '加载中...';
    loadingDiv.appendChild(loadingP);
    body.appendChild(loadingDiv);
    
    modal.classList.add('show');
    
    try {
        const res = await fetch('/api/kv-debug');
        const data = await res.json();
        
        if (data.error) {
            body.replaceChildren();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'empty-kv';
            const errorIcon = document.createElement('i');
            errorIcon.className = 'fa-solid fa-exclamation-circle';
            errorIcon.style.fontSize = '32px';
            errorIcon.style.marginBottom = '8px';
            errorIcon.style.opacity = '0.5';
            errorDiv.appendChild(errorIcon);
            const errorP = document.createElement('p');
            errorP.textContent = data.error;
            errorDiv.appendChild(errorP);
            body.appendChild(errorDiv);
            return;
        }
        
        body.replaceChildren();
        
        // 合并所有KV数据
        const kvData = {};
        
        // 添加地标数据
        if (data.exists && data.raw) {
            kvData[LIST_KEY] = JSON.parse(data.raw);
        } else {
            kvData[LIST_KEY] = null;
        }
        
        // 添加配置数据
        kvData[CONFIG_KEY] = data.config || null;
        
        // 检查是否所有数据都为空
        const allEmpty = Object.values(kvData).every(v => v === null);
        
        if (allEmpty) {
            body.classList.add('empty-kv');
            const emptyIcon = document.createElement('i');
            emptyIcon.className = 'fa-solid fa-database';
            emptyIcon.style.fontSize = '32px';
            emptyIcon.style.marginBottom = '8px';
            emptyIcon.style.opacity = '0.5';
            body.appendChild(emptyIcon);
            const emptyP = document.createElement('p');
            emptyP.textContent = 'KV数据为空';
            body.appendChild(emptyP);
        } else {
            body.classList.remove('empty-kv');
            body.textContent = JSON.stringify(kvData, null, 2);
        }
    } catch (e) {
        console.error('获取KV失败:', e);
        body.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'empty-kv';
        const errorIcon = document.createElement('i');
        errorIcon.className = 'fa-solid fa-exclamation-circle';
        errorIcon.style.fontSize = '32px';
        errorIcon.style.marginBottom = '8px';
        errorIcon.style.opacity = '0.5';
        errorDiv.appendChild(errorIcon);
        const errorP = document.createElement('p');
        errorP.textContent = '获取失败: ' + e.message;
        errorDiv.appendChild(errorP);
        body.appendChild(errorDiv);
    }
}

function closeKvModal() {
    document.getElementById('kv-modal').classList.remove('show');
}

function openConfigModal() {
    const modal = document.getElementById('config-modal');
    modal.classList.add('show');
    
    // 加载当前配置
    fetch('/api/config')
        .then(res => res.json())
        .then(config => {
            document.getElementById('config-region').value = config.region || '';
            document.getElementById('config-boundary-buffer').value = config.boundaryBuffer !== undefined ? Math.round(config.boundaryBuffer * 100) : 10;
        })
        .catch(e => {
            console.warn('加载配置失败', e);
        });
}

function closeConfigModal() {
    document.getElementById('config-modal').classList.remove('show');
}

async function saveConfig() {
    const region = document.getElementById('config-region').value.trim();
    const boundaryBuffer = parseFloat(document.getElementById('config-boundary-buffer').value) / 100 || 0.1;
    
    if (!region) {
        showToast('请填写城市区域');
        return;
    }
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ region, boundaryBuffer })
        });
        
        const data = await res.json();
        if (data.success) {
            showToast('配置保存成功');
            closeConfigModal();
        } else {
            showToast('配置保存失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('保存配置失败', e);
        showToast('配置保存失败');
    }
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
