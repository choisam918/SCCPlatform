// 個人化設定系統

// 默認設定
const defaultSettings = {
    theme: 'light', // light, dark, auto
    fontSize: 2, // 0-4
    cardStyle: 'default', // default, modern, minimal, elegant
    cardThemeColor: '#667eea'
};

// 載入設定
function loadSettings() {
    try {
        const saved = localStorage.getItem('cardSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return { ...defaultSettings, ...settings };
        }
    } catch (e) {
        console.error('載入設定失敗:', e);
    }
    return defaultSettings;
}

// 保存設定
function saveSettings(settings) {
    try {
        localStorage.setItem('cardSettings', JSON.stringify(settings));
        console.log('✅ 設定已保存');
    } catch (e) {
        console.error('保存設定失敗:', e);
    }
}

// 應用設定
function applySettings(settings) {
    // 應用主題
    applyTheme(settings.theme);
    
    // 應用字體大小
    applyFontSize(settings.fontSize);
    
    // 應用卡片樣式
    applyCardStyle(settings.cardStyle);
    
    // 應用卡片主題色
    applyCardThemeColor(settings.cardThemeColor);
}

// 應用主題
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'auto') {
        // 根據系統主題自動切換
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
        
        // 監聽系統主題變化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            applyTheme('auto');
        });
    }
    
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-theme-mode', theme === 'auto' ? 'auto' : theme);
    
    // 更新按鈕狀態
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === (theme === 'auto' ? 'auto' : theme)) {
            btn.classList.add('active');
        }
    });
    
    // 更新已顯示的卡片樣式（主題變化可能影響卡片背景）
    setTimeout(() => {
        updateCardStyles();
    }, 10);
}

// 應用字體大小
function applyFontSize(level) {
    const html = document.documentElement;
    html.setAttribute('data-font-size', level);
    
    // 更新字體大小顯示
    const fontSizes = ['很小', '小', '中等', '大', '很大'];
    const display = document.getElementById('font-size-display');
    if (display) {
        display.textContent = fontSizes[level] || '中等';
    }
    
    // 更新滑塊
    const slider = document.getElementById('font-size-slider');
    if (slider) {
        slider.value = level;
    }
    
    // 應用字體大小到卡片文字
    const cardTexts = document.querySelectorAll('.card-text');
    const sizes = ['0.7rem', '0.8rem', '0.9rem', '1rem', '1.1rem'];
    cardTexts.forEach(text => {
        text.style.fontSize = sizes[level] || '0.9rem';
    });
}

// 應用卡片樣式
function applyCardStyle(style) {
    const html = document.documentElement;
    html.setAttribute('data-card-style', style);
    
    // 更新按鈕狀態
    document.querySelectorAll('.card-style-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-style') === style) {
            option.classList.add('active');
        }
    });
    
    // 應用樣式到卡片（延遲執行確保DOM已更新）
    setTimeout(() => {
        updateCardStyles();
    }, 10);
}

// 應用卡片主題色
function applyCardThemeColor(color) {
    const html = document.documentElement;
    html.style.setProperty('--card-theme-color', color);
    
    // 更新按鈕顏色（如果需要的話）
    const root = document.documentElement;
    root.style.setProperty('--primary-color', color);
    
    // 計算漸變色
    const secondaryColor = adjustColor(color, -30);
    root.style.setProperty('--secondary-color', secondaryColor);
    
    // 更新顏色預設按鈕狀態
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.classList.remove('active');
        if (preset.getAttribute('data-color') === color) {
            preset.classList.add('active');
        }
    });
}

// 調整顏色亮度（用於生成漸變色）
function adjustColor(color, amount) {
    try {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    } catch (e) {
        return '#764ba2'; // 默認漸變色
    }
}

// 更新卡片樣式
function updateCardStyles() {
    const cardContainers = document.querySelectorAll('.card');
    const style = document.documentElement.getAttribute('data-card-style') || 'default';
    const cardThemeColor = document.documentElement.style.getPropertyValue('--card-theme-color') || 
                          getComputedStyle(document.documentElement).getPropertyValue('--card-theme-color') ||
                          '#667eea';
    
    cardContainers.forEach((cardContainer, index) => {
        const cardFront = cardContainer.querySelector('.card-front');
        const cardBack = cardContainer.querySelector('.card-back');
        const cardFace = cardContainer.querySelectorAll('.card-face');
        
        // 更新所有卡片面的樣式類
        cardFace.forEach(face => {
            face.classList.remove('modern-card', 'minimal-card', 'elegant-card');
            if (style !== 'default') {
                face.classList.add(style + '-card');
            }
        });
        
        // 更新卡片正面的樣式和顏色
        if (cardFront) {
            if (style === 'minimal') {
                cardFront.style.borderColor = cardThemeColor;
                cardFront.style.background = '#ffffff';
                if (document.documentElement.getAttribute('data-theme') === 'dark') {
                    cardFront.style.background = '#2d3748';
                }
            } else if (style === 'elegant') {
                cardFront.style.borderColor = '#2c3e50';
                cardFront.style.background = '#ffffff';
                if (document.documentElement.getAttribute('data-theme') === 'dark') {
                    cardFront.style.background = '#2d3748';
                }
            } else {
                // default 或 modern 樣式
                const useColor = cardThemeColor;
                cardFront.style.borderColor = useColor;
                cardFront.style.background = `linear-gradient(135deg, ${useColor}15 0%, ${useColor}05 100%)`;
                if (document.documentElement.getAttribute('data-theme') === 'dark') {
                    cardFront.style.background = '#2d3748';
                    cardFront.style.borderColor = useColor;
                }
            }
        }
        
        // 更新卡片背面的顏色
        if (cardBack && cardThemeColor) {
            const secondaryColor = adjustColorForGradient(cardThemeColor);
            cardBack.style.background = `linear-gradient(135deg, ${cardThemeColor} 0%, ${secondaryColor} 100%)`;
        }
    });
}

// 輔助函數：調整顏色用於漸變（與 card-system.js 中的函數保持一致）
function adjustColorForGradient(color) {
    if (color.startsWith('#')) {
        try {
            const num = parseInt(color.replace('#', ''), 16);
            const r = Math.max(0, Math.min(255, (num >> 16) - 30));
            const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - 30));
            const b = Math.max(0, Math.min(255, (num & 0x0000FF) - 30));
            return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
        } catch (e) {
            return '#764ba2';
        }
    }
    return '#764ba2';
}

// 切換設定面板
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.toggle('active');
        
        // 如果打開，載入當前設定
        if (modal.classList.contains('active')) {
            loadAndDisplaySettings();
        }
    }
}

// 載入並顯示設定
function loadAndDisplaySettings() {
    const settings = loadSettings();
    
    // 更新主題選項
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === settings.theme) {
            btn.classList.add('active');
        }
    });
    
    // 更新字體大小
    applyFontSize(settings.fontSize);
    
    // 更新卡片樣式
    document.querySelectorAll('.card-style-option').forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-style') === settings.cardStyle) {
            option.classList.add('active');
        }
    });
    
    // 更新顏色預設
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.classList.remove('active');
        if (preset.getAttribute('data-color') === settings.cardThemeColor) {
            preset.classList.add('active');
        }
    });
}

// 設定主題
function setTheme(theme) {
    const settings = loadSettings();
    settings.theme = theme;
    saveSettings(settings);
    applyTheme(theme);
}

// 設定字體大小
function setFontSize(level) {
    const settings = loadSettings();
    settings.fontSize = Math.max(0, Math.min(4, level));
    saveSettings(settings);
    applyFontSize(settings.fontSize);
}

// 調整字體大小
function adjustFontSize(delta) {
    const settings = loadSettings();
    const newLevel = Math.max(0, Math.min(4, settings.fontSize + delta));
    setFontSize(newLevel);
}

// 設定卡片樣式
function setCardStyle(style) {
    const settings = loadSettings();
    settings.cardStyle = style;
    saveSettings(settings);
    applyCardStyle(style);
}

// 設定卡片主題色
function setCardThemeColor(color) {
    const settings = loadSettings();
    settings.cardThemeColor = color;
    saveSettings(settings);
    applyCardThemeColor(color);
    // 更新已顯示的卡片樣式
    updateCardStyles();
}

// 重置設定
function resetSettings() {
    if (confirm('確定要重置所有設定為預設值嗎？')) {
        localStorage.removeItem('cardSettings');
        const settings = defaultSettings;
        saveSettings(settings);
        applySettings(settings);
        loadAndDisplaySettings();
        alert('設定已重置為預設值！');
    }
}

// 點擊設定面板外部關閉
document.addEventListener('click', function(event) {
    const modal = document.getElementById('settings-modal');
    if (modal && event.target === modal) {
        toggleSettings();
    }
});

// 初始化設定
window.addEventListener('DOMContentLoaded', function() {
    const settings = loadSettings();
    applySettings(settings);
    
    // 監聽字體大小滑塊變化
    const slider = document.getElementById('font-size-slider');
    if (slider) {
        slider.addEventListener('input', function() {
            setFontSize(parseInt(this.value));
        });
    }
});

