/**
 * 檔案處理模組
 * 負責檔案上傳、讀取、驗證等操作
 */

/**
 * 處理檔案上傳
 */
function handleFiles(files) {
    if (!files || files.length === 0) {
        return;
    }
    
    if (typeof addFile !== 'function') {
        alert('系統錯誤：儲存功能未載入，請重新整理頁面後再試。');
        console.error('addFile 未定義，請確認 js/storage.js 已正確載入');
        return;
    }
    
    var validFiles = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file.name || !(file.name.toLowerCase().endsWith('.py'))) {
            alert('檔案「' + file.name + '」不是 Python 檔案（.py），已跳過。');
            continue;
        }
        if (file.size > 1024 * 1024) {
            alert('檔案「' + file.name + '」超過 1MB 限制，已跳過。');
            continue;
        }
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) {
        return;
    }
    
    var processedCount = 0;
    var totalFiles = validFiles.length;
    
    function tryFinish() {
        if (processedCount === totalFiles) {
            if (typeof renderFilesList === 'function') {
                renderFilesList();
            }
            if (typeof updateStorageUsage === 'function') {
                updateStorageUsage();
            }
            if (typeof showMessage === 'function') {
                showMessage('成功上傳 ' + processedCount + ' 個檔案！點擊「生成展示頁面」檢視程式碼。', 'success');
            } else {
                alert('成功上傳 ' + processedCount + ' 個檔案！');
            }
        }
    }
    
    validFiles.forEach(function(file) {
        var reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                var content = e.target.result;
                if (typeof content !== 'string') {
                    content = String(content);
                }
                var fileData = {
                    id: generateFileId(),
                    name: file.name,
                    content: content,
                    size: file.size,
                    uploadTime: new Date().toISOString(),
                    lineCount: content.split('\n').length
                };
                
                if (addFile(fileData)) {
                    processedCount++;
                    tryFinish();
                } else {
                    alert('檔案「' + file.name + '」儲存失敗，可能是儲存空間不足。');
                }
            } catch (err) {
                console.error('處理檔案時錯誤:', err);
                alert('處理檔案「' + file.name + '」時發生錯誤：' + (err.message || err));
            }
        };
        
        reader.onerror = function() {
            alert('讀取檔案「' + file.name + '」失敗！請確認檔案未損壞且可讀取。');
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * 生成檔案ID
 */
function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 預覽檔案
 */
function previewFile(fileId) {
    const file = getFile(fileId);
    if (!file) {
        alert('檔案不存在！');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const title = document.getElementById('previewTitle');
    const content = document.getElementById('previewContent');
    
    if (modal && title && content) {
        title.textContent = file.name;
        content.textContent = file.content;
        modal.style.display = 'flex';
    }
}

/**
 * 關閉預覽
 */
function closePreview() {
    const modal = document.getElementById('previewModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 刪除檔案
 */
function deleteFileHandler(fileId) {
    const file = getFile(fileId);
    if (!file) {
        return;
    }
    
    if (confirm(`確定要刪除檔案「${file.name}」嗎？`)) {
        if (deleteFile(fileId)) {
            if (typeof renderFilesList === 'function') {
                renderFilesList();
            }
            if (typeof updateStorageUsage === 'function') {
                updateStorageUsage();
            }
            showMessage('檔案已刪除', 'success');
        }
    }
}

/**
 * 顯示訊息
 */
function showMessage(message, type = 'info') {
    // 簡單的訊息提示（可以改進為更好的UI）
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'success' ? '#28a745' : '#4a90e2'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: fadeIn 0.3s;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// 點擊模態框外部關閉
document.addEventListener('click', function(e) {
    const modal = document.getElementById('previewModal');
    if (modal && e.target === modal) {
        closePreview();
    }
});

// ESC鍵關閉模態框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePreview();
    }
});
