// 全局搜索功能 - 搜索整個學習平台的內容
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    // 章節索引數據
    const chaptersData = [
        { title: 'Python 基本語法', url: 'index.html', keywords: '語法 縮進 註釋 變量 保留字 字符串' },
        { title: 'Python 數據類型', url: 'chapters/chapter02-data-types.html', keywords: '數據類型 數字 字符串 列表 元組 字典 集合 布爾值' },
        { title: 'Python 運算符', url: 'chapters/chapter03-operators.html', keywords: '運算符 算術 比較 邏輯 賦值 成員 身份' },
        { title: '條件語句', url: 'chapters/chapter04-conditionals.html', keywords: '條件 if else elif 判斷 邏輯運算符' },
        { title: '循環語句', url: 'chapters/chapter05-loops.html', keywords: '循環 for while break continue 迭代 range' },
        { title: '函數', url: 'chapters/chapter06-functions.html', keywords: '函數 def 參數 返回值 lambda 全局變量 局部變量' },
        { title: '模組', url: 'chapters/chapter07-modules.html', keywords: '模組 import from 標準庫 math random datetime' },
        { title: '文件操作', url: 'chapters/chapter08-file-io.html', keywords: '文件 讀取 寫入 open with read write' },
        { title: '異常處理', url: 'chapters/chapter09-exceptions.html', keywords: '異常 exception try except finally 錯誤處理' },
        { title: '面向對象編程', url: 'chapters/chapter10-oop.html', keywords: '類 對象 繼承 class __init__ 面向對象' },
        { title: '迭代器和生成器', url: 'chapters/chapter11-iterators.html', keywords: '迭代器 iterator 生成器 generator yield iter next' },
        { title: '裝飾器', url: 'chapters/chapter12-decorators.html', keywords: '裝飾器 decorator @ 修飾函數 wrapper' },
        { title: 'Lambda 函數', url: 'chapters/chapter13-lambda.html', keywords: 'lambda 匿名函數 map filter 簡潔函數' },
        { title: '正則表達式', url: 'chapters/chapter14-regular-expressions.html', keywords: '正則表達式 regex re 模式匹配 findall search' },
        { title: '數據庫操作', url: 'chapters/chapter15-database.html', keywords: '數據庫 database SQLite MySQL 連接 查詢' },
        { title: '網絡爬蟲', url: 'chapters/chapter16-web-scraping.html', keywords: '爬蟲 scraping requests BeautifulSoup HTTP 抓取' },
        { title: 'API 開發', url: 'chapters/chapter17-api.html', keywords: 'API Flask FastAPI RESTful 路由 jsonify' }
    ];
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (query.length < 1) {
                    hideSearchResults();
                    return;
                }
                
                const results = performSearch(query, chaptersData);
                displaySearchResults(results, query);
            }, 300);
        });
        
        // 點擊外部關閉搜索結果
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && searchResults && !searchResults.contains(e.target)) {
                hideSearchResults();
            }
        });
        
        // Enter 鍵跳轉到第一個結果
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && searchResults && searchResults.style.display !== 'none') {
                const firstResult = searchResults.querySelector('a');
                if (firstResult) {
                    window.location.href = firstResult.href;
                }
            }
        });
    }
});

function performSearch(query, chaptersData) {
    const results = [];
    
    chaptersData.forEach(chapter => {
        const titleMatch = chapter.title.toLowerCase().includes(query);
        const keywordsMatch = chapter.keywords.toLowerCase().includes(query);
        
        if (titleMatch || keywordsMatch) {
            let score = 0;
            if (titleMatch) score += 10;
            if (keywordsMatch) score += 5;
            
            results.push({ ...chapter, score });
        }
    });
    
    // 按分數排序
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 10); // 最多顯示10個結果
}

function displaySearchResults(results, query) {
    let searchResults = document.getElementById('search-results');
    
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.id = 'search-results';
        searchResults.className = 'search-results';
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.appendChild(searchResults);
        }
    }
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">沒有找到相關章節</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    // 檢測當前路徑，調整URL
    const currentPath = window.location.pathname;
    const isInChapters = currentPath.includes('/chapters/');
    const baseUrl = isInChapters ? '../' : '';
    
    let html = '<div class="search-results-list">';
    results.forEach(result => {
        // 調整URL路徑
        let url = result.url;
        if (isInChapters && !url.startsWith('../')) {
            url = '../' + url;
        } else if (!isInChapters && url.startsWith('../')) {
            url = url.substring(3); // 移除 '../'
        }
        
        // 高亮匹配的關鍵詞
        let highlightedTitle = result.title;
        if (result.title.toLowerCase().includes(query)) {
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlightedTitle = result.title.replace(regex, '<mark>$1</mark>');
        }
        
        html += `
            <a href="${url}" class="search-result-item">
                <div class="search-result-title">${highlightedTitle}</div>
                <div class="search-result-keywords">${result.keywords}</div>
            </a>
        `;
    });
    html += '</div>';
    
    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
}

function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}
