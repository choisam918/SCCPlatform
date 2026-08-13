// 返回主系統功能
function goBackToMain() {
    // 檢查是否在子系統中
    if (window.location.pathname.includes('/football/') || 
        window.location.pathname.includes('/math/') || 
        window.location.pathname.includes('/group/') || 
        window.location.pathname.includes('/ramdom/') || 
        window.location.pathname.includes('/Rank/') || 
        window.location.pathname.includes('/typeanything/')) {
        
        // 返回到主系統
        window.location.href = '../index.html';
    } else {
        // 如果已經在主系統，則刷新頁面
        window.location.reload();
    }
}

// 導出函數供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { goBackToMain };
}
























