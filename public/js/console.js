let landmarks = [];
let filteredLandmarks = [];
let deleteTargetName = null;

// 初始化当前地图指示器和返回链接
document.getElementById('current-map-slug').textContent = getConsoleMapSlug();
const backLink = document.getElementById('back-to-map-link');
if (backLink) backLink.href = '/m/' + encodeURIComponent(getConsoleMapSlug());

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
        item.setAttribute('data-name', landmark.name);
        
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
        infoDiv.setAttribute('data-name', landmark.name);
        
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
        editBtn.setAttribute('data-name', landmark.name);
        editBtn.textContent = '编辑';
        actionsDiv.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', '删除');
        deleteBtn.setAttribute('data-name', landmark.name);
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

function goToEdit(name) {
    const mapParam = `map=${encodeURIComponent(getConsoleMapSlug())}`;
    if (name) {
        window.location.href = `/console-edit?${mapParam}&name=${encodeURIComponent(name)}`;
    } else {
        window.location.href = `/console-edit?${mapParam}`;
    }
}

function goBack() {
    window.location.href = '/m/' + encodeURIComponent(getConsoleMapSlug());
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

function showDeleteConfirm(name) {
    deleteTargetName = name;
    document.getElementById('confirm-message').textContent =
        `确定要删除「${name}」吗？此操作不可撤销。`;
    document.getElementById('confirm-dialog').classList.add('show');
}

function cancelDelete() {
    deleteTargetName = null;
    document.getElementById('confirm-dialog').classList.remove('show');
}

async function confirmDelete() {
    if (!deleteTargetName) return;

    try {
        const res = await fetch(`${mapApiUrl('/api/landmarks')}&name=${encodeURIComponent(deleteTargetName)}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            landmarks = landmarks.filter(l => l.name !== deleteTargetName);
            filteredLandmarks = filteredLandmarks.filter(l => l.name !== deleteTargetName);
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

async function exportData() {
    if (landmarks.length === 0) {
        showToast('暂无数据可导出');
        return;
    }

    try {
        // 同时获取配置数据
        let config = null;
        const configRes = await fetch(mapApiUrl('/api/config'));
        if (configRes.ok) {
            config = await configRes.json();
        }

        const exportData = {
            landmarks: landmarks,
            config: config
        };

        const data = JSON.stringify(exportData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `community-map-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('数据导出成功');
    } catch (e) {
        console.error('导出失败:', e);
        showToast('导出失败，请重试');
    }
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

        let landmarksArr = null;
        let configData = null;

        // 检测新格式 { landmarks: [...], config: {...} } 或旧格式 [...]
        if (Array.isArray(data)) {
            // 旧格式：纯地标数组
            landmarksArr = data;
        } else if (data.landmarks && Array.isArray(data.landmarks)) {
            // 新格式：包含 landmarks 和 config 的对象
            landmarksArr = data.landmarks;
            configData = data.config || null;
        } else {
            showToast('文件格式错误：缺少 landmarks 数组');
            input.value = '';
            return;
        }

        if (landmarksArr.length === 0) {
            showToast('文件内容为空');
            input.value = '';
            return;
        }

        // 导入地标
        const lmRes = await fetch(mapApiUrl('/api/landmarks'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(landmarksArr)
        });

        if (!lmRes.ok) {
            const err = await lmRes.json();
            showToast('导入地标失败：' + (err.error || '未知错误'));
            input.value = '';
            return;
        }

        const lmResult = await lmRes.json();
        let msg = `导入成功，共 ${lmResult.count} 个地标`;

        // 导入配置（如果有）
        if (configData) {
            const cfgRes = await fetch(mapApiUrl('/api/config'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            if (cfgRes.ok) {
                msg += '，配置已同步';
            } else {
                msg += '，但配置导入失败';
            }
        }

        showToast(msg);
        await loadLandmarks();
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
    
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    renderList();
}

document.getElementById('landmark-list').addEventListener('click', function(e) {
    const target = e.target.closest('.landmark-info, .edit-btn');
    if (target) {
        const name = target.getAttribute('data-name');
        if (name) {
            goToEdit(name);
        }
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const name = deleteBtn.getAttribute('data-name');
        if (name) {
            showDeleteConfirm(name);
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
        } else if (document.getElementById('maps-modal').classList.contains('show')) {
            closeMapsModal();
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
        const res = await fetch(mapApiUrl('/api/kv-debug'));
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

        const maps = data.maps || [];

        if (maps.length === 0) {
            body.classList.add('empty-kv');
            const emptyIcon = document.createElement('i');
            emptyIcon.className = 'fa-solid fa-database';
            emptyIcon.style.fontSize = '32px';
            emptyIcon.style.marginBottom = '8px';
            emptyIcon.style.opacity = '0.5';
            body.appendChild(emptyIcon);
            const emptyP = document.createElement('p');
            emptyP.textContent = 'KV数据为空（点击"还原默认"初始化）';
            body.appendChild(emptyP);
        } else {
            body.classList.remove('empty-kv');

            // 显示概览统计
            const summary = document.createElement('div');
            summary.className = 'kv-summary';
            summary.textContent = `共 ${maps.length} 个地图`;
            body.appendChild(summary);

            // 每个地图一个卡片
            maps.forEach(map => {
                const card = document.createElement('div');
                card.className = 'kv-map-card';

                const header = document.createElement('div');
                header.className = 'kv-map-header';

                const titleSpan = document.createElement('strong');
                titleSpan.textContent = map.title || map.slug;
                header.appendChild(titleSpan);

                const slugSpan = document.createElement('span');
                slugSpan.className = 'kv-map-slug';
                slugSpan.textContent = '/m/' + map.slug;
                header.appendChild(slugSpan);

                card.appendChild(header);

                const info = document.createElement('div');
                info.className = 'kv-map-info';

                const items = [
                    ['地标数', map.landmarksCount + ' 个'],
                    ['区域', map.config ? map.config.region : '-'],
                    ['边界缓冲', map.config ? map.config.boundaryBuffer : '-'],
                    ['自定义底图', map.hasCustomImage ? `有 (${(map.imageMeta.size / 1024).toFixed(1)} KB)` : '使用默认'],
                    ['创建时间', map.createdAt ? new Date(map.createdAt).toLocaleString('zh-CN') : '-'],
                    ['更新时间', map.updatedAt ? new Date(map.updatedAt).toLocaleString('zh-CN') : '-']
                ];

                items.forEach(([label, value]) => {
                    const row = document.createElement('div');
                    row.className = 'kv-map-row';
                    const labelEl = document.createElement('span');
                    labelEl.className = 'kv-map-label';
                    labelEl.textContent = label;
                    const valueEl = document.createElement('span');
                    valueEl.className = 'kv-map-value';
                    valueEl.textContent = value;
                    row.appendChild(labelEl);
                    row.appendChild(valueEl);
                    info.appendChild(row);
                });

                card.appendChild(info);
                body.appendChild(card);
            });

            // 原始 JSON 折叠
            const rawSection = document.createElement('details');
            rawSection.className = 'kv-raw-section';
            const summary2 = document.createElement('summary');
            summary2.textContent = '查看原始 JSON';
            rawSection.appendChild(summary2);
            const pre = document.createElement('pre');
            pre.className = 'kv-raw-json';
            pre.textContent = JSON.stringify(maps, null, 2);
            rawSection.appendChild(pre);
            body.appendChild(rawSection);
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
    fetch(mapApiUrl('/api/config'))
        .then(res => res.json())
        .then(config => {
            document.getElementById('config-title').value = config.title || '';
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
    const title = document.getElementById('config-title').value.trim();
    const region = document.getElementById('config-region').value.trim();
    const boundaryBuffer = parseFloat(document.getElementById('config-boundary-buffer').value) / 100 || 0.1;
    
    if (!region) {
        showToast('请填写城市区域');
        return;
    }
    
    try {
        const res = await fetch(mapApiUrl('/api/config'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, region, boundaryBuffer })
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
    if (!confirm('确定要清除所有KV值吗？此操作将删除所有地标数据和配置，且无法恢复！')) {
        return;
    }
    
    try {
        const res = await fetch(mapApiUrl('/api/kv-debug'), { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message || 'KV值已清除');
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

async function restoreDefaults() {
    if (!confirm('确定要还原默认配置吗？当前数据将被覆盖。')) {
        return;
    }

    try {
        const res = await fetch(mapApiUrl('/api/kv-debug'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restoreDefaults: true })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || '默认配置已还原');
            viewKvRaw();
            loadLandmarks();
        } else {
            showToast('还原失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('还原默认配置失败:', e);
        showToast('还原失败，请检查网络');
    }
}



document.getElementById('kv-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeKvModal();
    }
});

loadLandmarks();

// ==================== 底图管理 ====================

function openMapModal() {
    document.getElementById('map-modal').classList.add('show');
    loadMapInfo();
}

function closeMapModal() {
    document.getElementById('map-modal').classList.remove('show');
}

async function loadMapInfo() {
    const preview = document.getElementById('map-preview');
    const statusEl = document.getElementById('map-status');
    const typeEl = document.getElementById('map-type');
    const sizeEl = document.getElementById('map-size');
    const nameEl = document.getElementById('map-name');
    const updatedEl = document.getElementById('map-updated');
    const resetBtn = document.getElementById('map-reset-btn');

    // 重置显示
    preview.replaceChildren();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'map-placeholder';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(document.createTextNode(' 加载中...'));
    preview.appendChild(loadingDiv);

    try {
        const res = await fetch(mapApiUrl('/api/map-image?info'));
        const data = await res.json();

        if (data.hasCustom && data.meta) {
            // 有自定义底图
            statusEl.replaceChildren();
            const customTag = document.createElement('span');
            customTag.className = 'map-status-tag custom';
            customTag.textContent = '自定义';
            statusEl.appendChild(customTag);

            typeEl.textContent = data.meta.type || '-';
            sizeEl.textContent = formatFileSize(data.meta.size);
            nameEl.textContent = data.meta.name || '-';
            updatedEl.textContent = data.meta.updatedAt
                ? new Date(data.meta.updatedAt).toLocaleString('zh-CN')
                : '-';
            resetBtn.disabled = false;

            // 预览图片（加时间戳避免缓存）
            preview.replaceChildren();
            const img = document.createElement('img');
            img.src = mapApiUrl('/api/map-image') + '&t=' + Date.now();
            img.alt = '当前底图';
            preview.appendChild(img);
        } else {
            // 使用默认底图
            statusEl.replaceChildren();
            const defaultTag = document.createElement('span');
            defaultTag.className = 'map-status-tag default';
            defaultTag.textContent = '默认';
            statusEl.appendChild(defaultTag);

            typeEl.textContent = 'image/webp';
            sizeEl.textContent = '-';
            nameEl.textContent = 'default-map.webp';
            updatedEl.textContent = '-';
            resetBtn.disabled = true;

            preview.replaceChildren();
            const img = document.createElement('img');
            img.src = '/assets/default-map.webp';
            img.alt = '默认底图';
            preview.appendChild(img);
        }
    } catch (e) {
        console.error('加载底图信息失败:', e);
        statusEl.textContent = '加载失败';
        preview.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'map-placeholder';
        errorDiv.textContent = '加载失败: ' + e.message;
        preview.appendChild(errorDiv);
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function triggerMapUpload() {
    document.getElementById('map-upload-input').click();
}

async function handleMapUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(mapApiUrl('/api/map-image'), {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast('底图上传成功');
            loadMapInfo();
        } else {
            showToast('上传失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('底图上传失败:', e);
        showToast('上传失败，请检查网络');
    }

    input.value = '';
}

async function handleMapReset() {
    if (!confirm('确定要恢复默认底图吗？当前自定义底图将被删除。')) {
        return;
    }

    try {
        const res = await fetch(mapApiUrl('/api/map-image'), {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast('已恢复默认底图');
            loadMapInfo();
        } else {
            showToast('恢复失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('恢复默认底图失败:', e);
        showToast('恢复失败，请检查网络');
    }
}

// 点击遮罩关闭底图模态框
document.getElementById('map-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeMapModal();
    }
});

// ==================== 地图管理 ====================

function openMapsModal() {
    document.getElementById('maps-modal').classList.add('show');
    loadMapsList();
}

function closeMapsModal() {
    document.getElementById('maps-modal').classList.remove('show');
}

async function loadMapsList() {
    const listEl = document.getElementById('maps-list');
    listEl.replaceChildren();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'maps-loading';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(document.createTextNode(' 加载中...'));
    listEl.appendChild(loadingDiv);

    try {
        const res = await fetch('/api/maps');
        if (res.ok) {
            const maps = await res.json();
            renderMapsList(maps);
        } else {
            listEl.replaceChildren();
            const p = document.createElement('p');
            p.className = 'maps-empty';
            p.textContent = '加载失败';
            listEl.appendChild(p);
        }
    } catch (e) {
        console.error('加载地图列表失败:', e);
        listEl.replaceChildren();
        const p = document.createElement('p');
        p.className = 'maps-empty';
        p.textContent = '加载失败，请检查网络';
        listEl.appendChild(p);
    }
}

function renderMapsList(maps) {
    const listEl = document.getElementById('maps-list');
    listEl.replaceChildren();
    const currentSlug = getConsoleMapSlug();

    if (!maps || maps.length === 0) {
        const p = document.createElement('p');
        p.className = 'maps-empty';
        p.textContent = '暂无地图，点击下方表单创建';
        listEl.appendChild(p);
        return;
    }

    maps.forEach(map => {
        const item = document.createElement('div');
        item.className = 'map-item' + (map.slug === currentSlug ? ' active' : '');

        const info = document.createElement('div');
        info.className = 'map-item-info';

        const titleEl = document.createElement('div');
        titleEl.className = 'map-item-title';
        titleEl.textContent = map.title || map.slug;
        info.appendChild(titleEl);

        const slugEl = document.createElement('div');
        slugEl.className = 'map-item-slug';
        slugEl.textContent = '/m/' + map.slug;
        info.appendChild(slugEl);

        if (map.createdAt) {
            const dateEl = document.createElement('div');
            dateEl.className = 'map-item-date';
            dateEl.textContent = '创建于 ' + new Date(map.createdAt).toLocaleString('zh-CN');
            info.appendChild(dateEl);
        }
        item.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'map-item-actions';

        if (map.slug !== currentSlug) {
            const switchBtn = document.createElement('button');
            switchBtn.type = 'button';
            switchBtn.className = 'map-switch-btn';
            switchBtn.textContent = '切换';
            switchBtn.onclick = () => consoleSwitchMap(map.slug);
            actions.appendChild(switchBtn);
        } else {
            const current = document.createElement('span');
            current.className = 'map-current-tag';
            current.textContent = '当前';
            actions.appendChild(current);
        }

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'map-rename-btn';
        renameBtn.textContent = '重命名';
        renameBtn.onclick = () => handleRenameMap(map.slug, map.title);
        actions.appendChild(renameBtn);

        if (map.slug !== 'default') {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'map-delete-btn';
            deleteBtn.textContent = '删除';
            deleteBtn.onclick = () => handleDeleteMap(map.slug, map.title);
            actions.appendChild(deleteBtn);
        }

        item.appendChild(actions);
        listEl.appendChild(item);
    });
}

function consoleSwitchMap(slug) {
    switchEditMap(slug);
    document.getElementById('current-map-slug').textContent = slug;
    const backLink = document.getElementById('back-to-map-link');
    if (backLink) backLink.href = '/m/' + encodeURIComponent(slug);
    loadLandmarks();
    showToast('已切换到地图：' + slug);
    closeMapsModal();
}

async function handleCreateMap() {
    const slug = document.getElementById('new-map-slug').value.trim();
    const title = document.getElementById('new-map-title').value.trim();

    if (!slug) {
        showToast('请填写地图标识 slug');
        return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
        showToast('slug 仅允许小写字母、数字和连字符');
        return;
    }
    if (!title) {
        showToast('请填写地图标题');
        return;
    }

    try {
        const res = await fetch('/api/maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, title })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('地图 "' + title + '" 创建成功');
            document.getElementById('new-map-slug').value = '';
            document.getElementById('new-map-title').value = '';
            await loadMapsList();
        } else {
            showToast('创建失败：' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('创建地图失败:', e);
        showToast('创建失败，请检查网络');
    }
}

async function handleDeleteMap(slug, title) {
    if (!confirm('确定要删除地图 "' + title + '" (' + slug + ') 吗？\n该地图的所有地标和底图将被永久删除，此操作不可撤销。')) {
        return;
    }

    try {
        const res = await fetch('/api/maps?slug=' + encodeURIComponent(slug), { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('地图 "' + title + '" 已删除');
            if (slug === getConsoleMapSlug()) {
                consoleSwitchMap('default');
            }
            await loadMapsList();
        } else {
            showToast('删除失败：' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('删除地图失败:', e);
        showToast('删除失败，请检查网络');
    }
}

function handleRenameMap(oldSlug, oldTitle) {
    const newSlug = prompt('输入新的 slug（小写字母、数字、连字符，留空则不变）：', oldSlug);
    if (newSlug === null) return;
    const newTitle = prompt('输入新的标题：', oldTitle);
    if (newTitle === null) return;

    const body = {};
    if (newSlug.trim() && newSlug.trim() !== oldSlug) body.newSlug = newSlug.trim();
    if (newTitle.trim() && newTitle.trim() !== oldTitle) body.title = newTitle.trim();

    if (!body.newSlug && !body.title) {
        showToast('未做任何修改');
        return;
    }

    fetch('/api/maps?slug=' + encodeURIComponent(oldSlug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
        .then(res => res.json())
        .then(data => {
            if (data.slug) {
                showToast('重命名成功');
                if (oldSlug === getConsoleMapSlug()) {
                    consoleSwitchMap(data.slug);
                }
                loadMapsList();
            } else {
                showToast('重命名失败：' + (data.error || '未知错误'));
            }
        })
        .catch(e => {
            console.error('重命名地图失败:', e);
            showToast('重命名失败，请检查网络');
        });
}

// 点击遮罩关闭地图管理模态框
document.getElementById('maps-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeMapsModal();
    }
});
