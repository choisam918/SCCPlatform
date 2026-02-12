/**
 * Pyodide 狀態檢測和顯示模組
 */

let pyodideStatusChecked = false;

/**
 * 檢查 Pyodide 狀態
 */
function checkPyodideStatus() {
    const statusElement = document.getElementById('pyodideStatus');
    const statusText = document.getElementById('pyodideStatusText');
    
    if (!statusElement || !statusText) return;
    
    // 顯示狀態區域
    statusElement.style.display = 'block';
    statusElement.className = 'pyodide-status';
    statusText.textContent = '正在檢查...';
    
    // 檢查腳本是否載入
    setTimeout(() => {
        const scriptLoaded = typeof window.loadPyodide !== 'undefined';
        const webAssemblySupported = typeof WebAssembly !== 'undefined';
        const isOnline = navigator.onLine;
        
        if (!isOnline) {
            statusElement.className = 'pyodide-status error';
            statusText.innerHTML = '❌ <strong>網路離線</strong>：無法載入 Python 執行環境';
            return;
        }
        
        if (!webAssemblySupported) {
            statusElement.className = 'pyodide-status error';
            statusText.innerHTML = '❌ <strong>瀏覽器不支援</strong>：需要支援 WebAssembly 的瀏覽器';
            return;
        }
        
        if (!scriptLoaded) {
            statusElement.className = 'pyodide-status error';
            statusText.innerHTML = `
                ❌ <strong>Pyodide 腳本未載入</strong>
                <br><small style="display: block; margin-top: 5px;">
                    可能原因：網路連線問題、CDN 無法訪問、或腳本載入失敗
                    <br>請按 F12 打開控制台查看詳細錯誤
                </small>
            `;
            return;
        }
        
        // 腳本已載入
        statusElement.className = 'pyodide-status success';
        statusText.innerHTML = '✅ <strong>Python 執行環境已就緒</strong>：可以執行程式碼';
        
        // 3秒後自動隱藏成功訊息
        setTimeout(() => {
            if (statusElement.className.includes('success')) {
                statusElement.style.display = 'none';
            }
        }, 3000);
    }, 100);
}

/**
 * 顯示 Pyodide 載入錯誤
 */
function showPyodideError(message) {
    const statusElement = document.getElementById('pyodideStatus');
    const statusText = document.getElementById('pyodideStatusText');
    
    if (statusElement && statusText) {
        statusElement.style.display = 'block';
        statusElement.className = 'pyodide-status error';
        statusText.innerHTML = `❌ <strong>載入失敗</strong>：${message}`;
    }
}

// 頁面載入時檢查
document.addEventListener('DOMContentLoaded', function() {
    // 延遲檢查，確保腳本有時間載入
    setTimeout(() => {
        checkPyodideStatus();
        pyodideStatusChecked = true;
    }, 2000);
    
    // 每10秒檢查一次（如果還沒成功）
    const checkInterval = setInterval(() => {
        if (!pyodideStatusChecked) {
            checkPyodideStatus();
        } else {
            clearInterval(checkInterval);
        }
    }, 10000);
});

// 將函數暴露到全局
window.checkPyodideStatus = checkPyodideStatus;
window.showPyodideError = showPyodideError;
