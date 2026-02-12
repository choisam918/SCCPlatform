/**
 * 檔案處理模組
 * 負責檔案上傳、讀取、驗證等操作
 */

/**
 * 處理檔案上傳
 */
function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    const validFiles = Array.from(files).filter(file => {
        // 驗證檔案類型
        if (!file.name.endsWith('.py')) {
            alert(`檔案 ${file.name} 不是 Python 檔案，已跳過。`);
            return false;
        }
        
        // 驗證檔案大小（限制 1MB）
        if (file.size > 1024 * 1024) {
            alert(`檔案 ${file.name} 超過 1MB 限制，已跳過。`);
            return false;
        }
        
        return true;
    });
    
    if (validFiles.length === 0) {
        return;
    }
    
    // 讀取所有檔案
    let processedCount = 0;
    const totalFiles = validFiles.length;
    
    validFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            const fileData = {
                id: generateFileId(),
                name: file.name,
                content: content,
                size: file.size,
                uploadTime: new Date().toISOString(),
                lineCount: content.split('\n').length
            };
            
            // 儲存檔案
            if (addFile(fileData)) {
                processedCount++;
                
                // 所有檔案處理完成後更新介面
                if (processedCount === totalFiles) {
                    if (typeof renderFilesList === 'function') {
                        renderFilesList();
                    }
                    if (typeof updateStorageUsage === 'function') {
                        updateStorageUsage();
                    }
                    
                    // 顯示成功訊息（含運行結果提示）
                    showMessage(`成功上傳 ${processedCount} 個檔案！點擊「生成展示頁面」可執行程式並查看運行結果。`, 'success');
                }
            }
        };
        
        reader.onerror = function() {
            alert(`讀取檔案 ${file.name} 失敗！`);
        };
        
        reader.readAsText(file);
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
