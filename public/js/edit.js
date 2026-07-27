let isNew = true;
let editingName = null;
let selectedIcon = 'fa-location-dot';
let selectedColor = '#4285f4';
let landmarkEnabled = true;

function validateColor(color) {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    return hexPattern.test(color) ? color : '#4285f4';
}

const DEFAULT_QUICK_COLORS = [
    '#4285f4', '#ea4335', '#34a853', '#fbbc05',
    '#8e44ad', '#0e1115', '#f538a0', '#16a085'
];

let quickColors = [...DEFAULT_QUICK_COLORS];
let isColorEditMode = false;

const DEFAULT_QUICK_ICONS = [
    'fa-location-dot', 'fa-hospital', 'fa-film', 'fa-hotel',
    'fa-landmark', 'fa-tree', 'fa-utensils', 'fa-music',
    'fa-book', 'fa-shop', 'fa-school', 'fa-building',
    'fa-mosque', 'fa-church', 'fa-museum', 'fa-monument'
];

let quickIcons = [...DEFAULT_QUICK_ICONS];
let isIconEditMode = false;

const PICKER_MAX_SCALE = 5;
const PICKER_ZOOM_FACTOR = 1.25;
const PICKER_BOUNDARY_BUFFER = 0.2;

let pickerScale = 1;
let pickerTranslateX = 0;
let pickerTranslateY = 0;
let pickerMinScale = 1;

const urlParams = new URLSearchParams(window.location.search);
const nameParam = urlParams.get('name');

function init() {
    if (nameParam) {
        isNew = false;
        editingName = nameParam;
        document.getElementById('page-title').textContent = '编辑地标';
        loadLandmark(nameParam);
    } else {
        isNew = true;
        document.getElementById('page-title').textContent = '新增地标';
    }

    loadQuickIconsFromConfig();
    loadQuickColorsFromConfig();

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

async function loadLandmark(name) {
    try {
        const res = await fetch(`/api/landmarks?name=${encodeURIComponent(name)}`);
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
    document.getElementById('landmark-lat').value = landmark.lat !== null && landmark.lat !== undefined ? landmark.lat : '';
    document.getElementById('landmark-lng').value = landmark.lng !== null && landmark.lng !== undefined ? landmark.lng : '';

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

async function loadQuickIconsFromConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();
            if (config.quickIcons && Array.isArray(config.quickIcons) && config.quickIcons.length > 0) {
                quickIcons = config.quickIcons;
            }
        }
    } catch (e) {
        console.warn('加载快捷图标配置失败，使用默认列表');
    }
    renderQuickIcons();
}

async function saveQuickIcons() {
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quickIcons })
        });
    } catch (e) {
        console.error('保存快捷图标失败:', e);
    }
}

function renderQuickIcons() {
    const grid = document.getElementById('icon-grid');
    if (!grid) return;
    grid.replaceChildren();

    quickIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-opt';
        btn.setAttribute('data-icon', icon);

        const iEl = document.createElement('i');
        const iconName = icon.replace(/^fa-/, '');
        const isBrands = FONT_AWESOME_ICONS.some(x => x.name === iconName && x.prefix === 'brands');
        iEl.className = (isBrands ? 'fa-brands ' : 'fa-solid ') + icon;
        btn.appendChild(iEl);

        const label = document.createElement('span');
        label.className = 'icon-label';
        label.textContent = iconName;
        btn.appendChild(label);

        if (icon === selectedIcon) {
            btn.classList.add('active');
        }

        if (isIconEditMode) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'icon-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = '从快捷栏移除';
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                removeQuickIcon(icon);
            };
            btn.appendChild(removeBtn);
        } else {
            btn.onclick = function() {
                selectIcon(icon);
            };
        }

        grid.appendChild(btn);
    });

    // "更多"按钮
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'icon-opt more-icon-btn';
    moreBtn.onclick = function() {
        openIconSearchModal();
    };
    const moreI = document.createElement('i');
    moreI.className = 'fa-solid fa-ellipsis';
    moreBtn.appendChild(moreI);
    const moreLabel = document.createElement('span');
    moreLabel.className = 'icon-label';
    moreLabel.textContent = 'more';
    moreBtn.appendChild(moreLabel);
    grid.appendChild(moreBtn);

    updateIconSearchSelection();
}

function toggleIconEditMode() {
    isIconEditMode = !isIconEditMode;
    const btn = document.getElementById('icon-edit-toggle');
    const label = document.getElementById('icon-edit-label');
    const icon = btn.querySelector('i');
    if (isIconEditMode) {
        btn.classList.add('active');
        label.textContent = '完成';
        icon.className = 'fa-solid fa-check';
        document.body.classList.add('edit-mode');
    } else {
        btn.classList.remove('active');
        label.textContent = '编辑';
        icon.className = 'fa-solid fa-pen';
        document.body.classList.remove('edit-mode');
        saveQuickIcons();
    }
    renderQuickIcons();
}

function removeQuickIcon(icon) {
    quickIcons = quickIcons.filter(i => i !== icon);
    renderQuickIcons();
    saveQuickIcons();
}

function addQuickIcon(icon) {
    if (quickIcons.includes(icon)) return;
    quickIcons.push(icon);
    renderQuickIcons();
    saveQuickIcons();
    renderIconSearchGrid();
}

function selectIcon(icon) {
    selectedIcon = icon;
    updateIconSelection();
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
    const color = btn.getAttribute('data-color');
    selectedColor = color;
    document.getElementById('custom-color').value = color;
    renderColorRow();
    updateRGBFromColor(color);
    updateIconPreview();
}

function selectCustomColor(color) {
    if (isColorEditMode) {
        const hex = color.toLowerCase();
        if (!quickColors.includes(hex)) {
            quickColors.push(hex);
            renderColorRow();
            saveQuickColors();
        }
    }
    selectedColor = color;
    renderColorRow();
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
    
    renderColorRow();
    updateIconPreview();
}

function updateColorSelection() {
    renderColorRow();
    document.getElementById('custom-color').value = selectedColor;
    updateRGBFromColor(selectedColor);
    updateIconPreview();
}

async function loadQuickColorsFromConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();
            if (config.quickColors && Array.isArray(config.quickColors) && config.quickColors.length > 0) {
                quickColors = config.quickColors;
            }
        }
    } catch (e) {
        console.warn('加载快捷颜色配置失败，使用默认列表');
    }
    renderColorRow();
}

async function saveQuickColors() {
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quickColors })
        });
    } catch (e) {
        console.error('保存快捷颜色失败:', e);
    }
}

function renderColorRow() {
    const row = document.getElementById('color-row');
    if (!row) return;
    row.replaceChildren();

    quickColors.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'clr-opt';
        btn.setAttribute('data-color', color);
        btn.style.background = color;

        if (color.toLowerCase() === selectedColor.toLowerCase()) {
            btn.classList.add('active');
        }

        if (isColorEditMode) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'clr-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = '移除颜色';
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                removeQuickColor(color);
            };
            btn.appendChild(removeBtn);
        } else {
            btn.onclick = function() {
                selectColor(btn);
            };
        }

        row.appendChild(btn);
    });

    if (isColorEditMode) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'clr-add-btn';
        addBtn.title = '添加颜色';
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addBtn.onclick = function() {
            const picker = document.getElementById('custom-color');
            picker.click();
        };
        row.appendChild(addBtn);
    }
}

function toggleColorEditMode() {
    isColorEditMode = !isColorEditMode;
    const btn = document.getElementById('color-edit-toggle');
    const label = document.getElementById('color-edit-label');
    const icon = btn.querySelector('i');
    if (isColorEditMode) {
        btn.classList.add('active');
        label.textContent = '完成';
        icon.className = 'fa-solid fa-check';
        document.body.classList.add('color-edit-mode');
    } else {
        btn.classList.remove('active');
        label.textContent = '编辑';
        icon.className = 'fa-solid fa-pen';
        document.body.classList.remove('color-edit-mode');
        saveQuickColors();
    }
    renderColorRow();
}

function removeQuickColor(color) {
    quickColors = quickColors.filter(c => c.toLowerCase() !== color.toLowerCase());
    if (selectedColor.toLowerCase() === color.toLowerCase()) {
        selectedColor = quickColors[0] || '#4285f4';
        document.getElementById('custom-color').value = selectedColor;
        updateRGBFromColor(selectedColor);
        updateIconPreview();
    }
    renderColorRow();
    saveQuickColors();
}

function updateIconPreview() {
    const preview = document.getElementById('icon-preview');
    const previewI = document.getElementById('icon-preview-i');
    const markerDot = document.getElementById('picker-marker-dot');

    preview.style.background = selectedColor;
    markerDot.style.background = selectedColor;
    
    // 检测是否为品牌图标
    const iconName = selectedIcon.replace(/^fa-/, '');
    const isBrands = FONT_AWESOME_ICONS.some(x => x.name === iconName && x.prefix === 'brands');
    previewI.className = (isBrands ? 'fa-brands ' : 'fa-solid ') + selectedIcon;
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

    const BOUNDARY_BUFFER = PICKER_BOUNDARY_BUFFER;
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
    const newScale = pickerScale * PICKER_ZOOM_FACTOR;
    if (newScale > PICKER_MAX_SCALE) return;
    
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
    const newScale = pickerScale / PICKER_ZOOM_FACTOR;
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
        lat: parseLatLng(document.getElementById('landmark-lat').value),
        lng: parseLatLng(document.getElementById('landmark-lng').value),
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
            res = await fetch(`/api/landmarks?name=${encodeURIComponent(editingName)}`, {
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
    renderQuickIcons();
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

        const fullIcon = `fa-${icon.name}`;
        if (fullIcon === selectedIcon) {
            btn.classList.add('selected');
        }
        const inQuick = quickIcons.includes(fullIcon);
        if (inQuick) {
            btn.classList.add('added');
        }

        btn.onclick = function(e) {
            if (e.target.classList.contains('quick-add-btn')) return;
            selectedIcon = fullIcon;
            updateIconSelection();
            updateIconPreview();
        };

        if (!inQuick) {
            const addBtn = document.createElement('span');
            addBtn.className = 'quick-add-btn';
            addBtn.innerHTML = '+';
            addBtn.title = '添加到快捷栏';
            addBtn.onclick = function(e) {
                e.stopPropagation();
                addQuickIcon(fullIcon);
            };
            btn.appendChild(addBtn);
        }

        grid.appendChild(btn);
    });
}

function renderIconSearchGrid() {
    const modal = document.getElementById('icon-search-modal');
    if (!modal || !modal.classList.contains('show')) return;
    const query = document.getElementById('icon-search-input').value.toLowerCase().trim();
    const filtered = query
        ? FONT_AWESOME_ICONS.filter(icon => icon.name.toLowerCase().includes(query))
        : FONT_AWESOME_ICONS;
    renderIconGrid(filtered);
}

document.getElementById('icon-search-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeIconSearchModal();
    }
});

function parseLatLng(value) {
    if (value === undefined || value === null || value === '') return null;
    var num = Number(value);
    return isNaN(num) ? null : num;
}

async function geocodeFromAddress() {
    var address = document.getElementById('landmark-address').value.trim();
    if (!address) {
        showToast('请先输入地址');
        return;
    }
    
    try {
        var res = await fetch('/api/geocode?address=' + encodeURIComponent(address));
        if (res.ok) {
            var data = await res.json();
            if (data.lat && data.lng) {
                document.getElementById('landmark-lat').value = data.lat;
                document.getElementById('landmark-lng').value = data.lng;
                showToast('坐标获取成功');
            } else {
                showToast('未找到该地址的坐标');
            }
        } else if (res.status === 401) {
            showToast('请先登录控制台');
        } else if (res.status === 502) {
            showToast('地理编码服务不可用，请检查 TIANDITU_KEY 配置');
        } else {
            showToast('地理编码失败，请手动填写');
        }
    } catch (e) {
        console.error('地理编码失败:', e);
        showToast('网络错误，请手动填写');
    }
}

init();
