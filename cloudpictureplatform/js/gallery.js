// 展覽功能

let currentMode = '3d'; // '3d' 或 'album' - 默認顯示3D模式
let photos = [];
let deleteMode = false;

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 先檢查URL參數設置模式，確保在loadGallery之前設置
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'album') {
            currentMode = 'album';
        } else {
            currentMode = '3d'; // 默認顯示3D模式
        }
        
        await initDB();
        await loadGallery();
        setupEventListeners();
    } catch (error) {
        console.error('初始化失敗:', error);
        showNotification('系統初始化失敗，請重新整理頁面重試', 'error');
    }
});

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    const switchModeBtn = document.getElementById('switchModeBtn');
    const deleteModeBtn = document.getElementById('deleteModeBtn');
    
    // 更新按鈕文本以反映當前模式
    if (switchModeBtn) {
        switchModeBtn.textContent = currentMode === '3d' ? '切換到相冊模式' : '切換到3D模式';
    }
    
    switchModeBtn.addEventListener('click', toggleMode);
    deleteModeBtn.addEventListener('click', toggleDeleteMode);
}

/**
 * 載入展覽
 */
async function loadGallery() {
    try {
        showLoading(true);
        
        photos = await getAllPhotos();
        
        if (photos.length === 0) {
            showEmptyState();
            return;
        }
        
        hideEmptyState();
        
        // 根據當前模式顯示
        if (currentMode === '3d') {
            await init3DGallery();
        } else {
            showAlbumMode();
        }
        
    } catch (error) {
        console.error('載入展覽失敗:', error);
        showNotification('載入展覽失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 切換模式
 */
async function toggleMode() {
    currentMode = currentMode === '3d' ? 'album' : '3d';
    
    // 更新按鈕文本
    const switchModeBtn = document.getElementById('switchModeBtn');
    if (switchModeBtn) {
        switchModeBtn.textContent = currentMode === '3d' ? '切換到相冊模式' : '切換到3D模式';
    }
    
    if (currentMode === '3d') {
        await init3DGallery();
    } else {
        showAlbumMode();
    }
}

/**
 * 顯示相冊模式
 */
function showAlbumMode() {
    const sceneContainer = document.getElementById('sceneContainer');
    const albumContainer = document.getElementById('albumContainer');
    
    if (!albumContainer) {
        console.error('找不到相冊容器');
        return;
    }
    
    // 隱藏3D場景
    if (sceneContainer) {
        sceneContainer.style.display = 'none';
        sceneContainer.style.visibility = 'hidden';
    }
    
    // 顯示相冊容器
    albumContainer.style.display = 'block';
    albumContainer.style.visibility = 'visible';
    albumContainer.classList.add('active');
    
    
    // 清空並重新渲染相冊
    const albumGrid = document.getElementById('albumGrid');
    if (!albumGrid) {
        console.error('找不到相冊網格');
        return;
    }
    albumGrid.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'album-item';
        item.dataset.photoId = photo.id;
        
        const img = document.createElement('img');
        const thumbnailUrl = URL.createObjectURL(photo.thumbnail);
        img.src = thumbnailUrl;
        img.alt = photo.filename || `照片 ${index + 1}`;
        
        // 點擊查看大圖
        item.addEventListener('click', () => {
            if (deleteMode) {
                handleDeletePhoto(photo.id);
            } else {
                showImageModal(photo);
            }
        });
        
        // 長按進入刪除模式
        let longPressTimer;
        item.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                if (!deleteMode) {
                    toggleDeleteMode();
                }
            }, 500);
        });
        
        item.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
        
        item.appendChild(img);
        albumGrid.appendChild(item);
    });
}

/**
 * 初始化3D展覽
 */
async function init3DGallery() {
    try {
        console.log('開始初始化3D展覽，當前模式:', currentMode);
        console.log('照片數量:', photos.length);
        
        const sceneContainer = document.getElementById('sceneContainer');
        const albumContainer = document.getElementById('albumContainer');
        
        if (!sceneContainer) {
            console.error('找不到場景容器');
            return;
        }
        
        // 确保3D容器显示
        sceneContainer.style.display = 'block';
        sceneContainer.style.visibility = 'visible';
        albumContainer.classList.remove('active');
        albumContainer.style.display = 'none';
        
        // 檢查Three.js是否已加載
        if (typeof THREE === 'undefined') {
            console.warn('Three.js未加載，等待加載...');
            let retries = 0;
            const maxRetries = 50;
            const checkThree = setInterval(() => {
                if (typeof THREE !== 'undefined') {
                    clearInterval(checkThree);
                    console.log('Three.js已加載，重新初始化3D場景');
                    init3DGallery();
                } else if (retries++ >= maxRetries) {
                    clearInterval(checkThree);
                    console.error('Three.js加載超時');
                    showNotification('3D模式需要Three.js庫，請檢查網絡連接', 'error');
                    currentMode = 'album';
                    showAlbumMode();
                }
            }, 100);
            return;
        }
        
        // 調用3D展覽初始化
        // 確保3d-gallery.js已完全加載
        const init3DSceneFunc = window.init3DScene || init3DScene;
        
        if (typeof init3DSceneFunc === 'function') {
            try {
                await init3DSceneFunc(photos);
            } catch (error) {
                console.error('3D場景初始化錯誤:', error);
                showNotification('3D場景初始化失敗: ' + error.message, 'error');
                currentMode = 'album';
                showAlbumMode();
            }
        } else {
            // 等待函數加載
            let retries = 0;
            const maxRetries = 30; // 30次（3秒）
            const checkInit3DScene = setInterval(() => {
                const func = window.init3DScene || init3DScene;
                if (typeof func === 'function') {
                    clearInterval(checkInit3DScene);
                    func(photos).then(() => {
                        // 初始化成功
                    }).catch(error => {
                        console.error('3D場景初始化錯誤:', error);
                        showNotification('3D場景初始化失敗: ' + error.message, 'error');
                        currentMode = 'album';
                        showAlbumMode();
                    });
                } else if (retries++ >= maxRetries) {
                    clearInterval(checkInit3DScene);
                    console.error('3D展覽功能未加載，init3DScene函數不存在');
                    showNotification('3D模式加載失敗，請檢查控制台錯誤信息', 'error');
                    currentMode = 'album';
                    showAlbumMode();
                }
            }, 100);
        }
    } catch (error) {
        console.error('初始化3D展覽失敗:', error);
        showNotification('3D模式初始化失敗: ' + error.message, 'error');
        currentMode = 'album';
        showAlbumMode();
    }
}

/**
 * 顯示圖片模態框
 */
function showImageModal(photo) {
    // 打開圖片查看器
    const imageUrl = URL.createObjectURL(photo.file);
    
    // 使用移動端修復中的圖片查看器（如果可用）
    if (window.mobileFixes && typeof window.mobileFixes.fix3DImageZoom === 'function') {
        const tempImg = document.createElement('img');
        tempImg.src = imageUrl;
        tempImg.style.display = 'none';
        document.body.appendChild(tempImg);
        
        setTimeout(() => {
            tempImg.click();
            setTimeout(() => document.body.removeChild(tempImg), 100);
        }, 100);
    } else {
        // 降級方案：在新窗口打開
        window.open(imageUrl, '_blank');
    }
}

/**
 * 切換刪除模式
 */
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const deleteModeBtn = document.getElementById('deleteModeBtn');
    
    if (deleteMode) {
        deleteModeBtn.style.display = 'block';
        deleteModeBtn.textContent = '退出刪除';
        showNotification('刪除模式已開啟，點擊照片可刪除', 'info');
    } else {
        deleteModeBtn.style.display = 'none';
        deleteModeBtn.textContent = '刪除模式';
        showNotification('刪除模式已關閉', 'info');
    }
}

/**
 * 處理刪除照片
 */
async function handleDeletePhoto(photoId) {
    if (!confirm('確定要刪除這張照片嗎？')) {
        return;
    }
    
    try {
        await deletePhoto(photoId);
        showNotification('照片已刪除', 'success');
        
        // 重新載入展覽
        await loadGallery();
        
    } catch (error) {
        console.error('刪除照片失敗:', error);
        showNotification('刪除照片失敗: ' + error.message, 'error');
    }
}

/**
 * 顯示/隱藏空狀態
 */
function showEmptyState() {
    document.getElementById('emptyState').style.display = 'block';
    const sceneContainer = document.getElementById('sceneContainer');
    if (sceneContainer) {
        sceneContainer.style.display = 'none';
    }
    document.getElementById('albumContainer').classList.remove('active');
}

function hideEmptyState() {
    document.getElementById('emptyState').style.display = 'none';
}

/**
 * 顯示/隱藏加載狀態
 */
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
}
