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
 * 獲取檔案類型圖示
 */
function getFileTypeIcon(fileType, fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'py') return '🐍';
    return '📄';
}

/**
 * 創建程式碼區塊元素（含程式碼評分區）
 */
function createCodeBlock(file, index) {
    const block = document.createElement('div');
    block.className = 'code-block';
    block.dataset.blockIndex = String(index);
    block.dataset.fileType = file.fileType || getFileType(file.name);
    
    const sizeKB = (file.size / 1024).toFixed(2);
    const uploadDate = new Date(file.uploadTime).toLocaleString('zh-TW');
    const score = file.score != null ? Number(file.score) : '';
    const commentSafe = (file.comment || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fileType = file.fileType || getFileType(file.name);
    const fileIcon = getFileTypeIcon(fileType, file.name);
    
    // 評分和評語顯示區域
    let scoreDisplayHtml = '';
    if (file.score != null || (file.comment && file.comment.trim())) {
        scoreDisplayHtml = `
            <div class="score-display">
                ${file.score != null ? `<span class="score-badge">評分：${file.score} 分</span>` : ''}
                ${(file.comment && file.comment.trim()) ? `<span class="score-comment-display">評語：${escapeHtml(file.comment)}</span>` : ''}
            </div>
        `;
    }
    
    // 根據檔案類型生成內容區域
    let contentHtml = '';
    const contentId = `content-${file.id}`;
    
    if (fileType === 'python') {
        // Python 檔案：顯示程式碼
        const escapedContent = escapeHtml(file.content);
        contentHtml = `
            <div class="code-content">
                <pre><code class="language-python">${escapedContent}</code></pre>
            </div>
        `;
    } else {
        // 預設：顯示文字內容
        const escapedContent = escapeHtml(file.content || '');
        contentHtml = `
            <div class="code-content">
                <pre><code>${escapedContent}</code></pre>
            </div>
        `;
    }
    
    // 行數顯示（二進制檔案不顯示行數）
    const lineCountDisplay = file.lineCount != null && file.lineCount > 0 
        ? ` · ${file.lineCount} 行` 
        : '';
    
    block.innerHTML = `
        <div class="code-header">
            <h3>${fileIcon} ${escapeHtml(file.name)}</h3>
            <div class="code-info">
                ${sizeKB} KB${lineCountDisplay} · ${uploadDate}
            </div>
        </div>
        ${contentHtml}
        ${scoreDisplayHtml}
        <div class="score-section">
            <div class="score-section-title">程式碼評分</div>
            <div class="score-form">
                <label>分數 <input type="number" class="score-input" min="0" max="100" step="1" value="${score}" placeholder="0–100"> 分</label>
                <label class="score-comment-label">評語 <input type="text" class="score-comment" value="${commentSafe}" placeholder="選填"></label>
                <button type="button" class="btn btn-primary btn-small" onclick="saveScore(${index})">儲存評分</button>
            </div>
        </div>
    `;
    
    
    return block;
}

/**
 * 儲存單一檔案的程式碼評分
 */
function saveScore(blockIndex) {
    const files = getAllFiles();
    if (blockIndex < 0 || blockIndex >= files.length) return;
    const file = files[blockIndex];
    
    const block = document.querySelector(`.code-block[data-block-index="${blockIndex}"]`);
    if (!block) return;
    
    const scoreInput = block.querySelector('.score-input');
    const commentInput = block.querySelector('.score-comment');
    const scoreVal = scoreInput ? scoreInput.value.trim() : '';
    const score = scoreVal === '' ? null : Math.min(100, Math.max(0, parseInt(scoreVal, 10) || 0));
    const comment = commentInput ? commentInput.value.trim() : '';
    
    if (updateFileScore(file.id, score, comment)) {
        // 更新評分和評語顯示區域
        let scoreDisplay = block.querySelector('.score-display');
        
        // 如果有評分或評語，顯示它們
        if (score != null || (comment && comment.trim())) {
            if (!scoreDisplay) {
                // 如果不存在，創建新的顯示區域（插入到程式碼內容之後）
                const codeContent = block.querySelector('.code-content');
                if (codeContent) {
                    scoreDisplay = document.createElement('div');
                    scoreDisplay.className = 'score-display';
                    codeContent.insertAdjacentElement('afterend', scoreDisplay);
                }
            }
            
            if (scoreDisplay) {
                scoreDisplay.innerHTML = '';
                if (score != null) {
                    const badge = document.createElement('span');
                    badge.className = 'score-badge';
                    badge.textContent = `評分：${score} 分`;
                    scoreDisplay.appendChild(badge);
                }
                if (comment && comment.trim()) {
                    const commentSpan = document.createElement('span');
                    commentSpan.className = 'score-comment-display';
                    commentSpan.textContent = `評語：${comment}`;
                    scoreDisplay.appendChild(commentSpan);
                }
            }
        } else {
            // 如果沒有評分和評語，移除顯示區域
            if (scoreDisplay) {
                scoreDisplay.remove();
            }
        }
        
        if (typeof showMessage === 'function') {
            showMessage('評分已儲存', 'success');
        } else {
            alert('評分已儲存');
        }
        
        // 重新渲染檔案列表（如果在上傳頁面）
        if (typeof renderFilesList === 'function') {
            renderFilesList();
        }
    }
}

/**
 * 獲取檔案類型
 */
function getFileType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'py') return 'python';
    return 'unknown';
}


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
    <title>Python作業檢視系統 - 匯出</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="lib/highlight.js/styles/github.min.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Python作業檢視系統</h1>
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
        
        // 評分和評語合併顯示
        let scoreDisplayHtml = '';
        if (file.score != null || (file.comment && file.comment.trim())) {
            scoreDisplayHtml = `
                    <div class="score-display">
                        ${file.score != null ? `<span class="score-badge">評分：${escapeHtml(String(file.score))} 分</span>` : ''}
                        ${(file.comment && file.comment.trim()) ? `<span class="score-comment-display">評語：${escapeHtml(file.comment)}</span>` : ''}
                    </div>
            `;
        }
        
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
                    ${scoreDisplayHtml}
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
 * 匯出Excel（檔名、評分、評語）
 */
function exportExcel() {
    const files = getAllFiles();
    
    if (files.length === 0) {
        alert('沒有檔案可匯出！');
        return;
    }
    
    // 檢查 SheetJS 是否載入
    if (typeof XLSX === 'undefined') {
        alert('Excel 匯出功能載入失敗，請重新整理頁面後重試。');
        return;
    }
    
    try {
        // 準備資料：檔名、評分、評語
        const data = files.map(file => ({
            '檔名': file.name,
            '評分': file.score != null ? file.score : '',
            '評語': file.comment || ''
        }));
        
        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 將資料轉換為工作表
        const ws = XLSX.utils.json_to_sheet(data);
        
        // 設定欄寬
        const colWidths = [
            { wch: 30 },  // 檔名
            { wch: 10 },  // 評分
            { wch: 50 }   // 評語
        ];
        ws['!cols'] = colWidths;
        
        // 將工作表添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '評分表');
        
        // 生成檔案名稱（包含日期）
        const fileName = `Python作業評分表_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // 匯出檔案
        XLSX.writeFile(wb, fileName);
        
        alert(`Excel 檔案已匯出！\n共 ${files.length} 筆資料`);
    } catch (error) {
        console.error('Excel 匯出失敗:', error);
        alert('Excel 匯出失敗：' + error.message);
    }
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
window.saveScore = saveScore;
window.exportHTML = exportHTML;
window.exportExcel = exportExcel;
window.toggleTheme = toggleTheme;
window.getFileType = getFileType;