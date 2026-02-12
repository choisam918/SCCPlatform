/**
 * 展示頁面邏輯
 * 負責程式碼展示和語法高亮
 */

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeDisplay();
});

/**
 * 初始化展示頁面
 */
function initializeDisplay() {
    const files = getAllFiles();
    const displayContent = document.getElementById('displayContent');
    const totalFiles = document.getElementById('totalFiles');
    
    if (totalFiles) {
        totalFiles.textContent = files.length;
    }
    
    if (files.length === 0) {
        return; // 顯示預設的「無檔案」訊息
    }
    
    // 渲染所有檔案
    renderDisplay(files);
    
    // 初始化語法高亮
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }
}

/**
 * 渲染展示內容
 */
function renderDisplay(files) {
    const displayContent = document.getElementById('displayContent');
    if (!displayContent) return;
    
    displayContent.innerHTML = '';
    
    files.forEach((file, index) => {
        const codeBlock = createCodeBlock(file, index);
        displayContent.appendChild(codeBlock);
    });
    
    // 應用語法高亮
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
}

/**
 * 創建程式碼區塊元素
 */
function createCodeBlock(file, index) {
    const block = document.createElement('div');
    block.className = 'code-block';
    
    const sizeKB = (file.size / 1024).toFixed(2);
    const uploadDate = new Date(file.uploadTime).toLocaleString('zh-TW');
    
    // 轉義HTML（防止XSS）
    const escapedContent = escapeHtml(file.content);
    const safeId = escapeAttrId(file.id);
    
    block.innerHTML = `
        <div class="code-header">
            <h3>${escapeHtml(file.name)}</h3>
            <div class="code-info">
                ${sizeKB} KB · ${file.lineCount} 行 · ${uploadDate}
            </div>
        </div>
        <div class="code-content">
            <pre><code class="language-python">${escapedContent}</code></pre>
        </div>
        <div class="code-actions">
            <button class="btn btn-primary btn-run" onclick="runFile('${safeId}')" id="run-btn-${escapeHtml(file.id)}" title="在瀏覽器中執行此 Python 程式碼">
                ▶️ 執行程式碼
            </button>
            <button class="btn btn-secondary btn-clear-output" onclick="clearOutput('${safeId}')" style="display: none;" id="clear-btn-${escapeHtml(file.id)}" title="清除執行結果">
                🗑️ 清除結果
            </button>
        </div>
        <div class="code-output" id="output-${escapeHtml(file.id)}">
            <div class="output-header">運行結果</div>
            <div class="output-placeholder" id="output-placeholder-${escapeHtml(file.id)}">
                點擊上方「▶️ 執行程式碼」按鈕，運行結果將顯示於此
            </div>
        </div>
    `;
    
    return block;
}

/**
 * 還原運行結果區塊為預設提示
 */
function getDefaultOutputHTML(fileId) {
    const safeId = (fileId != null && fileId !== undefined) ? escapeHtml(String(fileId)) : '';
    return `
        <div class="output-header">運行結果</div>
        <div class="output-placeholder" id="output-placeholder-${safeId}">
            點擊上方「▶️ 執行程式碼」按鈕，運行結果將顯示於此
        </div>
    `;
}

/**
 * 清除輸出結果（還原為預設提示）
 */
function clearOutput(fileId) {
    // fileId 已經在 onclick 中經過 escapeAttrId 處理，這裡需要轉回 HTML 格式用於 ID
    const safeId = escapeHtml(String(fileId));
    const outputElement = document.getElementById(`output-${safeId}`);
    const clearBtn = document.getElementById(`clear-btn-${safeId}`);
    
    if (outputElement) {
        outputElement.innerHTML = getDefaultOutputHTML(fileId);
        outputElement.style.display = 'block';
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
}

// 監聽執行完成事件，顯示清除按鈕
document.addEventListener('DOMContentLoaded', function() {
    // 使用 MutationObserver 監聽輸出區域變化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.classList.contains('code-output')) {
                const outputElement = mutation.target;
                const fileId = outputElement.id.replace('output-', '');
                const clearBtn = document.getElementById(`clear-btn-${fileId}`);
                
                // 僅在有實際運行結果時顯示清除按鈕（排除預設 placeholder）
                const hasPlaceholder = outputElement.querySelector('.output-placeholder');
                if (outputElement.innerHTML.trim() && !hasPlaceholder && clearBtn) {
                    clearBtn.style.display = 'inline-block';
                }
            }
        });
    });
    
    // 延遲觀察，等待元素創建
    setTimeout(() => {
        document.querySelectorAll('.code-output').forEach(element => {
            observer.observe(element, { childList: true, subtree: true });
        });
    }, 1000);
});

// 將函數暴露到全局
window.clearOutput = clearOutput;

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
 * 跳脫字串用於 HTML 屬性內的 JS（如 onclick="runFile('...')"）
 */
function escapeAttrId(id) {
    if (id == null || id === undefined) return '';
    return String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * 匯出HTML
 */
function exportHTML() {
    const files = getAllFiles();
    
    if (files.length === 0) {
        alert('沒有檔案可匯出！');
        return;
    }
    
    // 生成HTML內容
    let htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>程式展示系統 - 匯出</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="lib/highlight.js/styles/github.min.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 程式展示系統</h1>
            <p class="subtitle">匯出時間：${new Date().toLocaleString('zh-TW')}</p>
        </header>
        <main class="display-main">
            <div class="display-info">
                <p>共 ${files.length} 個檔案</p>
            </div>
            <div class="display-content">
`;
    
    files.forEach(file => {
        const escapedContent = escapeHtml(file.content);
        const sizeKB = (file.size / 1024).toFixed(2);
        const uploadDate = new Date(file.uploadTime).toLocaleString('zh-TW');
        
        htmlContent += `
                <div class="code-block">
                    <div class="code-header">
                        <h3>${escapeHtml(file.name)}</h3>
                        <div class="code-info">
                            ${sizeKB} KB · ${file.lineCount} 行 · ${uploadDate}
                        </div>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-python">${escapedContent}</code></pre>
                    </div>
                </div>
`;
    });
    
    htmlContent += `
            </div>
        </main>
    </div>
    <script src="lib/highlight.js/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>`;
    
    // 下載HTML檔案
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-display-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('HTML檔案已匯出！');
}

/**
 * 切換主題
 */
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    
    // 儲存主題設定
    const settings = getSettings();
    settings.theme = newTheme;
    saveSettings(settings);
}

// 載入儲存的主題設定
document.addEventListener('DOMContentLoaded', function() {
    const settings = getSettings();
    if (settings.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});

// 將函數暴露到全局
window.exportHTML = exportHTML;
window.toggleTheme = toggleTheme;
