/**
 * 主程式邏輯
 * 負責頁面初始化、事件綁定等
 */

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

/**
 * 初始化頁面
 */
function initializePage() {
    // 開啟時自動移除範例檔 Example1.py / example2.py
    if (typeof removeExampleFiles === 'function' && removeExampleFiles()) {
        // 已刪除範例檔，下方 renderFilesList 會更新畫面
    }
    
    // 初始化上傳區域
    initializeUploadArea();
    
    // 渲染檔案列表
    renderFilesList();
    
    // 更新儲存空間顯示
    if (typeof updateStorageUsage === 'function') {
        updateStorageUsage();
    }
}

/**
 * 初始化上傳區域
 */
function initializeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    
    if (!uploadArea || !fileInput) return;
    
    // 「選擇檔案」按鈕：只觸發一次檔案選擇
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    // 點擊上傳區域其他區域（不含按鈕）也可開啟選擇
    uploadArea.addEventListener('click', function(e) {
        if (e.target === fileInput) return;
        if (e.target.closest && e.target.closest('button')) return;
        fileInput.click();
    });
    
    // 檔案選擇事件
    fileInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        e.target.value = '';
    });
    
    // 拖放事件
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

/**
 * 渲染檔案列表
 */
function renderFilesList() {
    const files = getAllFiles();
    const filesList = document.getElementById('filesList');
    const filesSection = document.getElementById('filesSection');
    const actionSection = document.getElementById('actionSection');
    const fileCount = document.getElementById('fileCount');
    
    if (!filesList) return;
    
    // 更新檔案數量
    if (fileCount) {
        fileCount.textContent = files.length;
    }
    
    // 顯示/隱藏區塊
    if (files.length > 0) {
        if (filesSection) filesSection.style.display = 'block';
        if (actionSection) actionSection.style.display = 'block';
    } else {
        if (filesSection) filesSection.style.display = 'none';
        if (actionSection) actionSection.style.display = 'none';
    }
    
    // 清空列表
    filesList.innerHTML = '';
    
    // 渲染每個檔案
    files.forEach(file => {
        const fileItem = createFileItem(file);
        filesList.appendChild(fileItem);
    });
}

/**
 * 創建檔案項目元素
 */
function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const sizeKB = (file.size / 1024).toFixed(2);
    const uploadDate = new Date(file.uploadTime).toLocaleString('zh-TW');
    
    const safeId = escapeAttrId(file.id);
    item.innerHTML = `
        <div class="file-info">
            <div class="file-icon">🐍</div>
            <div class="file-details">
                <h3>${escapeHtml(file.name)}</h3>
                <p>${sizeKB} KB · ${file.lineCount} 行 · ${uploadDate}</p>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn btn-secondary btn-small" onclick="previewFile('${safeId}')">
                預覽
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteFileHandler('${safeId}')">
                刪除
            </button>
        </div>
    `;
    
    return item;
}

/**
 * HTML轉義（防止XSS）
 */
function escapeHtml(text) {
    if (text == null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 跳脫字串用於 HTML 屬性內的 JS（如 onclick="fn('...')"）
 */
function escapeAttrId(id) {
    if (id == null || id === undefined) return '';
    return String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * 生成展示頁面
 */
function generateDisplay() {
    const files = getAllFiles();
    
    if (files.length === 0) {
        alert('請先上傳至少一個檔案！');
        return;
    }
    
    // 跳轉到展示頁面
    window.location.href = 'display.html';
}

// 將函數暴露到全局（供HTML調用）
window.previewFile = previewFile;
window.closePreview = closePreview;
window.deleteFileHandler = deleteFileHandler;
window.generateDisplay = generateDisplay;
