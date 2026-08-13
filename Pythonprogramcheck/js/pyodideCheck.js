/**
 * Pyodide 載入檢查模組
 * 在頁面載入時檢查 Pyodide 是否可用
 */

document.addEventListener('DOMContentLoaded', function() {
    // 檢查 Pyodide 是否載入
    setTimeout(() => {
        if (typeof window.loadPyodide === 'undefined') {
            console.warn('Pyodide 未載入');
            
            // 可以選擇顯示一個提示（可選）
            // 但不要打擾用戶，只在控制台記錄
            console.error('Pyodide 腳本載入失敗。可能的原因：');
            console.error('1. 網路連線問題');
            console.error('2. CDN 無法訪問');
            console.error('3. 瀏覽器不支援');
            console.error('4. 腳本載入被阻擋');
        } else {
            console.log('✓ Pyodide 腳本已載入，準備就緒');
        }
    }, 1000);
});
