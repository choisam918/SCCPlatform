// 上傳功能

const MAX_PHOTOS = 12;
let selectedFiles = [];
let previewUrls = [];

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
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
    const photoInput = document.getElementById('photoInput');
    const selectBtn = document.getElementById('selectBtn');
    const uploadArea = document.getElementById('uploadArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    // 文件選擇
    photoInput.addEventListener('change', handleFileSelect);
    selectBtn.addEventListener('click', () => photoInput.click());
    
    // 拖拽上傳
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // 上傳和取消
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', handleCancel);
}

/**
 * 處理文件選擇
 */
async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    await processFiles(files);
}

/**
 * 處理拖拽
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)
    );
    
    if (files.length > 0) {
        processFiles(files);
    }
}

/**
 * 處理文件
 */
async function processFiles(files) {
    try {
        // 檢查當前照片數量
        const currentCount = await getPhotoCount();
        const remaining = MAX_PHOTOS - currentCount;
        
        if (remaining <= 0) {
            showNotification(`已達到最大照片數量（${MAX_PHOTOS}張），請先刪除舊照片`, 'warning');
            return;
        }
        
        // 限制選擇數量
        const filesToProcess = files.slice(0, remaining);
        
        if (files.length > remaining) {
            showNotification(`最多只能上傳${remaining}張照片，已自動選擇前${remaining}張`, 'warning');
        }
        
        // 驗證文件
        const validFiles = [];
        for (const file of filesToProcess) {
            const validation = validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                showNotification(`${file.name}: ${validation.error}`, 'error');
            }
        }
        
        if (validFiles.length === 0) {
            return;
        }
        
        // 添加到選擇列表
        selectedFiles = [...selectedFiles, ...validFiles];
        
        // 更新預覽
        await updatePreview();
        updateStatus();
        
    } catch (error) {
        console.error('處理文件失敗:', error);
        showNotification('處理文件失敗: ' + error.message, 'error');
    }
}

/**
 * 更新預覽
 */
async function updatePreview() {
    const previewGrid = document.getElementById('previewGrid');
    previewGrid.innerHTML = '';
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const previewUrl = createImagePreview(file);
        previewUrls.push(previewUrl);
        
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = file.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeFile(i);
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewGrid.appendChild(previewItem);
    }
}

/**
 * 移除文件
 */
function removeFile(index) {
    // 釋放預覽URL
    if (previewUrls[index]) {
        revokeImagePreview(previewUrls[index]);
    }
    
    selectedFiles.splice(index, 1);
    previewUrls.splice(index, 1);
    
    updatePreview();
    updateStatus();
}

/**
 * 更新狀態
 */
function updateStatus() {
    const statusInfo = document.getElementById('statusInfo');
    const selectedCount = document.getElementById('selectedCount');
    const uploadBtn = document.getElementById('uploadBtn');
    const currentCount = selectedFiles.length;
    
    selectedCount.textContent = currentCount;
    
    // 更新進度條
    const progressFill = document.getElementById('progressFill');
    const progress = (currentCount / MAX_PHOTOS) * 100;
    progressFill.style.width = progress + '%';
    
    // 顯示/隱藏狀態區域
    if (currentCount > 0) {
        statusInfo.style.display = 'block';
        uploadBtn.disabled = false;
    } else {
        statusInfo.style.display = 'none';
        uploadBtn.disabled = true;
    }
}

/**
 * 處理上傳
 */
async function handleUpload() {
    if (selectedFiles.length === 0) {
        showNotification('請先選擇照片', 'warning');
        return;
    }
    
    try {
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上傳中...';
        
        // 檢查當前照片數量
        const currentCount = await getPhotoCount();
        const totalCount = currentCount + selectedFiles.length;
        
        if (totalCount > MAX_PHOTOS) {
            showNotification(`超過最大照片數量（${MAX_PHOTOS}張）`, 'error');
            uploadBtn.disabled = false;
            uploadBtn.textContent = '確認上傳';
            return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        // 上傳每張照片
        for (const file of selectedFiles) {
            try {
                // 壓縮圖片
                const compressed = await compressImage(file);
                
                // 生成縮略圖
                const thumbnail = await generateThumbnail(file);
                
                // 獲取圖片尺寸
                const dimensions = await getImageDimensions(file);
                
                // 創建元數據
                const metadata = {
                    filename: file.name,
                    originalName: file.name,
                    uploadTime: Date.now(),
                    fileSize: file.size,
                    width: dimensions.width,
                    height: dimensions.height,
                    category: '',
                    tags: [],
                    description: ''
                };
                
                // 保存到數據庫
                await savePhoto(compressed.blob, thumbnail, metadata);
                successCount++;
                
            } catch (error) {
                console.error('上傳照片失敗:', file.name, error);
                failCount++;
            }
        }
        
        // 清理預覽URL
        previewUrls.forEach(url => revokeImagePreview(url));
        previewUrls = [];
        selectedFiles = [];
        
        // 重置界面
        document.getElementById('photoInput').value = '';
        updatePreview();
        updateStatus();
        
        // 顯示結果
        if (successCount > 0) {
            showNotification(`成功上傳 ${successCount} 張照片`, 'success');
            
            // 詢問是否跳轉到展覽頁面
            setTimeout(() => {
                if (confirm('上傳成功！是否立即查看展覽？')) {
                    window.location.href = 'gallery.html';
                }
            }, 500);
        }
        
        if (failCount > 0) {
            showNotification(`${failCount} 張照片上傳失敗`, 'error');
        }
        
    } catch (error) {
        console.error('上傳失敗:', error);
        showNotification('上傳失敗: ' + error.message, 'error');
    } finally {
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = false;
        uploadBtn.textContent = '確認上傳';
    }
}

/**
 * 處理取消
 */
function handleCancel() {
    // 清理預覽URL
    previewUrls.forEach(url => revokeImagePreview(url));
    previewUrls = [];
    selectedFiles = [];
    
    // 重置界面
    document.getElementById('photoInput').value = '';
    updatePreview();
    updateStatus();
}
