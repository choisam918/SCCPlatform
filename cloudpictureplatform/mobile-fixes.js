// 移動端修復腳本

(function() {
    'use strict';

    // ============================================
    // 1. 修復手機版無法上傳照片問題
    // ============================================
    
    function fixMobileUpload() {
        // 查找所有文件輸入元素
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            // 確保在移動設備上可以正常觸發
            input.addEventListener('touchstart', function(e) {
                // 不阻止默認行為，讓文件選擇器正常打開
                e.stopPropagation();
            }, { passive: true });
            
            // 確保點擊事件正常工作
            input.addEventListener('click', function(e) {
                // 在移動設備上，確保可以觸發文件選擇
                if (this.value) {
                    // 允許重新選擇文件
                    this.value = '';
                }
            });
            
            // 修復iOS Safari的文件選擇問題
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                // iOS需要特殊處理
                const wrapper = input.closest('.upload-area, .upload-button-container');
                if (wrapper) {
                    wrapper.addEventListener('click', function(e) {
                        if (e.target !== input) {
                            input.click();
                        }
                    });
                }
            }
        });
        
        // 修復上傳按鈕在移動端的問題
        const uploadButtons = document.querySelectorAll('.upload-button, .select-photos-btn, [data-upload-trigger]');
        uploadButtons.forEach(btn => {
            btn.addEventListener('touchstart', function(e) {
                // 觸摸時觸發文件選擇
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    e.preventDefault();
                    fileInput.click();
                }
            }, { passive: false });
        });
    }

    // ============================================
    // 2. 修復滾動問題（問題3和5）
    // ============================================
    
    function fixScrolling() {
        // 修復body滾動
        document.body.style.overflow = 'auto';
        document.body.style.webkitOverflowScrolling = 'touch';
        
        // 修復所有可滾動容器
        const scrollableContainers = document.querySelectorAll(
            '.album-container, .gallery-container, .photo-grid, .album-grid, .scrollable'
        );
        
        scrollableContainers.forEach(container => {
            container.style.overflowY = 'auto';
            container.style.webkitOverflowScrolling = 'touch';
            container.style.touchAction = 'pan-y';
            
            // 防止滾動被阻止
            container.addEventListener('touchstart', function(e) {
                // 允許滾動
            }, { passive: true });
            
            container.addEventListener('touchmove', function(e) {
                // 允許滾動
            }, { passive: true });
        });
        
        // 處理橫屏模式
        function handleOrientationChange() {
            const isLandscape = window.innerWidth > window.innerHeight;
            
            if (isLandscape) {
                // 橫屏時確保可以滾動
                document.body.style.overflowY = 'auto';
                document.body.style.overflowX = 'auto';
                document.body.style.touchAction = 'pan-y pan-x';
                
                scrollableContainers.forEach(container => {
                    container.style.overflowY = 'auto';
                    container.style.overflowX = 'auto';
                    container.style.touchAction = 'pan-y pan-x';
                });
            } else {
                // 豎屏時
                document.body.style.overflowY = 'auto';
                document.body.style.overflowX = 'hidden';
                document.body.style.touchAction = 'pan-y';
            }
        }
        
        // 監聽方向變化
        window.addEventListener('orientationchange', function() {
            setTimeout(handleOrientationChange, 100);
        });
        
        window.addEventListener('resize', handleOrientationChange);
        handleOrientationChange();
    }

    // ============================================
    // 3. 修復相冊模式走位問題
    // ============================================
    
    function fixAlbumLayout() {
        const albumGrid = document.querySelector('.album-grid');
        if (!albumGrid) return;
        
        // 確保網格布局正確
        function updateAlbumLayout() {
            const isMobile = window.innerWidth <= 768;
            const isLandscape = window.innerWidth > window.innerHeight;
            
            if (isMobile) {
                if (isLandscape) {
                    albumGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                } else {
                    albumGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
                }
            }
            
            // 強制重新計算布局
            albumGrid.style.display = 'none';
            albumGrid.offsetHeight; // 觸發重排
            albumGrid.style.display = 'grid';
        }
        
        // 初始化和監聽變化
        updateAlbumLayout();
        window.addEventListener('resize', updateAlbumLayout);
        window.addEventListener('orientationchange', function() {
            setTimeout(updateAlbumLayout, 100);
        });
        
        // 修復相冊項目的定位
        const albumItems = document.querySelectorAll('.album-item');
        albumItems.forEach(item => {
            item.style.position = 'relative';
            item.style.width = '100%';
            item.style.boxSizing = 'border-box';
        });
    }

    // ============================================
    // 4. 修復3D模式無法放大圖片問題
    // ============================================
    
    function fix3DImageZoom() {
        // 創建圖片查看器
        function createImageViewer(imageSrc, imageAlt = '') {
            // 移除現有的查看器
            const existingViewer = document.querySelector('.image-viewer');
            if (existingViewer) {
                existingViewer.remove();
            }
            
            // 創建查看器容器
            const viewer = document.createElement('div');
            viewer.className = 'image-viewer';
            viewer.style.display = 'flex';
            
            // 創建圖片元素
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = imageAlt;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            
            // 添加關閉按鈕
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                font-size: 24px;
                cursor: pointer;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // 添加縮放控制
            const zoomControls = document.createElement('div');
            zoomControls.className = 'image-zoom-controls';
            zoomControls.innerHTML = `
                <button class="zoom-btn" data-action="zoom-out">−</button>
                <button class="zoom-btn" data-action="zoom-reset">⌂</button>
                <button class="zoom-btn" data-action="zoom-in">+</button>
            `;
            
            // 組裝查看器
            viewer.appendChild(img);
            viewer.appendChild(closeBtn);
            viewer.appendChild(zoomControls);
            document.body.appendChild(viewer);
            
            // 圖片縮放狀態
            let scale = 1;
            let translateX = 0;
            let translateY = 0;
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            
            // 更新圖片變換
            function updateTransform() {
                img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                img.style.transition = isDragging ? 'none' : 'transform 0.3s ease';
            }
            
            // 縮放功能
            function zoomIn() {
                scale = Math.min(scale * 1.5, 5);
                updateTransform();
            }
            
            function zoomOut() {
                scale = Math.max(scale / 1.5, 0.5);
                updateTransform();
            }
            
            function zoomReset() {
                scale = 1;
                translateX = 0;
                translateY = 0;
                updateTransform();
            }
            
            // 縮放按鈕事件
            zoomControls.querySelector('[data-action="zoom-in"]').addEventListener('click', zoomIn);
            zoomControls.querySelector('[data-action="zoom-out"]').addEventListener('click', zoomOut);
            zoomControls.querySelector('[data-action="zoom-reset"]').addEventListener('click', zoomReset);
            
            // 觸摸縮放手勢
            let initialDistance = 0;
            let initialScale = 1;
            
            viewer.addEventListener('touchstart', function(e) {
                if (e.touches.length === 2) {
                    // 雙指縮放
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    initialDistance = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY
                    );
                    initialScale = scale;
                } else if (e.touches.length === 1) {
                    // 單指拖動
                    isDragging = true;
                    startX = e.touches[0].clientX - translateX;
                    startY = e.touches[0].clientY - translateY;
                }
            }, { passive: true });
            
            viewer.addEventListener('touchmove', function(e) {
                if (e.touches.length === 2) {
                    // 雙指縮放
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const currentDistance = Math.hypot(
                        touch2.clientX - touch1.clientX,
                        touch2.clientY - touch1.clientY
                    );
                    scale = initialScale * (currentDistance / initialDistance);
                    scale = Math.max(0.5, Math.min(scale, 5));
                    updateTransform();
                } else if (e.touches.length === 1 && isDragging) {
                    // 單指拖動
                    e.preventDefault();
                    translateX = e.touches[0].clientX - startX;
                    translateY = e.touches[0].clientY - startY;
                    updateTransform();
                }
            }, { passive: false });
            
            viewer.addEventListener('touchend', function() {
                isDragging = false;
            });
            
            // 鼠標滾輪縮放（桌面端）
            viewer.addEventListener('wheel', function(e) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                scale = Math.max(0.5, Math.min(scale * delta, 5));
                updateTransform();
            }, { passive: false });
            
            // 關閉查看器
            function closeViewer() {
                viewer.style.opacity = '0';
                setTimeout(() => {
                    viewer.remove();
                }, 300);
            }
            
            closeBtn.addEventListener('click', closeViewer);
            viewer.addEventListener('click', function(e) {
                if (e.target === viewer) {
                    closeViewer();
                }
            });
            
            // 添加淡入動畫
            viewer.style.opacity = '0';
            setTimeout(() => {
                viewer.style.transition = 'opacity 0.3s ease';
                viewer.style.opacity = '1';
            }, 10);
        }
        
        // 為3D場景中的圖片添加點擊事件
        function attachImageClickHandlers() {
            // 查找3D場景中的圖片
            const sceneImages = document.querySelectorAll('.scene-container img, .canvas-container img, [data-3d-photo]');
            
            sceneImages.forEach(img => {
                img.style.cursor = 'pointer';
                img.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    createImageViewer(this.src, this.alt);
                });
            });
            
            // 也監聽動態添加的圖片
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            const images = node.querySelectorAll ? node.querySelectorAll('img[data-3d-photo], .scene-container img, .canvas-container img') : [];
                            images.forEach(img => {
                                if (!img.dataset.zoomAttached) {
                                    img.dataset.zoomAttached = 'true';
                                    img.style.cursor = 'pointer';
                                    img.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        createImageViewer(this.src, this.alt);
                                    });
                                }
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        attachImageClickHandlers();
    }

    // ============================================
    // 初始化所有修復
    // ============================================
    
    function initMobileFixes() {
        // 等待DOM加載完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                fixMobileUpload();
                fixScrolling();
                fixAlbumLayout();
                fix3DImageZoom();
            });
        } else {
            fixMobileUpload();
            fixScrolling();
            fixAlbumLayout();
            fix3DImageZoom();
        }
        
        // 延遲執行，確保其他腳本已加載
        setTimeout(function() {
            fixMobileUpload();
            fixAlbumLayout();
            fix3DImageZoom();
        }, 500);
    }
    
    // 執行初始化
    initMobileFixes();
    
    // 導出函數供外部調用
    window.mobileFixes = {
        fixMobileUpload,
        fixScrolling,
        fixAlbumLayout,
        fix3DImageZoom
    };
    
})();

