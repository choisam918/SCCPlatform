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
    batchCountInput: null,
    customScoreInput: null
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
    elements.customScoreInput = document.getElementById('customScoreInput');
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
        try {
            groups = JSON.parse(saved);
        } catch (e) {
            console.error('載入數據失敗：', e);
            groups = [];
        }
    }
    
    const savedView = localStorage.getItem('classroomView');
    if (savedView) {
        currentView = savedView;
    }
    
    // 确保元素已初始化后再调用switchView
    // 注意：switchView 函数在后面定义，所以这里先不调用
    // 会在 init() 完成后通过 renderGroups() 来渲染
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
    // 确保容器元素存在
    if (!elements.groupsContainer) {
        elements.groupsContainer = document.getElementById('groupsContainer');
    }
    
    const container = elements.groupsContainer;
    if (!container) {
        console.error('無法找到 groupsContainer 元素！');
        return;
    }
    
    if (groups.length === 0) {
        container.innerHTML = '';
        if (elements.statsSection) {
            elements.statsSection.classList.add('hidden');
        }
        container.style.maxHeight = '';
        container.style.overflowY = 'hidden';
        return;
    }

    // 渲染所有卡片
    container.innerHTML = groups.map((group, index) => {
        return `
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
        `;
    }).join('');
    
    // 設置容器高度，固定顯示2行（10個卡片）
    // 使用雙重 requestAnimationFrame 確保 DOM 完全渲染
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const cards = container.querySelectorAll('.group-card');
            if (cards.length === 0) {
                container.style.maxHeight = '';
                container.style.height = '';
                container.style.overflowY = 'hidden';
                return;
            }
            
            // 計算卡片高度：基於容器寬度計算，確保所有卡片大小一致
            const containerWidth = container.clientWidth;
            const containerStyle = window.getComputedStyle(container);
            const gap = parseFloat(containerStyle.gap) || 12;
            const padding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight) || 12;
            
            // 計算每個卡片的寬度：(容器寬度 - 左右padding - 4個gap) / 5列
            const cardWidth = (containerWidth - padding - (gap * 4)) / 5;
            // 卡片高度是寬度的一半，再增加1/4（即寬度的5/8）
            const cardHeight = (cardWidth / 2) * 1.25;
            
            // 為所有卡片設置固定高度，確保大小一致
            cards.forEach(card => {
                card.style.width = cardWidth + 'px';
                card.style.height = cardHeight + 'px';
                card.style.minWidth = cardWidth + 'px';
                card.style.minHeight = cardHeight + 'px';
                card.style.maxWidth = cardWidth + 'px';
                card.style.maxHeight = cardHeight + 'px';
            });
            
            // 設置容器高度為2行
            const paddingTop = parseFloat(containerStyle.paddingTop) || 6;
            const paddingBottom = parseFloat(containerStyle.paddingBottom) || 6;
            const rowsToShow = 2;
            const maxHeight = (cardHeight * rowsToShow) + (gap * (rowsToShow - 1)) + paddingTop + paddingBottom;
            
            container.style.maxHeight = maxHeight + 'px';
            
            // 超過10個時啟用滾動，否則隱藏滾動條
            if (cards.length > 10) {
                container.style.overflowY = 'auto';
                container.style.overflowX = 'hidden';
            } else {
                container.style.overflowY = 'hidden';
                container.style.overflowX = 'hidden';
            }
        });
    });
}

// 渲染排行榜视图
function renderLeaderboardView() {
    // 确保容器元素存在
    if (!elements.leaderboardContainer) {
        elements.leaderboardContainer = document.getElementById('leaderboardContainer');
    }
    
    const container = elements.leaderboardContainer;
    if (!container) {
        console.error('無法找到 leaderboardContainer 元素！');
        return;
    }
    
    if (groups.length === 0) {
        container.innerHTML = '';
        if (elements.statsSection) {
            elements.statsSection.classList.add('hidden');
        }
        container.style.maxHeight = 'none';
        return;
    }

    // 获取要渲染的组别
    const groupsToSort = groups.map((group, index) => ({ ...group, originalIndex: index }));
    
    // 检查是否所有组分数相同
    const allScoresSame = groupsToSort.length > 0 && groupsToSort.every(g => g.score === groupsToSort[0].score);
    
    // 按分数排序（从高到低）
    // 如果所有分数相同，按原始顺序（第一组开始）排序
    // 否则按分数排序，分数相同时按名称排序
    const sortedGroups = [...groupsToSort].sort((a, b) => {
        if (allScoresSame) {
            // 所有分数相同时，按原始索引排序（保持第一组开始）
            return a.originalIndex - b.originalIndex;
        }
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name, 'zh-TW');
    });

    // 计算最高分，用于柱状图比例
    const maxScore = Math.max(...groupsToSort.map(g => g.score), 1);
    const minScore = Math.min(...groupsToSort.map(g => g.score), 0);
    const scoreRange = maxScore - minScore || 1; // 避免除以0

    container.innerHTML = sortedGroups.map((group, rankIndex) => {
        const originalIndex = group.originalIndex;
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
    try {
        currentView = view;
        localStorage.setItem('classroomView', view);
        
        // 确保元素已初始化
        if (!elements.cardViewBtn) {
            elements.cardViewBtn = document.getElementById('cardViewBtn');
        }
        if (!elements.leaderboardViewBtn) {
            elements.leaderboardViewBtn = document.getElementById('leaderboardViewBtn');
        }
        if (!elements.groupsContainer) {
            elements.groupsContainer = document.getElementById('groupsContainer');
        }
        if (!elements.leaderboardContainer) {
            elements.leaderboardContainer = document.getElementById('leaderboardContainer');
        }
        
        if (view === 'card') {
            if (elements.cardViewBtn) elements.cardViewBtn.classList.add('active');
            if (elements.leaderboardViewBtn) elements.leaderboardViewBtn.classList.remove('active');
            if (elements.groupsContainer) elements.groupsContainer.classList.remove('hidden');
            if (elements.leaderboardContainer) elements.leaderboardContainer.classList.remove('active');
        } else {
            if (elements.cardViewBtn) elements.cardViewBtn.classList.remove('active');
            if (elements.leaderboardViewBtn) elements.leaderboardViewBtn.classList.add('active');
            if (elements.groupsContainer) elements.groupsContainer.classList.add('hidden');
            if (elements.leaderboardContainer) elements.leaderboardContainer.classList.add('active');
        }
        
        renderGroups();
    } catch (error) {
        console.error('切换视图时发生错误：', error);
    }
}

// 立即暴露函数到全局作用域
window.switchView = switchView;

// 初始化事件监听器
function initEventListeners() {
    // 新增組別
    const addGroupForm = document.getElementById('addGroupForm');
    if (addGroupForm) {
        addGroupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 确保元素已初始化
            if (!elements.groupNameInput) {
                elements.groupNameInput = document.getElementById('groupNameInput');
            }
            
            const name = elements.groupNameInput ? elements.groupNameInput.value.trim() : '';
            
            if (!name) {
                alert('請輸入組別名稱！');
                if (elements.groupNameInput) {
                    elements.groupNameInput.focus();
                }
                return;
            }

            // 檢查是否重複
            if (groups.some(g => g.name === name)) {
                alert('組別名稱已存在！');
                if (elements.groupNameInput) {
                    elements.groupNameInput.focus();
                    elements.groupNameInput.select();
                }
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

// 立即暴露函数到全局作用域
window.clearAllGroups = clearAllGroups;

// 批量新增組別
function batchAddGroups() {
    try {
        // 确保元素已初始化
        if (!elements.batchCountInput) {
            elements.batchCountInput = document.getElementById('batchCountInput');
        }
        
        if (!elements.batchCountInput) {
            alert('無法找到批量新增輸入框！');
            return;
        }
        
        const inputValue = elements.batchCountInput.value.trim();
        
        if (!inputValue) {
            alert('請輸入要新增的組別數量！');
            elements.batchCountInput.focus();
            return;
        }
        
        const count = parseInt(inputValue);

        if (isNaN(count) || count <= 0 || count > 50) {
            alert('請輸入有效的數量（1-50）！');
            elements.batchCountInput.focus();
            elements.batchCountInput.select();
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
    } catch (error) {
        console.error('批量新增組別時發生錯誤：', error);
        alert('批量新增組別時發生錯誤：' + error.message);
    }
}

// 立即暴露函数到全局作用域，确保onclick可以访问
window.batchAddGroups = batchAddGroups;

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

// 立即暴露函数到全局作用域
window.startEditName = startEditName;

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

// 立即暴露函数到全局作用域
window.deleteGroup = deleteGroup;

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

// 立即暴露函数到全局作用域
window.selectGroup = selectGroup;

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
    try {
        // 确保元素已初始化
        if (!elements.customScoreInput) {
            elements.customScoreInput = document.getElementById('customScoreInput');
        }
        
        if (selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
            const score = parseInt(elements.customScoreInput?.value || '1');
            if (isNaN(score) || score <= 0) {
                alert('請輸入有效的正整數分數！');
                return;
            }
            groups[selectedGroupIndex].score += score;
            saveGroups();
            animateScore(selectedGroupIndex);
            updateStats();
        }
    } catch (error) {
        console.error('全局加分时发生错误：', error);
        alert('操作失败：' + error.message);
    }
}

// 全局減分
function globalSubtractScore() {
    try {
        // 确保元素已初始化
        if (!elements.customScoreInput) {
            elements.customScoreInput = document.getElementById('customScoreInput');
        }
        
        if (selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
            const score = parseInt(elements.customScoreInput?.value || '1');
            if (isNaN(score) || score <= 0) {
                alert('請輸入有效的正整數分數！');
                return;
            }
            groups[selectedGroupIndex].score -= score;
            saveGroups();
            animateScore(selectedGroupIndex);
            updateStats();
        }
    } catch (error) {
        console.error('全局減分时发生错误：', error);
        alert('操作失败：' + error.message);
    }
}

// 立即暴露函数到全局作用域
window.globalAddScore = globalAddScore;
window.globalSubtractScore = globalSubtractScore;

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
    // 确保元素已初始化
    if (!elements.statsSection) {
        elements.statsSection = document.getElementById('statsSection');
    }
    
    if (!elements.statsSection) {
        return;
    }
    
    if (groups.length === 0) {
        elements.statsSection.classList.add('hidden');
        return;
    }

    elements.statsSection.classList.remove('hidden');
    
    const totalGroups = groups.length;
    const totalScore = groups.reduce((sum, g) => sum + g.score, 0);
    const maxScore = groups.length > 0 ? Math.max(...groups.map(g => g.score)) : 0;

    const totalGroupsEl = document.getElementById('totalGroups');
    const totalScoreEl = document.getElementById('totalScore');
    const maxScoreEl = document.getElementById('maxScore');
    
    if (totalGroupsEl) totalGroupsEl.textContent = totalGroups;
    if (totalScoreEl) totalScoreEl.textContent = totalScore;
    if (maxScoreEl) maxScoreEl.textContent = maxScore;
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

    try {
        exportToExcel();
        setTimeout(() => {
            alert('✅ Excel 文件已成功導出！\n文件名：課堂計分_YYYYMMDD.xlsx');
        }, 500);
    } catch (error) {
        alert('❌ 導出失敗：' + error.message);
        console.error('導出錯誤：', error);
    }
}

// 立即暴露函数到全局作用域
window.exportData = exportData;

// 導出為 Excel 格式
function exportToExcel() {
    // 檢查 SheetJS 是否已載入
    if (typeof XLSX === 'undefined') {
        alert('❌ Excel 導出功能載入失敗，請刷新頁面後重試！');
        return;
    }

    // 按分數排序（從高到低）
    const sortedGroups = [...groups].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name, 'zh-TW');
    });

    // 準備數據
    const worksheetData = [
        ['排名', '組別名稱', '分數'], // 標題行
        ...sortedGroups.map((group, index) => {
            const rank = index + 1;
            return [rank, group.name, group.score];
        })
    ];

    // 創建工作簿
    const wb = XLSX.utils.book_new();
    
    // 將數據轉換為工作表
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // 設置列寬
    ws['!cols'] = [
        { wch: 10 }, // 排名列
        { wch: 20 }, // 組別名稱列
        { wch: 10 }  // 分數列
    ];
    
    // 將工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '課堂計分');
    
    // 生成文件名
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `課堂計分_${dateStr}.xlsx`;
    
    // 導出文件
    XLSX.writeFile(wb, filename);
}

// 導入數據
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 檢查文件格式
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('❌ 只支持 Excel 格式文件（.xlsx 或 .xls）！');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let content = e.target.result;
            let importedGroups = [];

            // 導入 Excel 格式
            if (typeof XLSX === 'undefined') {
                throw new Error('Excel 導入功能載入失敗，請刷新頁面後重試！');
            }
            
            // 將 ArrayBuffer 轉換為二進制字符串
            const data = new Uint8Array(content);
            let binaryString = '';
            for (let i = 0; i < data.length; i++) {
                binaryString += String.fromCharCode(data[i]);
            }
            
            const workbook = XLSX.read(binaryString, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 將工作表轉換為 JSON 數組
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                throw new Error('Excel 文件格式不正確，至少需要標題行和一行數據！');
            }
            
            // 跳過標題行（第一行）
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row.length >= 3) {
                    // 假設格式為：排名, 組別名稱, 分數
                    const name = String(row[1] || '').trim();
                    const score = parseInt(row[2]) || 0;
                    
                    if (name) {
                        importedGroups.push({
                            id: Date.now() + i,
                            name: name,
                            score: score
                        });
                    }
                } else if (row.length >= 2) {
                    // 如果只有兩列，假設是：組別名稱, 分數
                    const name = String(row[0] || '').trim();
                    const score = parseInt(row[1]) || 0;
                    
                    if (name) {
                        importedGroups.push({
                            id: Date.now() + i,
                            name: name,
                            score: score
                        });
                    }
                }
            }

            if (importedGroups.length === 0) {
                alert('導入的數據為空！');
                return;
            }

            if (confirm(`將導入 ${importedGroups.length} 個組別。\n點擊「確定」替換現有數據，點擊「取消」取消導入。`)) {
                groups = importedGroups;
                saveGroups();
                renderGroups();
                alert(`成功導入 ${importedGroups.length} 個組別！`);
            }
        } catch (error) {
            alert('導入失敗：' + error.message);
        }
    };
    
    // 讀取 Excel 文件
    reader.readAsArrayBuffer(file);
    
    // 重置文件輸入
    event.target.value = '';
}

// 立即暴露函数到全局作用域
window.importData = importData;

// 鍵盤快捷鍵支持
document.addEventListener('keydown', function(e) {
    // 防止在輸入框中觸發快捷鍵
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // 在輸入框中不處理 Backspace 和空格
        if (e.key === 'Backspace' || e.key === ' ') {
            return;
        }
    }
    
    // 空格鍵加分（當有選中組別時）
    if (e.key === ' ' && selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
        e.preventDefault();
        globalAddScore();
        return;
    }
    
    // 退格鍵減分（當有選中組別時）
    if (e.key === 'Backspace' && selectedGroupIndex >= 0 && selectedGroupIndex < groups.length) {
        e.preventDefault();
        globalSubtractScore();
        return;
    }
});

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
    try {
        console.log('开始初始化...');
        initElements();
        console.log('元素初始化完成');
        
        initEventListeners();
        console.log('事件监听器初始化完成');
        
        loadGroups();
        console.log('数据加载完成');
        
        // 在 loadGroups 之后调用 switchView，确保视图正确显示
        if (elements.cardViewBtn && elements.leaderboardViewBtn) {
            switchView(currentView);
        }
        
        updateDate();
        console.log('日期更新完成');
        
        // 确保所有函数在初始化后都暴露到全局作用域
        if (typeof window !== 'undefined') {
            window.batchAddGroups = batchAddGroups;
            window.clearAllGroups = clearAllGroups;
            window.switchView = switchView;
            window.selectGroup = selectGroup;
            window.startEditName = startEditName;
            window.deleteGroup = deleteGroup;
            window.globalAddScore = globalAddScore;
            window.globalSubtractScore = globalSubtractScore;
            window.exportData = exportData;
            window.importData = importData;
            console.log('所有函数已暴露到全局作用域');
        }
        
        console.log('初始化完成！');
    } catch (error) {
        console.error('初始化错误：', error);
        console.error('错误堆栈：', error.stack);
        alert('系统初始化失败：' + error.message + '\n请查看控制台获取详细信息。');
    }
}

// 立即执行初始化（如果DOM已加载）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM已经加载完成
    init();
}

// 監聽窗口大小改變，重新計算卡片大小
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        if (currentView === 'card' && groups.length > 0) {
            renderCardView();
        }
    }, 250);
});


