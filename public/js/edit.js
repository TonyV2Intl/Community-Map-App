let isNew = true;
let editingId = null;
let selectedIcon = 'fa-location-dot';
let selectedColor = '#4285f4';
let landmarkEnabled = true;

let pickerScale = 1;
let pickerTranslateX = 0;
let pickerTranslateY = 0;
let pickerMinScale = 1;

const urlParams = new URLSearchParams(window.location.search);
const idParam = urlParams.get('id');

function init() {
    if (idParam) {
        isNew = false;
        editingId = idParam;
        document.getElementById('page-title').textContent = '编辑地标';
        loadLandmark(idParam);
    } else {
        isNew = true;
        document.getElementById('page-title').textContent = '新增地标';
    }

    document.getElementById('picker-viewport').addEventListener('click', function(e) {
        const img = document.getElementById('picker-img');
        const viewport = document.getElementById('picker-viewport');
        const rect = viewport.getBoundingClientRect();
        const iw = img.naturalWidth || img.offsetWidth;
        const ih = img.naturalHeight || img.offsetHeight;
        
        const relativeX = e.clientX - rect.left - pickerTranslateX;
        const relativeY = e.clientY - rect.top - pickerTranslateY;
        
        let x = (relativeX / (iw * pickerScale)) * 100;
        let y = (relativeY / (ih * pickerScale)) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        document.getElementById('pos-x').value = x.toFixed(1);
        document.getElementById('pos-y').value = y.toFixed(1);
        syncPickerMarker();
    });

    setupPickerDrag();
}

async function loadLandmark(id) {
    try {
        const res = await fetch(`/api/landmarks/${id}`);
        if (res.ok) {
            const landmark = await res.json();
            fillForm(landmark);
        } else {
            showToast('加载失败，请重试');
        }
    } catch (e) {
        console.error('加载地标失败:', e);
        showToast('加载失败，请检查网络');
    }
}

function fillForm(landmark) {
    document.getElementById('landmark-name').value = landmark.name || '';
    document.getElementById('landmark-address').value = landmark.address || '';
    document.getElementById('landmark-description').value = landmark.description || '';
    document.getElementById('landmark-image').value = landmark.imageUrl || '';
    document.getElementById('pos-x').value = landmark.x || 50;
    document.getElementById('pos-y').value = landmark.y || 50;

    if (landmark.icon) {
        selectedIcon = landmark.icon;
        updateIconSelection();
    }
    if (landmark.color) {
        selectedColor = landmark.color;
        updateColorSelection();
    }

    landmarkEnabled = landmark.enabled !== false;
    
    updatePosDisplay();
    document.getElementById('landmark-enabled').checked = landmarkEnabled;

    updateTimeDisplay(landmark);
    updateIconPreview();
}

function updateTimeDisplay(landmark) {
    const createdEl = document.getElementById('time-created');
    const updatedEl = document.getElementById('time-updated');
    
    if (landmark.createdAt) {
        createdEl.textContent = formatTimestamp(landmark.createdAt);
    } else {
        createdEl.textContent = '-';
    }
    
    if (landmark.updatedAt) {
        updatedEl.textContent = formatTimestamp(landmark.updatedAt);
    } else {
        updatedEl.textContent = '-';
    }
}

function formatTimestamp(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

function selectIcon(btn) {
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedIcon = btn.getAttribute('data-icon');
    updateIconPreview();
}

function updateIconSelection() {
    document.querySelectorAll('.icon-opt').forEach(btn => {
        if (btn.getAttribute('data-icon') === selectedIcon) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    updateIconSearchSelection();
    updateIconPreview();
}

function updateIconSearchSelection() {
    const modal = document.getElementById('icon-search-modal');
    if (!modal || !modal.classList.contains('show')) return;
    const grid = document.getElementById('icon-search-grid');
    if (!grid) return;
    grid.querySelectorAll('button').forEach(btn => {
        const iconName = btn.getAttribute('data-icon-name');
        if (`fa-${iconName}` === selectedIcon) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function selectColor(btn) {
    document.querySelectorAll('.clr-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.getAttribute('data-color');
    document.getElementById('custom-color').value = selectedColor;
    updateRGBFromColor(selectedColor);
    updateIconPreview();
}

function selectCustomColor(color) {
    document.querySelectorAll('.clr-opt').forEach(b => b.classList.remove('active'));
    selectedColor = color;
    updateRGBFromColor(color);
    updateIconPreview();
}

function updateRGBFromColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.getElementById('rgb-r').value = r;
    document.getElementById('rgb-g').value = g;
    document.getElementById('rgb-b').value = b;
    document.getElementById('hex-display').textContent = hex.toUpperCase();
}

function updateColorFromRGB() {
    let r = parseInt(document.getElementById('rgb-r').value);
    let g = parseInt(document.getElementById('rgb-g').value);
    let b = parseInt(document.getElementById('rgb-b').value);
    
    r = Math.max(0, Math.min(255, isNaN(r) ? 0 : r));
    g = Math.max(0, Math.min(255, isNaN(g) ? 0 : g));
    b = Math.max(0, Math.min(255, isNaN(b) ? 0 : b));
    
    document.getElementById('rgb-r').value = r;
    document.getElementById('rgb-g').value = g;
    document.getElementById('rgb-b').value = b;
    
    const hex = '#' + 
        r.toString(16).padStart(2, '0') + 
        g.toString(16).padStart(2, '0') + 
        b.toString(16).padStart(2, '0');
    
    selectedColor = hex;
    document.getElementById('custom-color').value = hex;
    document.getElementById('hex-display').textContent = hex.toUpperCase();
    
    document.querySelectorAll('.clr-opt').forEach(b => b.classList.remove('active'));
    updateIconPreview();
}

function updateColorSelection() {
    let found = false;
    document.querySelectorAll('.clr-opt').forEach(btn => {
        if (btn.getAttribute('data-color').toLowerCase() === selectedColor.toLowerCase()) {
            btn.classList.add('active');
            found = true;
        } else {
            btn.classList.remove('active');
        }
    });
    document.getElementById('custom-color').value = selectedColor;
    updateRGBFromColor(selectedColor);
    updateIconPreview();
}

function updateIconPreview() {
    const preview = document.getElementById('icon-preview');
    const previewI = document.getElementById('icon-preview-i');
    const markerDot = document.getElementById('picker-marker-dot');

    preview.style.background = selectedColor;
    markerDot.style.background = selectedColor;
    previewI.className = `fa-solid ${selectedIcon}`;
}

function previewImage() {
    const url = document.getElementById('landmark-image').value.trim();
    const modal = document.getElementById('preview-modal');
    const body = document.getElementById('preview-modal-body');
    
    if (!url) {
        showToast('请先输入图片URL');
        return;
    }
    
    // 使用 new URL() 构造函数验证URL的有效性
    let validatedUrl;
    try {
        validatedUrl = new URL(url);
        // 确保协议是 http 或 https
        if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
            showToast('请输入有效的图片URL');
            return;
        }
    } catch {
        showToast('请输入有效的图片URL');
        return;
    }
    
    // 使用 replaceChildren 替代 innerHTML 清空内容
    body.replaceChildren();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-state';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    spinner.style.fontSize = '24px';
    spinner.style.color = 'white';
    loadingDiv.appendChild(spinner);
    body.appendChild(loadingDiv);
    
    modal.classList.add('show');
    
    const img = document.createElement('img');
    img.src = validatedUrl.href;
    img.alt = '预览图';
    img.onload = function() {
        body.replaceChildren();
        body.appendChild(img);
    };
    img.onerror = function() {
        body.replaceChildren();
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = '图片加载失败';
        body.appendChild(placeholder);
    };
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.remove('show');
}

document.getElementById('preview-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePreviewModal();
    }
});

function openPositionPicker() {
    document.getElementById('pos-picker').classList.add('show');
    document.body.style.overflow = 'hidden';
    syncPickerMarker();
    initPickerTransform();
}

function closePositionPicker() {
    document.getElementById('pos-picker').classList.remove('show');
    document.body.style.overflow = '';
}

function initPickerTransform() {
    const img = document.getElementById('picker-img');
    const viewport = document.getElementById('picker-viewport');
    const transform = document.getElementById('picker-transform');
    
    const iw = img.naturalWidth || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    
    transform.style.width = iw + 'px';
    transform.style.height = ih + 'px';
    
    pickerMinScale = Math.min(vw / iw, vh / ih);
    pickerScale = pickerMinScale;
    pickerTranslateX = (vw - iw * pickerScale) / 2;
    pickerTranslateY = (vh - ih * pickerScale) / 2;
    
    applyPickerTransform();
}

function applyPickerTransform() {
    const transform = document.getElementById('picker-transform');
    transform.style.transform = `translate(${pickerTranslateX}px, ${pickerTranslateY}px) scale(${pickerScale})`;
}

function clampPickerBounds() {
    const img = document.getElementById('picker-img');
    const viewport = document.getElementById('picker-viewport');
    const iw = img.naturalWidth || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    
    const ww = iw * pickerScale;
    const wh = ih * pickerScale;

    const BOUNDARY_BUFFER = 0.2;
    const bufferW = ww * BOUNDARY_BUFFER;
    const bufferH = wh * BOUNDARY_BUFFER;
    
    const minTranslateX = vw - ww - bufferW;
    const maxTranslateX = bufferW;
    const minTranslateY = vh - wh - bufferH;
    const maxTranslateY = bufferH;
    
    pickerTranslateX = Math.max(minTranslateX, Math.min(maxTranslateX, pickerTranslateX));
    pickerTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, pickerTranslateY));
}

function pickerZoomIn() {
    const newScale = pickerScale * 1.25;
    if (newScale > 5) return;
    
    const img = document.getElementById('picker-img');
    const iw = img.naturalWidth || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    
    const imgCenterX = (iw * pickerScale) / 2 + pickerTranslateX;
    const imgCenterY = (ih * pickerScale) / 2 + pickerTranslateY;
    
    pickerTranslateX = imgCenterX - (iw * newScale) / 2;
    pickerTranslateY = imgCenterY - (ih * newScale) / 2;
    pickerScale = newScale;
    
    clampPickerBounds();
    applyPickerTransform();
    syncPickerMarker();
}

function pickerZoomOut() {
    const newScale = pickerScale / 1.25;
    if (newScale < pickerMinScale) {
        pickerScale = pickerMinScale;
        initPickerTransform();
        return;
    }
    
    const img = document.getElementById('picker-img');
    const iw = img.naturalWidth || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    
    const imgCenterX = (iw * pickerScale) / 2 + pickerTranslateX;
    const imgCenterY = (ih * pickerScale) / 2 + pickerTranslateY;
    
    pickerTranslateX = imgCenterX - (iw * newScale) / 2;
    pickerTranslateY = imgCenterY - (ih * newScale) / 2;
    pickerScale = newScale;
    
    clampPickerBounds();
    applyPickerTransform();
    syncPickerMarker();
}

function setupPickerDrag() {
    const viewport = document.getElementById('picker-viewport');
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    viewport.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - pickerTranslateX;
        startY = e.clientY - pickerTranslateY;
    });
    
    viewport.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        pickerTranslateX = e.clientX - startX;
        pickerTranslateY = e.clientY - startY;
        clampPickerBounds();
        applyPickerTransform();
        syncPickerMarker();
    });
    
    viewport.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    viewport.addEventListener('mouseleave', function() {
        isDragging = false;
    });
    
    viewport.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX - pickerTranslateX;
        startY = e.touches[0].clientY - pickerTranslateY;
    }, { passive: true });
    
    viewport.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        pickerTranslateX = e.touches[0].clientX - startX;
        pickerTranslateY = e.touches[0].clientY - startY;
        clampPickerBounds();
        applyPickerTransform();
        syncPickerMarker();
    }, { passive: true });
    
    viewport.addEventListener('touchend', function() {
        isDragging = false;
    });
}

function syncPositionFromInput() {
    syncPickerMarker();
}

function updatePosDisplay() {
    const x = parseFloat(document.getElementById('pos-x').value) || 0;
    const y = parseFloat(document.getElementById('pos-y').value) || 0;
    const xDisplay = document.getElementById('pos-x-display');
    const yDisplay = document.getElementById('pos-y-display');
    if (xDisplay) xDisplay.textContent = x.toFixed(1);
    if (yDisplay) yDisplay.textContent = y.toFixed(1);
}

function syncPickerMarker() {
    updatePosDisplay();
    
    const overlay = document.getElementById('pos-picker');
    if (!overlay || !overlay.classList.contains('show')) {
        return;
    }

    const x = parseFloat(document.getElementById('pos-x').value) || 0;
    const y = parseFloat(document.getElementById('pos-y').value) || 0;
    const marker = document.getElementById('picker-marker');

    const img = document.getElementById('picker-img');
    const viewport = document.getElementById('picker-viewport');
    const iw = img.naturalWidth || img.offsetWidth;
    const ih = img.naturalHeight || img.offsetHeight;
    const rect = viewport.getBoundingClientRect();

    const markerX = rect.left + pickerTranslateX + (x / 100) * iw * pickerScale;
    const markerY = rect.top + pickerTranslateY + (y / 100) * ih * pickerScale;

    marker.style.left = markerX + 'px';
    marker.style.top = markerY + 'px';
}

async function saveLandmark() {
    const name = document.getElementById('landmark-name').value.trim();
    const address = document.getElementById('landmark-address').value.trim();
    const description = document.getElementById('landmark-description').value.trim();
    const imageUrl = document.getElementById('landmark-image').value.trim();
    const xInput = document.getElementById('pos-x').value;
    const yInput = document.getElementById('pos-y').value;
    const x = parseFloat(xInput);
    const y = parseFloat(yInput);

    if (!name) {
        showToast('请输入地标名称');
        return;
    }

    if (isNaN(x) || x < 0 || x > 100) {
        showToast('X坐标必须在0-100之间');
        return;
    }

    if (isNaN(y) || y < 0 || y > 100) {
        showToast('Y坐标必须在0-100之间');
        return;
    }

    const colorPattern = /^#[0-9a-fA-F]{6}$/;
    if (!colorPattern.test(selectedColor)) {
        showToast('颜色格式不正确');
        return;
    }

    const data = {
        name,
        address,
        description,
        imageUrl,
        x,
        y,
        icon: selectedIcon,
        color: selectedColor,
        enabled: landmarkEnabled
    };

    try {
        let res;
        if (isNew) {
            res = await fetch('/api/landmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            res = await fetch(`/api/landmarks/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (res.ok) {
            showToast(isNew ? '创建成功' : '保存成功');
            setTimeout(() => {
                window.location.href = '/console';
            }, 800);
        } else {
            showToast('保存失败，请重试');
        }
    } catch (e) {
        console.error('保存失败:', e);
        showToast('保存失败，请检查网络');
    }
}

function goBack() {
    window.location.href = '/console';
}

document.getElementById('pos-picker').addEventListener('click', function(e) {
    if (e.target === this) {
        closePositionPicker();
    }
});

function toggleEnabled() {
    landmarkEnabled = document.getElementById('landmark-enabled').checked;
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('pos-picker').classList.contains('show')) {
            closePositionPicker();
        }
        if (document.getElementById('icon-search-modal').classList.contains('show')) {
            closeIconSearchModal();
        }
    }
});

function openIconSearchModal() {
    document.getElementById('icon-search-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('icon-search-input').value = '';
    renderIconGrid(FONT_AWESOME_ICONS);
}

function closeIconSearchModal() {
    document.getElementById('icon-search-modal').classList.remove('show');
    document.body.style.overflow = '';
}

function filterIcons() {
    const query = document.getElementById('icon-search-input').value.toLowerCase().trim();
    if (!query) {
        renderIconGrid(FONT_AWESOME_ICONS);
        return;
    }
    const filtered = FONT_AWESOME_ICONS.filter(icon => 
        icon.name.toLowerCase().includes(query)
    );
    renderIconGrid(filtered);
}

function renderIconGrid(icons) {
    const grid = document.getElementById('icon-search-grid');
    grid.replaceChildren();
    
    icons.forEach(icon => {
        const btn = document.createElement('button');
        const className = icon.prefix === 'brands' ? `fa-brands fa-${icon.name}` : `fa-solid fa-${icon.name}`;
        const iconEl = document.createElement('i');
        iconEl.className = className;
        btn.appendChild(iconEl);
        const label = document.createElement('span');
        label.className = 'icon-label';
        label.textContent = icon.name;
        btn.appendChild(label);
        btn.title = icon.name;
        btn.setAttribute('data-icon-name', icon.name);
        if (`fa-${icon.name}` === selectedIcon) {
            btn.classList.add('selected');
        }
        btn.onclick = function() {
            selectedIcon = `fa-${icon.name}`;
            updateIconSelection();
            updateIconPreview();
            closeIconSearchModal();
        };
        grid.appendChild(btn);
    });
}

document.getElementById('icon-search-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeIconSearchModal();
    }
});

init();
