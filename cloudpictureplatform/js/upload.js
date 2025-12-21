// 上傳功能

// MAX_PHOTOS 在 storage.js 中已定義，這裡直接使用
let selectedFiles = [];
let processingFiles = false;

// DOM元素（将在DOMContentLoaded中初始化）
let fileInput, selectBtn, uploadArea, previewSection, previewGrid;
let countInfo, selectedCount, countProgressBar;
let uploadControls, uploadBtn, cancelBtn;
let uploadProgress, progressText, progressPercent, progressBarFill;
let successMessage, successCount;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 获取DOM元素
        fileInput = document.getElementById('fileInput');
        selectBtn = document.getElementById('selectBtn');
        uploadArea = document.getElementById('uploadArea');
        previewSection = document.getElementById('previewSection');
        previewGrid = document.getElementById('previewGrid');
        countInfo = document.getElementById('countInfo');
        selectedCount = document.getElementById('selectedCount');
        countProgressBar = document.getElementById('countProgressBar');
        uploadControls = document.getElementById('uploadControls');
        uploadBtn = document.getElementById('uploadBtn');
        cancelBtn = document.getElementById('cancelBtn');
        uploadProgress = document.getElementById('uploadProgress');
        progressText = document.getElementById('progressText');
        progressPercent = document.getElementById('progressPercent');
        progressBarFill = document.getElementById('progressBarFill');
        successMessage = document.getElementById('successMessage');
        successCount = document.getElementById('successCount');

        // 检查DOM元素是否存在
        if (!fileInput || !selectBtn || !uploadArea) {
            console.error('DOM元素未找到');
            console.error('fileInput:', fileInput);
            console.error('selectBtn:', selectBtn);
            console.error('uploadArea:', uploadArea);
            showNotification('頁面載入失敗，請重新整理重試', 'error');
            return;
        }

        console.log('DOM元素獲取成功');
        console.log('fileInput:', fileInput);
        console.log('selectBtn:', selectBtn);

        await initDB();
        setupEventListeners();
        await checkExistingPhotos();
        
        // 初始化時檢查照片數量，如果達到12張，禁用上傳按鈕
        await updateCountInfo();
        
        console.log('上傳頁面初始化成功');
    } catch (error) {
        console.error('初始化失敗:', error);
        showNotification('系統初始化失敗: ' + error.message, 'error');
    }
});

/**
 * 設置事件監聽
 */
function setupEventListeners() {
    try {
        // 選擇按鈕點擊 - 只添加一個事件監聽器，避免重複
        if (selectBtn && fileInput) {
            // 確保按鈕樣式正確
            selectBtn.style.pointerEvents = 'auto';
            selectBtn.style.cursor = 'pointer';
            selectBtn.style.position = 'relative';
            selectBtn.style.zIndex = '10';
            
            // 使用標記確保只添加一次監聽器
            if (!selectBtn.hasAttribute('data-listener-added')) {
                const clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('點擊選擇按鈕');
                    
                    try {
                        if (fileInput) {
                            fileInput.click();
                            console.log('已觸發fileInput.click()');
                        }
                    } catch (err) {
                        console.error('觸發fileInput.click()失敗:', err);
                    }
                };
                
                // 只添加一個事件監聽器
                selectBtn.addEventListener('click', clickHandler, false);
                selectBtn.setAttribute('data-listener-added', 'true');
                
                console.log('選擇按鈕事件監聽器已添加');
            } else {
                console.log('選擇按鈕事件監聽器已存在，跳過重複添加');
            }
        } else {
            console.error('selectBtn或fileInput不存在', { 
                selectBtn: !!selectBtn, 
                fileInput: !!fileInput
            });
        }

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', (e) => {
                // 如果點擊的是按鈕，不觸發
                if (e.target === selectBtn || e.target.closest('#selectBtn') || e.target.closest('.btn')) {
                    return;
                }
                console.log('點擊上傳區域');
                fileInput.click();
            });
        }

        // 檔案選擇 - 確保只添加一次監聽器
        if (fileInput) {
            if (!fileInput.hasAttribute('data-listener-added')) {
                fileInput.addEventListener('change', (e) => {
                    console.log('檔案選擇事件觸發', e.target.files ? e.target.files.length : 0);
                    handleFileSelect(e);
                });
                fileInput.setAttribute('data-listener-added', 'true');
                console.log('檔案選擇事件監聽器已添加');
            } else {
                console.log('檔案選擇事件監聽器已存在，跳過重複添加');
            }
        }

        // 拖拽上傳
        if (uploadArea) {
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);
        }

        // 上傳按鈕
        if (uploadBtn) {
            uploadBtn.addEventListener('click', handleUpload);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
        }

        console.log('事件監聽器設置完成');
    } catch (error) {
        console.error('設置事件監聽器失敗:', error);
        showNotification('頁面功能初始化失敗: ' + error.message, 'error');
    }
}

/**
 * 檢查已有照片數量
 */
async function checkExistingPhotos() {
    try {
        const maxPhotos = 12; // 最大照片數量
        const count = await getPhotoCount();
        if (count >= maxPhotos) {
            showNotification(`已達到最大照片數量（${maxPhotos}張），請先刪除一些照片`, 'warning');
        }
    } catch (error) {
        console.error('檢查照片數量失敗:', error);
    }
}

/**
 * 處理檔案選擇
 */
async function handleFileSelect(event) {
    try {
        console.log('handleFileSelect 被調用');
        const files = Array.from(event.target.files);
        console.log('選擇的檔案數量:', files.length);
        
        if (files.length === 0) {
            console.log('沒有選擇檔案');
            return;
        }
        
        await processFiles(files);
        // 注意：不要立即重置input，否則無法重新選擇相同檔案
        // fileInput.value = ''; 
    } catch (error) {
        console.error('處理檔案選擇失敗:', error);
        showNotification('處理檔案失敗: ' + error.message, 'error');
    }
}

/**
 * 处理拖拽
 */
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

async function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    await processFiles(files);
}

/**
 * 處理檔案
 */
async function processFiles(files) {
    if (processingFiles) {
        console.log('正在處理檔案，跳過');
        return;
    }

    try {
        console.log('開始處理檔案，數量:', files.length);
        
        // 檢查總數 - 嚴格限制：達到12張就不能再上傳
        const maxPhotos = 12; // 最大照片數量
        const currentCount = await getPhotoCount();
        console.log('當前已有照片:', currentCount);
        
        // 如果當前照片數量已經達到或超過最大數量，禁止選擇新文件
        if (currentCount >= maxPhotos) {
            showNotification(`已達到最大照片數量（${maxPhotos}張），請先刪除一些照片後再上傳`, 'error');
            return;
        }
        
        const totalCount = currentCount + selectedFiles.length + files.length;
        console.log('總數量:', totalCount);

        // 檢查選擇文件後是否會超過最大數量
        if (totalCount > maxPhotos) {
            const allowed = maxPhotos - currentCount - selectedFiles.length;
            if (allowed <= 0) {
                showNotification(`已達到最大照片數量（${maxPhotos}張），請先刪除一些照片`, 'error');
                return;
            }
            files = files.slice(0, allowed);
            showNotification(`最多只能選擇${allowed}張照片`, 'warning');
        }

        // 驗證檔案
        const validFiles = [];
        for (const file of files) {
            const validation = validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
                console.log('檔案驗證通過:', file.name);
            } else {
                console.warn('檔案驗證失敗:', file.name, validation.error);
                showNotification(`${file.name}: ${validation.error}`, 'error');
            }
        }

        if (validFiles.length === 0) {
            console.log('沒有有效檔案');
            return;
        }

        // 添加到選擇列表
        selectedFiles.push(...validFiles);
        console.log('已選擇檔案總數:', selectedFiles.length);

        // 更新UI
        updatePreview();
        updateCountInfo();
        
        // 重置input以便可以重新選擇相同檔案
        if (fileInput) {
            fileInput.value = '';
        }
    } catch (error) {
        console.error('處理檔案失敗:', error);
        showNotification('處理檔案失敗: ' + error.message, 'error');
    }
}

/**
 * 更新預覽
 */
function updatePreview() {
    if (!previewGrid || !previewSection || !uploadControls) {
        console.error('預覽相關DOM元素未找到');
        return;
    }

    try {
        previewGrid.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            const img = document.createElement('img');
            const previewUrl = createImagePreview(file);
            img.src = previewUrl;
            img.alt = file.name;
            img.onerror = () => {
                console.error('圖片載入失敗:', file.name);
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E圖片載入失敗%3C/text%3E%3C/svg%3E';
            };
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => removeFile(index);
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
            
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            previewItem.appendChild(fileInfo);
            previewGrid.appendChild(previewItem);
        });

        if (previewSection) {
            previewSection.style.display = selectedFiles.length > 0 ? 'block' : 'none';
        }
        if (uploadControls) {
            uploadControls.style.display = selectedFiles.length > 0 ? 'block' : 'none';
            // 确保上传按钮区域可见，即使需要滚动
            if (selectedFiles.length > 0) {
                uploadControls.style.visibility = 'visible';
                uploadControls.style.opacity = '1';
            }
        }
        
        console.log('預覽更新完成，顯示', selectedFiles.length, '張照片');
    } catch (error) {
        console.error('更新預覽失敗:', error);
        showNotification('更新預覽失敗', 'error');
    }
}

/**
 * 移除檔案
 */
function removeFile(index) {
    const file = selectedFiles[index];
    revokeImagePreview(createImagePreview(file)); // 釋放URL
    selectedFiles.splice(index, 1);
    updatePreview();
    updateCountInfo();
}

/**
 * 更新數量資訊
 */
async function updateCountInfo() {
    const maxPhotos = 12; // 最大照片數量
    const count = selectedFiles.length;
    if (selectedCount) selectedCount.textContent = count;
    const progress = (count / maxPhotos) * 100;
    if (countProgressBar) countProgressBar.style.width = `${progress}%`;
    if (countInfo) countInfo.style.display = 'block';
    
    // 檢查當前照片數量，如果達到12張，禁用上傳按鈕
    try {
        const currentCount = await getPhotoCount();
        if (currentCount >= maxPhotos) {
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.title = `已達到最大照片數量（${maxPhotos}張），請先刪除一些照片`;
            }
        } else {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.title = '';
            }
        }
    } catch (error) {
        console.error('檢查照片數量失敗:', error);
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

    if (processingFiles) return;

    try {
        processingFiles = true;
        uploadBtn.disabled = true;
        uploadProgress.style.display = 'block';
        progressText.textContent = '上傳中...';

        const maxPhotos = 12; // 最大照片數量
        const currentCount = await getPhotoCount();
        
        // 嚴格限制：如果當前照片數量已經達到或超過最大數量，禁止上傳
        if (currentCount >= maxPhotos) {
            showNotification(`已達到最大照片數量（${maxPhotos}張），請先刪除一些照片後再上傳`, 'error');
            processingFiles = false;
            uploadBtn.disabled = false;
            uploadProgress.style.display = 'none';
            return;
        }
        
        const totalCount = currentCount + selectedFiles.length;

        // 檢查上傳後是否會超過最大數量
        if (totalCount > maxPhotos) {
            const needDelete = totalCount - maxPhotos;
            showNotification(`上傳後照片總數將超過${maxPhotos}張，請先刪除${needDelete}張舊照片`, 'error');
            processingFiles = false;
            uploadBtn.disabled = false;
            uploadProgress.style.display = 'none';
            return;
        }

        let uploadedCount = 0;
        const total = selectedFiles.length;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = ((i + 1) / total) * 100;
            if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `正在上傳 ${i + 1} / ${total}`;

            try {
                // 壓縮圖片
                const compressed = await compressImage(file);
                
                // 生成縮圖
                const thumbnail = await generateThumbnail(file);
                
                // 獲取圖片尺寸
                const dimensions = await getImageDimensions(file);
                
                // 創建元數據
                const metadata = {
                    filename: file.name,
                    originalName: file.name,
                    fileSize: file.size,
                    width: dimensions.width,
                    height: dimensions.height,
                    category: '',
                    tags: [],
                    description: ''
                };

                // 保存到IndexedDB
                await savePhoto(compressed.blob, thumbnail, metadata);
                uploadedCount++;
            } catch (error) {
                console.error(`上傳 ${file.name} 失敗:`, error);
                showNotification(`${file.name} 上傳失敗`, 'error');
            }
        }

        // 上傳完成
        if (uploadProgress) uploadProgress.style.display = 'none';
        if (uploadControls) uploadControls.style.display = 'none';
        if (previewSection) previewSection.style.display = 'none';
        if (countInfo) countInfo.style.display = 'none';
        
        if (successCount && uploadedCount > 0) {
            successCount.textContent = `已成功上傳 ${uploadedCount} 張照片`;
        }
        if (successMessage) {
            successMessage.style.display = 'block';
        }

        // 清空選擇
        selectedFiles = [];
        fileInput.value = '';
        
        // 上傳完成後，檢查照片數量並更新按鈕狀態
        await updateCountInfo();

    } catch (error) {
        console.error('上傳失敗:', error);
        showNotification('上傳失敗，請重試', 'error');
    } finally {
        processingFiles = false;
        // 注意：不要直接啟用按鈕，讓 updateCountInfo 來決定按鈕狀態
        await updateCountInfo();
    }
}

/**
 * 處理取消
 */
function handleCancel() {
    // 釋放所有預覽URL
    selectedFiles.forEach(file => {
        revokeImagePreview(createImagePreview(file));
    });
    
    selectedFiles = [];
    fileInput.value = '';
    updatePreview();
    updateCountInfo();
    uploadControls.style.display = 'none';
    previewSection.style.display = 'none';
    countInfo.style.display = 'none';
}


