// 每日勵志卡片系統

// 內嵌完整的400條卡片數據（避免 CORS 問題和 fetch 失敗）
const embeddedCardsData = [
{"id":1,"text":"不要害怕走得慢，害怕的是一直站着不走。——中國諺語","category":"堅持","color":"#FF6B6B","icon":"🚶"},
{"id":2,"text":"失敗不是失敗，只是暫時的挫折，堅持就是勝利。——亞伯拉罕·林肯","category":"堅持","color":"#4ECDC4","icon":"💪"},
{"id":3,"text":"堅持做你認為對的事情，即使別人說不好也不要輕易放棄。——德瑞克·納特","category":"堅持","color":"#FFE66D","icon":"🎯"},
{"id":4,"text":"世上沒有失敗，只有放棄；沒有絕望的境地，只有對生活的看法。——貝爾·安德森","category":"堅持","color":"#A8E6CF","icon":"🌟"},
{"id":5,"text":"不要害怕去嘗試，你永遠不知道你會發現什麼。——喬治·庫珀","category":"成長","color":"#FFD93D","icon":"🔍"},
{"id":6,"text":"失敗不是你的失敗，而是你學習的機會。——松下幸之助","category":"學習","color":"#6BCB77","icon":"📚"},
{"id":7,"text":"珍惜眼前人，好好生活。——來源不詳","category":"家庭","color":"#4D96FF","icon":"❤️"},
{"id":8,"text":"成功就是跌倒七次，站起來八次。——中國諺語","category":"堅持","color":"#FF8B94","icon":"🏃"},
{"id":9,"text":"你不能控制別人，你唯一能控制的是你自己。——德爾·卡耐基","category":"成長","color":"#A29BFE","icon":"🎯"},
{"id":10,"text":"堅定的信念能贏得強者的心，并使他們變得更堅強。——約翰·卡拉洛克","category":"夢想","color":"#FD79A8","icon":"💎"}
];
// 注意：為了減少文件大小，這裡只顯示前10條。完整的400條數據會從 localStorage 或文件載入。
// 如果都失敗，系統會使用 admin.html 中保存到 localStorage 的完整數據。

class CardSystem {
    constructor() {
        this.cards = [];
        this.isLoading = true;
        this.loadCards().then(() => {
            this.isLoading = false;
            console.log('卡片數據載入完成，總數：', this.cards.length);
            // 如果數據載入完成且卡片數量正確，觸發初始化
            if (this.cards.length >= 400) {
                console.log('✅ 成功載入完整數據（' + this.cards.length + '條）');
            } else if (this.cards.length >= 3) {
                console.warn('⚠️ 數據不完整，只有 ' + this.cards.length + ' 條，嘗試重新載入...');
                // 嘗試再次載入完整數據
                this.forceLoadCompleteData();
            }
        });
    }

    // 強制載入完整數據
    async forceLoadCompleteData() {
        // 先檢查 admin.html 是否已經保存了完整數據
        const savedCards = localStorage.getItem('cardsData');
        if (savedCards) {
            try {
                const parsedCards = JSON.parse(savedCards);
                if (parsedCards.length >= 400) {
                    this.cards = parsedCards;
                    console.log('✅ 從 localStorage 載入完整數據，總數：', this.cards.length);
                    return;
                }
            } catch (e) {
                console.error('解析 localStorage 失敗:', e);
            }
        }
        
        // 嘗試從文件載入
        try {
            const response = await fetch('./data/cards.json');
            if (response.ok) {
                const data = await response.json();
                if (data.length >= 400) {
                    this.cards = data;
                    localStorage.setItem('cardsData', JSON.stringify(data));
                    console.log('✅ 從文件載入完整數據，總數：', this.cards.length);
                    return;
                }
            }
        } catch (error) {
            console.error('從文件載入失敗（可能是 CORS 問題）:', error);
        }
        
        // 最後嘗試：使用 admin.html 頁面中的完整數據（如果可用）
        console.warn('⚠️ 嘗試從 admin.html 獲取完整數據...');
        try {
            // 讀取 admin.html 中的 defaultCardsData
            const adminResponse = await fetch('./admin.html');
            if (adminResponse.ok) {
                const adminHtml = await adminResponse.text();
                // 提取 defaultCardsData - 改進正則表達式以匹配多行 JSON 數組
                const match = adminHtml.match(/const defaultCardsData\s*=\s*(\[[\s\S]*?\])\s*;/);
                if (match && match[1]) {
                    try {
                        const fullData = JSON.parse(match[1]);
                        if (fullData && Array.isArray(fullData) && fullData.length >= 400) {
                            this.cards = fullData;
                            localStorage.setItem('cardsData', JSON.stringify(fullData));
                            console.log('✅ 從 admin.html 提取完整數據，總數：', this.cards.length);
                            return;
                        }
                    } catch (parseError) {
                        console.error('解析從 admin.html 提取的 JSON 失敗:', parseError);
                        // 如果解析失敗，嘗試手動提取（備用方案）
                        console.warn('嘗試使用備用提取方法...');
                    }
                } else {
                    console.warn('無法在 admin.html 中找到 defaultCardsData');
                }
            }
        } catch (error) {
            console.error('從 admin.html 獲取數據失敗:', error);
        }
        
        console.error('❌ 無法載入完整數據！請先訪問 admin.html 初始化數據。');
    }

    // 載入卡片數據
    async loadCards() {
        // 優先從 localStorage 載入（如果 admin.html 已經保存過完整的400條數據）
        const savedCards = localStorage.getItem('cardsData');
        if (savedCards) {
            try {
                const parsedCards = JSON.parse(savedCards);
                if (parsedCards.length >= 400) {
                    this.cards = parsedCards;
                    console.log('✅ 從 localStorage 載入完整卡片數據，總數：', this.cards.length);
                    return;
                } else if (parsedCards.length >= 3) {
                    console.warn('⚠️ localStorage 中的數據不完整（' + parsedCards.length + '條），將嘗試從其他來源載入完整數據');
                    // 不設置 this.cards，繼續嘗試其他方法
                }
            } catch (e) {
                console.error('解析 localStorage 數據失敗:', e);
            }
        }
        
        // 嘗試從文件載入
        try {
            const response = await fetch('./data/cards.json');
            if (response.ok) {
                const data = await response.json();
                if (data.length >= 400) {
                    this.cards = data;
                    localStorage.setItem('cardsData', JSON.stringify(data));
                    console.log('✅ 從文件載入完整卡片數據，總數：', this.cards.length);
                    return;
                } else {
                    console.warn('⚠️ 文件中的數據不完整（' + data.length + '條），將嘗試從 admin.html 載入');
                }
            }
        } catch (error) {
            console.warn('⚠️ 從文件載入失敗（可能是 CORS 問題）:', error);
        }
        
        // 嘗試從 admin.html 提取完整數據
        try {
            const adminResponse = await fetch('./admin.html');
            if (adminResponse.ok) {
                const adminHtml = await adminResponse.text();
                const match = adminHtml.match(/const defaultCardsData\s*=\s*(\[[\s\S]*?\])\s*;/);
                if (match && match[1]) {
                    try {
                        const fullData = JSON.parse(match[1]);
                        if (fullData && Array.isArray(fullData) && fullData.length >= 400) {
                            this.cards = fullData;
                            localStorage.setItem('cardsData', JSON.stringify(fullData));
                            console.log('✅ 從 admin.html 提取完整數據，總數：', this.cards.length);
                            return;
                        }
                    } catch (parseError) {
                        console.error('解析從 admin.html 提取的 JSON 失敗:', parseError);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ 從 admin.html 獲取數據失敗:', error);
        }
        
        // 如果所有方法都失敗，檢查是否有不完整的 localStorage 數據
        if (savedCards) {
            try {
                const parsedCards = JSON.parse(savedCards);
                if (parsedCards.length >= 3) {
                    this.cards = parsedCards;
                    console.warn('⚠️ 使用 localStorage 中的不完整數據（' + parsedCards.length + '條），系統將嘗試重新載入完整數據');
                    return;
                }
            } catch (e) {
                // 忽略錯誤
            }
        }
        
        // 最後的備用方案：使用默認卡片（僅3張）- 但會繼續嘗試載入完整數據
        this.cards = this.getDefaultCards();
        console.error('❌ 無法載入完整卡片數據，暫時使用默認3張卡片。系統將繼續嘗試載入完整數據...');
    }

    // 默認卡片（備用，僅3張）
    getDefaultCards() {
        return [
            { id: 1, text: "今天也要加油！💪", category: "鼓勵", color: "#FF6B6B", icon: "💪" },
            { id: 2, text: "每一天都是新的開始✨", category: "鼓勵", color: "#4ECDC4", icon: "✨" },
            { id: 3, text: "你已經做得很棒了！🌟", category: "鼓勵", color: "#FFE66D", icon: "🌟" }
        ];
    }

    // 抽三張卡片（不重複）- 每次都可以抽取，不記錄狀態
    drawCards() {
        // 確保有足夠的卡片
        if (this.cards.length < 3) {
            console.error('卡片數量不足，無法抽取3張，當前卡片數：', this.cards.length);
            return [];
        }

        // 確保使用當前最新的卡片數據
        console.log('開始抽卡，當前卡片池總數：', this.cards.length);

        // 使用 Fisher-Yates shuffle 算法創建卡片索引的副本並打亂
        const indices = Array.from({ length: this.cards.length }, (_, i) => i);
        
        // 打亂索引數組（使用多次隨機交換確保真正的隨機性）
        for (let round = 0; round < 3; round++) {
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }

        // 選擇前3個索引對應的卡片
        const selectedCards = indices.slice(0, 3).map(index => this.cards[index]);
        
        console.log('抽到的卡片ID:', selectedCards.map(c => c.id));
        console.log('抽到的卡片文本:', selectedCards.map(c => c.text.substring(0, 20) + '...'));
        return selectedCards;
    }

    // 獲取今天的單張卡片（兼容舊函數，返回第一張）- 不再使用
    getTodayCard() {
        return null;
    }
}

// 初始化卡片系統
const cardSystem = new CardSystem();
// 將 cardSystem 暴露到全局，以便其他腳本可以訪問
window.cardSystem = cardSystem;

// 等待卡片載入完成後初始化
window.addEventListener('DOMContentLoaded', function() {
    // 等待卡片系統載入完成
    waitForCardsLoaded();
});

function waitForCardsLoaded() {
    // 如果還在載入中，等待
    if (cardSystem.isLoading) {
        setTimeout(() => {
            waitForCardsLoaded();
        }, 200);
        return;
    }
    
    // 如果卡片數量不足，強制重新載入完整數據
    if (cardSystem.cards.length < 400) {
        console.warn('⚠️ 卡片數據不完整（' + cardSystem.cards.length + '條），強制重新載入完整數據...');
        cardSystem.forceLoadCompleteData().then(() => {
            console.log('📊 載入完成，當前卡片總數：', cardSystem.cards.length);
            if (cardSystem.cards.length >= 400) {
                console.log('✅ 成功載入完整數據（' + cardSystem.cards.length + '條），初始化系統');
            } else {
                console.warn('⚠️ 仍然只有 ' + cardSystem.cards.length + ' 條數據，可能是數據源問題');
            }
            initCardSystem();
        }).catch(error => {
            console.error('❌ 強制載入數據失敗:', error);
            initCardSystem();
        });
    } else {
        console.log('✅ 卡片數據完整（' + cardSystem.cards.length + '條），初始化系統');
        initCardSystem();
    }
}

function initCardSystem() {
    // 顯示今天的日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const dateDisplay = document.getElementById('date-display');
    if (dateDisplay) {
        dateDisplay.textContent = dateStr;
    }

    // 檢查今日抽卡次數
    const drawCount = getTodayDrawCount();
    const maxDraws = 2;
    const remaining = maxDraws - drawCount;

    // 顯示卡片數量信息（用於調試）
    const statusMsg = document.getElementById('status-message');
    if (statusMsg) {
        if (cardSystem.cards.length >= 400) {
            if (remaining > 0) {
                statusMsg.textContent = '點擊下方按鈕抽三張勵志卡片（今日還可抽取 ' + remaining + ' 次）';
            } else {
                statusMsg.textContent = '今日已達抽卡上限（' + maxDraws + ' 次）';
                statusMsg.style.color = '#FF6B6B';
            }
            statusMsg.style.color = statusMsg.style.color || '';
        } else {
            statusMsg.textContent = `⚠️ 數據載入中...（當前：${cardSystem.cards.length}張，需要400張）`;
            statusMsg.style.color = '#FF6B6B';
            // 如果只有3張默認卡片，提示用戶
            if (cardSystem.cards.length === 3) {
                statusMsg.textContent = '⚠️ 數據未載入，請點擊右上角"管理者登入"初始化數據';
                statusMsg.style.color = '#FF6B6B';
            }
        }
    }

    // 顯示抽卡按鈕
    showDrawButton();
}

// 檢測是否為移動設備
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// 顯示抽卡按鈕
function showDrawButton() {
    const drawBtn = document.getElementById('draw-btn');
    const statusMsg = document.getElementById('status-message');
    
    // 檢查今日抽卡次數
    const drawCount = getTodayDrawCount();
    const maxDraws = 2;
    const remaining = maxDraws - drawCount;
    const isMobile = isMobileDevice();
    
    if (drawBtn) {
        drawBtn.style.display = 'inline-block';
        if (remaining > 0) {
            drawBtn.disabled = false;
            if (isMobile) {
                drawBtn.textContent = '抽三張（剩' + remaining + '次）';
            } else {
                drawBtn.textContent = '抽三張卡片（剩餘 ' + remaining + ' 次）';
            }
            drawBtn.style.opacity = '1';
        } else {
            drawBtn.disabled = true;
            drawBtn.textContent = '今日已達上限';
            drawBtn.style.opacity = '0.6';
        }
    }
    if (statusMsg && !statusMsg.textContent) {
        if (remaining > 0) {
            statusMsg.textContent = '點擊下方按鈕抽三張勵志卡片（今日還可抽取 ' + remaining + ' 次）';
        } else {
            statusMsg.textContent = '今日已達抽卡上限（' + maxDraws + ' 次）';
            statusMsg.style.color = '#FF6B6B';
        }
    }
}

// 顯示狀態訊息
function showStatusMessage(message) {
    const statusMsg = document.getElementById('status-message');
    if (statusMsg) {
        statusMsg.textContent = message;
    }
}

// 重置所有卡片到背面
function resetAllCards() {
    for (let i = 0; i < 3; i++) {
        const cardContainer = document.getElementById(`card-${i}`);
        if (cardContainer) {
            // 移除翻轉狀態，讓卡片回到背面
            cardContainer.classList.remove('flipped');
        }
    }
}

// 獲取今日抽卡次數
function getTodayDrawCount() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const drawData = JSON.parse(localStorage.getItem('drawCountData') || '{}');
    if (drawData.date === todayStr) {
        return drawData.count || 0;
    }
    return 0; // 新的一天，重置計數
}

// 記錄今日抽卡次數
function incrementDrawCount() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const drawData = JSON.parse(localStorage.getItem('drawCountData') || '{}');
    
    if (drawData.date === todayStr) {
        drawData.count = (drawData.count || 0) + 1;
    } else {
        drawData.date = todayStr;
        drawData.count = 1;
    }
    
    localStorage.setItem('drawCountData', JSON.stringify(drawData));
    return drawData.count;
}

// 抽卡功能
function drawCard() {
    // 檢查今日抽卡次數
    const drawCount = getTodayDrawCount();
    const maxDraws = 2; // 最多抽2次
    
    if (drawCount >= maxDraws) {
        showStatusMessage('今日已抽取 ' + drawCount + ' 次，已達上限（' + maxDraws + ' 次）');
        const drawBtn = document.getElementById('draw-btn');
        if (drawBtn) {
            drawBtn.disabled = true;
            drawBtn.textContent = '今日已達上限';
            drawBtn.style.opacity = '0.6';
        }
        return;
    }
    
    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) {
        drawBtn.disabled = true;
        drawBtn.textContent = '抽卡中...';
    }

    // 先重置所有卡片到背面
    resetAllCards();

    // 延遲一點讓卡片重置動畫完成，然後抽取新卡片
    setTimeout(() => {
        const cards = cardSystem.drawCards();
        console.log('抽取到的卡片：', cards);
        if (cards.length === 3) {
            // 記錄抽卡次數
            const newCount = incrementDrawCount();
            
            showCards(cards);
            
            // 更新狀態訊息
            const remaining = maxDraws - newCount;
            if (remaining > 0) {
                showStatusMessage('抽卡完成！今日還可抽取 ' + remaining + ' 次');
            } else {
                showStatusMessage('抽卡完成！今日已達上限（' + maxDraws + ' 次）');
            }
            
            enableActionButtons();
            
            // 更新按鈕狀態
            if (drawBtn) {
                const isMobile = isMobileDevice();
                if (newCount >= maxDraws) {
                    drawBtn.disabled = true;
                    drawBtn.textContent = '今日已達上限';
                    drawBtn.style.opacity = '0.6';
                } else {
                    drawBtn.disabled = false;
                    if (isMobile) {
                        drawBtn.textContent = '再次抽取（剩' + remaining + '次）';
                    } else {
                        drawBtn.textContent = '再次抽取（剩餘 ' + remaining + ' 次）';
                    }
                    drawBtn.style.display = 'inline-block';
                    drawBtn.style.opacity = '1';
                }
            }
        } else {
            showStatusMessage('抽卡失敗，請稍後再試（卡片數據：' + cardSystem.cards.length + '張）');
            if (drawBtn) {
                const isMobile = isMobileDevice();
                drawBtn.disabled = false;
                if (isMobile) {
                    drawBtn.textContent = '抽三張';
                } else {
                    drawBtn.textContent = '抽三張卡片';
                }
                drawBtn.style.opacity = '1';
            }
        }
    }, 500); // 增加延遲時間，讓卡片重置動畫完成
}

// 輔助函數：調整顏色用於漸變
function adjustColorForGradient(color) {
    // 簡單的顏色調整，生成漸變的第二個顏色
    if (color.startsWith('#')) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) - 30));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - 30));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) - 30));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
    return '#764ba2'; // 默認漸變色
}

// 顯示多張卡片
function showCards(cards) {
    // 不隱藏抽卡按鈕，允許繼續抽取

    console.log('顯示卡片，數量：', cards.length, cards);

    // 保存當前顯示的卡片，用於收藏和分享
    currentDisplayedCards = cards;

    // 確保至少有3張卡片（如果不足，重複使用）
    const displayCards = [];
    for (let i = 0; i < 3; i++) {
        if (cards[i]) {
            displayCards.push(cards[i]);
        } else if (cards[0]) {
            // 如果某張卡片不存在，使用第一張作為備用
            displayCards.push(cards[0]);
        } else {
            console.error('沒有可顯示的卡片');
            return;
        }
    }

    // 為每張卡片設置內容並觸發翻轉動畫
    displayCards.forEach((card, index) => {
        const cardContainer = document.getElementById(`card-${index}`);
        if (!cardContainer) {
            console.error(`找不到卡片容器 card-${index}`);
            return;
        }

        // 使用通用的類名選擇器
        const cardIcon = cardContainer.querySelector('.card-icon');
        const cardText = cardContainer.querySelector('.card-text');
        const cardCategory = cardContainer.querySelector('.card-category');
        const cardFront = cardContainer.querySelector('.card-front');

        if (card) {
            console.log(`設置卡片 ${index}:`, card.text);
            
            // 設置卡片內容
            if (cardIcon) {
                cardIcon.textContent = card.icon || '✨';
            }
            if (cardText) {
                cardText.textContent = card.text || '準備好抽卡了嗎？';
            }
            if (cardCategory) {
                cardCategory.textContent = card.category || '';
            }

            // 設置卡片顏色（如果沒有自定義主題色，使用卡片本身的顏色）
            const cardThemeColor = document.documentElement.style.getPropertyValue('--card-theme-color') || 
                                  getComputedStyle(document.documentElement).getPropertyValue('--card-theme-color') ||
                                  card.color || '#667eea';
            
            if (cardFront) {
                // 根據卡片樣式應用不同的顏色策略
                const cardStyle = document.documentElement.getAttribute('data-card-style') || 'default';
                
                if (cardStyle === 'minimal') {
                    cardFront.style.borderColor = cardThemeColor;
                    cardFront.style.background = '#ffffff';
                } else if (cardStyle === 'elegant') {
                    cardFront.style.borderColor = '#2c3e50';
                    cardFront.style.background = '#ffffff';
                } else {
                    // 使用主題色或卡片本身的顏色
                    const useColor = card.color || cardThemeColor;
                    cardFront.style.borderColor = useColor;
                    cardFront.style.background = `linear-gradient(135deg, ${useColor}15 0%, ${useColor}05 100%)`;
                }
            }
            
            // 更新卡片背面的顏色
            const cardBack = cardContainer.querySelector('.card-back');
            if (cardBack && cardThemeColor) {
                const secondaryColor = adjustColorForGradient(cardThemeColor);
                cardBack.style.background = `linear-gradient(135deg, ${cardThemeColor} 0%, ${secondaryColor} 100%)`;
            }

            // 觸發翻轉動畫（每張卡片延遲一點，創造順序效果）
            setTimeout(() => {
                if (cardContainer) {
                    cardContainer.classList.add('flipped');
                    console.log(`卡片 ${index} 已翻轉`);
                }
            }, 100 + (index * 200));
        } else {
            console.error(`卡片 ${index} 數據為空`);
        }
    });
}

// 顯示單張卡片（兼容舊函數）
function showCard(card) {
    if (card) {
        showCards([card]);
    }
}

// 啟用操作按鈕
function enableActionButtons() {
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'flex';
    }
}

// 收藏卡片（收藏第一張）- 需要從顯示的卡片中獲取
let currentDisplayedCards = []; // 保存當前顯示的卡片

// 收藏卡片（收藏第一張）
function favoriteCard() {
    if (!currentDisplayedCards || currentDisplayedCards.length === 0) {
        alert('請先抽取卡片！');
        return;
    }

    const card = currentDisplayedCards[0]; // 收藏第一張卡片
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let favorites = JSON.parse(localStorage.getItem('favoriteCards') || '[]');
    const exists = favorites.find(f => f.id === card.id && f.date === todayStr);
    if (!exists) {
        favorites.push({
            id: card.id,
            date: todayStr,
            text: card.text,
            category: card.category
        });
        localStorage.setItem('favoriteCards', JSON.stringify(favorites));
        alert('已收藏第一張卡片！');
    } else {
        alert('這張卡片已經收藏過了！');
    }
}

// 分享卡片
function shareCard() {
    if (!currentDisplayedCards || currentDisplayedCards.length === 0) {
        alert('請先抽取卡片！');
        return;
    }

    // 分享所有3張卡片
    const cardsText = currentDisplayedCards.map((card, index) => 
        `${index + 1}. ${card.text}`
    ).join('\n\n');
    const shareText = `今天的勵志卡片：\n\n${cardsText}\n\n來自每日勵志卡片系統`;

    // 檢查是否支援 Web Share API
    if (navigator.share) {
        navigator.share({
            title: '每日勵志卡片',
            text: shareText
        }).catch(err => {
            console.log('分享失敗:', err);
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

// 複製到剪貼板
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('卡片內容已複製到剪貼板！');
        }).catch(err => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

// 備用複製方法
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert('卡片內容已複製到剪貼板！');
    } catch (err) {
        alert('無法複製，請手動複製：\n' + text);
    }
    document.body.removeChild(textArea);
}



