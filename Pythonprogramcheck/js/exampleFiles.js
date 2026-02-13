/**
 * 範例檔案資料
 * 預設為空，可在此新增範例
 */

const EXAMPLE_FILES = [];

/**
 * 載入範例檔案
 */
function loadExampleFiles() {
    // 確保必要的函數存在
    if (typeof getAllFiles !== 'function') {
        console.error('getAllFiles 函數未定義');
        alert('系統未正確載入，請重新整理頁面');
        return false;
    }
    
    if (typeof addFile !== 'function') {
        console.error('addFile 函數未定義');
        alert('系統未正確載入，請重新整理頁面');
        return false;
    }
    
    if (typeof generateFileId !== 'function') {
        console.error('generateFileId 函數未定義');
        alert('系統未正確載入，請重新整理頁面');
        return false;
    }
    
    const existingFiles = getAllFiles();
    const existingNames = new Set(existingFiles.map(f => f.name));
    
    let loadedCount = 0;
    
    EXAMPLE_FILES.forEach(example => {
        // 如果檔案已存在，跳過
        if (existingNames.has(example.name)) {
            return;
        }
        
        const fileData = {
            id: generateFileId(),
            name: example.name,
            content: example.content,
            size: new Blob([example.content]).size,
            uploadTime: new Date().toISOString(),
            lineCount: example.content.split('\n').length
        };
        
        if (addFile(fileData)) {
            loadedCount++;
        }
    });
    
    if (loadedCount > 0) {
        // 更新介面
        if (typeof renderFilesList === 'function') {
            renderFilesList();
        }
        if (typeof updateStorageUsage === 'function') {
            updateStorageUsage();
        }
        
        if (typeof showMessage === 'function') {
            showMessage(`已載入 ${loadedCount} 個範例檔案`, 'success');
        } else {
            alert(`已載入 ${loadedCount} 個範例檔案`);
        }
        return true;
    } else {
        if (typeof showMessage === 'function') {
            showMessage('所有範例檔案已存在', 'info');
        } else {
            alert('所有範例檔案已存在');
        }
        return false;
    }
}

/**
 * 檢查是否需要自動載入範例檔案
 */
function checkAndLoadExamples() {
    const existingFiles = getAllFiles();
    
    // 如果沒有任何檔案，自動載入範例
    if (existingFiles.length === 0) {
        console.log('沒有檔案，自動載入範例檔案...');
        loadExampleFiles();
    }
}

// 頁面載入時檢查
document.addEventListener('DOMContentLoaded', function() {
    // 延遲執行，確保其他模組已載入
    setTimeout(() => {
        checkAndLoadExamples();
    }, 500);
});

// 將函數暴露到全局
window.loadExampleFiles = loadExampleFiles;
