/**
 * LocalStorage 管理模組
 * 負責檔案的儲存、讀取、刪除等操作
 */

const STORAGE_KEY = 'programShowSystem_files';
const SETTINGS_KEY = 'programShowSystem_settings';

// 儲存設定預設值
const defaultSettings = {
    theme: 'light',
    highlightStyle: 'github'
};

/**
 * 獲取所有檔案
 */
function getAllFiles() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('讀取檔案失敗:', error);
        return [];
    }
}

/**
 * 儲存所有檔案
 */
function saveAllFiles(files) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        updateStorageUsage();
        return true;
    } catch (error) {
        console.error('儲存檔案失敗:', error);
        // 可能是儲存空間不足
        if (error.name === 'QuotaExceededError') {
            alert('儲存空間不足！請刪除一些檔案。');
        }
        return false;
    }
}

/**
 * 添加檔案
 */
function addFile(fileData) {
    const files = getAllFiles();
    
    // 檢查是否已存在相同檔名
    const existingIndex = files.findIndex(f => f.name === fileData.name);
    if (existingIndex !== -1) {
        // 更新現有檔案
        files[existingIndex] = fileData;
    } else {
        // 添加新檔案
        files.push(fileData);
    }
    
    return saveAllFiles(files);
}

/**
 * 刪除檔案
 */
function deleteFile(fileId) {
    const files = getAllFiles();
    const filteredFiles = files.filter(f => f.id !== fileId);
    return saveAllFiles(filteredFiles);
}

/**
 * 清除所有檔案
 */
function clearAllFiles() {
    if (confirm('確定要清除所有檔案嗎？此操作無法復原！')) {
        localStorage.removeItem(STORAGE_KEY);
        updateStorageUsage();
        return true;
    }
    return false;
}

/**
 * 移除範例檔（Example1.py / example2.py，不區分大小寫）
 * 開啟系統時自動呼叫，從儲存清單中刪除
 */
function removeExampleFiles() {
    const files = getAllFiles();
    const toRemove = new Set(['example1.py', 'example2.py']);
    const filtered = files.filter(f => {
        const nameLower = (f.name || '').toLowerCase();
        return !toRemove.has(nameLower);
    });
    if (filtered.length !== files.length) {
        saveAllFiles(filtered);
        return true;
    }
    return false;
}

/**
 * 獲取檔案
 */
function getFile(fileId) {
    const files = getAllFiles();
    return files.find(f => f.id === fileId);
}

/**
 * 更新檔案評分（程式碼評分功能）
 * @param {string} fileId - 檔案 ID
 * @param {number|null} score - 分數 0–100，null 表示清除
 * @param {string} comment - 評語（選填）
 */
function updateFileScore(fileId, score, comment) {
    const files = getAllFiles();
    const index = files.findIndex(f => f.id === fileId);
    if (index === -1) return false;
    files[index].score = score == null || score === '' ? null : Math.min(100, Math.max(0, Number(score)));
    files[index].comment = comment != null ? String(comment).trim() : '';
    return saveAllFiles(files);
}

/**
 * 計算儲存空間使用量
 */
function getStorageUsage() {
    try {
        let total = 0;
        const files = getAllFiles();
        files.forEach(file => {
            total += JSON.stringify(file).length;
        });
        return total;
    } catch (error) {
        return 0;
    }
}

/**
 * 更新儲存空間顯示
 */
function updateStorageUsage() {
    const usage = getStorageUsage();
    const usageKB = (usage / 1024).toFixed(2);
    const limitKB = (5 * 1024).toFixed(0); // 約5MB限制
    
    const usageElement = document.getElementById('storageUsage');
    const limitElement = document.getElementById('storageLimit');
    
    if (usageElement) {
        usageElement.textContent = usageKB + ' KB';
    }
    if (limitElement) {
        limitElement.textContent = limitKB + ' KB';
    }
    
    // 使用量超過約 80%（4MB）時顯示警告色，否則恢復預設
    if (usageElement) {
        usageElement.style.color = usage > 4 * 1024 * 1024 ? 'var(--danger-color)' : '';
    }
}

/**
 * 匯出資料為JSON
 */
function exportData() {
    const files = getAllFiles();
    const settings = getSettings();
    const data = {
        files: files,
        settings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-show-system-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('資料已匯出！');
}

/**
 * 匯入資料
 */
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.files && Array.isArray(data.files)) {
                    // 合併檔案（避免重複）
                    const existingFiles = getAllFiles();
                    const existingNames = new Set(existingFiles.map(f => f.name));
                    
                    const newFiles = data.files.filter(f => !existingNames.has(f.name));
                    const allFiles = [...existingFiles, ...newFiles];
                    
                    if (saveAllFiles(allFiles)) {
                        alert(`成功匯入 ${newFiles.length} 個檔案！`);
                        if (typeof renderFilesList === 'function') {
                            renderFilesList();
                        }
                    }
                } else {
                    alert('匯入的檔案格式不正確！');
                }
            } catch (error) {
                console.error('匯入失敗:', error);
                alert('匯入失敗：檔案格式錯誤！');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

/**
 * 獲取設定
 */
function getSettings() {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (error) {
        return defaultSettings;
    }
}

/**
 * 儲存設定
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('儲存設定失敗:', error);
        return false;
    }
}

// 初始化時更新儲存空間顯示
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateStorageUsage);
} else {
    updateStorageUsage();
}
