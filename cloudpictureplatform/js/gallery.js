// 展覽頁面邏輯

let photos = [];
let currentMode = '3d'; // '3d' 或 'traditional'
let currentImageIndex = 0;
let deleteMode = false; // 刪除模式開關
let selectedPhotos = new Set(); // 選中的照片ID集合

// DOM元素
const emptyState = document.getElementById('emptyState');
const galleryContainer = document.getElementById('galleryContainer');
const traditionalGallery = document.getElementById('traditionalGallery');
const galleryGrid = document.getElementById('galleryGrid');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const fullscreenViewer = document.getElementById('fullscreenViewer');
const fullscreenImage = document.getElementById('fullscreenImage');
const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const imageIndex = document.getElementById('imageIndex');
const deleteModeBtn = document.getElementById('deleteModeBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const deleteModeInfo = document.getElementById('deleteModeInfo');
const selectedCount = document.getElementById('selectedCount');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 檢查URL參數，決定初始模式
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        if (modeParam === 'album' || modeParam === 'traditional') {
            currentMode = 'traditional';
            console.log('從URL參數設置為相冊模式');
        }
        
        await initDB();
        await loadGallery();
        setupEventListeners();
    } catch (error) {
        console.error('初始化失敗:', error);
        showNotification('載入展覽失敗', 'error');
    }
});

/**
 * 设置事件监听
 */
function setupEventListeners() {
    modeToggleBtn.addEventListener('click', toggleMode);
    closeFullscreenBtn.addEventListener('click', closeFullscreen);
    prevBtn.addEventListener('click', showPrevImage);
    nextBtn.addEventListener('click', showNextImage);
    
    // 刪除模式按鈕
    if (deleteModeBtn) {
        deleteModeBtn.addEventListener('click', toggleDeleteMode);
    }
    
    // 刪除選中照片按鈕
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    }
    
    // 取消刪除模式按鈕
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', cancelDeleteMode);
    }
    
    // 全選/取消全選按鈕
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllPhotos);
    }
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllPhotos);
    }
    
    // 鍵盤快捷鍵
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * 加载展览
 */
async function loadGallery() {
    try {
        photos = await getAllPhotos();
        console.log('獲取到的照片:', photos);
        console.log('照片數量:', photos.length);
        
        if (photos.length === 0) {
            showEmptyState();
            return;
        }

        // 驗證照片數據結構
        photos = photos.filter(photo => {
            if (!photo) {
                console.warn('發現空照片對象，已過濾');
                return false;
            }
            if (!photo.file && !photo.thumbnail) {
                console.warn('照片沒有文件或縮圖，已過濾', photo);
                return false;
            }
            return true;
        });

        if (photos.length === 0) {
            showEmptyState();
            return;
        }

        
        if (currentMode === '3d') {
            // 顯示3D容器，隱藏其他
            if (galleryContainer) galleryContainer.classList.remove('hidden');
            if (traditionalGallery) traditionalGallery.classList.add('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            
            if (window.init3DGallery) {
                try {
                    await window.init3DGallery();
                    console.log('3D展覽館初始化成功');
                } catch (error) {
                    console.error('初始化3D展覽館失敗:', error);
                    showNotification('3D展覽館初始化失敗，已切換到相冊模式', 'error');
                    // 如果3D模式失敗，切換到相冊模式
                    currentMode = 'traditional';
                    console.log('3D模式失敗，切換到相冊模式');
                    showTraditionalGallery();
                }
            } else {
                console.warn('init3DGallery 函數不存在，切換到相冊模式');
                showNotification('3D功能未加載，已切換到相冊模式', 'warning');
                currentMode = 'traditional';
                showTraditionalGallery();
            }
        } else {
            showTraditionalGallery();
        }
    } catch (error) {
        console.error('載入展覽失敗:', error);
        console.error('錯誤詳情:', error.stack);
        showNotification('載入展覽失敗: ' + error.message, 'error');
    }
}

/**
 * 顯示空狀態
 */
function showEmptyState() {
    if (emptyState) emptyState.classList.remove('hidden');
    if (galleryContainer) galleryContainer.classList.add('hidden');
    if (traditionalGallery) traditionalGallery.classList.add('hidden');
}

/**
 * 處理清除所有照片
 */
async function handleClearAllPhotos() {
    // 確認對話框
    const confirmed = confirm('確定要清除所有照片嗎？此操作無法撤銷！');
    if (!confirmed) {
        return;
    }
    
    try {
        // 銷毀3D場景
        if (window.destroy3DGallery) {
            window.destroy3DGallery();
        }
        
        // 清除所有照片
        await clearAllPhotos();
        
        // 顯示成功提示
        showNotification('所有照片已清除', 'success');
        
        // 重新載入展覽（會顯示空狀態）
        await loadGallery();
        
        // 更新主頁的照片計數
        if (window.updatePhotoCountDisplay) {
            window.updatePhotoCountDisplay();
        }
        
        console.log('所有照片清除完成');
    } catch (error) {
        console.error('清除照片失敗:', error);
        showNotification('清除照片失敗: ' + error.message, 'error');
    }
}

/**
 * 切换模式
 */
async function toggleMode() {
    console.log('切換模式，當前模式:', currentMode, '照片數量:', photos.length);
    
    // 確保照片數據已加載
    if (photos.length === 0) {
        console.log('照片數據為空，重新加載');
        try {
            await loadGallery();
            if (photos.length === 0) {
                showNotification('沒有照片可顯示', 'warning');
                return;
            }
        } catch (error) {
            console.error('重新加載照片失敗:', error);
            showNotification('載入照片失敗', 'error');
            return;
        }
    }
    
    currentMode = currentMode === '3d' ? 'traditional' : '3d';
    
    if (currentMode === '3d') {
        if (modeToggleBtn) modeToggleBtn.textContent = '切換到相冊模式';
        // 隱藏傳統模式，顯示3D容器
        if (traditionalGallery) traditionalGallery.classList.add('hidden');
        if (galleryContainer) galleryContainer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // 隱藏刪除模式相關按鈕
        if (typeof updateDeleteModeUI === 'function') {
            updateDeleteModeUI();
        }
        
        // 初始化3D展覽館
        if (window.init3DGallery) {
            try {
                await window.init3DGallery(photos); // 傳遞照片數據
                console.log('3D模式切換成功');
            } catch (error) {
                console.error('切換到3D模式失敗:', error);
                showNotification('切換到3D模式失敗', 'error');
                // 如果3D模式失敗，切換回相冊模式
                currentMode = 'traditional';
                showTraditionalGallery();
            }
        } else {
            console.error('init3DGallery 函數不存在');
            showNotification('3D功能未加載', 'error');
            currentMode = 'traditional';
            showTraditionalGallery();
        }
    } else {
        if (modeToggleBtn) modeToggleBtn.textContent = '切換到3D模式';
        // 銷毀3D場景
        if (window.destroy3DGallery) {
            window.destroy3DGallery();
        }
        // 如果處於刪除模式，取消刪除模式
        if (deleteMode) {
            cancelDeleteMode();
        } else {
            console.log('切換到相冊模式，顯示照片');
            showTraditionalGallery();
        }
    }
}

/**
 * 顯示相冊模式
 */
function showTraditionalGallery() {
    console.log('顯示相冊模式，照片數量:', photos.length);
    console.log('照片數據:', photos);
    
    if (galleryContainer) galleryContainer.classList.add('hidden');
    if (traditionalGallery) traditionalGallery.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    
    if (!galleryGrid) {
        console.error('找不到galleryGrid元素');
        return;
    }
    
    if (!traditionalGallery) {
        console.error('找不到traditionalGallery元素');
        return;
    }
    
    // 確保traditionalGallery可見
    traditionalGallery.classList.remove('hidden');
    traditionalGallery.style.display = 'block';
    
    galleryGrid.innerHTML = '';
    
    // 更新刪除模式信息顯示
    if (typeof updateDeleteModeUI === 'function') {
        updateDeleteModeUI();
    }
    
    if (photos.length === 0) {
        console.warn('沒有照片可顯示');
        showEmptyState();
        return;
    }
    
    let validPhotoCount = 0;
    photos.forEach((photo, index) => {
        if (!photo) {
            console.warn('照片對象為空，跳過', index);
            return;
        }

        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.photoId = photo.id;
        
        // 如果處於刪除模式，添加選中框
        if (deleteMode) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'photo-checkbox';
            checkbox.dataset.photoId = photo.id;
            checkbox.checked = selectedPhotos.has(photo.id);
            checkbox.addEventListener('change', (e) => {
                togglePhotoSelection(photo.id, e.target.checked);
            });
            item.appendChild(checkbox);
        }
        
        const img = document.createElement('img');
        const imageBlob = photo.thumbnail || photo.file;
        
        console.log(`處理照片 ${index}:`, {
            hasId: !!photo.id,
            hasFile: !!photo.file,
            hasThumbnail: !!photo.thumbnail,
            hasImageBlob: !!imageBlob,
            photoId: photo.id
        });
        
        if (imageBlob) {
            try {
                img.src = URL.createObjectURL(imageBlob);
                img.alt = photo.metadata?.filename || `照片 ${index + 1}`;
                
                // 根據模式設置點擊事件
                if (deleteMode) {
                    img.onclick = (e) => {
                        e.stopPropagation();
                        const checkbox = item.querySelector('.photo-checkbox');
                        if (checkbox) {
                            checkbox.checked = !checkbox.checked;
                            togglePhotoSelection(photo.id, checkbox.checked);
                        }
                    };
                } else {
                    img.onclick = () => showFullscreen(index);
                }
                
                img.onload = () => {
                    console.log(`照片 ${index} 載入成功`);
                };
                
                img.onerror = (e) => {
                    console.error('圖片載入失敗:', index, photo, e);
                    // 如果縮圖失敗，嘗試使用原圖
                    if (photo.thumbnail && photo.file && imageBlob === photo.thumbnail) {
                        console.log('嘗試使用原圖:', index);
                        img.src = URL.createObjectURL(photo.file);
                    }
                };
            } catch (error) {
                console.error('創建圖片URL失敗:', index, error, photo);
            }
        } else {
            console.error('照片沒有文件或縮圖', index, photo);
            // 創建一個佔位符
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E圖片載入失敗%3C/text%3E%3C/svg%3E';
            img.alt = '圖片載入失敗';
        }
        
        item.appendChild(img);
        galleryGrid.appendChild(item);
        validPhotoCount++;
    });
    
    console.log(`相冊模式顯示完成，有效照片數: ${validPhotoCount}`);
    
    // 如果沒有有效照片，顯示提示
    if (validPhotoCount === 0 && photos.length > 0) {
        console.error('所有照片都無法顯示');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = '照片載入失敗，請重新上傳';
        errorMsg.style.cssText = 'text-align: center; padding: 40px; color: #999;';
        galleryGrid.appendChild(errorMsg);
    }
}


/**
 * 显示全屏
 */
function showFullscreen(index) {
    currentImageIndex = index;
    updateFullscreenImage();
    if (fullscreenViewer) fullscreenViewer.classList.remove('hidden');
}

/**
 * 关闭全屏
 */
function closeFullscreen() {
    if (fullscreenViewer) fullscreenViewer.classList.add('hidden');
}

/**
 * 更新全屏图片
 */
function updateFullscreenImage() {
    const photo = photos[currentImageIndex];
    if (photo) {
        fullscreenImage.src = URL.createObjectURL(photo.file);
        imageIndex.textContent = `${currentImageIndex + 1} / ${photos.length}`;
        
        prevBtn.disabled = currentImageIndex === 0;
        nextBtn.disabled = currentImageIndex === photos.length - 1;
    }
}

/**
 * 上一张
 */
function showPrevImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateFullscreenImage();
    }
}

/**
 * 下一张
 */
function showNextImage() {
    if (currentImageIndex < photos.length - 1) {
        currentImageIndex++;
        updateFullscreenImage();
    }
}

/**
 * 切換刪除模式
 */
function toggleDeleteMode() {
    deleteMode = true;
    selectedPhotos.clear();
    updateDeleteModeUI();
    
    // 切換到相冊模式以便選擇照片
    if (currentMode === '3d') {
        currentMode = 'traditional';
        if (modeToggleBtn) modeToggleBtn.textContent = '切換到3D模式';
        if (window.destroy3DGallery) {
            window.destroy3DGallery();
        }
    }
    
    showTraditionalGallery();
}

/**
 * 取消刪除模式
 */
function cancelDeleteMode() {
    deleteMode = false;
    selectedPhotos.clear();
    updateDeleteModeUI();
    showTraditionalGallery();
}

/**
 * 更新刪除模式UI
 */
function updateDeleteModeUI() {
    if (deleteModeBtn) {
        deleteModeBtn.classList.toggle('hidden', deleteMode);
    }
    if (deleteSelectedBtn) {
        deleteSelectedBtn.classList.toggle('hidden', !deleteMode);
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.classList.toggle('hidden', !deleteMode);
    }
    if (deleteModeInfo) {
        deleteModeInfo.classList.toggle('hidden', !deleteMode);
    }
    if (selectedCount) {
        selectedCount.textContent = selectedPhotos.size;
    }
}

/**
 * 切換照片選中狀態
 */
function togglePhotoSelection(photoId, checked) {
    if (checked) {
        selectedPhotos.add(photoId);
    } else {
        selectedPhotos.delete(photoId);
    }
    updateDeleteModeUI();
}

/**
 * 全選照片
 */
function selectAllPhotos() {
    photos.forEach(photo => {
        if (photo && photo.id) {
            selectedPhotos.add(photo.id);
        }
    });
    updateDeleteModeUI();
    
    // 更新所有複選框
    document.querySelectorAll('.photo-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
}

/**
 * 取消全選
 */
function deselectAllPhotos() {
    selectedPhotos.clear();
    updateDeleteModeUI();
    
    // 更新所有複選框
    document.querySelectorAll('.photo-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

/**
 * 處理刪除選中的照片
 */
async function handleDeleteSelected() {
    if (selectedPhotos.size === 0) {
        showNotification('請先選擇要刪除的照片', 'warning');
        return;
    }
    
    const confirmed = confirm(`確定要刪除選中的 ${selectedPhotos.size} 張照片嗎？此操作無法撤銷！`);
    if (!confirmed) {
        return;
    }
    
    try {
        // 刪除選中的照片
        const deletePromises = Array.from(selectedPhotos).map(photoId => deletePhoto(photoId));
        await Promise.all(deletePromises);
        
        // 重置刪除模式
        cancelDeleteMode();
        
        // 顯示成功提示
        showNotification(`已成功刪除 ${selectedPhotos.size} 張照片`, 'success');
        
        // 重新載入展覽
        await loadGallery();
        
        // 更新主頁的照片計數
        if (window.updatePhotoCountDisplay) {
            window.updatePhotoCountDisplay();
        }
        
        // 如果刪除後沒有照片，需要銷毀3D場景
        if (photos.length === 0 && window.destroy3DGallery) {
            window.destroy3DGallery();
        }
        
        console.log('刪除照片完成');
    } catch (error) {
        console.error('刪除照片失敗:', error);
        showNotification('刪除照片失敗: ' + error.message, 'error');
    }
}

/**
 * 鍵盤快捷鍵
 */
function handleKeyPress(e) {
    if (fullscreenViewer && !fullscreenViewer.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            closeFullscreen();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        }
    }
}

