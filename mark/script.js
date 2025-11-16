// 數據存儲
let groups = [];
let currentView = 'card'; // 'card' 或 'leaderboard'
let selectedGroupIndex = -1; // 當前選中的組別索引

// DOM元素缓存
const elements = {
    groupsContainer: null,
    leaderboardContainer: null,
    statsSection: null,
    cardViewBtn: null,
    leaderboardViewBtn: null,
    groupNameInput: null,
    batchCountInput: null
};

// 初始化DOM元素缓存
function initElements() {
    elements.groupsContainer = document.getElementById('groupsContainer');
    elements.leaderboardContainer = document.getElementById('leaderboardContainer');
    elements.statsSection = document.getElementById('statsSection');
    elements.cardViewBtn = document.getElementById('cardViewBtn');
    elements.leaderboardViewBtn = document.getElementById('leaderboardViewBtn');
    elements.groupNameInput = document.getElementById('groupNameInput');
    elements.batchCountInput = document.getElementById('batchCountInput');
}

// 计算容器最大高度（用于限制显示数量）
function calculateMaxHeight(container, itemSelector, maxItems, gap = 10, padding = 4) {
    const items = container.querySelectorAll(itemSelector);
    if (items.length >= maxItems) {
        const firstItems = Array.from(items).slice(0, maxItems);
        const totalHeight = firstItems.reduce((sum, item) => {
            return sum + item.offsetHeight + gap;
        }, padding);
        return totalHeight;
    }
    return null;
}

// 從 localStorage 載入數據
function loadGroups() {
    const saved = localStorage.getItem('classroomGroups');
    if (saved) {
        groups = JSON.parse(saved);
    }
    const savedView = localStorage.getItem('classroomView');
    if (savedView) {
        currentView = savedView;
    }
    switchView(currentView);
    renderGroups();
    
    // 如果組別數量為0，設置批量新增的預設值
    if (groups.length === 0 && elements.batchCountInput && !elements.batchCountInput.value) {
        elements.batchCountInput.value = '1'; // 預設建議新增1組
        elements.batchCountInput.placeholder = '建議：1組';
    }
}

// 保存數據到 localStorage
function saveGroups() {
    localStorage.setItem('classroomGroups', JSON.stringify(groups));
}

// 渲染所有小組
function renderGroups() {
    if (currentView === 'card') {
        renderCardView();
    } else {
        renderLeaderboardView();
    }
    updateStats();
}

// 渲染卡片视图
function renderCardView() {
    const container = elements.groupsContainer;
    
    if (groups.length === 0) {
        container.innerHTML = '<div class="empty-state">還沒有任何組別，請新增組別開始使用！</div>';
        elements.statsSection.classList.add('hidden');
        container.style.maxHeight = 'none';
        return;
    }

    container.innerHTML = groups.map((group, index) => `
        <div class="group-card ${selectedGroupIndex === index ? 'selected' : ''}" onclick="selectGroup(${index})">
            <div class="group-header">
                <div class="group-name" id="groupName-${index}" onclick="event.stopPropagation(); startEditName(${index})" title="點擊編輯組名">${escapeHtml(group.name)}</div>
                <div class="group-header-buttons" onclick="event.stopPropagation();">
                    <button class="edit-btn" onclick="startEditName(${index})" title="編輯組名">編輯</button>
                    <button class="delete-btn" onclick="deleteGroup(${index})" title="刪除組別">×</button>
                </div>
            </div>
            <div class="score-display">
                <div class="score-value" id="score-${index}">${group.score}</div>
            </div>
        </div>
    `).join('');
    
    // 限制最多顯示10組（2行×5列），超過時需要滾動
    if (groups.length > 10) {
        requestAnimationFrame(() => {
            const cards = container.querySelectorAll('.group-card');
            if (cards.length >= 10) {
                // 計算前兩行（10個卡片）的高度
                const firstRowCards = Array.from(cards).slice(0, 5);
                const secondRowCards = Array.from(cards).slice(5, 10);
                const firstRowHeight = firstRowCards.length > 0 ? Math.max(...firstRowCards.map(card => card.offsetHeight)) : 0;
                const secondRowHeight = secondRowCards.length > 0 ? Math.max(...secondRowCards.map(card => card.offsetHeight)) : 0;
                const gap = 12; // grid gap
                const padding = 6; // container padding
                const maxHeight = firstRowHeight + secondRowHeight + gap + padding * 2;
                container.style.maxHeight = maxHeight + 'px';
            }
        });
    } else {
        // 10組或以下，不限制高度
        container.style.maxHeight = 'none';
    }
}

// 渲染排行榜视图
function renderLeaderboardView() {
    const container = elements.leaderboardContainer;
    
    if (groups.length === 0) {
        container.innerHTML = '<div class="empty-state">還沒有任何組別，請新增組別開始使用！</div>';
        elements.statsSection.classList.add('hidden');
        container.style.maxHeight = 'none';
        return;
    }

    // 检查是否所有组分数相同
    const allScoresSame = groups.length > 0 && groups.every(g => g.score === groups[0].score);
    
    // 按分数排序（从高到低）
    // 如果所有分数相同，按原始顺序（第一组开始）排序
    // 否则按分数排序，分数相同时按名称排序
    const sortedGroups = [...groups].sort((a, b) => {
        if (allScoresSame) {
            // 所有分数相同时，按原始索引排序（保持第一组开始）
            return groups.findIndex(g => g.id === a.id) - groups.findIndex(g => g.id === b.id);
        }
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name, 'zh-TW');
    });

    // 计算最高分，用于柱状图比例
    const maxScore = Math.max(...groups.map(g => g.score), 1);
    const minScore = Math.min(...groups.map(g => g.score), 0);
    const scoreRange = maxScore - minScore || 1; // 避免除以0

    container.innerHTML = sortedGroups.map((group, rankIndex) => {
        const originalIndex = groups.findIndex(g => g.id === group.id);
        const rank = rankIndex + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        // 计算柱状图宽度百分比（相对于最高分）
        let barWidth = 0;
        if (maxScore > 0) {
            // 如果有正数，以最高分为基准
            barWidth = Math.max((group.score / maxScore) * 100, 0);
        } else if (minScore < 0 && maxScore <= 0) {
            // 如果所有分数都是负数或0，使用相对于最大绝对值的比例
            const maxAbs = Math.max(Math.abs(maxScore), Math.abs(minScore));
            if (maxAbs > 0) {
                barWidth = (Math.abs(group.score) / maxAbs) * 100;
            }
        }
        // 如果所有分数都是0，显示最小宽度
        if (maxScore === 0 && minScore === 0) {
            barWidth = group.score === 0 ? 5 : 0; // 0分显示最小条
        }
        barWidth = Math.max(barWidth, 0); // 确保不为负
        barWidth = Math.min(barWidth, 100); // 确保不超过100%

        return `
            <div class="leaderboard-item ${selectedGroupIndex === originalIndex ? 'selected' : ''}" onclick="selectGroup(${originalIndex})">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name" id="leaderboardName-${originalIndex}" onclick="event.stopPropagation(); startEditName(${originalIndex})" title="點擊編輯組名">${escapeHtml(group.name)}</div>
                    <div class="leaderboard-bar-container">
                        <div class="leaderboard-bar ${rankClass}" style="width: ${barWidth}%">
                            ${barWidth > 15 ? `<span class="leaderboard-bar-text">${group.score}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="leaderboard-score" id="leaderboardScore-${originalIndex}">${group.score}</div>
            </div>
        `;
            }).join('');
    
    // 限制最多顯示10組，超過時需要滾動
    if (groups.length > 10) {
        requestAnimationFrame(() => {
            const items = container.querySelectorAll('.leaderboard-item');
            if (items.length >= 10) {
                // 計算前10個項目的高度
                const firstTenItems = Array.from(items).slice(0, 10);
                const totalHeight = firstTenItems.reduce((sum, item) => {
                    return sum + item.offsetHeight + 6; // 6px是margin-bottom
                }, 4); // 4px是padding
                container.style.maxHeight = totalHeight + 'px';
            }
        });
    } else {
        // 10組或以下，不限制高度
        container.style.maxHeight = 'none';
    }
}

// 切换视图
function switchView(view) {
    currentView = view;
    localStorage.setItem('classroomView', view);
    
    if (view === 'card') {
        elements.cardViewBtn.classList.add('active');
        elements.leaderboardViewBtn.classList.remove('active');
        elements.groupsContainer.classList.remove('hidden');
        elements.leaderboardContainer.classList.remove('active');
    } else {
        elements.cardViewBtn.classList.remove('active');
        elements.leaderboardViewBtn.classList.add('active');
        elements.groupsContainer.classList.add('hidden');
        elements.leaderboardContainer.classList.add('active');
    }
    
    renderGroups();
}

// 初始化事件监听器
function initEventListeners() {
    // 新增組別
    const addGroupForm = document.getElementById('addGroupForm');
    if (addGroupForm) {
        addGroupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = elements.groupNameInput ? elements.groupNameInput.value.trim() : '';
            
            if (!name) {
                alert('請輸入組別名稱！');
                return;
            }

            // 檢查是否重複
            if (groups.some(g => g.name === name)) {
                alert('組別名稱已存在！');
                return;
            }

            groups.push({
                id: Date.now(),
                name: name,
                score: 0
            });

            saveGroups();
            renderGroups();
            
            // 自動選中新添加的組別
            selectGroup(groups.length - 1);
            
            if (elements.groupNameInput) {
                elements.groupNameInput.value = '';
                elements.groupNameInput.focus();
            }
        });
    }
}

// 清除所有組別
function clearAllGroups() {
    if (groups.length === 0) {
        alert('目前沒有任何組別！');
        return;
    }
    
    if (confirm(`確定要清除所有 ${groups.length} 個組別嗎？此操作無法復原！`)) {
        groups = [];
        saveGroups();
        renderGroups();
        
        // 重置批量新增預設值
        if (elements.batchCountInput) {
            elements.batchCountInput.value = '1';
            elements.batchCountInput.placeholder = '建議：1組';
        }
        
        alert('已清除所有組別！');
    }
}

// 批量新增組別
function batchAddGroups() {
    const count = parseInt(elements.batchCountInput.value);

    if (isNaN(count) || count <= 0 || count > 50) {
        alert('請輸入有效的數量（1-50）！');
        return;
    }

    // 找出現有組別的最大編號
    let maxNumber = 0;
    groups.forEach(group => {
        const match = group.name.match(/第?(\d+)[組组]/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    });

    // 批量創建組別
    const newGroups = [];
    for (let i = 1; i <= count; i++) {
        const groupNumber = maxNumber + i;
        const groupName = `第${groupNumber}組`;
        
        // 檢查是否已存在
        if (!groups.some(g => g.name === groupName)) {
            newGroups.push({
                id: Date.now() + i,
                name: groupName,
                score: 0
            });
        }
    }

    if (newGroups.length === 0) {
        alert('沒有可新增的組別（可能已存在）！');
        return;
    }

    groups.push(...newGroups);
    saveGroups();
    renderGroups();
    elements.batchCountInput.value = '';
    
    // 自動選中第一個新增的組別
    if (newGroups.length > 0) {
        selectGroup(groups.length - newGroups.length);
    }
    
    // 顯示成功訊息
    alert(`成功新增 ${newGroups.length} 個組別！`);
}

// 開始編輯組名
function startEditName(index) {
    // 根據當前視圖選擇正確的元素ID
    const nameElementId = currentView === 'leaderboard' 
        ? `leaderboardName-${index}` 
        : `groupName-${index}`;
    const nameElement = document.getElementById(nameElementId);
    
    if (!nameElement) {
        return;
    }
    
    // 如果已經在編輯中，則不重複創建
    if (nameElement.style.display === 'none') {
        return;
    }
    
    const currentName = groups[index].name;
    
    // 創建輸入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'group-name-input';
    input.value = currentName;
    input.style.width = '100%';
    
    // 替換顯示元素
    nameElement.style.display = 'none';
    nameElement.parentNode.insertBefore(input, nameElement);
    input.focus();
    input.select();

    let isSaving = false;

    // 保存編輯
    function saveEdit() {
        if (isSaving) return;
        isSaving = true;
        
        const newName = input.value.trim();
        
        if (newName === '') {
            alert('組別名稱不能為空！');
            input.focus();
            isSaving = false;
            return;
        }

        // 如果名稱沒有改變，直接取消編輯
        if (newName === currentName) {
            cancelEdit();
            isSaving = false;
            return;
        }

        // 檢查是否與其他組別重複
        if (groups.some((g, i) => i !== index && g.name === newName)) {
            alert('組別名稱已存在！');
            input.focus();
            isSaving = false;
            return;
        }

        groups[index].name = newName;
        saveGroups();
        renderGroups();
    }

    // 取消編輯
    function cancelEdit() {
        nameElement.style.display = 'block';
        if (input.parentNode) {
            input.remove();
        }
    }

    // 按 Enter 保存
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });

    // 失去焦點時保存
    input.addEventListener('blur', function() {
        setTimeout(() => {
            if (!isSaving && document.contains(input)) {
                saveEdit();
            }
        }, 200);
    });
}

// 刪除組別
function deleteGroup(index) {
    if (confirm(`確定要刪除「${groups[index].name}」嗎？`)) {
        groups.splice(index, 1);
        
        // 如果刪除的是選中的組別，清除選中狀態
        if (selectedGroupIndex === index) {
            selectedGroupIndex = -1;
            updateSelectedGroupInfo();
            const globalAddBtn = document.getElementById('globalAddBtn');
            const globalMinusBtn = document.getElementById('globalMinusBtn');
            if (globalAddBtn) globalAddBtn.disabled = true;
            if (globalMinusBtn) globalMinusBtn.disabled = true;
        } else if (selectedGroupIndex > index) {
            // 如果刪除的組別在選中組別之前，調整選中索引
            selectedGroupIndex--;
        }
        
        saveGroups();
        if (currentView === 'leaderboard') {
            renderLeaderboardView();
        } else {
            renderCardView();
        }
        updateStats();
    }
}

// 加分（自定義分數）
function addScore(index) {
    const input = document.getElementById(`scoreInput-${index}`);
    const score = parseInt(input.value);

    if (isNaN(score) || score <= 0) {
        alert('請輸入有效的正整數分數！');
        return;
    }

    groups[index].score += score;
    saveGroups();
    animateScore(index);
    input.value = '';
    updateStats();
}

// 減分（自定義分數）
function subtractScore(index) {
    const input = document.getElementById(`scoreInput-${index}`);
    const score = parseInt(input.value);

    if (isNaN(score) || score <= 0) {
        alert('請輸入有效的正整數分數！');
        return;
    }

    groups[index].score -= score;
    // 分數可以為負數，所以不限制最小值
    saveGroups();
    animateScore(index);
    input.value = '';
    updateStats();
}

// 選擇組別
function selectGroup(index) {
    if (index < 0 || index >= groups.length) {
        return;
    }
    selectedGroupIndex = index;
    updateSelectedGroupInfo();
    renderGroups();
    
    // 啟用全局按鈕
    const globalAddBtn = document.getElementById('globalAddBtn');
    const globalMinusBtn = document.getElementById('globalMinusBtn');
    if (globalAddBtn) globalAddBtn.disabled = false;
    if (globalMinusBtn) globalMinusBtn.disabled = false;
}

// 更新選中組別信息顯示
function updateSelectedGroupInfo() {
    const infoElement = document.getElementById('selectedGroupInfo');
    if (!infoElement) return;
    
    if (selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
        infoElement.innerHTML = `<span>已選擇：<strong>${escapeHtml(groups[selectedGroupIndex].name)}</strong></span>`;
    } else {
        infoElement.innerHTML = '<span>請選擇組別</span>';
    }
}

// 全局加分
function globalAddScore() {
    if (selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
        groups[selectedGroupIndex].score += 1;
        saveGroups();
        animateScore(selectedGroupIndex);
        updateStats();
    }
}

// 全局減分
function globalSubtractScore() {
    if (selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
        groups[selectedGroupIndex].score -= 1;
        saveGroups();
        animateScore(selectedGroupIndex);
        updateStats();
    }
}

// 快速加分（保留以備用）
function quickAddScore(index, points) {
    groups[index].score += points;
    saveGroups();
    animateScore(index);
    updateStats();
}

// 快速減分（保留以備用）
function quickSubtractScore(index, points) {
    groups[index].score -= points;
    // 分數可以為負數，所以不限制最小值
    saveGroups();
    animateScore(index);
    updateStats();
}

// 分數動畫
function animateScore(index) {
    const scoreElement = document.getElementById(`score-${index}`);
    if (scoreElement) {
        scoreElement.textContent = groups[index].score;
        scoreElement.classList.add('animate');
        setTimeout(() => {
            scoreElement.classList.remove('animate');
        }, 500);
    }
    
    // 更新排行榜视图中的分数
    const leaderboardScoreElement = document.getElementById(`leaderboardScore-${index}`);
    if (leaderboardScoreElement) {
        leaderboardScoreElement.textContent = groups[index].score;
    }
    
    // 如果当前是排行榜视图，重新渲染以更新排名
    if (currentView === 'leaderboard') {
        renderLeaderboardView();
    }
}

// 更新統計信息
function updateStats() {
    if (groups.length === 0) {
        elements.statsSection.classList.add('hidden');
        return;
    }

    elements.statsSection.classList.remove('hidden');
    
    const totalGroups = groups.length;
    const totalScore = groups.reduce((sum, g) => sum + g.score, 0);
    const maxScore = groups.length > 0 ? Math.max(...groups.map(g => g.score)) : 0;

    document.getElementById('totalGroups').textContent = totalGroups;
    document.getElementById('totalScore').textContent = totalScore;
    document.getElementById('maxScore').textContent = maxScore;
}

// HTML 轉義（防止 XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 導出數據
function exportData() {
    if (groups.length === 0) {
        alert('目前沒有任何組別數據可以導出！');
        return;
    }

    // 讓用戶選擇導出格式
    const format = confirm('點擊「確定」導出為 CSV 格式（可在 Excel 中打開）\n點擊「取消」導出為 JSON 格式（備份數據）') 
        ? 'csv' 
        : 'json';

    if (format === 'csv') {
        exportToCSV();
    } else {
        exportToJSON();
    }
}

// 導出為 CSV 格式
function exportToCSV() {
    // 按分數排序（從高到低）
    const sortedGroups = [...groups].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name, 'zh-TW');
    });

    // 創建 CSV 內容
    const headers = ['排名', '組別名稱', '分數'];
    const rows = sortedGroups.map((group, index) => {
        const rank = index + 1;
        return [rank, group.name, group.score];
    });

    // 將數據轉換為 CSV 格式
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // 處理包含逗號或引號的內容
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(','))
    ].join('\n');

    // 添加 BOM 以支持中文（UTF-8 with BOM）
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 創建下載鏈接
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    link.href = URL.createObjectURL(blob);
    link.download = `課堂計分_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// 導出為 JSON 格式
function exportToJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        totalGroups: groups.length,
        groups: groups.map(group => ({
            id: group.id,
            name: group.name,
            score: group.score
        }))
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // 創建下載鏈接
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    link.href = URL.createObjectURL(blob);
    link.download = `課堂計分_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// 支援 Enter 鍵提交加分
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const target = e.target;
        if (target.type === 'number' && target.id.startsWith('scoreInput-')) {
            const index = parseInt(target.id.split('-')[1]);
            addScore(index);
        }
    }
});

// 初始化 - 确保DOM加载完成后再执行
// 更新日期顯示
function updateDate() {
    const dateDisplay = document.getElementById('dateDisplay');
    if (dateDisplay) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        dateDisplay.textContent = `${year}年${month}月${day}日 ${weekday}`;
    }
}

function init() {
    initElements();
    initEventListeners();
    loadGroups();
    updateDate();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM已经加载完成
    init();
}

