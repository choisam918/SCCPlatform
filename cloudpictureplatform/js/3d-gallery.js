// 3D展覽功能 - 重新創建

let scene, camera, renderer, controls;
let photoMeshes = [];
let currentRotation = 0; // 當前場景旋轉角度（度）

/**
 * 初始化3D場景
 * 確保函數在全局作用域可用
 */
async function init3DScene(photos) {
    // 確保函數在window對象上也可用
    if (typeof window !== 'undefined') {
        window.init3DScene = init3DScene;
    }
    try {
        const canvas = document.getElementById('canvas3d');
        if (!canvas) {
            console.warn('找不到canvas元素');
            return;
        }
        
        // 檢查Three.js是否可用
        if (typeof THREE === 'undefined') {
            console.error('Three.js未加載，無法顯示3D場景');
            showNotification('3D模式需要Three.js庫，請檢查網絡連接', 'error');
            return;
        }
        
        
        // 創建場景
        scene = new THREE.Scene();
        // 使用更深的背景色，減少空白感
        scene.background = new THREE.Color(0x0a0a1a); // 更深的藍黑色背景
        
        // 創建相機
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        // 設置相機視場角和初始位置，確保能看到所有元素
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000); // 增大視場角以看到更多內容
        // 設置相機初始位置，從稍微抬高的角度看向角落（匹配圖片視角）
        // 相機位置：稍微靠近場景，從側上方看向角落，可以看到後牆和右牆
        camera.position.set(12, 10, 12); // 調整位置，更靠近場景，從側上方看向角落
        camera.lookAt(0, 0, 0); // 看向場景中心（SCC LOGO位置）
        
        // 創建渲染器
        // 優化渲染器設置 - 根據設備性能調整
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
        
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: !isMobile, // 移動端禁用抗鋸齒以提升性能
            powerPreference: 'high-performance' // 優先使用高性能GPU
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(pixelRatio); // 限制像素比以提升性能
        
        // 添加改進的光照系統（降低整體亮度）
        // 環境光 - 提供基礎照明
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        
        // 主方向光 - 模擬頂部照明
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 12, 5);
        directionalLight.castShadow = false;
        scene.add(directionalLight);
        
        // 輔助方向光 - 增加立體感
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
        directionalLight2.position.set(-5, 8, -5);
        scene.add(directionalLight2);
        
        // 頂部環境光 - 模擬展廳頂部照明
        const topLight = new THREE.HemisphereLight(0xffffff, 0x1a1a2e, 0.4);
        topLight.position.set(0, 10, 0);
        scene.add(topLight);
        
        // ========== 添加實體燈光效果 ==========
        
        // 吊燈已刪除
        
        // ========== 壁燈（牆上的裝飾燈） ==========
        // 優化：減少壁燈數量從12個減到8個以提升性能
        const wallLights = [
            { wall: 'back', pos: [-5, 5, -7.3], rot: 0 },
            { wall: 'back', pos: [5, 5, -7.3], rot: 0 },
            { wall: 'front', pos: [-5, 5, 7.3], rot: Math.PI },
            { wall: 'front', pos: [5, 5, 7.3], rot: Math.PI },
            { wall: 'left', pos: [-7.3, 5, -5], rot: Math.PI / 2 },
            { wall: 'left', pos: [-7.3, 5, 5], rot: Math.PI / 2 },
            { wall: 'right', pos: [7.3, 5, -5], rot: -Math.PI / 2 },
            { wall: 'right', pos: [7.3, 5, 5], rot: -Math.PI / 2 }
        ];
        
        wallLights.forEach(light => {
            // 壁燈點光源
            const wallPointLight = new THREE.PointLight(0xffaa00, 0.8, 8);
            wallPointLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
            scene.add(wallPointLight);
            
            // 壁燈燈體（圓形壁燈）
            const wallLightGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
            const wallLightMaterial = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                metalness: 0.7,
                roughness: 0.3
            });
            const wallLightBody = new THREE.Mesh(wallLightGeometry, wallLightMaterial);
            wallLightBody.rotation.z = Math.PI / 2;
            wallLightBody.position.set(light.pos[0], light.pos[1], light.pos[2]);
            scene.add(wallLightBody);
            
            // 壁燈發光體
            const wallLightGlow = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.8,
                    emissive: 0xffaa00,
                    emissiveIntensity: 1.2
                })
            );
            wallLightGlow.position.set(light.pos[0], light.pos[1], light.pos[2]);
            scene.add(wallLightGlow);
        });
        
        // ========== 射燈（四個角落的補光燈） ==========
        const cornerLights = [
            { pos: [-6, 7, -6], color: 0x4a90e2, target: [-3, 0, -3] },
            { pos: [6, 7, -6], color: 0x4a90e2, target: [3, 0, -3] },
            { pos: [-6, 7, 6], color: 0x4a90e2, target: [-3, 0, 3] },
            { pos: [6, 7, 6], color: 0x4a90e2, target: [3, 0, 3] }
        ];
        
        cornerLights.forEach(light => {
            // 射燈（聚光燈）
            const spotLight = new THREE.SpotLight(light.color, 1.5, 15, Math.PI / 5, 0.4);
            spotLight.position.set(light.pos[0], light.pos[1], light.pos[2]);
            spotLight.target.position.set(light.target[0], light.target[1], light.target[2]);
            spotLight.castShadow = false;
            scene.add(spotLight);
            scene.add(spotLight.target);
            
            // 射燈燈體（圓錐形）
            const spotLightGeometry = new THREE.ConeGeometry(0.2, 0.4, 16);
            const spotLightMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.9,
                roughness: 0.1
            });
            const spotLightBody = new THREE.Mesh(spotLightGeometry, spotLightMaterial);
            spotLightBody.rotation.x = Math.PI;
            spotLightBody.position.set(light.pos[0], light.pos[1] - 0.2, light.pos[2]);
            scene.add(spotLightBody);
            
            // 射燈發光體
            const spotLightGlow = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: light.color,
                    transparent: true,
                    opacity: 0.7,
                    emissive: light.color,
                    emissiveIntensity: 1
                })
            );
            spotLightGlow.position.set(light.pos[0], light.pos[1], light.pos[2]);
            scene.add(spotLightGlow);
        });
        
        // ========== 創建地板 ==========
        // 創建改進的地板
        // 優化：減少地板幾何體細分以提升性能（從20x20減到10x10）
        const floorGeometry = new THREE.PlaneGeometry(20, 20, 10, 10);
        // 使用更真實的地板材質
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a3e,
            roughness: 0.7,
            metalness: 0.1,
            emissive: 0x0a0a1a,
            emissiveIntensity: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = false;
        scene.add(floor);
        
        // 添加改進的地板網格線（更細緻）
        const gridHelper = new THREE.GridHelper(20, 20, 0x4a4a5e, 0x2a2a3e);
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);
        
        // 添加地板反射效果（使用鏡面反射材質）
        const floorReflection = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.3
        });
        const reflectionFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorReflection);
        reflectionFloor.rotation.x = -Math.PI / 2;
        reflectionFloor.position.y = 0.005;
        scene.add(reflectionFloor);
        
        // 添加星星效果（發光點）- 優化：使用圓形紋理替代正方形
        // 創建星星圓形紋理
        const createStarTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // 創建漸變圓形（中心亮，邊緣透明）
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        const starsTexture = createStarTexture();
        const starsGroup = new THREE.Group();
        const starsCount = 100; // 減少到100個發光點以提升性能
        
        // 創建每個星星作為Sprite（確保圓形顯示）
        for (let i = 0; i < starsCount; i++) {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: starsTexture,
                transparent: true,
                opacity: 0.8,
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // 在地板上隨機分佈
            sprite.position.set(
                (Math.random() - 0.5) * 20,
                0.1,
                (Math.random() - 0.5) * 20
            );
            
            // 隨機星星大小
            const size = 0.08 + Math.random() * 0.1;
            sprite.scale.set(size, size, 1);
            
            starsGroup.add(sprite);
        }
        
        scene.add(starsGroup);
        
        // 添加SCC文字（使用Canvas纹理，确保可见）
        // 使用正方形Canvas確保圓形不會變形
        const sccCanvas = document.createElement('canvas');
        sccCanvas.width = 512;
        sccCanvas.height = 512; // 改為正方形，確保圓形不會被拉伸
        const ctx = sccCanvas.getContext('2d');
        
        // 设置背景（透明）
        ctx.clearRect(0, 0, sccCanvas.width, sccCanvas.height);
        
        // 绘制圆形边框
        const centerX = sccCanvas.width / 2;
        const centerY = sccCanvas.height / 2;
        const radius = 200; // 圆形半径（適應正方形Canvas）
        
        // 绘制圆形外圈（发光效果）
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制圆形内圈
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制SCC文字
        ctx.fillStyle = '#ffffff'; // 白色
        ctx.font = 'bold 150px Arial'; // 調整字體大小適應正方形Canvas
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 添加发光效果
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 25;
        ctx.fillText('SCC', centerX, centerY);
        
        // 创建纹理
        const sccTexture = new THREE.CanvasTexture(sccCanvas);
        sccTexture.needsUpdate = true;
        
        // 创建SCC文字平面（正方形，確保圓形不會變形）
        const sccGeometry = new THREE.PlaneGeometry(5, 5); // 改為正方形5x5
        const sccMaterial = new THREE.MeshStandardMaterial({
            map: sccTexture,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            emissive: 0xffffff,
            emissiveIntensity: 1.5
        });
        
        const sccMesh = new THREE.Mesh(sccGeometry, sccMaterial);
        sccMesh.rotation.x = -Math.PI / 2; // 水平放置在地板上
        sccMesh.position.set(0, 0.3, 0); // 向上移动，更明显
        scene.add(sccMesh);
        
        // 为SCC添加点光源照明
        const sccLight = new THREE.PointLight(0xffffff, 1.2, 15);
        sccLight.position.set(0, 3, 0);
        scene.add(sccLight);
        
        
        // ========== 創建4面牆體（改進材質） ==========
        // 優化：減少牆面幾何體細分以提升性能（從15x8減到8x4）
        const wallGeometry = new THREE.PlaneGeometry(15, 8, 8, 4);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a2e,
            roughness: 0.6,
            metalness: 0.1,
            emissive: 0x0a0a1a,
            emissiveIntensity: 0.1
        });
        
        // 後牆
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, 4, -7.5);
        scene.add(backWall);
        
        // 前牆
        const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
        frontWall.rotation.y = Math.PI;
        frontWall.position.set(0, 4, 7.5);
        scene.add(frontWall);
        
        // 左牆
        const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-7.5, 4, 0);
        scene.add(leftWall);
        
        // 右牆
        const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(7.5, 4, 0);
        scene.add(rightWall);
        
        // ========== 添加改進的科技感粒子效果（優化：使用Sprite實現圓形粒子，替代正方形） ==========
        const particleCount = 20; // 粒子數量
        
        // 創建圓形粒子紋理（使用Sprite確保圓形顯示）
        const createParticleTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // 創建漸變圓形（中心亮，邊緣透明，形成柔和的光暈效果）
            const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.9)');
            gradient.addColorStop(0.7, 'rgba(150, 180, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(100, 140, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(64, 64, 64, 0, Math.PI * 2);
            ctx.fill();
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        const particleTexture = createParticleTexture();
        const particlesGroup = new THREE.Group();
        
        // 創建每個粒子作為Sprite（確保圓形顯示）
        for (let i = 0; i < particleCount; i++) {
            // 科技感青色粒子（更豐富的顏色變化）
            const colorVariation = Math.random();
            const r = 0.0 + colorVariation * 0.2;
            const g = 0.7 + colorVariation * 0.3;
            const b = 1.0;
            
            const spriteMaterial = new THREE.SpriteMaterial({
                map: particleTexture,
                transparent: true,
                opacity: 0.9,
                color: new THREE.Color(r, g, b),
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // 在場景周圍隨機分佈
            sprite.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 20
            );
            
            // 隨機粒子大小
            const size = 0.15 + Math.random() * 0.15;
            sprite.scale.set(size, size, 1);
            
            // 保存原始位置和大小用於動畫
            sprite.userData.originalY = sprite.position.y;
            sprite.userData.index = i;
            sprite.userData.size = size;
            
            particlesGroup.add(sprite);
        }
        
        scene.add(particlesGroup);
        
        // 保存粒子組以便動畫（使用Sprite）
        scene.userData.particles = particlesGroup;
        
        // 添加粒子動畫（緩慢浮動和旋轉）
        scene.userData.particleAnimation = () => {
            const time = Date.now() * 0.0005;
            particlesGroup.children.forEach((sprite, index) => {
                // 上下浮動
                sprite.position.y = sprite.userData.originalY + Math.sin(time + sprite.userData.index) * 0.3;
                // 輕微旋轉
                sprite.rotation.z += 0.001;
            });
        };
        
        // ========== 添加照片 ==========
        if (photos && photos.length > 0) {
            await addPhotosToScene(photos);
        }
        
        // ========== 添加相機控制器 ==========
        function setupControls() {
            if (typeof THREE === 'undefined') {
                console.warn('Three.js未加載');
                return;
            }
            
            // 檢查OrbitControls是否已加載，如果未加載則等待
            let OrbitControlsClass = null;
            let retries = 0;
            const maxRetries = 100; // 最多等待10秒（增加等待時間）
            
            const checkOrbitControls = () => {
                // 方式1: THREE.OrbitControls
                if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                    OrbitControlsClass = THREE.OrbitControls;
                }
                // 方式2: 全局OrbitControls
                else if (typeof OrbitControls !== 'undefined') {
                    OrbitControlsClass = OrbitControls;
                    // 同時設置到THREE對象上
                    if (typeof THREE !== 'undefined') {
                        THREE.OrbitControls = OrbitControls;
                    }
                }
                // 方式3: window.OrbitControls
                else if (typeof window !== 'undefined' && typeof window.OrbitControls !== 'undefined') {
                    OrbitControlsClass = window.OrbitControls;
                    if (typeof THREE !== 'undefined') {
                        THREE.OrbitControls = window.OrbitControls;
                    }
                }
                // 方式4: 從THREE對象查找
                else if (typeof THREE !== 'undefined' && THREE.OrbitControls) {
                    OrbitControlsClass = THREE.OrbitControls;
                }
                
                if (OrbitControlsClass) {
                    initializeControls(OrbitControlsClass);
                } else if (retries < maxRetries) {
                    retries++;
                    setTimeout(checkOrbitControls, 100);
                } else {
                    // 只在最終失敗時輸出警告
                    console.warn('OrbitControls未找到，使用手動控制實現');
                    setupManualControls();
                }
            };
            
            // 開始檢查
            checkOrbitControls();
        }
        
        // 初始化控制器的函數
        function initializeControls(OrbitControlsClass) {
            if (!OrbitControlsClass) return;
            
            try {
                controls = new OrbitControlsClass(camera, renderer.domElement);
                
                // ========== 優化的相機控制設置 ==========
                // 阻尼效果 - 使旋轉更平滑，有慣性感
                controls.enableDamping = true;
                controls.dampingFactor = 0.08; // 增加阻尼，使停止更平滑
                
                // 旋轉速度優化
                controls.rotateSpeed = 0.8; // 降低旋轉速度，使控制更精確
                
                // 調整距離範圍，允許放大和縮小
                controls.minDistance = 5; // 可以更靠近，看到更多細節
                controls.maxDistance = 60; // 可以更遠離，看到整個展廳和所有照片
                
                // 啟用所有控制功能
                controls.enablePan = true; // 允許平移
                controls.enableZoom = true; // 確保縮放已啟用
                controls.enableRotate = true; // 啟用旋轉（重要！）
                
                // 縮放速度優化
                controls.zoomSpeed = 0.8; // 降低縮放速度，使控制更平滑
                
                // 平移速度優化
                controls.panSpeed = 0.8; // 降低平移速度
                
                // 允許360度水平旋轉（無限制）
                controls.minAzimuthAngle = -Infinity;
                controls.maxAzimuthAngle = Infinity;
                // 限制垂直旋轉角度，防止轉到地板下方
                // Polar角：0 = 正上方，Math.PI/2 = 水平，Math.PI = 正下方
                controls.minPolarAngle = Math.PI / 6; // 限制最小角度（約30度），防止從正上方看
                controls.maxPolarAngle = Math.PI / 2.2; // 限制最大角度（約82度），確保始終在地板上方，不會轉到地板下方
                
                // 設置目標點為SCC標誌位置（場景中心，地板高度）
                // 確保場景在畫面正中央，相機對準SCC LOGO
                controls.target.set(0, 0, 0); // 場景中心，SCC LOGO位置
                
        // 設置相機初始位置（從稍微抬高的角度看向角落）
        // 確保相機對準場景中心，可以看到後牆和右牆
        // 調整相機位置，使其能看到後牆和右牆上的照片
        camera.position.set(12, 10, 12); // 調整位置，更靠近場景，從側上方看向角落
        camera.lookAt(0, 0, 0); // 看向場景中心（SCC LOGO位置）
                
                // ========== 自動旋轉功能 ==========
                // 啟用自動旋轉（慢速旋轉，展示展廳）
                controls.autoRotate = true; // 默認啟用自動旋轉
                controls.autoRotateSpeed = 0.5; // 慢速旋轉（可調整，範圍0.1-2.0）
                
                // 自動旋轉暫停/恢復功能
                let autoRotatePaused = false;
                let userInteracting = false;
                let interactionTimeout = null;
                
                // 當用戶交互時暫停自動旋轉
                const pauseAutoRotate = () => {
                    if (controls.autoRotate && !autoRotatePaused) {
                        controls.autoRotate = false;
                        autoRotatePaused = true;
                        userInteracting = true;
                    }
                    // 清除之前的計時器
                    if (interactionTimeout) {
                        clearTimeout(interactionTimeout);
                    }
                    // 3秒後恢復自動旋轉
                    interactionTimeout = setTimeout(() => {
                        if (autoRotatePaused && !userInteracting) {
                            controls.autoRotate = true;
                            autoRotatePaused = false;
                        }
                    }, 3000);
                };
                
                // 監聽用戶交互事件
                renderer.domElement.addEventListener('mousedown', pauseAutoRotate);
                renderer.domElement.addEventListener('touchstart', pauseAutoRotate);
                renderer.domElement.addEventListener('wheel', pauseAutoRotate);
                
                // 用戶停止交互時標記
                const resumeAutoRotate = () => {
                    userInteracting = false;
                };
                
                renderer.domElement.addEventListener('mouseup', resumeAutoRotate);
                renderer.domElement.addEventListener('touchend', resumeAutoRotate);
                
                // 將控制函數保存到場景，以便外部調用
                scene.userData.autoRotateControls = {
                    setSpeed: (speed) => {
                        controls.autoRotateSpeed = Math.max(0.1, Math.min(2.0, speed));
                    },
                    toggle: () => {
                        controls.autoRotate = !controls.autoRotate;
                        autoRotatePaused = !controls.autoRotate;
                    },
                    pause: () => {
                        if (controls.autoRotate) {
                            controls.autoRotate = false;
                            autoRotatePaused = true;
                        }
                    },
                    resume: () => {
                        if (autoRotatePaused) {
                            controls.autoRotate = true;
                            autoRotatePaused = false;
                        }
                    },
                    getSpeed: () => controls.autoRotateSpeed,
                    isActive: () => controls.autoRotate
                };
                
                // 確保所有控制都啟用
                controls.enabled = true;
                
                // 確保觸摸事件正常工作（移動端）
                if (renderer.domElement) {
                    renderer.domElement.style.touchAction = 'none'; // 允許觸摸控制
                    // 確保canvas可以接收事件
                    renderer.domElement.style.pointerEvents = 'auto';
                }
                
                // 強制啟用所有控制（防止被其他代碼禁用）
                setTimeout(() => {
                    if (controls) {
                        controls.enabled = true;
                        controls.enableRotate = true;
                        controls.enableZoom = true;
                        controls.enablePan = true;
                        controls.update();
                    }
                }, 100);
                
                // 更新controls以應用所有設置
                controls.update();
                
                // 確保場景在畫面正中央顯示
            } catch (error) {
                console.error('初始化OrbitControls失敗:', error);
                console.warn('使用手動控制實現作為備用方案');
                setupManualControls();
            }
        }
        
        // 等待照片加載完成後再設置controls，確保所有元素都已添加
        if (photos && photos.length > 0) {
            await addPhotosToScene(photos);
        }
        
        // 照片加載完成後再設置controls
        setupControls();
        
        // 開始渲染循環
        animate();
        
        // 響應式調整
        window.addEventListener('resize', onWindowResize);
        
        // 設置左右旋轉按鈕（延遲執行，確保DOM完全加載）
        setTimeout(() => {
            setupRotationButtons();
        }, 500);
        
        // 再次嘗試設置按鈕（確保按鈕已渲染）
        setTimeout(() => {
            setupRotationButtons();
        }, 1000);
        
        
    } catch (error) {
        console.error('初始化3D場景失敗:', error);
        showNotification('3D場景初始化失敗: ' + error.message, 'error');
    }
}

/**
 * 添加照片到場景 - 最多12張，每面牆3張
 */
async function addPhotosToScene(photos) {
    if (!scene || !photos || photos.length === 0) {
        console.warn('無法添加照片：場景未初始化或沒有照片');
        return;
    }
    
    // 限制最多12張照片
    const maxPhotos = 12;
    const actualPhotos = photos.slice(0, maxPhotos);
    const totalWalls = 4; // 4面牆
    const maxPhotosPerRow = 6; // 每行最多6張照片
    
    // 平均分配照片到4面牆，每面牆最多6張（一行）
    const photosPerWall = Math.floor(actualPhotos.length / totalWalls);
    const remainder = actualPhotos.length % totalWalls; // 餘數，需要分配給前幾面牆
    
    // 計算每面牆的照片數量（不超過6張）
    const wallPhotoCounts = [];
    for (let w = 0; w < totalWalls; w++) {
        const count = photosPerWall + (w < remainder ? 1 : 0);
        wallPhotoCounts[w] = Math.min(count, maxPhotosPerRow); // 限制每面牆最多6張
    }
    
    console.log(`牆體分配：後牆 ${wallPhotoCounts[0]} 張，左牆 ${wallPhotoCounts[1]} 張，右牆 ${wallPhotoCounts[2]} 張，前牆 ${wallPhotoCounts[3]} 張`);
    
    // 清除舊的照片
    photoMeshes.forEach(mesh => {
        if (scene) {
            scene.remove(mesh);
        }
        // 清理資源
        if (mesh.userData && mesh.userData.texture) {
            mesh.userData.texture.dispose();
        }
        mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    });
    photoMeshes = [];
    
    // 調整照片尺寸和間距，確保每行6張不重疊
    const photoWidth = 2.0; // 減小照片寬度以容納更多照片
    const photoHeight = 2.0; // 減小照片高度
    const spacing = 0.6; // 照片間距，確保不重疊
    
    // 優化：創建共享的相框幾何體和材質（所有照片使用相同的相框尺寸）
    const frameWidth = photoWidth + 0.25;
    const frameHeight = photoHeight + 0.25;
    const frameDepth = 0.12;
    const frameThickness = 0.08;
    
    // 共享的相框幾何體
    const sharedTopBottomFrameGeometry = new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth);
    const sharedLeftRightFrameGeometry = new THREE.BoxGeometry(frameThickness, frameHeight - frameThickness * 2, frameDepth);
    const sharedBackBoardGeometry = new THREE.BoxGeometry(frameWidth - 0.05, frameHeight - 0.05, 0.02);
    
    // 共享的相框材質
    const sharedFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700, // 金色相框
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x332200,
        emissiveIntensity: 0.3
    });
    
    const sharedBackBoardMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6
    });
    
    // 使用Promise.all來並行加載所有照片
    const photoPromises = actualPhotos.map(async (photo, index) => {
        try {
            // 檢查照片數據結構
            if (!photo || !photo.file) {
                console.warn(`照片 ${index} 數據不完整:`, photo);
                return null;
            }
            
            // 平均分配到4面牆
            // 計算當前照片應該分配到哪面牆
            let wallIndex = 0;
            let photoIndex = 0;
            let currentCount = 0;
            
            // 使用預先計算的每面牆照片數量
            for (let w = 0; w < totalWalls; w++) {
                const wallPhotoCount = wallPhotoCounts[w];
                if (index < currentCount + wallPhotoCount) {
                    wallIndex = w;
                    photoIndex = index - currentCount;
                    break;
                }
                currentCount += wallPhotoCount;
            }
            
            // 創建照片組（包含相框和照片）
            const photoGroup = new THREE.Group();
            
            // 優化：使用共享的幾何體和材質創建相框
            const frameGroup = new THREE.Group();
            
            // 外框（四個邊）- 使用共享幾何體
            const topFrame = new THREE.Mesh(sharedTopBottomFrameGeometry, sharedFrameMaterial);
            topFrame.position.set(0, (frameHeight - frameThickness) / 2, -frameDepth / 2);
            frameGroup.add(topFrame);
            
            const bottomFrame = new THREE.Mesh(sharedTopBottomFrameGeometry, sharedFrameMaterial);
            bottomFrame.position.set(0, -(frameHeight - frameThickness) / 2, -frameDepth / 2);
            frameGroup.add(bottomFrame);
            
            const leftFrame = new THREE.Mesh(sharedLeftRightFrameGeometry, sharedFrameMaterial);
            leftFrame.position.set(-(frameWidth - frameThickness) / 2, 0, -frameDepth / 2);
            frameGroup.add(leftFrame);
            
            const rightFrame = new THREE.Mesh(sharedLeftRightFrameGeometry, sharedFrameMaterial);
            rightFrame.position.set((frameWidth - frameThickness) / 2, 0, -frameDepth / 2);
            frameGroup.add(rightFrame);
            
            // 相框背景板（白色背景）- 使用共享幾何體和材質
            const backBoard = new THREE.Mesh(sharedBackBoardGeometry, sharedBackBoardMaterial);
            backBoard.position.z = -frameDepth / 2 - 0.01;
            frameGroup.add(backBoard);
            
            photoGroup.add(frameGroup);
            
            // 加載照片紋理
            let texture;
            try {
                texture = await loadTexture(photo.file);
            } catch (error) {
                console.error(`加載照片 ${index} 紋理失敗:`, error);
                // 創建白色備選紋理
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 256, 256);
                texture = new THREE.CanvasTexture(canvas);
            }
            
            // 創建改進的照片平面（優化：使用MeshLambertMaterial提升性能）
            const photoGeometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
            // 使用MeshLambertMaterial代替MeshStandardMaterial以提升性能（Lambert材質計算更簡單）
            const photoMaterial = new THREE.MeshLambertMaterial({ 
                map: texture,
                side: THREE.DoubleSide
            });
            
            const photoMesh = new THREE.Mesh(photoGeometry, photoMaterial);
            photoMesh.position.z = 0.02; // 稍微突出相框
            
            // 添加照片淡入動畫（優化：統一管理，不創建獨立動畫循環）
            photoMesh.material.opacity = 0;
            photoMesh.material.transparent = true;
            photoGroup.add(photoMesh);
            
            // 保存動畫數據到photoGroup，由主動畫循環統一處理
            photoGroup.userData.fadeIn = {
                startTime: Date.now() + index * 100, // 錯開動畫時間
                duration: 1000, // 1秒
                photoMesh: photoMesh
            };
            
            photoGroup.userData.photo = photo;
            photoGroup.userData.texture = texture;
            photoGroup.userData.photoMesh = photoMesh;
            
            // 計算位置 - 所有照片在同一水平線上
            let x, y, z;
            const fixedY = 3.5; // 所有照片固定在同一水平高度，稍微提高使其更明顯
            
            // 計算每面牆內的照片水平位置
            // 使用預先計算的當前牆照片數量
            const currentWallPhotoCount = wallPhotoCounts[wallIndex];
            
            // 水平排列照片（居中對齊），確保不重疊
            // 計算總寬度，確保6張照片不超出牆面
            const totalWidth = currentWallPhotoCount * photoWidth + (currentWallPhotoCount - 1) * spacing;
            const maxWallWidth = 14; // 牆面可用寬度（留出邊距）
            
            // 如果總寬度超過牆面，縮小間距
            let actualSpacing = spacing;
            if (totalWidth > maxWallWidth && currentWallPhotoCount > 1) {
                actualSpacing = (maxWallWidth - currentWallPhotoCount * photoWidth) / (currentWallPhotoCount - 1);
                actualSpacing = Math.max(0.3, actualSpacing); // 最小間距0.3，確保不重疊
            }
            
            // 計算起始位置（居中）
            let wallStartX = 0;
            if (currentWallPhotoCount > 1) {
                const actualTotalWidth = currentWallPhotoCount * photoWidth + (currentWallPhotoCount - 1) * actualSpacing;
                wallStartX = -actualTotalWidth / 2 + photoWidth / 2;
            }
            const wallX = wallStartX + photoIndex * (photoWidth + actualSpacing);
            
            y = fixedY;
            
            switch (wallIndex) {
                case 0: // 後牆 - 水平排列
                    x = wallX;
                    z = -7.4;
                    break;
                case 1: // 左牆 - 水平排列（沿z軸）
                    x = -7.4;
                    z = wallX;
                    photoGroup.rotation.y = Math.PI / 2;
                    break;
                case 2: // 右牆 - 水平排列（沿z軸，反向）
                    x = 7.4;
                    z = -wallX;
                    photoGroup.rotation.y = -Math.PI / 2;
                    break;
                case 3: // 前牆 - 水平排列（反向）
                    x = -wallX;
                    z = 7.4;
                    photoGroup.rotation.y = Math.PI;
                    break;
            }
            
            photoGroup.position.set(x, y, z);
            scene.add(photoGroup);
            photoMeshes.push(photoGroup);
            
            // 添加照片懸浮動畫數據（優化：統一管理，不創建獨立動畫循環）
            photoGroup.userData.floatAnimation = {
                originalY: y,
                index: index
            };
            
            // 添加燈光發光體（視覺效果）
            const lightGlowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const lightGlowMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                emissive: 0xffffff,
                emissiveIntensity: 1
            });
            const lightGlow = new THREE.Mesh(lightGlowGeometry, lightGlowMaterial);
            lightGlow.position.set(lightX, lightY, lightZ);
            scene.add(lightGlow);
            
            // 添加發光體到燈光位置
            lightGlow.position.set(lightX, lightY, lightZ);
            scene.add(lightGlow);
            
            // 添加點擊事件（支持手機端打開）
            photoGroup.userData.onClick = () => {
                const imageUrl = URL.createObjectURL(photo.file);
                
                // 優先使用移動端修復中的圖片查看器
                if (window.mobileFixes && typeof window.mobileFixes.fix3DImageZoom === 'function') {
                    try {
                        // 創建臨時圖片元素觸發查看器
                        const tempImg = document.createElement('img');
                        tempImg.src = imageUrl;
                        tempImg.style.display = 'none';
                        document.body.appendChild(tempImg);
                        
                        setTimeout(() => {
                            // 觸發點擊事件來打開查看器
                            tempImg.click();
                            setTimeout(() => {
                                if (document.body.contains(tempImg)) {
                                    document.body.removeChild(tempImg);
                                }
                            }, 200);
                        }, 100);
                    } catch (error) {
                        console.error('打開圖片查看器失敗:', error);
                        // 降級方案：在新窗口打開
                        window.open(imageUrl, '_blank');
                    }
                } else {
                    // 降級方案：在新窗口打開（手機端也支持）
                    window.open(imageUrl, '_blank');
                }
            };
            
            return photoGroup;
        } catch (error) {
            console.error(`處理照片 ${index} 失敗:`, error);
            return null;
        }
    });
    
    // 等待所有照片加載完成
    const results = await Promise.all(photoPromises);
    const successful = results.filter(r => r !== null);
    
    // 添加射線檢測
    setupRaycaster();
}

/**
 * 加載紋理（優化：限制紋理大小以提升性能）
 */
function loadTexture(file) {
    return new Promise((resolve, reject) => {
        // 優化：限制紋理最大尺寸為1024x1024以提升性能
        const MAX_TEXTURE_SIZE = 1024;
        
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            // 計算縮放比例
            let width = img.width;
            let height = img.height;
            let scale = 1;
            
            if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
                scale = Math.min(MAX_TEXTURE_SIZE / width, MAX_TEXTURE_SIZE / height);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);
            }
            
            // 如果不需要縮放，直接使用原圖
            if (scale === 1) {
                const loader = new THREE.TextureLoader();
                loader.load(
                    url,
                    (texture) => {
                        texture.needsUpdate = true;
                        URL.revokeObjectURL(url); // 釋放ObjectURL
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        URL.revokeObjectURL(url);
                        reject(error);
                    }
                );
            } else {
                // 需要縮放，使用Canvas處理
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const loader = new THREE.TextureLoader();
                loader.load(
                    canvas.toDataURL('image/jpeg', 0.9),
                    (texture) => {
                        texture.needsUpdate = true;
                        URL.revokeObjectURL(url); // 釋放ObjectURL
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        URL.revokeObjectURL(url);
                        reject(error);
                    }
                );
            }
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('圖片加載失敗'));
        };
        
        img.src = url;
    });
}

/**
 * 設置射線檢測
 */
function setupRaycaster() {
    if (!renderer || !camera || typeof THREE === 'undefined') {
        console.warn('無法設置射線檢測：缺少必要組件');
        return;
    }
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function onMouseClick(event) {
        if (!renderer || !camera) return;
        
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        // 檢測所有照片組及其子對象
        const intersects = raycaster.intersectObjects(photoMeshes, true);
        
        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            // 如果點擊的是照片組內的物體，找到父組
            let target = intersected;
            while (target && !target.userData.onClick) {
                target = target.parent;
            }
            if (target && target.userData && target.userData.onClick) {
                target.userData.onClick();
            }
        }
    }
    
    // 添加點擊和觸摸事件
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('touchend', function(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        renderer.domElement.dispatchEvent(clickEvent);
    });
}

/**
 * 動畫循環（添加科技感動畫效果）
 */
function animate() {
    requestAnimationFrame(animate);
    
    // 確保場景、相機、渲染器都存在
    if (!scene || !camera || !renderer) {
        console.warn('動畫循環：場景、相機或渲染器未初始化', {
            scene: !!scene,
            camera: !!camera,
            renderer: !!renderer
        });
        return;
    }
    
    // 優化：只在必要時更新controls，避免每幀都檢查
    if (controls && typeof controls.update === 'function' && !controls.manual) {
        controls.update(); // 這會應用阻尼效果和自動旋轉
    }
    
    // 優化：統一管理照片動畫（淡入和懸浮）
    if (photoMeshes && photoMeshes.length > 0) {
        const currentTime = Date.now();
        const floatTime = currentTime * 0.001;
        
        photoMeshes.forEach(photoGroup => {
            // 處理淡入動畫
            if (photoGroup.userData.fadeIn) {
                const fadeData = photoGroup.userData.fadeIn;
                const elapsed = currentTime - fadeData.startTime;
                if (elapsed >= 0 && elapsed < fadeData.duration) {
                    const progress = Math.min(elapsed / fadeData.duration, 1);
                    fadeData.photoMesh.material.opacity = progress;
                } else if (elapsed >= fadeData.duration) {
                    fadeData.photoMesh.material.opacity = 1;
                    fadeData.photoMesh.material.transparent = false;
                    delete photoGroup.userData.fadeIn; // 動畫完成後清理
                }
            }
            
            // 處理懸浮動畫
            if (photoGroup.userData.floatAnimation) {
                const floatData = photoGroup.userData.floatAnimation;
                photoGroup.position.y = floatData.originalY + Math.sin(floatTime + floatData.index) * 0.05;
            }
        });
    }
    
    // 優化：降低粒子更新頻率（每3幀更新一次）
    if (scene && scene.userData.particles) {
        const particles = scene.userData.particles;
        if (!scene.userData.particleFrameCount) {
            scene.userData.particleFrameCount = 0;
        }
        scene.userData.particleFrameCount++;
        
        // 每3幀更新一次粒子
        if (scene.userData.particleFrameCount % 3 === 0) {
            if (scene.userData.particleAnimation) {
                scene.userData.particleAnimation();
            } else {
                // 備用動畫（使用Sprite）
                const time = Date.now() * 0.0005;
                if (particles && particles.children) {
                    particles.children.forEach((sprite, index) => {
                        if (sprite.userData && sprite.userData.originalY !== undefined) {
                            sprite.position.y = sprite.userData.originalY + Math.sin(time + index) * 0.3;
                        }
                    });
                }
            }
        }
    }
    
    // 渲染場景（這是主動畫循環，必須調用render）
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/**
 * 窗口大小調整
 */
function onWindowResize() {
    if (!camera || !renderer) return;
    
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * 設置左右旋轉按鈕和上下縮放按鈕
 */
function setupRotationButtons() {
    console.log('設置旋轉和縮放按鈕...');
    
    // 使用setTimeout確保DOM完全加載
    setTimeout(() => {
        const rotateLeftBtn = document.getElementById('rotateLeftBtn');
        const rotateRightBtn = document.getElementById('rotateRightBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        console.log('按鈕元素檢查:', {
            rotateLeftBtn: !!rotateLeftBtn,
            rotateRightBtn: !!rotateRightBtn,
            zoomInBtn: !!zoomInBtn,
            zoomOutBtn: !!zoomOutBtn
        });
        
        // 左旋轉按鈕
        if (rotateLeftBtn) {
            // 先移除所有舊的事件監聽器
            const newLeftBtn = rotateLeftBtn.cloneNode(true);
            rotateLeftBtn.parentNode.replaceChild(newLeftBtn, rotateLeftBtn);
            
            newLeftBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('左鍵被點擊，向左旋轉90度');
                // 嘗試多種方式調用函數
                if (typeof window.rotateScene === 'function') {
                    window.rotateScene(-90);
                } else if (typeof rotateScene === 'function') {
                    rotateScene(-90);
                } else {
                    console.error('rotateScene函數不存在，嘗試直接操作相機');
                    // 直接操作相機作為備用方案
                    if (camera && controls) {
                        const radians = (-90 * Math.PI) / 180;
                        if (controls.manual && controls.cameraAngleY !== undefined) {
                            controls.cameraAngleY += radians;
                            if (controls.updateCameraPosition) {
                                controls.updateCameraPosition();
                            }
                        } else {
                            const currentPos = camera.position.clone();
                            const target = controls.target ? controls.target.clone() : new THREE.Vector3(0, 0, 0);
                            const dx = currentPos.x - target.x;
                            const dz = currentPos.z - target.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            const currentAngle = Math.atan2(dz, dx);
                            const newAngle = currentAngle + radians;
                            const newX = target.x + distance * Math.cos(newAngle);
                            const newZ = target.z + distance * Math.sin(newAngle);
                            camera.position.set(newX, currentPos.y, newZ);
                            camera.lookAt(target);
                            camera.updateMatrixWorld();
                            // 優化：移除手動渲染，由主動畫循環統一處理
                        }
                    }
                }
            });
            console.log('左旋轉按鈕事件已綁定');
        }
        // 如果按鈕不存在，靜默跳過（按鈕是可選的）
        
        // 右旋轉按鈕
        if (rotateRightBtn) {
            const newRightBtn = rotateRightBtn.cloneNode(true);
            rotateRightBtn.parentNode.replaceChild(newRightBtn, rotateRightBtn);
            
            newRightBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('右鍵被點擊，向右旋轉90度');
                // 嘗試多種方式調用函數
                if (typeof window.rotateScene === 'function') {
                    window.rotateScene(90);
                } else if (typeof rotateScene === 'function') {
                    rotateScene(90);
                } else {
                    console.error('rotateScene函數不存在，嘗試直接操作相機');
                    // 直接操作相機作為備用方案
                    if (camera && controls) {
                        const radians = (90 * Math.PI) / 180;
                        if (controls.manual && controls.cameraAngleY !== undefined) {
                            controls.cameraAngleY += radians;
                            if (controls.updateCameraPosition) {
                                controls.updateCameraPosition();
                            }
                        } else {
                            const currentPos = camera.position.clone();
                            const target = controls.target ? controls.target.clone() : new THREE.Vector3(0, 0, 0);
                            const dx = currentPos.x - target.x;
                            const dz = currentPos.z - target.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            const currentAngle = Math.atan2(dz, dx);
                            const newAngle = currentAngle + radians;
                            const newX = target.x + distance * Math.cos(newAngle);
                            const newZ = target.z + distance * Math.sin(newAngle);
                            camera.position.set(newX, currentPos.y, newZ);
                            camera.lookAt(target);
                        }
                    }
                }
            });
            console.log('右旋轉按鈕事件已綁定');
        }
        // 如果按鈕不存在，靜默跳過（按鈕是可選的）
        
        // 縮放按鈕（拉近）
        if (zoomInBtn) {
            const newZoomInBtn = zoomInBtn.cloneNode(true);
            zoomInBtn.parentNode.replaceChild(newZoomInBtn, zoomInBtn);
            
            newZoomInBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('縮放+按鈕被點擊，拉近畫面');
                // 嘗試多種方式調用函數
                if (typeof window.zoomCamera === 'function') {
                    window.zoomCamera(-2);
                } else if (typeof zoomCamera === 'function') {
                    zoomCamera(-2);
                } else {
                    console.error('zoomCamera函數不存在，嘗試直接操作相機');
                    // 直接操作相機作為備用方案
                    if (camera) {
                        const currentPos = camera.position;
                        const target = controls && controls.target ? controls.target : new THREE.Vector3(0, 0, 0);
                        const dx = currentPos.x - target.x;
                        const dy = currentPos.y - target.y;
                        const dz = currentPos.z - target.z;
                        const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        const newDistance = Math.max(5, currentDistance - 2);
                        if (currentDistance > 0) {
                            const direction = {
                                x: dx / currentDistance,
                                y: dy / currentDistance,
                                z: dz / currentDistance
                            };
                            const newX = target.x + direction.x * newDistance;
                            const newY = target.y + direction.y * newDistance;
                            const newZ = target.z + direction.z * newDistance;
                            camera.position.set(newX, newY, newZ);
                            camera.lookAt(target);
                            camera.updateMatrixWorld();
                            // 優化：移除手動渲染，由主動畫循環統一處理
                        }
                    }
                }
            });
            console.log('縮放+按鈕事件已綁定');
        }
        // 如果按鈕不存在，靜默跳過（按鈕是可選的）
        
        // 縮放按鈕（拉遠）
        if (zoomOutBtn) {
            const newZoomOutBtn = zoomOutBtn.cloneNode(true);
            zoomOutBtn.parentNode.replaceChild(newZoomOutBtn, zoomOutBtn);
            
            newZoomOutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('縮放-按鈕被點擊，拉遠畫面');
                // 嘗試多種方式調用函數
                if (typeof window.zoomCamera === 'function') {
                    window.zoomCamera(2);
                } else if (typeof zoomCamera === 'function') {
                    zoomCamera(2);
                } else {
                    console.error('zoomCamera函數不存在，嘗試直接操作相機');
                    // 直接操作相機作為備用方案
                    if (camera) {
                        const currentPos = camera.position;
                        const target = controls && controls.target ? controls.target : new THREE.Vector3(0, 0, 0);
                        const dx = currentPos.x - target.x;
                        const dy = currentPos.y - target.y;
                        const dz = currentPos.z - target.z;
                        const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        const newDistance = Math.min(60, currentDistance + 2);
                        if (currentDistance > 0) {
                            const direction = {
                                x: dx / currentDistance,
                                y: dy / currentDistance,
                                z: dz / currentDistance
                            };
                            const newX = target.x + direction.x * newDistance;
                            const newY = target.y + direction.y * newDistance;
                            const newZ = target.z + direction.z * newDistance;
                            camera.position.set(newX, newY, newZ);
                            camera.lookAt(target);
                            camera.updateMatrixWorld();
                            // 優化：移除手動渲染，由主動畫循環統一處理
                        }
                    }
                }
            });
            console.log('縮放-按鈕事件已綁定');
        }
        // 如果按鈕不存在，靜默跳過（按鈕是可選的）
        
        console.log('所有按鈕事件綁定完成');
    }, 100); // 延遲100ms確保DOM完全加載
}

// 將函數暴露到全局，確保可以從外部調用
window.rotateScene = rotateScene;
window.zoomCamera = zoomCamera;
window.setupRotationButtons = setupRotationButtons;

/**
 * 旋轉整個場景（圍繞場景中心旋轉相機）
 * @param {number} degrees - 旋轉角度（正數向右，負數向左）
 */
function rotateScene(degrees) {
    if (!camera) {
        console.warn('無法旋轉：camera未初始化');
        return;
    }
    
    
    // 如果使用手動控制
    if (controls && controls.manual && controls.cameraAngleY !== undefined) {
        const radians = (degrees * Math.PI) / 180;
        controls.cameraAngleY += radians;
        if (controls.updateCameraPosition) {
            controls.updateCameraPosition();
            // 優化：移除手動渲染，由主動畫循環統一處理
        } else {
            console.error('updateCameraPosition函數不存在');
        }
        return;
    }
    
    if (!controls) {
        console.warn('無法旋轉：controls未初始化');
        return;
    }
    
    // 更新當前旋轉角度
    currentRotation += degrees;
    
    // 將角度轉換為弧度
    const radians = (degrees * Math.PI) / 180;
    
    // 獲取當前相機位置和目標點（使用clone避免引用問題）
    const currentPos = camera.position.clone();
    const target = controls.target ? controls.target.clone() : new THREE.Vector3(0, 0, 0);
    
    // 計算相機相對於目標點的向量（在XZ平面上）
    const dx = currentPos.x - target.x;
    const dz = currentPos.z - target.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // 計算當前角度（從正X軸開始，逆時針為正）
    const currentAngle = Math.atan2(dz, dx);
    
    // 計算新角度
    const newAngle = currentAngle + radians;
    
    // 計算新位置（保持Y軸高度不變）
    const newX = target.x + distance * Math.cos(newAngle);
    const newZ = target.z + distance * Math.sin(newAngle);
    const newY = currentPos.y; // 保持高度不變
    
    console.log(`當前位置: (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)})`);
    console.log(`目標位置: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
    console.log(`距離: ${distance.toFixed(2)}, 當前角度: ${(currentAngle * 180 / Math.PI).toFixed(2)}度`);
    console.log(`新位置: (${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})`);
    
    // 平滑過渡到新位置
    animateCameraTo(newX, newY, newZ, target.x, target.y, target.z);
    
    // 優化：移除手動渲染，由主動畫循環統一處理
    
}

/**
 * 平滑動畫相機到新位置
 */
function animateCameraTo(targetX, targetY, targetZ, lookAtX, lookAtY, lookAtZ) {
    if (!camera) return;
    
    // 如果使用手動控制，直接設置位置
    if (controls && controls.manual) {
        camera.position.set(targetX, targetY, targetZ);
        camera.lookAt(lookAtX, lookAtY, lookAtZ);
        return;
    }
    
    const startX = camera.position.x;
    const startY = camera.position.y;
    const startZ = camera.position.z;
    
    const duration = 1000; // 動畫持續時間（毫秒）
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用緩動函數（easeInOutCubic）
        const easeProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // 插值相機位置
        camera.position.x = startX + (targetX - startX) * easeProgress;
        camera.position.y = startY + (targetY - startY) * easeProgress;
        camera.position.z = startZ + (targetZ - startZ) * easeProgress;
        
        // 更新相機朝向
        camera.lookAt(lookAtX, lookAtY, lookAtZ);
        
        // 更新controls（如果存在且不是手動控制）
        if (controls && typeof controls.update === 'function' && !controls.manual) {
            controls.update();
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

/**
 * 縮放相機（拉近或拉遠）
 * @param {number} delta - 距離變化（正數拉遠，負數拉近）
 */
function zoomCamera(delta) {
    if (!camera) {
        console.warn('無法縮放：camera未初始化');
        return;
    }
    
    // 如果使用手動控制
    if (controls && controls.manual && controls.cameraDistance !== undefined) {
        const newDistance = Math.max(5, Math.min(60, controls.cameraDistance + delta));
        controls.cameraDistance = newDistance;
        if (controls.updateCameraPosition) {
            controls.updateCameraPosition();
        } else {
            console.error('updateCameraPosition函數不存在，嘗試直接更新相機');
            // 如果updateCameraPosition不存在，直接更新相機
            if (controls.cameraAngleY !== undefined && controls.cameraDistance !== undefined) {
                const x = controls.cameraDistance * Math.sin(controls.cameraAngleX) * Math.cos(controls.cameraAngleY);
                const y = controls.cameraDistance * Math.cos(controls.cameraAngleX);
                const z = controls.cameraDistance * Math.sin(controls.cameraAngleX) * Math.sin(controls.cameraAngleY);
                camera.position.set(x, y, z);
                camera.lookAt(controls.target);
                camera.updateMatrixWorld();
            }
        }
        // 優化：移除手動渲染，由主動畫循環統一處理
        return;
    }
    
    // 如果controls未初始化，嘗試直接操作相機
    if (!controls) {
        console.warn('controls未初始化，嘗試直接操作相機');
        const currentPos = camera.position;
        const target = new THREE.Vector3(0, 0, 0);
        const dx = currentPos.x - target.x;
        const dy = currentPos.y - target.y;
        const dz = currentPos.z - target.z;
        const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const newDistance = Math.max(5, Math.min(60, currentDistance + delta));
        
        if (currentDistance > 0) {
            const direction = {
                x: dx / currentDistance,
                y: dy / currentDistance,
                z: dz / currentDistance
            };
            
            const newX = target.x + direction.x * newDistance;
            const newY = target.y + direction.y * newDistance;
            const newZ = target.z + direction.z * newDistance;
            
            camera.position.set(newX, newY, newZ);
            camera.lookAt(target);
            camera.updateMatrixWorld();
            // 優化：移除手動渲染，由主動畫循環統一處理
        }
        return;
    }
    
    if (!controls) {
        console.warn('無法縮放：controls未初始化');
        return;
    }
    
    // 計算當前相機到目標點的距離
    const currentPos = camera.position;
    const target = controls.target || new THREE.Vector3(0, 0, 0);
    const dx = currentPos.x - target.x;
    const dy = currentPos.y - target.y;
    const dz = currentPos.z - target.z;
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // 計算新距離
    const minDist = controls.minDistance || 5;
    const maxDist = controls.maxDistance || 60;
    const newDistance = Math.max(minDist, Math.min(maxDist, currentDistance + delta));
    
    // 計算方向向量
    const direction = {
        x: dx / currentDistance,
        y: dy / currentDistance,
        z: dz / currentDistance
    };
    
    // 計算新位置
    const newX = target.x + direction.x * newDistance;
    const newY = target.y + direction.y * newDistance;
    const newZ = target.z + direction.z * newDistance;
    
    // 平滑過渡到新位置
    animateCameraTo(newX, newY, newZ, target.x, target.y, target.z);
    
    // 優化：移除手動渲染，由主動畫循環統一處理
    
}

/**
 * 手動控制實現（當OrbitControls不可用時）
 */
function setupManualControls() {
    if (!camera || !renderer) {
        console.error('無法設置手動控制：camera或renderer未初始化');
        return;
    }
    
    console.log('設置手動控制系統...');
    
    // 創建一個簡單的控制對象
    controls = {
        target: new THREE.Vector3(0, 0, 0),
        enabled: true,
        enableRotate: true,
        enableZoom: true,
        enablePan: true,
        minDistance: 5,
        maxDistance: 60,
        autoRotate: false,
        manual: true, // 標記為手動控制
        update: function() {
            // 手動控制不需要update
        }
    };
    
    // 手動實現旋轉和縮放
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    // 調整初始距離和角度，匹配圖片視角（從側上方看向角落）
    let cameraDistance = 17; // 更靠近場景
    let cameraAngleX = Math.PI / 3.5; // 約51度，稍微抬高
    let cameraAngleY = Math.PI / 4; // 45度，看向角落
    
    // 更新相機位置
    function updateCameraPosition() {
        const x = cameraDistance * Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
        const y = cameraDistance * Math.cos(cameraAngleX);
        const z = cameraDistance * Math.sin(cameraAngleX) * Math.sin(cameraAngleY);
        
        // 優化：移除頻繁的console.log以提升性能
        
        camera.position.set(x, y, z);
        camera.lookAt(controls.target);
        
        // 強制更新相機矩陣
        camera.updateMatrixWorld();
        
        // 優化：移除手動渲染，由主動畫循環統一處理
        // 主動畫循環會自動渲染，這裡不需要手動調用
    }
    
    // 鼠標事件 - 旋轉
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
        renderer.domElement.style.cursor = 'grabbing';
    });
    
    // 優化：使用節流函數減少mousemove事件處理頻率
    let mouseMoveThrottle = null;
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            if (mouseMoveThrottle) return; // 節流：每16ms（約60fps）處理一次
            mouseMoveThrottle = setTimeout(() => {
                mouseMoveThrottle = null;
            }, 16);
            
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            cameraAngleY += deltaX * 0.01;
            cameraAngleX += deltaY * 0.01;
            
            // 限制垂直角度
            cameraAngleX = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleX));
            
            updateCameraPosition();
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
        renderer.domElement.style.cursor = 'grab';
    });
    
    renderer.domElement.addEventListener('mouseleave', () => {
        isDragging = false;
        renderer.domElement.style.cursor = 'grab';
    });
    
    // 滾輪縮放
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.1 : 0.9;
        cameraDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, cameraDistance * delta));
        updateCameraPosition();
    });
    
    // 觸摸事件（移動端）
    let touchStartDistance = 0;
    let touchStartAngleX = cameraAngleX;
    let touchStartAngleY = cameraAngleY;
    
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            touchStartAngleX = cameraAngleX;
            touchStartAngleY = cameraAngleY;
        }
    });
    
    // 優化：使用節流函數減少touchmove事件處理頻率
    let touchMoveThrottle = null;
    renderer.domElement.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            if (touchMoveThrottle) return; // 節流：每16ms（約60fps）處理一次
            touchMoveThrottle = setTimeout(() => {
                touchMoveThrottle = null;
            }, 16);
            
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;
            
            cameraAngleY += deltaX * 0.01;
            cameraAngleX += deltaY * 0.01;
            cameraAngleX = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleX));
            
            updateCameraPosition();
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = touchStartDistance / distance;
            cameraDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, cameraDistance * scale));
            updateCameraPosition();
        }
    });
    
    renderer.domElement.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    // 初始化相機位置
    updateCameraPosition();
    
    // 保存相機狀態以便按鈕使用
    controls.cameraDistance = cameraDistance;
    controls.cameraAngleX = cameraAngleX;
    controls.cameraAngleY = cameraAngleY;
    controls.updateCameraPosition = updateCameraPosition;
    
    console.log('手動控制系統已設置完成，支持旋轉和縮放');
}

// 確保init3DScene函數在文件加載時就暴露到全局
if (typeof window !== 'undefined') {
    window.init3DScene = init3DScene;
}

// 在文件末尾確保所有函數都暴露到全局
if (typeof window !== 'undefined') {
    window.rotateScene = rotateScene;
    window.zoomCamera = zoomCamera;
    window.setupRotationButtons = setupRotationButtons;
    // 移除日志，避免控制台噪音（函數已成功暴露）
}

