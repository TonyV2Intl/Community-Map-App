let isNew = true;
let editingId = null;
let selectedIcon = 'fa-location-dot';
let selectedColor = '#4285f4';
let landmarkEnabled = true;

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

    document.getElementById('picker-img-wrap').addEventListener('click', function(e) {
        const img = document.getElementById('picker-img');
        const r = img.getBoundingClientRect();
        let x = ((e.clientX - r.left) / r.width) * 100;
        let y = ((e.clientY - r.top) / r.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        document.getElementById('pos-x').value = x.toFixed(1);
        document.getElementById('pos-y').value = y.toFixed(1);
        syncPickerMarker();
    });
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

    updateImagePreview();
    updateIconPreview();
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
    updateIconPreview();
}

function selectColor(btn) {
    document.querySelectorAll('.clr-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.getAttribute('data-color');
    document.getElementById('custom-color').value = selectedColor;
    updateIconPreview();
}

function selectCustomColor(color) {
    document.querySelectorAll('.clr-opt').forEach(b => b.classList.remove('active'));
    selectedColor = color;
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
    if (!found) {
        document.getElementById('custom-color').value = selectedColor;
    }
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

function updateImagePreview() {
    const url = document.getElementById('landmark-image').value;
    const preview = document.getElementById('image-preview');

    if (url) {
        preview.innerHTML = `<img src="${url}" alt="预览图" onerror="this.parentElement.innerHTML='<i class=\\'fa-regular fa-image image-preview-placeholder\\'></i>'" />`;
    } else {
        preview.innerHTML = '<i class="fa-regular fa-image image-preview-placeholder"></i>';
    }
}

function openPositionPicker() {
    document.getElementById('pos-picker').classList.add('show');
    document.body.style.overflow = 'hidden';
    syncPickerMarker();
}

function closePositionPicker() {
    document.getElementById('pos-picker').classList.remove('show');
    document.body.style.overflow = '';
}

function syncPositionFromInput() {
    syncPickerMarker();
}

function syncPickerMarker() {
    const x = parseFloat(document.getElementById('pos-x').value) || 0;
    const y = parseFloat(document.getElementById('pos-y').value) || 0;
    const marker = document.getElementById('picker-marker');
    const label = document.getElementById('picker-label');

    marker.style.left = x + '%';
    marker.style.top = y + '%';
    label.textContent = `X: ${x.toFixed(1)}%  Y: ${y.toFixed(1)}%`;
}

async function saveLandmark() {
    const name = document.getElementById('landmark-name').value.trim();
    const address = document.getElementById('landmark-address').value.trim();
    const description = document.getElementById('landmark-description').value.trim();
    const imageUrl = document.getElementById('landmark-image').value.trim();
    const x = parseFloat(document.getElementById('pos-x').value) || 50;
    const y = parseFloat(document.getElementById('pos-y').value) || 50;

    if (!name) {
        showToast('请输入地标名称');
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

document.getElementById('pos-picker').addEventListener('click', function(e) {
    if (e.target === this) {
        closePositionPicker();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('pos-picker').classList.contains('show')) {
            closePositionPicker();
        }
    }
});

init();
