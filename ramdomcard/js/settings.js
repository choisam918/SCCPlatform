// 主題設定系統

// 默認設定
const defaultSettings = {
    theme: 'light' // light, dark
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
}

// 應用主題
function applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    
    // 更新按鈕狀態
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });
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
}

// 設定主題
function setTheme(theme) {
    const settings = loadSettings();
    settings.theme = theme;
    saveSettings(settings);
    applyTheme(theme);
}

// 切換主題（在淺色和深色之間切換）
function toggleTheme() {
    const settings = loadSettings();
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
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
});

