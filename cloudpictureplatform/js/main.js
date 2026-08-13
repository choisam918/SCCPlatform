// 主頁邏輯

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 初始化資料庫
        await initDB();
        
        // 更新照片數量顯示
        await updatePhotoCountDisplay();
        
        // 設置清除按鈕事件
        setupClearButton();
    } catch (error) {
        console.error('初始化失敗:', error);
        showNotification('系統初始化失敗，請重新整理頁面重試', 'error');
    }
});

/**
 * 更新照片數量顯示
 */
async function updatePhotoCountDisplay() {
    try {
        const count = await getPhotoCount();
        const countElement = document.getElementById('currentCount');
        if (countElement) {
            countElement.textContent = count;
        }
        
        // 根據照片數量顯示/隱藏清除按鈕
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            if (count > 0) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('獲取照片數量失敗:', error);
    }
}

/**
 * 設置清除按鈕事件
 */
function setupClearButton() {
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearAllPhotos);
        
        // 添加懸停效果
        clearBtn.addEventListener('mouseenter', () => {
            clearBtn.style.background = '#ff7875';
            clearBtn.style.transform = 'translateY(-2px)';
        });
        clearBtn.addEventListener('mouseleave', () => {
            clearBtn.style.background = '#ff4d4f';
            clearBtn.style.transform = 'translateY(0)';
        });
    }
}

/**
 * 處理清除所有照片
 */
async function handleClearAllPhotos() {
    // 確認對話框
    const confirmed = confirm('確定要清除所有照片嗎？此操作無法撤銷！');
    if (!confirmed) {
        return;
    }
    
    try {
        // 清除所有照片
        await clearAllPhotos();
        
        // 顯示成功提示
        showNotification('所有照片已清除', 'success');
        
        // 更新照片數量顯示
        await updatePhotoCountDisplay();
        
        console.log('所有照片清除完成');
    } catch (error) {
        console.error('清除照片失敗:', error);
        showNotification('清除照片失敗: ' + error.message, 'error');
    }
}


