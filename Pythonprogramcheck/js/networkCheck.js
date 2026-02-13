/**
 * 網路連接檢測模組
 * 檢測 CDN 是否可訪問
 */

/**
 * 檢測 CDN 連接
 */
async function checkCDNConnection() {
    const cdnUrl = 'https://cdn.jsdelivr.net';
    
    try {
        const response = await fetch(cdnUrl, {
            method: 'HEAD',
            mode: 'no-cors', // 避免 CORS 問題
            cache: 'no-cache'
        });
        return true;
    } catch (error) {
        console.warn('CDN 連接檢測失敗:', error);
        return false;
    }
}

/**
 * 檢測 Pyodide 腳本是否載入
 */
function checkPyodideScriptLoaded() {
    if (typeof window.loadPyodide === 'undefined') {
        console.error('❌ Pyodide 腳本未載入');
        return false;
    }
    console.log('✓ Pyodide 腳本已載入');
    return true;
}

/**
 * 顯示網路診斷資訊
 */
function showNetworkDiagnostics() {
    const diagnostics = {
        pyodideScript: checkPyodideScriptLoaded(),
        userAgent: navigator.userAgent,
        onLine: navigator.onLine,
        webAssembly: typeof WebAssembly !== 'undefined'
    };
    
    console.group('🔍 網路診斷資訊');
    console.log('Pyodide 腳本:', diagnostics.pyodideScript ? '✓ 已載入' : '❌ 未載入');
    console.log('網路狀態:', diagnostics.onLine ? '✓ 在線' : '❌ 離線');
    console.log('WebAssembly 支援:', diagnostics.webAssembly ? '✓ 支援' : '❌ 不支援');
    console.log('瀏覽器:', diagnostics.userAgent);
    console.groupEnd();
    
    return diagnostics;
}

// 頁面載入時執行診斷
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        showNetworkDiagnostics();
        
        // 如果 Pyodide 未載入，顯示警告
        if (!checkPyodideScriptLoaded()) {
            console.error('⚠️ Pyodide 腳本載入失敗！');
            console.error('請檢查：');
            console.error('1. 網路連線是否正常');
            console.error('2. 是否可以訪問 cdn.jsdelivr.net');
            console.error('3. 瀏覽器控制台是否有錯誤訊息');
        }
    }, 1000);
});

// 將函數暴露到全局
window.checkCDNConnection = checkCDNConnection;
window.checkPyodideScriptLoaded = checkPyodideScriptLoaded;
window.showNetworkDiagnostics = showNetworkDiagnostics;
