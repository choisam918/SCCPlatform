// 足球戰術系統 JavaScript 檔案

// 全局變量
let players = {
    home: [],
    away: []
};
let fieldPlayers = [];
let currentEditingPlayer = null;
let draggedElement = null;
let homeColor = 'blue';
let awayColor = 'red';

// 分數模式功能
let homeScore = 0;
let awayScore = 0;
const homeScoreSpan = document.getElementById('homeScore');
const awayScoreSpan = document.getElementById('awayScore');
const homePlus = document.getElementById('homePlus');
const homeMinus = document.getElementById('homeMinus');
const awayPlus = document.getElementById('awayPlus');
const awayMinus = document.getElementById('awayMinus');

// 新增：主隊/客隊顯示視窗的起始號碼
let homePlayerWindowStart = 1;
let awayPlayerWindowStart = 1;
const PLAYER_WINDOW_SIZE = 4;
const PLAYER_MAX_NUMBER = 15;

// DOM 元素
const homePlayersContainer = document.getElementById('homePlayers');
const awayPlayersContainer = document.getElementById('awayPlayers');
const fieldPlayersContainer = document.getElementById('fieldPlayers');
const football = document.getElementById('football');
const playerModal = document.getElementById('playerModal');
const playerNameInput = document.getElementById('playerName');
const playerPositionSelect = document.getElementById('playerPosition');
const savePlayerBtn = document.getElementById('savePlayer');
const closeModalBtn = document.querySelector('.close');
const homeColorSelect = document.getElementById('homeColor');
const awayColorSelect = document.getElementById('awayColor');

// 筆記系統變量
let matchNotes = [];
let currentEditingNote = null;
const noteModal = document.getElementById('noteModal');
const notesList = document.getElementById('notesList');

// 標題可編輯功能
const editableTitle = document.getElementById('editableTitle');
if (editableTitle) {
    editableTitle.addEventListener('click', function () {
        this.contentEditable = 'true';
        this.focus();
        document.execCommand('selectAll', false, null);
    });
    editableTitle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    editableTitle.addEventListener('blur', function () {
        this.contentEditable = 'false';
        if (!this.textContent.trim()) {
            this.textContent = "Sam's 7人足球戰術";
        }
    });
}

// 主隊/客隊隊名可編輯功能
function setupEditableTeamName(id, defaultName) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
        this.contentEditable = 'true';
        this.focus();
        document.execCommand('selectAll', false, null);
    });
    el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    el.addEventListener('blur', function () {
        this.contentEditable = 'false';
        if (!this.textContent.trim()) {
            this.textContent = defaultName;
        }
    });
}
setupEditableTeamName('editableHomeName', '主隊');
setupEditableTeamName('editableAwayName', '客隊');

// 計分牌隊名可編輯並同步側邊隊名
function setupEditableScoreName(id, defaultName, syncId) {
    const el = document.getElementById(id);
    const syncEl = document.getElementById(syncId);
    if (!el || !syncEl) return;
    el.addEventListener('click', function () {
        this.contentEditable = 'true';
        this.focus();
        document.execCommand('selectAll', false, null);
    });
    el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.blur();
        }
    });
    el.addEventListener('blur', function () {
        this.contentEditable = 'false';
        if (!this.textContent.trim()) {
            this.textContent = defaultName;
        }
        syncEl.textContent = this.textContent;
    });
    // 反向同步：側邊隊名改動時也同步到計分牌
    syncEl.addEventListener('blur', function () {
        if (syncEl.textContent.trim()) {
            el.textContent = syncEl.textContent;
        }
    });
}
setupEditableScoreName('scoreHomeName', '主隊', 'editableHomeName');
setupEditableScoreName('scoreAwayName', '客隊', 'editableAwayName');

// 創建球員數據
function createPlayerData() {
    // 清空現有球員數據
    players.home = [];
    players.away = [];
    
    // 創建主隊球員 (1-15號)
    for (let i = 1; i <= 15; i++) {
        const player = {
            id: `home_${i}`,
            number: i,
            name: `${i}號`,
            position: 'MF',
            team: 'home',
            x: 0,
            y: 0,
            cards: {
                yellow: 0,
                red: 0
            },
            status: {
                injured: false,
                goals: 0
            }
        };
        players.home.push(player);
    }
    
    // 創建客隊球員 (1-15號)
    for (let i = 1; i <= 15; i++) {
        const player = {
            id: `away_${i}`,
            number: i,
            name: `${i}號`,
            position: 'MF',
            team: 'away',
            x: 0,
            y: 0,
            cards: {
                yellow: 0,
                red: 0
            },
            status: {
                injured: false,
                goals: 0
            }
        };
        players.away.push(player);
    }
}

// 更新球員顯示（只顯示視窗範圍內的球員）
function updatePlayerWindowDisplay() {
    // 主隊
    homePlayersContainer.innerHTML = '';
    players.home
        .filter(p => p.number >= homePlayerWindowStart && p.number < homePlayerWindowStart + PLAYER_WINDOW_SIZE)
        .forEach(player => {
            const playerElement = createPlayerElement(player);
            homePlayersContainer.appendChild(playerElement);
            setupPlayerDragEvents(playerElement, player);
            playerElement.addEventListener('dblclick', () => openPlayerModal(player));
            playerElement.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.player-item .card-controls').forEach(control => {
                    if (control !== playerElement.querySelector('.card-controls')) {
                        control.style.display = 'none';
                        control.classList.remove('show');
                    }
                });
                const controls = playerElement.querySelector('.card-controls');
                if (controls) {
                    if (controls.classList.contains('show')) {
                        controls.classList.remove('show');
                        controls.style.display = 'none';
                    } else {
                        controls.classList.add('show');
                        controls.style.display = 'flex';
                    }
                }
            });
        });
    // 客隊
    awayPlayersContainer.innerHTML = '';
    players.away
        .filter(p => p.number >= awayPlayerWindowStart && p.number < awayPlayerWindowStart + PLAYER_WINDOW_SIZE)
        .forEach(player => {
            const playerElement = createPlayerElement(player);
            awayPlayersContainer.appendChild(playerElement);
            setupPlayerDragEvents(playerElement, player);
            playerElement.addEventListener('dblclick', () => openPlayerModal(player));
            playerElement.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.player-item .card-controls').forEach(control => {
                    if (control !== playerElement.querySelector('.card-controls')) {
                        control.style.display = 'none';
                        control.classList.remove('show');
                    }
                });
                const controls = playerElement.querySelector('.card-controls');
                if (controls) {
                    if (controls.classList.contains('show')) {
                        controls.classList.remove('show');
                        controls.style.display = 'none';
                    } else {
                        controls.classList.add('show');
                        controls.style.display = 'flex';
                    }
                }
            });
        });
}

// 修改 initializePlayers 只初始化資料，顯示交給 updatePlayerWindowDisplay
function initializePlayers() {
    createPlayerData();
    updatePlayerWindowDisplay();
}

// 創建球員元素
function createPlayerElement(player) {
    const playerElement = document.createElement('div');
    playerElement.className = `player-item ${player.team} ${player.team === 'home' ? homeColor : awayColor}`;
    playerElement.draggable = true;
    playerElement.dataset.playerId = player.id;
    
    const cardsDisplay = getCardsDisplay(player.cards, player.status);
    
    playerElement.innerHTML = `
        <div class="player-dot">
            ${player.number}
        </div>
        <div class="player-number">${player.name}</div>
        <div class="player-cards">${cardsDisplay}</div>
        <div class="card-controls">
            <button class="card-btn yellow-card" onclick="addCard('${player.id}', 'yellow')" title="黃牌">⚠</button>
            <button class="card-btn red-card" onclick="addCard('${player.id}', 'red')" title="紅牌">⚠</button>
            <button class="card-btn injury-btn" onclick="toggleInjury('${player.id}')" title="受傷">🏥</button>
            <button class="card-btn goal-btn" onclick="addGoal('${player.id}')" title="進球">⚽</button>
            <button class="card-btn clear-card" onclick="clearAll('${player.id}')" title="清除">✖</button>
        </div>
    `;
    
    return playerElement;
}

// 獲取卡片顯示
function getCardsDisplay(cards, status) {
    let display = '';
    
    // 顯示黃牌
    for (let i = 0; i < cards.yellow; i++) {
        display += '<div class="yellow-card-display"></div>';
    }
    
    // 顯示紅牌
    for (let i = 0; i < cards.red; i++) {
        display += '<div class="red-card-display"></div>';
    }
    
    // 顯示受傷狀態
        if (status.injured) {
        display += '<div class="injured-display">🏥</div>';
        }
    
    // 顯示進球數
        if (status.goals > 0) {
        display += `<div class="goals-display">⚽${status.goals}</div>`;
        }
    
    return display;
}

// 添加卡片
function addCard(playerId, cardType) {
    const player = findPlayerById(playerId);
    if (!player) return;
    
    if (cardType === 'yellow') {
        player.cards.yellow++;
            // 兩張黃牌等於一張紅牌
        if (player.cards.yellow >= 2) {
            player.cards.red++;
            player.cards.yellow = 0;
        }
    } else if (cardType === 'red') {
        player.cards.red++;
        player.cards.yellow = 0; // 直接紅牌時清除黃牌
    }
    
    updatePlayerCardsDisplay(playerId);
}

// 切換受傷狀態
function toggleInjury(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    
    player.status.injured = !player.status.injured;
    updatePlayerCardsDisplay(playerId);
}

// 添加進球
function addGoal(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    
    player.status.goals++;
    updatePlayerCardsDisplay(playerId);
}

// 清除所有狀態
function clearAll(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    
            player.cards.yellow = 0;
            player.cards.red = 0;
            player.status.injured = false;
            player.status.goals = 0;
    
            updatePlayerCardsDisplay(playerId);
}

// 更新球員卡片顯示
function updatePlayerCardsDisplay(playerId) {
    const player = findPlayerById(playerId);
    if (!player) return;
    
    // 更新側邊列表球員
    const sidePlayerElement = document.querySelector(`[data-player-id="${playerId}"]`);
    if (sidePlayerElement) {
        const cardsContainer = sidePlayerElement.querySelector('.player-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = getCardsDisplay(player.cards, player.status);
        }
    }
    
    // 更新場上球員
    const fieldPlayerElement = fieldPlayersContainer.querySelector(`[data-player-id="${playerId}"]`);
    if (fieldPlayerElement) {
        const cardsContainer = fieldPlayerElement.querySelector('.player-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = getCardsDisplay(player.cards, player.status);
        }
    }
}

// 設置球員拖拽事件
function setupPlayerDragEvents(element, player) {
    // 設置拖拽屬性
    element.draggable = true;
    element.addEventListener('dragstart', (e) => {
        // 檢查球員是否已經在場上
        if (element.classList.contains('player-on-field')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', player.id);
        element.classList.add('dragging');
        draggedElement = element;
    });

    element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
        draggedElement = null;
    });

    // 優化的觸控事件
    let isDragging = false;
    let startX, startY;
    let currentX, currentY;
    let dragStarted = false;
    let moveThreshold = 8; // 增加移動閾值，避免誤觸
    let touchStartTime = 0;

    const onTouchStart = (e) => {
        // 檢查球員是否已經在場上
        if (element.classList.contains('player-on-field')) {
            return;
        }
        
        // 防止多點觸控
        if (e.touches.length > 1) {
            return;
        }
        
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;
        currentY = startY;
        touchStartTime = Date.now();
        
        isDragging = true;
        dragStarted = false;
        
        // 添加觸覺反饋（如果支援）
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        
        // 不要立即阻止預設行為，等確認是拖拽操作
    };

    const onTouchMove = (e) => {
        if (!isDragging || e.touches.length > 1) return;
        
        const touch = e.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
        
        // 計算移動距離
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 檢查時間，避免長按誤觸
        const touchDuration = Date.now() - touchStartTime;
            
        // 超過閾值才開始拖拽，避免誤觸
        if (!dragStarted && distance > moveThreshold && touchDuration > 100) {
            dragStarted = true;
            element.classList.add('dragging');
            // 現在開始阻止預設行為
            e.preventDefault();
            
            // 添加觸覺反饋
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        }
        
        if (dragStarted) {
            e.preventDefault();
            e.stopPropagation();
            
            // 檢查是否在球場範圍內
            const fieldContainer = document.querySelector('.field-container');
            if (!fieldContainer) return;
            
            const fieldRect = fieldContainer.getBoundingClientRect();
            
            // 更精確的球場範圍檢查，考慮邊距
            const margin = 15; // 減少球場邊距，適應小螢幕
            if (currentX >= fieldRect.left + margin && 
                currentX <= fieldRect.right - margin &&
                currentY >= fieldRect.top + margin && 
                currentY <= fieldRect.bottom - margin) {
                
                // 視覺反饋 - 可以放置
                fieldContainer.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
                fieldContainer.style.borderColor = '#22c55e';
                fieldContainer.style.borderWidth = '2px';
            } else {
                // 視覺反饋 - 不能放置
                fieldContainer.style.backgroundColor = '';
                fieldContainer.style.borderColor = '';
                fieldContainer.style.borderWidth = '';
            }
        }
    };

    const onTouchEnd = (e) => {
        if (!isDragging) return;
            
        isDragging = false;
        
        if (dragStarted) {
            const fieldContainer = document.querySelector('.field-container');
            if (fieldContainer) {
                // 清除視覺反饋
                fieldContainer.style.backgroundColor = '';
                fieldContainer.style.borderColor = '';
                fieldContainer.style.borderWidth = '';
                
                const fieldRect = fieldContainer.getBoundingClientRect();
                const margin = 15; // 與移動事件保持一致
                
                // 檢查最終位置是否在球場內
                if (currentX >= fieldRect.left + margin && 
                    currentX <= fieldRect.right - margin &&
                    currentY >= fieldRect.top + margin && 
                    currentY <= fieldRect.bottom - margin) {
                    
                    // 計算相對於球場的位置
                    const x = currentX - fieldRect.left - 25; // 球員尺寸的一半
                    const y = currentY - fieldRect.top - 25;
                    
                    // 確保位置在有效範圍內
                    const maxX = fieldContainer.offsetWidth - 50;
                    const maxY = fieldContainer.offsetHeight - 50;
                    const validX = Math.max(0, Math.min(x, maxX));
                    const validY = Math.max(0, Math.min(y, maxY));
                    
                    // 放置球員到球場上
                    placePlayerOnField(player, validX, validY);
                    
                    // 成功放置的觸覺反饋
                    if (navigator.vibrate) {
                        navigator.vibrate([50, 30, 50]);
                    }
                } else {
                    // 放置失敗的觸覺反饋
                    if (navigator.vibrate) {
                        navigator.vibrate([100]);
                    }
                }
            }
            
            element.classList.remove('dragging');
            dragStarted = false;
        } else {
            // 如果沒有拖拽，可能是點擊事件
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration < 200) { // 短按視為點擊
                // 觸發點擊事件來顯示控制按鈕
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: currentX,
                    clientY: currentY
                });
                element.dispatchEvent(clickEvent);
            }
        }
        
        e.preventDefault();
    };

    const onTouchCancel = (e) => {
        isDragging = false;
        dragStarted = false;
        element.classList.remove('dragging');
        
        // 清除視覺反饋
        const fieldContainer = document.querySelector('.field-container');
        if (fieldContainer) {
            fieldContainer.style.backgroundColor = '';
            fieldContainer.style.borderColor = '';
        }
    };

    // 添加觸控事件監聽器
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', onTouchCancel, { passive: true });
    
    // 防止長按彈出上下文菜單
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// 設置事件監聽器
function setupEventListeners() {
    // 顏色選擇事件
    homeColorSelect.addEventListener('change', (e) => {
        homeColor = e.target.value;
        updateTeamColors();
    });

    awayColorSelect.addEventListener('change', (e) => {
        awayColor = e.target.value;
        updateTeamColors();
    });

    // 分數按鈕事件
    homePlus.addEventListener('click', () => {
        homeScore++;
        updateScoreDisplay();
    });

    homeMinus.addEventListener('click', () => {
        if (homeScore > 0) homeScore--;
        updateScoreDisplay();
    });

    awayPlus.addEventListener('click', () => {
        awayScore++;
        updateScoreDisplay();
    });
    
    awayMinus.addEventListener('click', () => {
        if (awayScore > 0) awayScore--;
        updateScoreDisplay();
    });

    // 球場拖拽事件
    const fieldContainer = document.querySelector('.field-container');
    fieldContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    fieldContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const playerId = e.dataTransfer.getData('text/plain');
        const player = findPlayerById(playerId);
        
        if (player) {
            const rect = fieldContainer.getBoundingClientRect();
            const x = e.clientX - rect.left - 25; // 球員尺寸的一半
            const y = e.clientY - rect.top - 25;
            
                    placePlayerOnField(player, x, y);
                }
    });

    // 控制按鈕事件
    document.getElementById('newMatch').addEventListener('click', newMatch);
    // 清空球場按鈕
    const clearFieldBtn = document.getElementById('clearField');
    if (clearFieldBtn) {
        clearFieldBtn.addEventListener('click', clearField);
    }

    // 放置所有球員按鈕
    const placeAllPlayersBtn = document.getElementById('placeAllPlayers');
    if (placeAllPlayersBtn) {
        placeAllPlayersBtn.addEventListener('click', placeAllPlayersOnField);
    }

    // 保存陣型按鈕
    document.getElementById('saveFormation').addEventListener('click', saveFormation);
    document.getElementById('loadFormation').addEventListener('click', loadFormation);
    const adminLoginBtn = document.getElementById('adminLogin');
    if (adminLoginBtn) {
        adminLoginBtn.onclick = function() {
            // 使用 Electron IPC 在同一視窗中載入管理頁面
            if (window.electronAPI) {
                window.electronAPI.openSubsystem('football/admin.html');
            } else {
                // 備用方案：直接導航
                window.location.href = 'admin.html';
            }
        };
    }

    // 球員編輯模態框事件
    closeModalBtn.addEventListener('click', closePlayerModal);
    savePlayerBtn.addEventListener('click', savePlayerInfo);
    
    // 點擊模態框外部關閉
    window.addEventListener('click', (e) => {
        if (e.target === playerModal) {
            closePlayerModal();
        }
        if (e.target === noteModal) {
            closeNoteModal();
            }
        });

    // 筆記功能事件
    document.getElementById('addNote').addEventListener('click', addNote);
    document.getElementById('clearAllNotes').addEventListener('click', clearAllNotes);
    document.getElementById('saveNote').addEventListener('click', saveNote);
    
    // 筆記模態框關閉按鈕
    const noteCloseBtn = noteModal.querySelector('.close');
    if (noteCloseBtn) {
        noteCloseBtn.addEventListener('click', closeNoteModal);
    }

    // 隱藏球員控制項的全局點擊事件
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.player-item') && !e.target.closest('.field-player')) {
            document.querySelectorAll('.card-controls.show').forEach(control => {
                control.classList.remove('show');
                control.style.display = 'none';
            });
        }
    });

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    saveFormation();
                    break;
                case 'l':
                    e.preventDefault();
                    loadFormation();
                    break;
                case 'c':
                    e.preventDefault();
                    clearField();
                    break;
            }
        }
        if (e.key === 'Escape') {
            closePlayerModal();
            closeNoteModal();
        }
    });
}

// 更新球隊顏色
function updateTeamColors() {
    // 更新球員列表中的顏色
    const homePlayers = homePlayersContainer.querySelectorAll('.player-item');
    const awayPlayers = awayPlayersContainer.querySelectorAll('.player-item');
    
    homePlayers.forEach(player => {
        player.className = `player-item home ${homeColor}`;
    });
    
    awayPlayers.forEach(player => {
        player.className = `player-item away ${awayColor}`;
    });
    
    // 更新場上球員的顏色
    const fieldHomePlayers = fieldPlayersContainer.querySelectorAll('.field-player.home');
    const fieldAwayPlayers = fieldPlayersContainer.querySelectorAll('.field-player.away');
    
    fieldHomePlayers.forEach(player => {
        player.className = `field-player home ${homeColor}`;
    });
    
    fieldAwayPlayers.forEach(player => {
        player.className = `field-player away ${awayColor}`;
    });
}

// 設置足球拖拽事件
function setupFootballDragEvents() {
    const fieldContainer = document.querySelector('.field-container');
    
    // 滑鼠拖拽（與球員使用相同的方式，更流暢）
    let isDraggingMouse = false;
    let startX, startY; // 初始鼠标位置
    let offsetX, offsetY; // 鼠标相对于足球中心点的偏移
    let animationFrameId = null;
    let originalZIndex = null;

    const updateFootballPosition = (x, y) => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            const rect = fieldContainer.getBoundingClientRect();
            const footballSize = 36; // 更新為與CSS一致的尺寸
            const footballRadius = footballSize / 2; // 足球半径
            const margin = 25;
            // 边界检测：确保足球中心点不会超出边界（考虑半径）
            const minX = -margin + footballRadius;
            const minY = -margin + footballRadius;
            const maxX = rect.width + margin - footballRadius;
            const maxY = rect.height + margin - footballRadius;
            const clampedX = Math.max(minX, Math.min(x, maxX));
            const clampedY = Math.max(minY, Math.min(y, maxY));
            
            moveFootball(clampedX, clampedY);
        });
    };

    const onMouseMove = (e) => {
        if (!isDraggingMouse) return;
        
        const rect = fieldContainer.getBoundingClientRect();
        // 计算鼠标相对于容器的位置
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算足球中心点应该的位置（鼠标位置减去偏移量）
        const footballCenterX = mouseX - offsetX;
        const footballCenterY = mouseY - offsetY;
        
        // 計算移動距離（基于初始鼠标位置和当前鼠标位置）
        const deltaX = Math.abs(mouseX - startX);
        const deltaY = Math.abs(mouseY - startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 只有移動距離超過閾值才開始真正的拖拽
        if (distance > 3) {
            // 只有在真正开始拖拽时才添加 dragging class
            if (!football.classList.contains('dragging')) {
                football.classList.add('dragging');
            }
            e.preventDefault();
            e.stopPropagation();
            
            // 使用中心点位置更新足球位置
            updateFootballPosition(footballCenterX, footballCenterY);
        }
    };

    const onMouseUp = (e) => {
        if (!isDraggingMouse) return;
        
        const wasDragging = football.classList.contains('dragging');
        isDraggingMouse = false;
        football.classList.remove('dragging');
        
        // 恢復原始 z-index
        if (originalZIndex !== null) {
            football.style.zIndex = originalZIndex;
        }
        
        // 清除拖拽时的 transform 缩放效果，但保持位置不变
        if (wasDragging) {
            // 保持 left/top 位置，只清除 transform 的缩放效果
            football.style.setProperty('transform', 'translateZ(0)', 'important');
        }
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // 如果真正拖拽了，才阻止默认行为
        if (wasDragging) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const onMouseDown = (e) => {
        // 儲存原始 z-index 並提升到最上層
        originalZIndex = football.style.zIndex;
        football.style.zIndex = '1000';
        
        const rect = fieldContainer.getBoundingClientRect();
        const footballRect = football.getBoundingClientRect();
        
        // 计算足球中心点相对于容器的位置（考虑当前的实际位置）
        // 使用 getPropertyValue 或 getComputedStyle 获取样式值，支持 important 样式
        const leftValue = football.style.getPropertyValue('left') || window.getComputedStyle(football).left;
        const topValue = football.style.getPropertyValue('top') || window.getComputedStyle(football).top;
        
        let currentLeft = parseFloat(leftValue);
        let currentTop = parseFloat(topValue);
        
        // 如果 left/top 是空的、NaN 或百分比，使用 getBoundingClientRect 计算实际位置
        if (isNaN(currentLeft) || isNaN(currentTop) || leftValue.includes('%') || !leftValue || leftValue === '50%') {
            currentLeft = footballRect.left + footballRect.width / 2 - rect.left;
            currentTop = footballRect.top + footballRect.height / 2 - rect.top;
        }
        
        // 计算鼠标相对于足球中心点的偏移
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        offsetX = mouseX - currentLeft;
        offsetY = mouseY - currentTop;
        
        // 保存初始鼠标位置，用于计算移动距离
        startX = mouseX;
        startY = mouseY;
        
        // 清除 transform，改用 left/top 定位（使用中心点）
        // 使用 setProperty 和 important 确保覆盖 CSS
        football.style.setProperty('transform', 'translateZ(0)', 'important');
        football.style.setProperty('left', currentLeft + 'px', 'important');
        football.style.setProperty('top', currentTop + 'px', 'important');
        
        isDraggingMouse = true;
        // 不立即添加 dragging class，等真正移动时再添加（与球员一致）
        document.body.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp, { passive: false });
    };

    football.addEventListener('mousedown', onMouseDown);
    
    // 觸控拖拽功能（使用 requestAnimationFrame 優化）
    let isDraggingTouch = false;
    let touchStartX, touchStartY;
    let touchOffsetX, touchOffsetY;
    let dragStarted = false;
    let moveThreshold = 3; // 降低觸控閾值，與球員一致

    const onTouchStart = (e) => {
        // 防止多點觸控
        if (e.touches.length > 1) {
            return;
        }
        
        const touch = e.touches[0];
        const rect = fieldContainer.getBoundingClientRect();
        const footballRect = football.getBoundingClientRect();
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        // 计算足球中心点相对于容器的位置（考虑当前的实际位置）
        // 使用 getPropertyValue 或 getComputedStyle 获取样式值，支持 important 样式
        const leftValue = football.style.getPropertyValue('left') || window.getComputedStyle(football).left;
        const topValue = football.style.getPropertyValue('top') || window.getComputedStyle(football).top;
        
        let currentLeft = parseFloat(leftValue);
        let currentTop = parseFloat(topValue);
        
        // 如果 left/top 是空的、NaN 或百分比，使用 getBoundingClientRect 计算实际位置
        if (isNaN(currentLeft) || isNaN(currentTop) || leftValue.includes('%') || !leftValue || leftValue === '50%') {
            currentLeft = footballRect.left + footballRect.width / 2 - rect.left;
            currentTop = footballRect.top + footballRect.height / 2 - rect.top;
        }
        
        // 计算触摸点相对于足球中心点的偏移
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        touchOffsetX = touchX - currentLeft;
        touchOffsetY = touchY - currentTop;
        
        // 清除 transform，改用 left/top 定位（使用中心点）
        // 使用 setProperty 和 important 确保覆盖 CSS
        football.style.setProperty('transform', 'translateZ(0)', 'important');
        football.style.setProperty('left', currentLeft + 'px', 'important');
        football.style.setProperty('top', currentTop + 'px', 'important');
        
        isDraggingTouch = true;
        dragStarted = false;
        
        // 儲存原始 z-index 並提升到最上層
        originalZIndex = football.style.zIndex;
        football.style.zIndex = '1000';
    };

    const onTouchMove = (e) => {
        if (!isDraggingTouch || e.touches.length > 1) return;
        
        const touch = e.touches[0];
        
        // 計算移動距離
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 超過閾值才開始拖拽
        if (!dragStarted && distance > moveThreshold) {
            dragStarted = true;
            football.classList.add('dragging');
            e.preventDefault();
        }
        
        if (dragStarted) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = fieldContainer.getBoundingClientRect();
            // 计算触摸点相对于容器的位置
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // 计算足球中心点应该的位置（触摸点位置减去偏移量）
            const footballCenterX = touchX - touchOffsetX;
            const footballCenterY = touchY - touchOffsetY;
            
            updateFootballPosition(footballCenterX, footballCenterY);
        }
    };

    const onTouchEnd = (e) => {
        if (!isDraggingTouch) return;
        
        isDraggingTouch = false;
        
        if (dragStarted) {
            football.classList.remove('dragging');
            dragStarted = false;
            
            // 恢復原始 z-index
            if (originalZIndex !== null) {
                football.style.zIndex = originalZIndex;
            }
            
            // 清除拖拽时的 transform 缩放效果，但保持位置不变
            football.style.setProperty('transform', 'translateZ(0)', 'important');
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const onTouchCancel = (e) => {
        isDraggingTouch = false;
        dragStarted = false;
        football.classList.remove('dragging');
        
        // 恢復原始 z-index
        if (originalZIndex !== null) {
            football.style.zIndex = originalZIndex;
        }
        
        // 清除拖拽时的 transform 缩放效果，但保持位置不变
        football.style.setProperty('transform', 'translateZ(0)', 'important');
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };

    // 添加觸控事件監聽器
    football.addEventListener('touchstart', onTouchStart, { passive: true });
    football.addEventListener('touchmove', onTouchMove, { passive: false });
    football.addEventListener('touchend', onTouchEnd, { passive: false });
    football.addEventListener('touchcancel', onTouchCancel, { passive: true });
    
    // 防止長按彈出上下文菜單
    football.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// 將球員放置到球場上
function placePlayerOnField(player, x, y, skipLimitCheck = false) {
    // 檢查是否已經在場上
    const existingFieldPlayer = fieldPlayersContainer.querySelector(`[data-player-id="${player.id}"]`);
    if (existingFieldPlayer) {
        return; // 球員已經在場上
    }
    
    // 檢查同隊球員數量限制（除非跳過檢查，如載入陣型時）
    if (!skipLimitCheck) {
        const sameTeamPlayersOnField = fieldPlayers.filter(p => p.team === player.team).length;
        if (sameTeamPlayersOnField >= 7) {
            alert(`球場上${player.team === 'home' ? '主隊' : '客隊'}球員已達上限（7人）！`);
            return;
        }
    }
    
    const fieldPlayer = document.createElement('div');
    fieldPlayer.className = `field-player ${player.team} ${player.team === 'home' ? homeColor : awayColor}`;
    fieldPlayer.dataset.playerId = player.id;
    fieldPlayer.draggable = true;
    fieldPlayer.style.left = x + 'px';
    fieldPlayer.style.top = y + 'px';
    
    const cardsDisplay = getCardsDisplay(player.cards, player.status);
    
    fieldPlayer.innerHTML = `
        <div class="player-number-display">${player.number}</div>
        <div class="player-cards">${cardsDisplay}</div>
        <div class="card-controls">
            <button class="card-btn yellow-card" onclick="addCard('${player.id}', 'yellow')" title="黃牌">⚠</button>
            <button class="card-btn red-card" onclick="addCard('${player.id}', 'red')" title="紅牌">⚠</button>
            <button class="card-btn injury-btn" onclick="toggleInjury('${player.id}')" title="受傷">🏥</button>
            <button class="card-btn goal-btn" onclick="addGoal('${player.id}')" title="進球">⚽</button>
            <button class="card-btn remove-btn" onclick="removePlayerFromField('${player.id}')" title="移除球員">×</button>
            <button class="card-btn clear-card" onclick="clearAll('${player.id}')" title="清除">✖</button>
        </div>
    `;
    
    fieldPlayersContainer.appendChild(fieldPlayer);
    setupFieldPlayerDrag(fieldPlayer);
    
    // 雙擊編輯事件
    fieldPlayer.addEventListener('dblclick', () => openPlayerModal(player));
    
    // 點擊顯示控制項
    fieldPlayer.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.field-player .card-controls').forEach(control => {
            if (control !== fieldPlayer.querySelector('.card-controls')) {
                control.style.display = 'none';
                control.classList.remove('show');
            }
        });
        const controls = fieldPlayer.querySelector('.card-controls');
        if (controls) {
            if (controls.classList.contains('show')) {
                controls.classList.remove('show');
                controls.style.display = 'none';
            } else {
                controls.classList.add('show');
                controls.style.display = 'flex';
            }
        }
    });
    
    // 更新球員位置
    player.x = x;
    player.y = y;
    
    if (!fieldPlayers.find(p => p.id === player.id)) {
        fieldPlayers.push(player);
    }
    
    // 禁用列表中的該球員拖拽功能
    disablePlayerInList(player.id);
}

// 設置場上球員拖拽
function setupFieldPlayerDrag(fieldPlayer) {
    const playerId = fieldPlayer.dataset.playerId;
    const player = findPlayerById(playerId);
    
    if (!player) return;

    const fieldContainer = document.querySelector('.field-container');
    
    // 滑鼠拖拽
    let isDraggingMouse = false;
    let startX, startY;
    let offsetX, offsetY;
    let animationFrameId = null;
    let originalZIndex = null;

    const updatePosition = (x, y) => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            const playerSize = 50;
            const rect = fieldContainer.getBoundingClientRect();
            const minX = -playerSize/2;
            const minY = -playerSize/2;
            const maxX = rect.width - playerSize/2;
            const maxY = rect.height - playerSize/2;
            const clampedX = Math.max(minX, Math.min(x, maxX));
            const clampedY = Math.max(minY, Math.min(y, maxY));
            
            fieldPlayer.style.left = clampedX + 'px';
            fieldPlayer.style.top = clampedY + 'px';
            player.x = clampedX;
            player.y = clampedY;
        });
    };

    const onMouseMove = (e) => {
        if (!isDraggingMouse) return;
        
        // 計算移動距離
        const deltaX = Math.abs(e.clientX - (offsetX + fieldPlayer.getBoundingClientRect().left));
        const deltaY = Math.abs(e.clientY - (offsetY + fieldPlayer.getBoundingClientRect().top));
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 只有移動距離超過閾值才開始真正的拖拽
        if (distance > 3) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = fieldContainer.getBoundingClientRect();
            const x = e.clientX - rect.left - offsetX;
            const y = e.clientY - rect.top - offsetY;
            
            updatePosition(x, y);
        }
    };

    const onMouseUp = (e) => {
        if (!isDraggingMouse) return;
        
        const wasDragging = fieldPlayer.classList.contains('dragging');
        isDraggingMouse = false;
        fieldPlayer.classList.remove('dragging');
        
        // 恢復原始 z-index
        if (originalZIndex !== null) {
            fieldPlayer.style.zIndex = originalZIndex;
        }
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // 如果沒有真正拖拽，則觸發點擊事件
        if (!wasDragging) {
            // 手動觸發點擊事件來顯示控制按鈕
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY
            });
            fieldPlayer.dispatchEvent(clickEvent);
        }
        
        e.preventDefault();
        e.stopPropagation();
    };

    const onMouseDown = (e) => {
        // 不要立即阻止預設行為，讓點擊事件先處理
        // e.preventDefault();
        // e.stopPropagation();
        
        // 儲存原始 z-index 並提升到最上層
        originalZIndex = fieldPlayer.style.zIndex;
        fieldPlayer.style.zIndex = '1000';
        
        const rect = fieldContainer.getBoundingClientRect();
        const playerRect = fieldPlayer.getBoundingClientRect();
        
        offsetX = e.clientX - playerRect.left;
        offsetY = e.clientY - playerRect.top;
        
        isDraggingMouse = true;
        fieldPlayer.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp, { passive: false });
    };

    fieldPlayer.addEventListener('mousedown', onMouseDown);
    
    // 觸控拖拽
    let isDraggingTouch = false;
    let touchStartX, touchStartY;
    let touchOffsetX, touchOffsetY;
    let dragStarted = false;
    let moveThreshold = 3; // 降低觸控閾值，提升響應性

    const onTouchStart = (e) => {
        // 防止多點觸控
        if (e.touches.length > 1) {
            return;
        }
        
        const touch = e.touches[0];
        const playerRect = fieldPlayer.getBoundingClientRect();
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchOffsetX = touch.clientX - playerRect.left;
        touchOffsetY = touch.clientY - playerRect.top;
        
        isDraggingTouch = true;
        dragStarted = false;
        
        // 儲存原始 z-index 並提升到最上層
        originalZIndex = fieldPlayer.style.zIndex;
        fieldPlayer.style.zIndex = '1000';
    };

    const onTouchMove = (e) => {
        if (!isDraggingTouch || e.touches.length > 1) return;
        
        const touch = e.touches[0];
        
        // 計算移動距離
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 超過閾值才開始拖拽
        if (!dragStarted && distance > moveThreshold) {
            dragStarted = true;
            fieldPlayer.classList.add('dragging');
            e.preventDefault();
        }
        
        if (dragStarted) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = fieldContainer.getBoundingClientRect();
            const x = touch.clientX - rect.left - touchOffsetX;
            const y = touch.clientY - rect.top - touchOffsetY;
            
            updatePosition(x, y);
        }
    };

    const onTouchEnd = (e) => {
        if (!isDraggingTouch) return;
        
        isDraggingTouch = false;
        
        if (dragStarted) {
            fieldPlayer.classList.remove('dragging');
            dragStarted = false;
            
            // 恢復原始 z-index
            if (originalZIndex !== null) {
                fieldPlayer.style.zIndex = originalZIndex;
            }
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const onTouchCancel = (e) => {
        isDraggingTouch = false;
        dragStarted = false;
        fieldPlayer.classList.remove('dragging');
        
        // 恢復原始 z-index
        if (originalZIndex !== null) {
            fieldPlayer.style.zIndex = originalZIndex;
        }
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };

    // 添加觸控事件監聽器
    fieldPlayer.addEventListener('touchstart', onTouchStart, { passive: true });
    fieldPlayer.addEventListener('touchmove', onTouchMove, { passive: false });
    fieldPlayer.addEventListener('touchend', onTouchEnd, { passive: false });
    fieldPlayer.addEventListener('touchcancel', onTouchCancel, { passive: true });
    
    // 防止長按彈出上下文菜單
    fieldPlayer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// 移動足球
// x, y 参数是足球中心点的位置（相对于容器的像素值）
function moveFootball(x, y) {
    // 拖拽时清除 transform，直接使用 left/top 定位，避免残影
    if (football.classList.contains('dragging')) {
        // 使用 setProperty 确保样式一致性
        football.style.setProperty('transform', 'translateZ(0) scale(1.1)', 'important');
    } else {
        // 非拖拽状态时，清除 transform，使用 left/top 定位
        football.style.setProperty('transform', 'translateZ(0)', 'important');
    }
    // 直接设置中心点位置（因为我们已经计算好了中心点）
    // 使用 setProperty 和 important 确保覆盖 CSS 中的百分比定位
    football.style.setProperty('left', x + 'px', 'important');
    football.style.setProperty('top', y + 'px', 'important');
}

// 查找球員
function findPlayerById(id) {
    return [...players.home, ...players.away].find(player => player.id === id);
}

// 從場上移除球員
function removePlayerFromField(playerId) {
    const fieldPlayer = fieldPlayersContainer.querySelector(`[data-player-id="${playerId}"]`);
    if (fieldPlayer) {
        fieldPlayer.remove();
    }
    
    // 從場上球員陣列中移除
    const index = fieldPlayers.findIndex(p => p.id === playerId);
    if (index > -1) {
        fieldPlayers.splice(index, 1);
    }
    
    // 重置球員位置
    const player = findPlayerById(playerId);
    if (player) {
        player.x = 0;
        player.y = 0;
    }
    
    // 重新啟用列表中的該球員拖拽功能
    enablePlayerInList(playerId);
}

// 禁用列表中的球員拖拽
function disablePlayerInList(playerId) {
    const playerElements = document.querySelectorAll(`[data-player-id="${playerId}"]`);
    playerElements.forEach(element => {
        if (element.parentElement !== fieldPlayersContainer) {
            element.classList.add('player-on-field');
            element.draggable = false;
        }
    });
}

// 啟用列表中的球員拖拽
function enablePlayerInList(playerId) {
    const playerElements = document.querySelectorAll(`[data-player-id="${playerId}"]`);
    playerElements.forEach(element => {
        if (element.parentElement !== fieldPlayersContainer) {
            element.classList.remove('player-on-field');
            element.draggable = true;
        }
    });
}

// 打開球員編輯模態框
function openPlayerModal(player) {
    currentEditingPlayer = player;
    playerNameInput.value = player.name;
    playerPositionSelect.value = player.position;
    playerModal.style.display = 'block';
}

// 關閉球員編輯模態框
function closePlayerModal() {
        playerModal.style.display = 'none';
    currentEditingPlayer = null;
}

// 保存球員信息
function savePlayerInfo() {
    if (!currentEditingPlayer) return;

    const newName = playerNameInput.value.trim();
    const newPosition = playerPositionSelect.value;

    if (newName) {
        currentEditingPlayer.name = newName;
        currentEditingPlayer.position = newPosition;

        // 更新側邊列表顯示
        const sidePlayerElement = document.querySelector(`[data-player-id="${currentEditingPlayer.id}"]`);
        if (sidePlayerElement) {
            const nameElement = sidePlayerElement.querySelector('.player-number');
            if (nameElement) {
                nameElement.textContent = newName;
            }
        }
        
        // 更新場上球員顯示
        const fieldPlayerElement = fieldPlayersContainer.querySelector(`[data-player-id="${currentEditingPlayer.id}"]`);
        if (fieldPlayerElement) {
            const numberElement = fieldPlayerElement.querySelector('.player-number-display');
            if (numberElement) {
                numberElement.textContent = currentEditingPlayer.number;
        }
    }

    closePlayerModal();
    }
}

// 新的賽事
function newMatch() {
    if (confirm('確定要開始新的賽事嗎？這將清空所有球員、筆記並重置比分。')) {
        // 清空球場
        clearField();
        
        // 重置所有球員狀態
        [...players.home, ...players.away].forEach(player => {
            player.cards.yellow = 0;
            player.cards.red = 0;
            player.status.injured = false;
            player.status.goals = 0;
            player.x = 0;
            player.y = 0;
        });
        
        // 重新初始化球員顯示
        initializePlayers();
        
        // 重置足球位置到中心
        initializeFootballPosition();
        
        // 清空筆記
        matchNotes = [];
        updateNotesDisplay();
        
        // 重置比分
        homeScore = 0;
        awayScore = 0;
        updateScoreDisplay();
        
        alert('新賽事已開始！');
    }
}

// 保存陣型
function saveFormation() {
    const formation = {
        id: Date.now(),
        name: `陣型_${new Date().toLocaleString()}`,
        home: [],
        away: [],
        football: {
            // 使用 getPropertyValue 获取样式值，支持 important 样式
            x: (() => {
                const leftValue = football.style.getPropertyValue('left') || window.getComputedStyle(football).left;
                if (!leftValue || leftValue === '50%' || leftValue.includes('%')) return null;
                return parseFloat(leftValue) || null;
            })(),
            y: (() => {
                const topValue = football.style.getPropertyValue('top') || window.getComputedStyle(football).top;
                if (!topValue || topValue === '50%' || topValue.includes('%')) return null;
                return parseFloat(topValue) || null;
            })()
        },
        homeColor: homeColor,
        awayColor: awayColor,
        homeScore: homeScore,
        awayScore: awayScore,
        homeTeamName: document.getElementById('editableHomeName').textContent.trim(),
        awayTeamName: document.getElementById('editableAwayName').textContent.trim(),
        timestamp: new Date().toISOString(),
        notes: [...matchNotes]
    };

    // 保存主隊球員
    players.home.forEach(player => {
        const fieldPlayer = fieldPlayersContainer.querySelector(`[data-player-id="${player.id}"]`);
        if (fieldPlayer) {
            formation.home.push({
                id: player.id,
                number: player.number,
                name: player.name,
                x: parseFloat(fieldPlayer.style.left) || 0,
                y: parseFloat(fieldPlayer.style.top) || 0,
                cards: player.cards,
                status: player.status,
                onField: true
            });
        } else {
            formation.home.push({
                id: player.id,
                number: player.number,
                name: player.name,
                x: 0,
                y: 0,
                cards: player.cards,
                status: player.status,
                onField: false
            });
        }
    });

    // 保存客隊球員
    players.away.forEach(player => {
        const fieldPlayer = fieldPlayersContainer.querySelector(`[data-player-id="${player.id}"]`);
        if (fieldPlayer) {
            formation.away.push({
                id: player.id,
                number: player.number,
                name: player.name,
                x: parseFloat(fieldPlayer.style.left) || 0,
                y: parseFloat(fieldPlayer.style.top) || 0,
                cards: player.cards,
                status: player.status,
                onField: true
            });
        } else {
            formation.away.push({
                id: player.id,
                number: player.number,
                name: player.name,
                x: 0,
                y: 0,
                cards: player.cards,
                status: player.status,
                onField: false
            });
        }
    });

    try {
        const existingFormations = JSON.parse(localStorage.getItem('footballFormations') || '[]');
        
        if (existingFormations.length >= 10) {
            existingFormations.shift();
        }
        
        existingFormations.push(formation);
        localStorage.setItem('footballFormations', JSON.stringify(existingFormations));
        
        alert('記錄保存成功！');
    } catch (error) {
        console.error('保存記錄時發生錯誤:', error);
        alert('保存記錄時發生錯誤！');
    }
}




// 清空球場
function clearField() {
    // 清空場上球員
    fieldPlayersContainer.innerHTML = '';
    
    // 清空場上球員陣列
    fieldPlayers = [];
    
    // 重置所有球員位置並重新啟用拖拽
    [...players.home, ...players.away].forEach(player => {
        player.x = 0;
        player.y = 0;
        enablePlayerInList(player.id);
    });
    
    // 重置足球位置到球場中心
    initializeFootballPosition();
}

// 載入陣型
function loadFormation() {
    try {
        const formations = JSON.parse(localStorage.getItem('footballFormations') || '[]');
        if (formations.length === 0) {
            alert('沒有找到保存的記錄！');
            return;
        }
        
        // 創建載入記錄的模態框
        showLoadFormationModal(formations);
        
    } catch (error) {
        console.error('載入記錄時發生錯誤:', error);
        alert('載入記錄時發生錯誤！');
    }
}

// 顯示載入記錄模態框
function showLoadFormationModal(formations) {
    // 移除已存在的模態框
    const existingModal = document.getElementById('loadFormationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 創建模態框
    const modal = document.createElement('div');
    modal.id = 'loadFormationModal';
    modal.className = 'modal';
    modal.style.cssText = `
        display: block;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white;
        margin: 5% auto;
        padding: 20px;
        border-radius: 15px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
    `;
    
    // 標題
    const title = document.createElement('h3');
    title.textContent = '選擇要載入的記錄';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #1e3c72;
        text-align: center;
    `;
    
    // 記錄列表容器（可滾動）
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        margin-bottom: 20px;
        max-height: 60vh;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 10px;
    `;
    
    // 生成記錄列表
    formations.forEach((formation, index) => {
        const recordItem = document.createElement('div');
        recordItem.style.cssText = `
            padding: 15px;
            margin-bottom: 10px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9fa;
        `;
        
        const date = new Date(formation.timestamp).toLocaleString();
        recordItem.innerHTML = `
            <div style="font-weight: bold; color: #1e3c72; margin-bottom: 5px;">
                ${index + 1}. ${formation.name}
            </div>
            <div style="font-size: 0.9rem; color: #6c757d; margin-bottom: 3px;">
                主隊：${formation.homeTeamName || '主隊'} vs 客隊：${formation.awayTeamName || '客隊'}
            </div>
            <div style="font-size: 0.9rem; color: #6c757d; margin-bottom: 3px;">
                比分：${formation.homeScore || 0} : ${formation.awayScore || 0}
            </div>
            <div style="font-size: 0.8rem; color: #adb5bd;">
                保存時間：${date}
            </div>
        `;
        
        // 點擊事件
        recordItem.addEventListener('click', () => {
            loadSpecificFormation(formation);
            modal.remove();
        });
        
        // 懸停效果
        recordItem.addEventListener('mouseenter', () => {
            recordItem.style.borderColor = '#1e3c72';
            recordItem.style.background = '#e3f2fd';
        });
        
        recordItem.addEventListener('mouseleave', () => {
            recordItem.style.borderColor = '#e9ecef';
            recordItem.style.background = '#f8f9fa';
        });
        
        listContainer.appendChild(recordItem);
    });
    
    // 取消按鈕
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
        background: #6c757d;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        align-self: center;
    `;
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // 組裝模態框
    modalContent.appendChild(title);
    modalContent.appendChild(listContainer);
    modalContent.appendChild(cancelBtn);
    modal.appendChild(modalContent);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 添加到頁面
    document.body.appendChild(modal);
}

// 載入特定陣型
function loadSpecificFormation(formation) {
        // 清空球場
        clearField();
        
    // 恢復球隊顏色
    homeColor = formation.homeColor || 'blue';
    awayColor = formation.awayColor || 'red';
            homeColorSelect.value = homeColor;
            awayColorSelect.value = awayColor;
        
    // 恢復比分
    homeScore = formation.homeScore || 0;
    awayScore = formation.awayScore || 0;
    updateScoreDisplay();
        
    // 恢復隊伍名稱
        if (formation.homeTeamName) {
            document.getElementById('editableHomeName').textContent = formation.homeTeamName;
            document.getElementById('scoreHomeName').textContent = formation.homeTeamName;
        }
        if (formation.awayTeamName) {
            document.getElementById('editableAwayName').textContent = formation.awayTeamName;
            document.getElementById('scoreAwayName').textContent = formation.awayTeamName;
        }
        
    // 恢復筆記
    if (formation.notes) {
        matchNotes = [...formation.notes];
        updateNotesDisplay();
    }
    
    // 恢復球員數據和狀態
    formation.home.forEach(savedPlayer => {
        const player = players.home.find(p => p.number === savedPlayer.number);
        if (player) {
            player.name = savedPlayer.name;
            player.cards = savedPlayer.cards || { yellow: 0, red: 0 };
            player.status = savedPlayer.status || { injured: false, goals: 0 };
            player.x = savedPlayer.x;
            player.y = savedPlayer.y;
            
            if (savedPlayer.onField) {
                placePlayerOnField(player, savedPlayer.x, savedPlayer.y, true);
            }
        }
    });
    
    formation.away.forEach(savedPlayer => {
        const player = players.away.find(p => p.number === savedPlayer.number);
        if (player) {
            player.name = savedPlayer.name;
            player.cards = savedPlayer.cards || { yellow: 0, red: 0 };
            player.status = savedPlayer.status || { injured: false, goals: 0 };
            player.x = savedPlayer.x;
            player.y = savedPlayer.y;
            
            if (savedPlayer.onField) {
                placePlayerOnField(player, savedPlayer.x, savedPlayer.y, true);
            }
        }
    });
        
    // 恢復足球位置
    if (formation.football && formation.football.x !== null && formation.football.y !== null) {
        moveFootball(formation.football.x, formation.football.y);
    } else {
        initializeFootballPosition();
    }

    // 重新初始化球員顯示
    initializePlayers();
    updateTeamColors();
    
    // 顯示載入記錄資訊
    let infoMsg = `主隊：${formation.homeTeamName || ''}  vs  客隊：${formation.awayTeamName || ''}\n比分：${formation.homeScore || 0} : ${formation.awayScore || 0}\n保存時間：${formation.timestamp ? new Date(formation.timestamp).toLocaleString() : ''}`;
    alert(infoMsg);
    
    alert('陣型載入成功！');
    }
    
// 更新分數顯示
function updateScoreDisplay() {
    homeScoreSpan.textContent = homeScore;
    awayScoreSpan.textContent = awayScore;
}

// 筆記功能
function addNote() {
    currentEditingNote = null;
    document.getElementById('noteModalTitle').textContent = '新增筆記';
    document.getElementById('noteTime').value = '';
    document.getElementById('noteType').value = '進球';
    document.getElementById('noteContent').value = '';
    noteModal.style.display = 'block';
}

function editNote(noteId) {
    const note = matchNotes.find(n => n.id === noteId);
    if (!note) return;
    
    currentEditingNote = note;
    document.getElementById('noteModalTitle').textContent = '編輯筆記';
    document.getElementById('noteTime').value = note.time;
    document.getElementById('noteType').value = note.type;
    document.getElementById('noteContent').value = note.content;
    noteModal.style.display = 'block';
}

function saveNote() {
    const time = document.getElementById('noteTime').value.trim();
    const type = document.getElementById('noteType').value;
    const content = document.getElementById('noteContent').value.trim();
    
    if (!content) {
        alert('請填寫筆記內容！');
        return;
    }
    
    if (currentEditingNote) {
        // 編輯現有筆記
        currentEditingNote.time = time;
        currentEditingNote.type = type;
        currentEditingNote.content = content;
    } else {
        // 新增筆記
        const note = {
            id: Date.now(),
            time: time || '無時間',
            type: type,
            content: content,
            timestamp: new Date().toISOString()
        };
        matchNotes.push(note);
    }
    
    updateNotesDisplay();
    closeNoteModal();
}

function deleteNote(noteId) {
    if (confirm('確定要刪除這條筆記嗎？')) {
        const index = matchNotes.findIndex(n => n.id === noteId);
        if (index > -1) {
            matchNotes.splice(index, 1);
    updateNotesDisplay();
        }
    }
}

function clearAllNotes() {
    if (confirm('確定要清空所有筆記嗎？')) {
    matchNotes = [];
    updateNotesDisplay();
    }
}

function updateNotesDisplay() {
    if (!notesList) return;
    
    if (matchNotes.length === 0) {
        notesList.innerHTML = '<div class="no-notes">暫無筆記</div>';
        return;
    }
    
    notesList.innerHTML = matchNotes.map(note => `
        <div class="note-item">
            <div class="note-header">
                <span class="note-time">${note.time}</span>
                <span class="note-type ${note.type}">${note.type}</span>
            </div>
            <div class="note-content">${note.content}</div>
            <div class="note-actions">
                <button class="note-btn edit-note-btn" onclick="editNote(${note.id})">編輯</button>
                <button class="note-btn delete-note-btn" onclick="deleteNote(${note.id})">刪除</button>
            </div>
        </div>
    `).join('');
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    currentEditingNote = null;
}

// 初始化足球位置
function initializeFootballPosition() {
    // 清除所有內聯樣式，讓足球回到CSS的預設中心位置
    football.style.left = '';
    football.style.top = '';
    football.style.transform = '';
}

// 綁定上下箭頭事件
function setupPlayerWindowArrows() {
    const homeUpBtn = document.getElementById('homeUpBtn');
    const homeDownBtn = document.getElementById('homeDownBtn');
    const awayUpBtn = document.getElementById('awayUpBtn');
    const awayDownBtn = document.getElementById('awayDownBtn');
    
    homeUpBtn.addEventListener('click', () => {
        if (homePlayerWindowStart > 1) {
            homePlayerWindowStart--;
            updatePlayerWindowDisplay();
        }
    });
    homeDownBtn.addEventListener('click', () => {
        if (homePlayerWindowStart + PLAYER_WINDOW_SIZE - 1 < PLAYER_MAX_NUMBER) {
            homePlayerWindowStart++;
            updatePlayerWindowDisplay();
        }
    });
    awayUpBtn.addEventListener('click', () => {
        if (awayPlayerWindowStart > 1) {
            awayPlayerWindowStart--;
            updatePlayerWindowDisplay();
        }
    });
    awayDownBtn.addEventListener('click', () => {
        if (awayPlayerWindowStart + PLAYER_WINDOW_SIZE - 1 < PLAYER_MAX_NUMBER) {
            awayPlayerWindowStart++;
            updatePlayerWindowDisplay();
        }
    });
}

// 新增：一次性放置所有球員到球場
function placeAllPlayersOnField() {
    clearField();
    const fieldContainer = document.querySelector('.field-container');
    const rect = fieldContainer.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // 主隊（藍色）站位
    const homePositions = [
        // 1號守門員 - 左側禁區內
        { x: W * 0.12, y: H * 0.5 },
        // 2、3、4號禁區外橫排防線
        { x: W * 0.25, y: H * 0.25 },
        { x: W * 0.25, y: H * 0.5 },
        { x: W * 0.25, y: H * 0.75 },
        // 5、6、7號中場三角形陣型
        { x: W * 0.4, y: H * 0.5 },
        { x: W * 0.35, y: H * 0.3 },
        { x: W * 0.35, y: H * 0.7 }
    ];
    players.home.slice(0, 7).forEach((player, i) => {
        const pos = homePositions[i];
        placePlayerOnField(player, pos.x, pos.y, true);
    });

    // 客隊（紅色）站位
    const awayPositions = [
        // 1號守門員 - 右側禁區內
        { x: W * 0.88, y: H * 0.5 },
        // 2、3、4號禁區外橫排防線
        { x: W * 0.75, y: H * 0.25 },
        { x: W * 0.75, y: H * 0.5 },
        { x: W * 0.75, y: H * 0.75 },
        // 5、6、7號中場三角形陣型
        { x: W * 0.6, y: H * 0.5 },
        { x: W * 0.65, y: H * 0.3 },
        { x: W * 0.65, y: H * 0.7 }
    ];
    players.away.slice(0, 7).forEach((player, i) => {
        const pos = awayPositions[i];
        placePlayerOnField(player, pos.x, pos.y, true);
    });
    alert('已根據新圖示將球員放置到球場上！');
}

// 檢測並處理屏幕方向
function checkOrientation() {
    const portraitWarning = document.getElementById('portraitWarning');
    const container = document.querySelector('.container');
    
    if (!container) {
        console.warn('Container not found');
        return;
    }
    
    // 檢測是否為移動設備
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 檢測是否為豎屏（高度大於寬度）
    const isPortrait = window.innerHeight > window.innerWidth;
    
    console.log('Orientation check:', { isMobile, isPortrait, width: window.innerWidth, height: window.innerHeight });
    
    // 移動設備且為豎屏時，顯示提示並隱藏內容
    if (isMobile && isPortrait) {
        if (portraitWarning) {
            portraitWarning.classList.add('show');
            portraitWarning.style.display = 'flex';
            portraitWarning.style.visibility = 'visible';
            portraitWarning.style.zIndex = '99999';
        }
        container.style.display = 'none';
        container.style.visibility = 'hidden';
    } else {
        // 橫屏或其他設備：隱藏提示，顯示內容
        if (portraitWarning) {
            portraitWarning.classList.remove('show');
            portraitWarning.style.display = 'none';
            portraitWarning.style.visibility = 'hidden';
        }
        // 強制顯示容器，清除所有可能的隱藏樣式
        container.style.display = 'flex';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
    }
}

// 移動端檢測和優化
function detectMobileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isMobile || isTouchDevice) {
        document.body.classList.add('mobile-device');
        
        // 檢查屏幕方向
        checkOrientation();
        
        // 監聽屏幕方向變化
        window.addEventListener('orientationchange', function() {
            setTimeout(checkOrientation, 100);
        });
        
        // 監聽窗口大小變化（處理軟鍵盤等情況）
        window.addEventListener('resize', function() {
            setTimeout(checkOrientation, 100);
        });
        
        // 優化移動端體驗
        optimizeForMobile();
        
        console.log('檢測到移動設備，已啟用移動端優化');
    }
    
    return isMobile || isTouchDevice;
}

// 移動端優化
function optimizeForMobile() {
    // 禁用雙擊縮放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // 優化視窗高度
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
    
    // 優化觸控滾動
    document.body.style.webkitOverflowScrolling = 'touch';
    document.documentElement.style.webkitOverflowScrolling = 'touch';
    
    // 確保容器可以滾動
    const container = document.querySelector('.container');
    if (container) {
        container.style.webkitOverflowScrolling = 'touch';
        container.style.overflowY = 'auto';
    }
    
    // 防止橡皮筋效果（僅針對球場區域）
    document.addEventListener('touchmove', function(e) {
        // 只在拖拽球場上的球員時才阻止默認滾動
        if (e.target.closest('.field-container') && e.target.closest('.field-player, .football')) {
            // 允許拖拽，但不要阻止整個頁面的滾動
            return;
        }
    }, { passive: true });
}

// 移動端滾動修復（包括微信和普通手機瀏覽器）
function fixMobileScrolling() {
    // 檢測是否為移動設備
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    
    if (isMobile || isTouchDevice) {
        // 強制啟用滾動
        document.body.style.position = 'relative';
        document.body.style.height = 'auto';
        document.body.style.minHeight = '100vh';
        document.body.style.overflowY = 'auto';
        document.body.style.webkitOverflowScrolling = 'touch';
        
        const container = document.querySelector('.container');
        if (container) {
            container.style.position = 'relative';
            container.style.height = 'auto';
            container.style.minHeight = '100vh';
            container.style.overflowY = 'auto';
            container.style.webkitOverflowScrolling = 'touch';
            container.style.maxWidth = '100vw';
        }
        
        // 確保html也可以滾動
        document.documentElement.style.overflowY = 'auto';
        document.documentElement.style.webkitOverflowScrolling = 'touch';
        
        // 確保主內容區域不超出屏幕
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.maxWidth = '100vw';
            mainContent.style.boxSizing = 'border-box';
        }
        
        console.log('移動端環境檢測：已啟用滾動修復', { isMobile, isTouchDevice, isWeChat });
    }
}

// 微信環境特殊處理（保留兼容性）
function fixWeChatScrolling() {
    fixMobileScrolling();
}

// 立即檢查屏幕方向（在DOM加載前就檢查，避免閃爍）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        checkOrientation();
        fixMobileScrolling();
    });
} else {
    // DOM已經加載完成，立即檢查
    checkOrientation();
    fixMobileScrolling();
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 再次檢查屏幕方向（確保執行）
    checkOrientation();
    // 再次修復移動端滾動
    fixMobileScrolling();
    
    // 檢測移動設備
    const isMobile = detectMobileDevice();
    
    initializePlayers();
    setupEventListeners();
    setupFootballDragEvents();
    initializeFootballPosition();
    updateScoreDisplay();
    updateNotesDisplay();
    setupPlayerWindowArrows();
    
    // 移動端延遲檢查備份提醒
    if (isMobile) {
        setTimeout(checkBackupReminder, 3000);
    } else {
        setTimeout(checkBackupReminder, 2000);
    }
    
    console.log('足球戰術系統初始化完成！');
});

// 檢查備份提醒
function checkBackupReminder() {
    const autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
    if (!autoBackupEnabled) return;
    
    const nextReminder = localStorage.getItem('nextBackupReminder');
    if (!nextReminder) return;
    
    const now = new Date();
    const reminderTime = new Date(nextReminder);
    
    if (now >= reminderTime) {
        // 顯示備份提醒
        if (confirm('📅 備份提醒\n\n距離上次備份已經超過設定的時間，建議您現在進行數據備份。\n\n是否要現在進行數據備份？')) {
            // 創建一個簡單的備份功能
            const backup = {
                formations: JSON.parse(localStorage.getItem('footballFormations') || '[]'),
                notes: JSON.parse(localStorage.getItem('footballNotes') || '[]'),
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `football_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            localStorage.setItem('lastBackupTime', new Date().toISOString());
            alert('數據備份完成！文件已保存到您的下載資料夾。');
        } else {
            // 延遲提醒到明天
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            localStorage.setItem('nextBackupReminder', tomorrow.toISOString());
        }
    }
}

function scrollPlayerList(team, direction) {
    const list = document.getElementById(team === 'home' ? 'homePlayers' : 'awayPlayers');
    if (!list) return;
    const scrollAmount = 60; // 每次滾動的像素，可依實際高度調整
    list.scrollTop += direction * scrollAmount;
}
