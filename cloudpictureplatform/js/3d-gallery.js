// 3D展览馆功能

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let photoFrames = [];
let raycaster = null;
let mouse = null;
let animationId = null; // 用於停止動畫循環
let particles = null; // 粒子系統
let techElements = []; // 科技感裝飾元素

// 緊湊展覽廳尺寸 - 直接進入展廳，無空白區域
const ROOM_WIDTH = 22;
const ROOM_DEPTH = 16;
const ROOM_HEIGHT = 9;
const WALL_HEIGHT = 6.5;
const PHOTO_WIDTH = 2.4; // 適中的照片尺寸（稍微减小以避免重叠）
const PHOTO_HEIGHT = 1.8;
const PHOTO_SPACING = 1.5; // 增加間距，確保不重疊（從1.2增加到1.5）
const PHOTO_FRAME_DEPTH = 0.08; // 相框厚度

/**
 * 初始化3D展覽館
 */
async function init3DGallery() {
    try {
        const canvas = document.getElementById('galleryCanvas');
        if (!canvas) {
            console.error('找不到galleryCanvas元素');
            return;
        }

        // 獲取照片
        const photos = await getAllPhotos();
        console.log('3D展覽館獲取照片:', photos.length);
        
        if (photos.length === 0) {
            console.log('沒有照片，無法初始化3D展覽館');
            return;
        }

        // 驗證照片數據
        console.log('開始驗證照片數據，總數:', photos.length);
        const validPhotos = [];
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            if (!photo) {
                console.warn(`照片 ${i} 對象為空，已過濾`);
                continue;
            }
            
            // 檢查照片結構
            console.log(`照片 ${i} 結構:`, {
                hasFile: !!photo.file,
                hasThumbnail: !!photo.thumbnail,
                hasMetadata: !!photo.metadata,
                keys: Object.keys(photo)
            });
            
            if (!photo.file && !photo.thumbnail) {
                console.warn(`照片 ${i} 沒有文件或縮圖，已過濾`, photo);
                continue;
            }
            
            validPhotos.push(photo);
        }
        
        console.log('驗證完成，有效照片:', validPhotos.length);

        if (validPhotos.length === 0) {
            console.error('沒有有效的照片數據');
            return;
        }

        console.log('有效照片數量:', validPhotos.length);

        // 清空之前的場景
        if (renderer) {
            destroy3DGallery();
        }

        // 檢查canvas尺寸（必須先檢查，因為相機和渲染器需要用到）
        let canvasWidth = canvas.clientWidth || canvas.width || 800;
        let canvasHeight = canvas.clientHeight || canvas.height || 600;
        console.log('Canvas尺寸:', canvasWidth, 'x', canvasHeight);
        
        // 如果canvas尺寸為0，設置默認值
        if (canvasWidth === 0 || canvasHeight === 0) {
            console.warn('Canvas尺寸為0，使用默認尺寸');
            canvas.width = 800;
            canvas.height = 600;
            canvasWidth = 800;
            canvasHeight = 600;
        }

        // 創建場景 - 使用深色背景，減少白色
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2a); // 深藍黑色背景，與展廳風格一致
        console.log('場景創建成功');

        // 創建相機 - 調整位置以看到整個房間
        const aspect = canvasWidth / canvasHeight;
        camera = new THREE.PerspectiveCamera(
            75, // 增加視角，看到更多內容
            aspect,
            0.1,
            1000
        );
        // 設置初始視角：相機在展廳中心，SCC上方，不偏向任何牆體
        camera.position.set(0, 5, 0); // 在展廳正中心，SCC上方
        camera.lookAt(0, 0, 0); // 向下看向展廳中心（SCC位置）
        console.log('相機創建成功，位置:', camera.position, 'aspect:', aspect);
        
        // 創建渲染器
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false // 不透明背景
        });
        renderer.setSize(canvasWidth, canvasHeight);
        renderer.shadowMap.enabled = true;
        renderer.setClearColor(0x1a1a2a, 1); // 深藍黑色背景，與場景一致
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和陰影
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // 更現代的色調映射
        renderer.toneMappingExposure = 1.0; // 標準曝光
        renderer.outputEncoding = THREE.sRGBEncoding; // 使用sRGB編碼，顏色更準確
        const size = new THREE.Vector2();
        renderer.getSize(size);
        console.log('渲染器創建成功，尺寸:', size.width, 'x', size.height);

        // 創建控制器
        if (typeof THREE.OrbitControls === 'undefined') {
            console.error('OrbitControls未定義，無法創建控制器');
            throw new Error('OrbitControls未加載');
        }
        
        try {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 0, 0); // 目標點在展廳中心（SCC位置）
            controls.enableDamping = true;
            controls.dampingFactor = 0.08; // 更流暢的移動
            controls.minDistance = 3; // 最小距離，避免太近
            controls.maxDistance = 18; // 增加最大距離，確保可以看到所有牆面的照片
            controls.maxPolarAngle = Math.PI / 2.2; // 稍微放寬向上角度，可以看到更多牆面
            controls.minPolarAngle = Math.PI / 3.5; // 稍微放寬向下角度，可以看到地板
            // 限制水平旋轉為270度（3/4圈），但允許更大的範圍以看到所有牆面
            controls.maxAzimuthAngle = Math.PI * 0.8; // 144度（向右），稍微增加範圍
            controls.minAzimuthAngle = -Math.PI * 0.8; // -144度（向左），總共約288度
            controls.enablePan = true; // 允許平移
            controls.panSpeed = 0.5; // 降低平移速度
            // 限制平移範圍，確保相機在展廳內，但允許更大的移動範圍
            controls.addEventListener('change', () => {
                if (camera) {
                    // 限制相機位置在展廳範圍內，嚴格限制Y軸避免到天花板
                    const maxX = ROOM_WIDTH / 2 - 0.5;
                    const maxZ = ROOM_DEPTH / 2 - 0.5;
                    const minY = 2; // 提高最小高度，避免太低
                    const maxY = WALL_HEIGHT - 2; // 降低最大高度，避免接近天花板（WALL_HEIGHT=6.5，maxY=4.5）
                    
                    // 強制限制相機Y位置，優先處理Y軸，確保不會到天花板
                    if (camera.position.y > maxY) {
                        camera.position.y = maxY;
                    }
                    if (camera.position.y < minY) {
                        camera.position.y = minY;
                    }
                    
                    camera.position.x = Math.max(-maxX, Math.min(maxX, camera.position.x));
                    camera.position.z = Math.max(-maxZ, Math.min(maxZ, camera.position.z));
                    
                    // 限制目標點也在展廳範圍內，嚴格限制Y軸避免到天花板
                    const targetMinY = 2;
                    const targetMaxY = WALL_HEIGHT - 2; // 與相機Y限制一致
                    
                    if (controls.target.y > targetMaxY) {
                        controls.target.y = targetMaxY;
                    }
                    if (controls.target.y < targetMinY) {
                        controls.target.y = targetMinY;
                    }
                    
                    controls.target.x = Math.max(-maxX, Math.min(maxX, controls.target.x));
                    controls.target.z = Math.max(-maxZ, Math.min(maxZ, controls.target.z));
                }
            });
            console.log('OrbitControls創建成功', controls);
        } catch (error) {
            console.error('創建OrbitControls失敗:', error);
            throw error;
        }

        // 創建光照
        setupLighting();
        console.log('光照設置完成，場景子對象數量:', scene.children.length);

        // 創建房間
        createRoom();
        console.log('房間創建完成，場景子對象數量:', scene.children.length);

        // 添加美化裝飾元素
        addGalleryDecorations();
        console.log('裝飾元素添加完成');

        // 載入照片（使用驗證後的照片）
        console.log('開始載入照片到場景，數量:', validPhotos.length);
        await loadPhotosToScene(validPhotos);
        console.log('照片載入完成');

        // 設置射線檢測
        setupRaycaster();

        // 確保所有組件都已初始化
        if (!controls || !renderer || !scene || !camera) {
            console.error('3D組件初始化不完整', {
                controls: !!controls,
                renderer: !!renderer,
                scene: !!scene,
                camera: !!camera
            });
            throw new Error('3D組件初始化失敗');
        }

        // 開始渲染
        console.log('開始3D渲染循環，controls狀態:', !!controls);
        animate();

        // 顯示容器
        document.getElementById('galleryContainer').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('traditionalGallery').style.display = 'none';

        // 窗口大小調整
        window.addEventListener('resize', onWindowResize);
        
        console.log('3D展覽館初始化完成');
    } catch (error) {
        console.error('初始化3D展覽館失敗:', error);
        console.error('錯誤堆棧:', error.stack);
        throw error; // 重新拋出錯誤以便上層處理
    }
}

/**
 * 添加展廳美化裝飾元素
 */
function addGalleryDecorations() {
    techElements = [];
    
    // 1. 添加牆面聚光燈效果（為照片提供更好的照明）
    addWallSpotlights();
    
    // 2. 添加地面裝飾元素
    addFloorDecorations();
    
    // 3. 添加環境氛圍光
    addAmbientEffects();
    
        // 4. 添加粒子系統
        createParticleSystem();
        
        // 5. 添加數據流線條效果
        addDataStreams();
        
        // 6. 添加懸浮科技裝飾物
        addFloatingTechElements();
        
        // 7. 添加全息投影效果
        addHolographicEffects();
        
        // 8. 添加能量波紋效果
        addEnergyRipples();
        
        // 9. 添加實體燈具模型
        addPhysicalLightFixtures();
    
    console.log('展廳美化裝飾添加完成，裝飾元素數量:', techElements.length);
}

/**
 * 添加牆面聚光燈
 */
function addWallSpotlights() {
    // 已移除所有牆面聚光燈
    // 不再添加聚光燈
}

/**
 * 添加頂部LED燈帶效果
 */
function addTopLightStrips() {
    // 在牆面頂部添加LED燈帶
    const lightStrips = [
        { start: [-ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, -ROOM_DEPTH / 2], end: [ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, -ROOM_DEPTH / 2] }, // 前牆
        { start: [-ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, ROOM_DEPTH / 2], end: [ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, ROOM_DEPTH / 2] }, // 後牆
        { start: [-ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, -ROOM_DEPTH / 2], end: [-ROOM_WIDTH / 2, WALL_HEIGHT - 0.2, ROOM_DEPTH / 2] } // 左牆
    ];
    
    lightStrips.forEach((strip, index) => {
        // 創建LED燈帶幾何體
        const length = Math.sqrt(
            Math.pow(strip.end[0] - strip.start[0], 2) +
            Math.pow(strip.end[1] - strip.start[1], 2) +
            Math.pow(strip.end[2] - strip.start[2], 2)
        );
        
        const stripGeometry = new THREE.PlaneGeometry(length, 0.15);
        const stripMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6
        });
        const lightStrip = new THREE.Mesh(stripGeometry, stripMaterial);
        
        // 計算中間位置和旋轉
        const midX = (strip.start[0] + strip.end[0]) / 2;
        const midY = (strip.start[1] + strip.end[1]) / 2;
        const midZ = (strip.start[2] + strip.end[2]) / 2;
        lightStrip.position.set(midX, midY, midZ);
        
        // 計算旋轉角度
        const dx = strip.end[0] - strip.start[0];
        const dz = strip.end[2] - strip.start[2];
        if (Math.abs(dz) < 0.01) {
            // 沿X軸
            lightStrip.rotation.y = Math.PI / 2;
        } else if (Math.abs(dx) < 0.01) {
            // 沿Z軸
            lightStrip.rotation.y = 0;
        }
        
        scene.add(lightStrip);
        techElements.push(lightStrip);
        
        // 為燈帶添加點光源
        const ledCount = 5;
        for (let i = 0; i <= ledCount; i++) {
            const t = i / ledCount;
            const ledX = strip.start[0] + (strip.end[0] - strip.start[0]) * t;
            const ledY = strip.start[1] + (strip.end[1] - strip.start[1]) * t;
            const ledZ = strip.start[2] + (strip.end[2] - strip.start[2]) * t;
            
            const ledLight = new THREE.PointLight(0xffffff, 0.3, 8);
            ledLight.position.set(ledX, ledY, ledZ);
            ledLight.userData.originalIntensity = 0.3;
            scene.add(ledLight);
            techElements.push(ledLight);
        }
    });
}

/**
 * 添加地面裝飾
 */
function addFloorDecorations() {
    // 添加地面中心裝飾圓圈
    const circleGeometry = new THREE.RingGeometry(2, 2.5, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.05;
    scene.add(circle);
    techElements.push(circle);
    
    // 添加角落裝飾點
    const cornerPositions = [
        [-ROOM_WIDTH / 2 + 1, 0.05, -ROOM_DEPTH / 2 + 1],
        [ROOM_WIDTH / 2 - 1, 0.05, -ROOM_DEPTH / 2 + 1],
        [-ROOM_WIDTH / 2 + 1, 0.05, ROOM_DEPTH / 2 - 1],
        [ROOM_WIDTH / 2 - 1, 0.05, ROOM_DEPTH / 2 - 1]
    ];
    
    cornerPositions.forEach(pos => {
        const dotGeometry = new THREE.CircleGeometry(0.3, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(...pos);
        scene.add(dot);
        techElements.push(dot);
    });
}

/**
 * 添加環境氛圍效果
 */
function addAmbientEffects() {
    // 添加柔和的環境光暈
    const fog = new THREE.Fog(0x000000, 15, 30);
    scene.fog = fog;
    
    // 添加牆面邊緣光帶（包括右牆）
    const walls = [
        { width: ROOM_WIDTH, height: WALL_HEIGHT, position: [0, WALL_HEIGHT / 2, -ROOM_DEPTH / 2], rotation: [0, 0, 0] },
        { width: ROOM_WIDTH, height: WALL_HEIGHT, position: [0, WALL_HEIGHT / 2, ROOM_DEPTH / 2], rotation: [0, Math.PI, 0] },
        { width: ROOM_DEPTH, height: WALL_HEIGHT, position: [-ROOM_WIDTH / 2, WALL_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0] },
        { width: ROOM_DEPTH, height: WALL_HEIGHT, position: [ROOM_WIDTH / 2, WALL_HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0] }
    ];
    
    walls.forEach(wall => {
        // 頂部光帶
        const topLightGeometry = new THREE.PlaneGeometry(wall.width, 0.2);
        const topLightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const topLight = new THREE.Mesh(topLightGeometry, topLightMaterial);
        topLight.position.set(wall.position[0], wall.position[1] + WALL_HEIGHT / 2 - 0.1, wall.position[2]);
        topLight.rotation.set(...wall.rotation);
        scene.add(topLight);
        techElements.push(topLight);
    });
}

/**
 * 創建粒子系統
 */
function createParticleSystem() {
    const particleCount = 80; // 大幅減少粒子數量
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    const color = new THREE.Color(0xffffff);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 隨機位置（在展廳空間內）
        positions[i3] = (Math.random() - 0.5) * ROOM_WIDTH * 0.6;
        positions[i3 + 1] = Math.random() * WALL_HEIGHT * 0.6 + 2;
        positions[i3 + 2] = (Math.random() - 0.5) * ROOM_DEPTH * 0.6;
        
        // 顏色
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        // 隨機速度（減慢）
        velocities[i3] = (Math.random() - 0.5) * 0.01;
        velocities[i3 + 1] = Math.random() * 0.005 + 0.002;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.06, // 減小粒子大小
        transparent: true,
        opacity: 0.4, // 降低不透明度
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData.positions = positions;
    particleSystem.userData.velocities = velocities;
    scene.add(particleSystem);
    techElements.push(particleSystem);
}

/**
 * 添加數據流線條效果
 */
function addDataStreams() {
    // 創建垂直數據流線條 - 大幅減少數量
    const streamCount = 3; // 從8減少到3
    for (let i = 0; i < streamCount; i++) {
        const x = (Math.random() - 0.5) * ROOM_WIDTH * 0.4;
        const z = (Math.random() - 0.5) * ROOM_DEPTH * 0.4;
        
        const streamGeometry = new THREE.BufferGeometry();
        const points = 15; // 減少點數
        const streamPositions = new Float32Array(points * 3);
        
        for (let j = 0; j < points; j++) {
            const j3 = j * 3;
            streamPositions[j3] = x;
            streamPositions[j3 + 1] = (j / points) * WALL_HEIGHT;
            streamPositions[j3 + 2] = z;
        }
        
        streamGeometry.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
        
        const streamMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15, // 降低不透明度
            linewidth: 1
        });
        
        const stream = new THREE.Line(streamGeometry, streamMaterial);
        stream.userData.originalY = streamPositions;
        stream.userData.animationOffset = Math.random() * Math.PI * 2;
        scene.add(stream);
        techElements.push(stream);
    }
}

/**
 * 添加懸浮科技裝飾物
 */
function addFloatingTechElements() {
    // 添加懸浮的幾何體裝飾 - 減少數量
    const positions = [
        [ROOM_WIDTH / 2 - 2, WALL_HEIGHT - 1, -ROOM_DEPTH / 2 + 2]
        // 只保留一個，移除其他兩個
    ];
    
    positions.forEach((pos, index) => {
        // 創建發光的四面體
        const geometry = new THREE.TetrahedronGeometry(0.25, 0); // 稍微減小
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.6, // 降低發光強度
            transparent: true,
            opacity: 0.5 // 降低不透明度
        });
        const tetrahedron = new THREE.Mesh(geometry, material);
        tetrahedron.position.set(...pos);
        tetrahedron.userData.originalY = pos[1];
        tetrahedron.userData.animationOffset = index * Math.PI / 3;
        scene.add(tetrahedron);
        techElements.push(tetrahedron);
        
        // 移除外圈光環，減少視覺干擾
    });
}

/**
 * 添加全息投影效果
 */
function addHolographicEffects() {
    // 移除全息掃描線效果，減少視覺干擾
    // 不再添加掃描線
}

/**
 * 添加能量波紋效果
 */
function addEnergyRipples() {
    // 在地板中心添加能量波紋 - 減少數量
    const rippleCount = 1; // 從3減少到1
    for (let i = 0; i < rippleCount; i++) {
        const rippleGeometry = new THREE.RingGeometry(0.5 + i * 0.3, 0.7 + i * 0.3, 64);
        const rippleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15, // 降低不透明度
            side: THREE.DoubleSide
        });
        const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.set(0, 0.08, 0);
        ripple.userData.originalRadius = 0.5 + i * 0.3;
        ripple.userData.animationOffset = i * Math.PI / 3;
        scene.add(ripple);
        techElements.push(ripple);
    }
}

/**
 * 添加實體燈具模型
 */
function addPhysicalLightFixtures() {
    // 1. 添加壁燈（牆面燈具）
    addWallLights();
    
    // 2. 添加射燈裝置（可見的射燈模型）
    addSpotlightFixtures();
    
    console.log('實體燈具模型添加完成');
}

/**
 * 添加吊燈 - 科技感設計
 */
function addCeilingLights() {
    const positions = [
        [0, WALL_HEIGHT - 0.5, 0], // 中心
        [ROOM_WIDTH / 3, WALL_HEIGHT - 0.5, -ROOM_DEPTH / 3],
        [-ROOM_WIDTH / 3, WALL_HEIGHT - 0.5, ROOM_DEPTH / 3]
    ];
    
    positions.forEach((pos, index) => {
        // 創建科技感吊燈組
        const lightGroup = new THREE.Group();
        
        // 科技感懸掛桿（六邊形柱體）
        const chainLength = 0.8;
        const chainGeometry = new THREE.CylinderGeometry(0.03, 0.03, chainLength, 6);
        const chainMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
        const chain = new THREE.Mesh(chainGeometry, chainMaterial);
        chain.position.set(pos[0], pos[1] - chainLength / 2, pos[2]);
        lightGroup.add(chain);
        
        // 科技感燈體（多邊形幾何體）
        const lightBodyGeometry = new THREE.OctahedronGeometry(0.35, 0);
        const lightBodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.3
        });
        const lightBody = new THREE.Mesh(lightBodyGeometry, lightBodyMaterial);
        lightBody.position.set(pos[0], pos[1] - chainLength, pos[2]);
        lightGroup.add(lightBody);
        
        // LED發光核心（發光球體）
        const coreGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.set(pos[0], pos[1] - chainLength, pos[2]);
        lightGroup.add(core);
        
        // 發光環（科技感光環）
        const ringGeometry = new THREE.RingGeometry(0.25, 0.35, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(pos[0], pos[1] - chainLength - 0.1, pos[2]);
        ring.rotation.x = Math.PI / 2;
        lightGroup.add(ring);
        ring.userData.animationOffset = index * Math.PI / 3;
        
        // LED光線（從燈體發出的光線）
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const rayGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
            const rayMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.7
            });
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.position.set(
                pos[0] + Math.cos(angle) * 0.3,
                pos[1] - chainLength,
                pos[2] + Math.sin(angle) * 0.3
            );
            ray.rotation.z = Math.PI / 2;
            ray.rotation.y = angle;
            lightGroup.add(ray);
        }
        
        // 添加點光源
        const pointLight = new THREE.PointLight(0xffffff, 1.0, 18);
        pointLight.position.set(pos[0], pos[1] - chainLength, pos[2]);
        pointLight.userData.originalIntensity = 1.0;
        scene.add(pointLight);
        techElements.push(pointLight);
        
        scene.add(lightGroup);
        techElements.push(lightGroup);
    });
}

/**
 * 添加壁燈 - 科技感設計
 */
function addWallLights() {
    const wallLights = [
        // 前牆 - 2個壁燈
        { wall: 'front', position: [ROOM_WIDTH / 2 - 1, WALL_HEIGHT / 2, -ROOM_DEPTH / 2 + 0.1], rotation: [0, 0, 0] },
        { wall: 'front', position: [-ROOM_WIDTH / 2 + 1, WALL_HEIGHT / 2, -ROOM_DEPTH / 2 + 0.1], rotation: [0, 0, 0] },
        // 後牆 - 2個壁燈
        { wall: 'back', position: [ROOM_WIDTH / 2 - 1, WALL_HEIGHT / 2, ROOM_DEPTH / 2 - 0.1], rotation: [0, Math.PI, 0] },
        { wall: 'back', position: [-ROOM_WIDTH / 2 + 1, WALL_HEIGHT / 2, ROOM_DEPTH / 2 - 0.1], rotation: [0, Math.PI, 0] },
        // 左牆 - 2個壁燈
        { wall: 'left', position: [-ROOM_WIDTH / 2 + 0.1, WALL_HEIGHT / 2, ROOM_DEPTH / 2 - 1], rotation: [0, Math.PI / 2, 0] },
        { wall: 'left', position: [-ROOM_WIDTH / 2 + 0.1, WALL_HEIGHT / 2, -ROOM_DEPTH / 2 + 1], rotation: [0, Math.PI / 2, 0] },
        // 右牆 - 2個壁燈
        { wall: 'right', position: [ROOM_WIDTH / 2 - 0.1, WALL_HEIGHT / 2, ROOM_DEPTH / 2 - 1], rotation: [0, -Math.PI / 2, 0] },
        { wall: 'right', position: [ROOM_WIDTH / 2 - 0.1, WALL_HEIGHT / 2, -ROOM_DEPTH / 2 + 1], rotation: [0, -Math.PI / 2, 0] }
    ];
    
    wallLights.forEach((lightConfig, index) => {
        const lightGroup = new THREE.Group();
        
        // 科技感底座（六邊形）
        const baseGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.rotation.z = Math.PI / 6;
        lightGroup.add(base);
        
        // 科技感燈體（幾何形狀）
        const bodyGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.15);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x001122,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.15;
        lightGroup.add(body);
        
        // LED發光條（橫向）
        const ledStripGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.02);
        const ledStripMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.5
        });
        const ledStrip = new THREE.Mesh(ledStripGeometry, ledStripMaterial);
        ledStrip.position.y = 0.15;
        ledStrip.position.z = 0.08;
        lightGroup.add(ledStrip);
        
        // 發光核心
        const coreGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = 0.15;
        core.position.z = 0.1;
        lightGroup.add(core);
        
        // 科技感光線（從燈體發出）
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const rayGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8);
            const rayMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.6
            });
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.position.set(
                Math.cos(angle) * 0.15,
                0.15,
                0.1 + Math.sin(angle) * 0.15
            );
            ray.rotation.z = Math.PI / 2;
            ray.rotation.y = angle;
            lightGroup.add(ray);
        }
        
        // 設置位置和旋轉
        lightGroup.position.set(...lightConfig.position);
        lightGroup.rotation.set(...lightConfig.rotation);
        
        // 添加點光源
        const pointLight = new THREE.PointLight(0xffffff, 0.6, 12);
        pointLight.position.set(...lightConfig.position);
        pointLight.userData.originalIntensity = 0.6;
        scene.add(pointLight);
        techElements.push(pointLight);
        
        scene.add(lightGroup);
        techElements.push(lightGroup);
    });
}

/**
 * 添加射燈裝置 - 科技感設計
 */
function addSpotlightFixtures() {
    // 為現有的聚光燈添加可見的射燈裝置 - 減少到3個
    const spotlightPositions = [
        // 前牆 - 1個射燈
        { position: [0, WALL_HEIGHT - 1, -ROOM_DEPTH / 2 + 0.5], rotation: [0, 0, 0] },
        // 後牆 - 1個射燈
        { position: [0, WALL_HEIGHT - 1, ROOM_DEPTH / 2 - 0.5], rotation: [0, Math.PI, 0] },
        // 左牆 - 1個射燈
        { position: [-ROOM_WIDTH / 2 + 0.5, WALL_HEIGHT - 1, 0], rotation: [0, Math.PI / 2, 0] },
        // 右牆 - 1個射燈
        { position: [ROOM_WIDTH / 2 - 0.5, WALL_HEIGHT - 1, 0], rotation: [0, -Math.PI / 2, 0] }
    ];
    
    spotlightPositions.forEach((config, index) => {
        const fixtureGroup = new THREE.Group();
        
        // 科技感支架（幾何形狀）
        const bracketGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.2);
        const bracketMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.15
        });
        const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
        fixtureGroup.add(bracket);
        
        // 科技感射燈頭部（多邊形）
        const headGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = Math.PI / 2;
        head.position.y = -0.25;
        fixtureGroup.add(head);
        
        // LED發光環
        const ledRingGeometry = new THREE.RingGeometry(0.12, 0.15, 16);
        const ledRingMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.8
        });
        const ledRing = new THREE.Mesh(ledRingGeometry, ledRingMaterial);
        ledRing.rotation.z = Math.PI / 2;
        ledRing.position.y = -0.45;
        fixtureGroup.add(ledRing);
        
        // 發光核心
        const coreGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = -0.45;
        fixtureGroup.add(core);
        
        // 科技感光線（從射燈發出）
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rayGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 8);
            const rayMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.5
            });
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.position.set(
                Math.cos(angle) * 0.1,
                -0.45,
                Math.sin(angle) * 0.1
            );
            ray.rotation.z = Math.PI / 2;
            ray.rotation.y = angle;
            fixtureGroup.add(ray);
        }
        
        // 設置位置和旋轉
        fixtureGroup.position.set(...config.position);
        fixtureGroup.rotation.set(...config.rotation);
        
        scene.add(fixtureGroup);
        techElements.push(fixtureGroup);
    });
}

/**
 * 添加落地燈 - 科技感設計
 */
function addFloorLamps() {
    const floorLampPositions = [
        [ROOM_WIDTH / 2 - 2, 0, -ROOM_DEPTH / 2 + 2],
        [-ROOM_WIDTH / 2 + 2, 0, ROOM_DEPTH / 2 - 2]
    ];
    
    floorLampPositions.forEach((pos, index) => {
        const lampGroup = new THREE.Group();
        
        // 科技感燈桿（六邊形，帶發光線條）
        const poleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 1.25;
        pole.rotation.z = Math.PI / 6;
        lampGroup.add(pole);
        
        // LED發光線條（沿燈桿）
        for (let i = 0; i < 3; i++) {
            const ledLineGeometry = new THREE.BoxGeometry(0.01, 2.3, 0.01);
            const ledLineMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.7
            });
            const ledLine = new THREE.Mesh(ledLineGeometry, ledLineMaterial);
            const angle = (i / 3) * Math.PI * 2;
            ledLine.position.set(
                Math.cos(angle) * 0.055,
                1.25,
                Math.sin(angle) * 0.055
            );
            lampGroup.add(ledLine);
        }
        
        // 科技感底座（多邊形）
        const baseGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.15
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        lampGroup.add(base);
        
        // 科技感燈體（幾何形狀）
        const bodyGeometry = new THREE.OctahedronGeometry(0.3, 0);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x001122,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        lampGroup.add(body);
        
        // LED發光核心
        const coreGeometry = new THREE.SphereGeometry(0.18, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = 2.5;
        lampGroup.add(core);
        
        // 發光環
        const ringGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = 2.3;
        ring.rotation.x = Math.PI / 2;
        lampGroup.add(ring);
        ring.userData.animationOffset = index * Math.PI / 2;
        
        // 科技感光線（從燈體發出）
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const rayGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8);
            const rayMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1,
                transparent: true,
                opacity: 0.5
            });
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.position.set(
                Math.cos(angle) * 0.25,
                2.5,
                Math.sin(angle) * 0.25
            );
            ray.rotation.z = Math.PI / 2;
            ray.rotation.y = angle;
            lampGroup.add(ray);
        }
        
        // 設置位置
        lampGroup.position.set(...pos);
        
        // 添加點光源
        const pointLight = new THREE.PointLight(0xffffff, 0.8, 15);
        pointLight.position.set(pos[0], 2.5, pos[2]);
        pointLight.userData.originalIntensity = 0.8;
        scene.add(pointLight);
        techElements.push(pointLight);
        
        scene.add(lampGroup);
        techElements.push(lampGroup);
    });
}

/**
 * 設置光照
 */
function setupLighting() {
    // 精美光照系統 - 現代美術館風格
    // 環境光 - 科技感藍色調
    const ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.5); // 稍微增強環境光
    scene.add(ambientLight);

    // 主方向光 - 科技感藍白色頂部照明
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2); // 增強主光源
    mainLight.position.set(0, 13, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 55;
    mainLight.shadow.camera.left = -16;
    mainLight.shadow.camera.right = 16;
    mainLight.shadow.camera.top = 16;
    mainLight.shadow.camera.bottom = -16;
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.radius = 4;
    scene.add(mainLight);
    
    // 白色側光源 - 增強
    const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.8); // 增強側光源
    sideLight1.position.set(10, 7, 10);
    scene.add(sideLight1);
    
    const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.8); // 增強側光源
    sideLight2.position.set(-10, 7, 10);
    scene.add(sideLight2);
    
    // 白色點光源 - 增強
    const pointLight1 = new THREE.PointLight(0xffffff, 0.9, 35); // 增強點光源
    pointLight1.position.set(0, 6, 0);
    pointLight1.userData.originalIntensity = 0.9;
    scene.add(pointLight1);
    techElements.push(pointLight1);
    
    // 額外的白色點光源 - 增強
    const pointLight2 = new THREE.PointLight(0xffffff, 0.7, 40); // 增強點光源
    pointLight2.position.set(0, 8, -8);
    pointLight2.userData.originalIntensity = 0.7;
    scene.add(pointLight2);
    techElements.push(pointLight2);
    
    // 添加牆角補光燈
    const cornerLight1 = new THREE.PointLight(0xffffff, 0.5, 25);
    cornerLight1.position.set(ROOM_WIDTH / 2 - 1, 3, -ROOM_DEPTH / 2 + 1);
    cornerLight1.userData.originalIntensity = 0.5;
    scene.add(cornerLight1);
    techElements.push(cornerLight1);
    
    const cornerLight2 = new THREE.PointLight(0xffffff, 0.5, 25);
    cornerLight2.position.set(-ROOM_WIDTH / 2 + 1, 3, ROOM_DEPTH / 2 - 1);
    cornerLight2.userData.originalIntensity = 0.5;
    scene.add(cornerLight2);
    techElements.push(cornerLight2);
    
    // 添加地面補光燈（從下往上照亮牆面）
    const floorLight1 = new THREE.SpotLight(0xffffff, 0.6, 20, Math.PI / 4, 0.5, 1.5);
    floorLight1.position.set(ROOM_WIDTH / 2 - 2, 0.5, 0);
    floorLight1.target.position.set(ROOM_WIDTH / 2 - 2, WALL_HEIGHT / 2, 0);
    floorLight1.castShadow = false;
    scene.add(floorLight1);
    scene.add(floorLight1.target);
    techElements.push(floorLight1);
    
    const floorLight2 = new THREE.SpotLight(0xffffff, 0.6, 20, Math.PI / 4, 0.5, 1.5);
    floorLight2.position.set(-ROOM_WIDTH / 2 + 2, 0.5, 0);
    floorLight2.target.position.set(-ROOM_WIDTH / 2 + 2, WALL_HEIGHT / 2, 0);
    floorLight2.castShadow = false;
    scene.add(floorLight2);
    scene.add(floorLight2.target);
    techElements.push(floorLight2);
    
    // 添加頂部裝飾燈帶（模擬LED燈帶效果）
    addTopLightStrips();
}

/**
 * 創建房間
 */
function createRoom() {
    // 地面 - 精美的反射地板
    const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2a, // 深藍灰色，更優雅
        roughness: 0.05, // 非常光滑，產生鏡面反射
        metalness: 0.9, // 高金屬感，產生強烈反射
        emissive: 0x000811, // 深藍色發光
        emissiveIntensity: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // 已移除網格線
    
    // 添加地板文字 "SCC"
    addFloorText();

    // 天花板已刪除，不再添加

    // 創建牆面 - 精美的展覽牆面
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a3e, // 稍亮的深藍灰色，更優雅
        roughness: 0.1, // 更光滑
        metalness: 0.5, // 增加金屬感
        emissive: 0x0a0a1a,
        emissiveIntensity: 0.15
    });

    // 前牆
    const frontWall = createWall(ROOM_WIDTH, WALL_HEIGHT);
    frontWall.position.set(0, WALL_HEIGHT / 2, -ROOM_DEPTH / 2);
    scene.add(frontWall);

    // 後牆
    const backWall = createWall(ROOM_WIDTH, WALL_HEIGHT);
    backWall.position.set(0, WALL_HEIGHT / 2, ROOM_DEPTH / 2);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    // 左牆
    const leftWall = createWall(ROOM_DEPTH, WALL_HEIGHT);
    leftWall.position.set(-ROOM_WIDTH / 2, WALL_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // 右牆
    const rightWall = createWall(ROOM_DEPTH, WALL_HEIGHT);
    rightWall.position.set(ROOM_WIDTH / 2, WALL_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
}

/**
 * 在地板上添加"SCC"文字
 */
function addFloorText() {
    // 創建Canvas來繪製文字
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 4096; // 更大的Canvas尺寸以獲得更高分辨率
    canvas.height = 2048;
    
    // 設置文字樣式 - 超大字體
    context.fillStyle = 'rgba(255, 255, 255, 1)'; // 白色，完全不透明
    context.font = 'bold 800px Arial'; // 超大字體
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 繪製"SCC"文字
    context.fillText('SCC', canvas.width / 2, canvas.height / 2);
    
    // 創建紋理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // 創建文字平面 - 超大尺寸
    const textGeometry = new THREE.PlaneGeometry(8, 4); // 超大的文字區域
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95, // 非常高的不透明度
        side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    
    // 將文字放在地板中心圓圈的正中央（圓圈位置在 [0, 0.05, 0]）
    textMesh.rotation.x = -Math.PI / 2;
    textMesh.position.set(0, 0.06, 0); // 放在圓圈中心，稍微高一點點以確保可見
    scene.add(textMesh);
    
    console.log('地板文字"SCC"添加完成，位置在地板中心圓圈中間，已放大到超大尺寸');
}

/**
 * 创建墙面 - 科技感展覽牆，帶有發光裝飾效果
 */
function createWall(width, height) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2a2a3e, // 稍亮的深藍灰色，更優雅
        roughness: 0.08, // 更光滑
        metalness: 0.6, // 增加金屬感，產生更好的反射
        emissive: 0x0a0a1a,
        emissiveIntensity: 0.15
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.receiveShadow = true;
    
    // 添加精美的發光邊框
    const borderGeometry = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        opacity: 0.4, 
        transparent: true,
        linewidth: 2
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    wall.add(border);
    
    // 已移除牆面網格線
    
    // 添加牆面中心裝飾線（水平中線）
    const centerLineGeometry = new THREE.BufferGeometry();
    const centerLinePoints = [
        new THREE.Vector3(-width/2, 0, 0.02),
        new THREE.Vector3(width/2, 0, 0.02)
    ];
    centerLineGeometry.setFromPoints(centerLinePoints);
    const centerLineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.3,
        transparent: true,
        linewidth: 2
    });
    const centerLine = new THREE.Line(centerLineGeometry, centerLineMaterial);
    wall.add(centerLine);
    
    return wall;
}

/**
 * 載入照片到場景
 */
/**
 * 固定的照片分配方案（1-12張）
 * 格式：[前牆數量, 後牆數量, 左牆數量, 右牆數量]
 * 長牆（前牆、後牆）：最多4張
 * 短牆（左牆、右牆）：最多2張
 */
const PHOTO_ALLOCATION_TABLE = {
    0: [0, 0, 0, 0],
    1: [1, 0, 0, 0],   // 前牆1張
    2: [1, 1, 0, 0],   // 前牆1張，後牆1張
    3: [1, 1, 1, 0],   // 前牆1張，後牆1張，左牆1張
    4: [1, 1, 1, 1],   // 前牆1張，後牆1張，左牆1張，右牆1張
    5: [2, 1, 1, 1],   // 前牆2張，後牆1張，左牆1張，右牆1張
    6: [2, 2, 1, 1],   // 前牆2張，後牆2張，左牆1張，右牆1張
    7: [2, 2, 2, 1],   // 前牆2張，後牆2張，左牆2張，右牆1張
    8: [2, 2, 2, 2],   // 前牆2張，後牆2張，左牆2張，右牆2張
    9: [3, 2, 2, 2],   // 前牆3張，後牆2張，左牆2張，右牆2張
    10: [3, 3, 2, 2],  // 前牆3張，後牆3張，左牆2張，右牆2張
    11: [4, 3, 2, 2],  // 前牆4張，後牆3張，左牆2張，右牆2張
    12: [4, 4, 2, 2]   // 前牆4張，後牆4張，左牆2張，右牆2張
};

async function loadPhotosToScene(photos) {
    photoFrames = [];
    
    const totalPhotos = photos.length;
    
    // 使用固定的分配方案
    let wallPhotoCounts;
    if (totalPhotos >= 0 && totalPhotos <= 12) {
        wallPhotoCounts = [...PHOTO_ALLOCATION_TABLE[totalPhotos]];
        console.log(`使用固定分配方案：${totalPhotos}張照片 → [${wallPhotoCounts.join(', ')}]`);
    } else {
        console.warn(`照片數量超出範圍（${totalPhotos}），使用默認分配`);
        // 超過12張，只處理前12張
        wallPhotoCounts = [4, 4, 2, 2]; // 使用12張的分配方案
    }
    
    // 驗證分配總數
    const sum = wallPhotoCounts.reduce((a, b) => a + b, 0);
    if (sum !== totalPhotos && totalPhotos <= 12) {
        console.error(`分配總數不匹配！預期: ${totalPhotos}, 實際: ${sum}`);
        // 強制修正
        const diff = totalPhotos - sum;
        if (diff > 0) {
            // 按順序分配到各個牆面（優先長牆，然後短牆）
            const longWalls = [0, 1]; // 前牆、後牆
            const shortWalls = [2, 3]; // 左牆、右牆
            for (let i = 0; i < diff; i++) {
                // 優先分配到長牆，但限制最多4張
                if (i % 2 < longWalls.length && wallPhotoCounts[longWalls[i % 2]] < 4) {
                    wallPhotoCounts[longWalls[i % 2]]++;
                } else if (i % 2 < shortWalls.length && wallPhotoCounts[shortWalls[i % 2]] < 2) {
                    wallPhotoCounts[shortWalls[i % 2]]++;
                } else {
                    // 如果都滿了，分配到第一個未滿的牆面
                    for (let j = 0; j < 4; j++) {
                        if (j < 2 && wallPhotoCounts[j] < 4) {
                            wallPhotoCounts[j]++;
                            break;
                        } else if (j >= 2 && wallPhotoCounts[j] < 2) {
                            wallPhotoCounts[j]++;
                            break;
                        }
                    }
                }
            }
        } else {
            // 從最後一個牆面減少
            for (let i = 3; i >= 0 && diff < 0; i--) {
                if (wallPhotoCounts[i] > 0) {
                    wallPhotoCounts[i]--;
                    diff++;
                }
            }
        }
        console.log(`修正後分配: [${wallPhotoCounts.join(', ')}]`);
    }
    
    console.log(`照片分配驗證：總照片數: ${totalPhotos}, 分配總數: ${sum}, 分配方案: [${wallPhotoCounts.join(', ')}]`);
    
    // 分配到4個牆面 - 前牆、後牆、左牆、右牆
    const walls = [
        { position: [0, WALL_HEIGHT / 2, -ROOM_DEPTH / 2 + 0.1], rotation: [0, 0, 0], width: ROOM_WIDTH, name: '前牆' },
        { position: [0, WALL_HEIGHT / 2, ROOM_DEPTH / 2 - 0.1], rotation: [0, Math.PI, 0], width: ROOM_WIDTH, name: '後牆' },
        { position: [-ROOM_WIDTH / 2 + 0.1, WALL_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], width: ROOM_DEPTH, name: '左牆' },
        { position: [ROOM_WIDTH / 2 - 0.1, WALL_HEIGHT / 2, 0], rotation: [0, -Math.PI / 2, 0], width: ROOM_DEPTH, name: '右牆' }
    ];
    
    console.log('開始分配照片到牆面，總照片數:', totalPhotos, '分配方案:', wallPhotoCounts);
    console.log('照片數組長度:', photos.length);
    console.log('照片數組內容:', photos.map((p, i) => ({ index: i, hasFile: !!p?.file, hasThumbnail: !!p?.thumbnail, id: p?.id })));

    let photoIndex = 0;
    let successCount = 0;
    let failCount = 0;
    
    // 記錄每張照片的處理狀態
    const photoProcessed = new Array(photos.length).fill(false);

    for (let wallIndex = 0; wallIndex < walls.length && photoIndex < photos.length; wallIndex++) {
        const wall = walls[wallIndex];
        const photoCount = wallPhotoCounts[wallIndex] || 0;
        
        if (photoCount === 0) continue;
        
        // 確保不會超出照片數組範圍，並且確保所有照片都被處理
        // 強制使用預期的照片數量（如果還有照片可用）
        let wallPhotos;
        if (photoIndex + photoCount <= photos.length) {
            // 有足夠的照片，使用預期的數量
            wallPhotos = photos.slice(photoIndex, photoIndex + photoCount);
        } else {
            // 照片不足，使用所有剩餘的照片
            wallPhotos = photos.slice(photoIndex);
            console.warn(`牆面 ${wall.name} 照片不足！預期: ${photoCount}, 實際可用: ${wallPhotos.length}`);
        }
        
        console.log(`準備處理 ${wall.name}：預期 ${photoCount} 張，實際可用 ${wallPhotos.length} 張，從索引 ${photoIndex} 開始，總照片數: ${photos.length}`);
        
        if (wallPhotos.length === 0) {
            console.warn(`牆面 ${wall.name} 沒有照片可處理，photoIndex: ${photoIndex}, photoCount: ${photoCount}, 總照片數: ${photos.length}`);
            // 如果沒有照片可處理，但還有照片未處理，繼續下一個牆面
            if (photoIndex < photos.length) {
                continue;
            } else {
                break;
            }
        }
        
        if (wallPhotos.length !== photoCount) {
            console.warn(`牆面 ${wall.name} 照片數量不匹配！預期: ${photoCount}, 實際: ${wallPhotos.length}`);
        }

        console.log(`處理 ${wall.name}，預期照片數: ${photoCount}，實際照片數: ${wallPhotos.length}，從索引 ${photoIndex} 開始`);
        
        // 對於左牆，需要特別處理，因為它的寬度是ROOM_DEPTH而不是ROOM_WIDTH
        const wallWidthForCalculation = wall.width;
        const positions = calculatePhotoPositions(wallPhotos.length, wallWidthForCalculation);
        console.log(`計算出的位置數量:`, positions.length, '需要的照片數量:', wallPhotos.length, '牆面寬度:', wallWidthForCalculation);
        
        // 確保位置數量與照片數量一致
        if (positions.length !== wallPhotos.length) {
            console.error(`位置數量不匹配！位置數: ${positions.length}, 照片數: ${wallPhotos.length}`);
            // 如果位置不足，重新計算
            if (positions.length < wallPhotos.length) {
                console.log(`重新計算位置，照片數: ${wallPhotos.length}`);
                positions = calculatePhotoPositions(wallPhotos.length, wall.width);
            }
        }
        
        // 確保有足夠的位置
        if (positions.length < wallPhotos.length) {
            console.error(`位置不足！需要: ${wallPhotos.length}, 實際: ${positions.length}`);
            // 嘗試擴展位置數組
            const needed = wallPhotos.length - positions.length;
            for (let j = 0; j < needed; j++) {
                const lastPos = positions[positions.length - 1] || { x: 0, y: 0 };
                positions.push({
                    x: lastPos.x + (PHOTO_WIDTH + PHOTO_SPACING) * (j + 1),
                    y: lastPos.y
                });
            }
        }
        
        // 確保位置數組與照片數量一致
        if (!positions || positions.length !== wallPhotos.length) {
            console.warn(`位置數組不匹配，重新計算位置。照片數: ${wallPhotos.length}, 位置數: ${positions?.length || 0}`);
            positions = calculatePhotoPositions(wallPhotos.length, wallWidthForCalculation);
            if (positions.length !== wallPhotos.length) {
                console.error(`位置計算失敗！照片數: ${wallPhotos.length}, 位置數: ${positions.length}`);
            }
        }
        
        for (let i = 0; i < wallPhotos.length; i++) {
            const photo = wallPhotos[i];
            if (!photo) {
                console.error('照片對象為空，跳過', { i, photoIndex, wallPhotos });
                photoIndex++;
                continue;
            }
            
            // 確保位置存在
            if (i >= positions.length) {
                console.error(`位置索引 ${i} 超出範圍 ${positions.length}，跳過照片 ${photoIndex}`);
                photoIndex++;
                continue;
            }
            
            let pos = positions[i];
            if (!pos || pos.x === undefined || pos.y === undefined) {
                console.error(`位置對象無效，照片索引: ${i}, 位置:`, pos);
                // 計算一個默認位置（基於索引）
                const photoSpaceWidth = PHOTO_WIDTH + PHOTO_SPACING;
                const defaultX = (i - (wallPhotos.length - 1) / 2) * photoSpaceWidth;
                const centerY = (WALL_HEIGHT / 2 - 0.5) * 0.4; // 使用相同的Y坐标计算方式
                pos = { x: defaultX, y: centerY };
                positions[i] = pos;
                console.warn(`使用默認位置: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
            }
            // 計算最終位置，確保照片緊貼牆面
            let finalPosition;
            if (wallIndex === 0) {
                // 前牆：Z軸在牆面位置
                finalPosition = [
                    wall.position[0] + pos.x,
                    wall.position[1] + pos.y,
                    wall.position[2]
                ];
            } else if (wallIndex === 1) {
                // 後牆：Z軸在牆面位置
                finalPosition = [
                    wall.position[0] + pos.x,
                    wall.position[1] + pos.y,
                    wall.position[2]
                ];
            } else if (wallIndex === 2) {
                // 左牆：X軸在牆面位置
                finalPosition = [
                    wall.position[0],
                    wall.position[1] + pos.y,
                    wall.position[2] + pos.x  // 注意：左牆上，pos.x對應Z軸
                ];
            } else {
                // 右牆：X軸在牆面位置
                finalPosition = [
                    wall.position[0],
                    wall.position[1] + pos.y,
                    wall.position[2] - pos.x  // 注意：右牆上，pos.x對應Z軸（反向）
                ];
            }
            
            console.log(`創建照片 ${photoIndex} (牆面索引 ${i}) 在 ${wall.name}，位置:`, finalPosition, '牆面位置:', wall.position);
            
            // 驗證位置是否在合理範圍內
            const maxDistance = Math.max(ROOM_WIDTH, ROOM_DEPTH) / 2 + 1;
            if (Math.abs(finalPosition[0]) > maxDistance || 
                Math.abs(finalPosition[1]) > ROOM_HEIGHT || 
                Math.abs(finalPosition[2]) > maxDistance) {
                console.warn(`照片 ${photoIndex} 位置可能超出範圍！`, finalPosition);
            }
            
            try {
                console.log(`[${photoIndex + 1}/${totalPhotos}] 正在加載照片 ${photoIndex}...`);
                await createPhotoFrame(photo, finalPosition, wall.rotation);
                successCount++;
                photoProcessed[photoIndex] = true; // 標記為已處理
                console.log(`✓ 照片 ${photoIndex} 創建成功，當前總數: ${photoFrames.length}, 成功: ${successCount}, 失敗: ${failCount}`);
            } catch (error) {
                failCount++;
                console.error(`✗ 創建照片相框失敗 (照片 ${photoIndex}):`, error);
                console.error('失敗的照片信息:', {
                    id: photo?.id,
                    hasFile: !!photo?.file,
                    hasThumbnail: !!photo?.thumbnail,
                    metadata: photo?.metadata
                });
                
                // 嘗試使用原圖重新創建（如果之前使用的是縮圖）
                if (photo.thumbnail && photo.file && photo.thumbnail !== photo.file) {
                    console.log(`嘗試使用原圖重新創建照片 ${photoIndex}`);
                    try {
                        // 創建一個臨時照片對象，使用原圖
                        const photoWithOriginal = { ...photo, thumbnail: photo.file };
                        await createPhotoFrame(photoWithOriginal, finalPosition, wall.rotation);
                        successCount++;
                        failCount--; // 減少失敗計數
                        photoProcessed[photoIndex] = true; // 標記為已處理
                        console.log(`使用原圖重新創建照片 ${photoIndex} 成功`);
                    } catch (retryError) {
                        console.error(`使用原圖重新創建照片 ${photoIndex} 仍然失敗:`, retryError);
                    }
                }
                // 即使失敗也繼續處理下一張照片
            }
            
            photoIndex++;
        }
        
        console.log(`${wall.name} 處理完成，預期處理 ${photoCount} 張照片，實際處理 ${wallPhotos.length} 張，當前總照片數: ${photoFrames.length}，photoIndex: ${photoIndex}`);
    }
    
    // 檢查是否有照片未被處理
    const unprocessedPhotos = [];
    for (let i = 0; i < photos.length; i++) {
        if (!photoProcessed[i]) {
            unprocessedPhotos.push(i);
        }
    }
    
    if (unprocessedPhotos.length > 0) {
        console.error(`發現 ${unprocessedPhotos.length} 張照片未被處理！索引:`, unprocessedPhotos);
        // 強制處理未處理的照片
        for (const unprocessedIndex of unprocessedPhotos) {
            const photo = photos[unprocessedIndex];
            if (!photo) continue;
            
            // 找到一個有空間的牆面
            let targetWall = null;
            let targetWallIndex = -1;
            for (let w = 0; w < walls.length; w++) {
                const wall = walls[w];
                // 簡單計算該牆面可以容納的照片數
                const maxPhotos = Math.floor((wall.width - 3) / (PHOTO_WIDTH + PHOTO_SPACING)) * 
                                 Math.floor((WALL_HEIGHT - 3) / (PHOTO_HEIGHT + PHOTO_SPACING));
                const currentPhotosOnWall = photoFrames.filter(f => {
                    // 簡單判斷照片是否屬於該牆面
                    const pos = f.position || (f.children[0]?.position);
                    if (!pos) return false;
                    const wallX = wall.position[0];
                    const wallZ = wall.position[2];
                    const dist = Math.sqrt(Math.pow(pos.x - wallX, 2) + Math.pow(pos.z - wallZ, 2));
                    return dist < 2;
                }).length;
                
                if (currentPhotosOnWall < maxPhotos) {
                    targetWall = wall;
                    targetWallIndex = w;
                    break;
                }
            }
            
            if (targetWall) {
                // 計算該牆面上的新位置
                const positions = calculatePhotoPositions(1, targetWall.width);
                if (positions.length > 0) {
                    const pos = positions[0];
                    let finalPosition;
                    if (targetWallIndex === 0 || targetWallIndex === 1) {
                        finalPosition = [
                            targetWall.position[0] + pos.x,
                            targetWall.position[1] + pos.y,
                            targetWall.position[2]
                        ];
                    } else {
                        finalPosition = [
                            targetWall.position[0],
                            targetWall.position[1] + pos.y,
                            targetWall.position[2] + pos.x
                        ];
                    }
                    
                    try {
                        await createPhotoFrame(photo, finalPosition, targetWall.rotation);
                        successCount++;
                        photoProcessed[unprocessedIndex] = true;
                        console.log(`強制處理未處理的照片 ${unprocessedIndex}，成功添加到 ${targetWall.name}`);
                    } catch (error) {
                        console.error(`強制處理照片 ${unprocessedIndex} 失敗:`, error);
                    }
                }
            }
        }
    }
    
    // 檢查是否所有照片都被處理
    console.log(`照片處理完成，總照片數: ${photos.length}, 處理的索引範圍: 0-${photoIndex - 1}, 應該處理: ${photoIndex} 張`);
    console.log(`已處理照片數: ${photoProcessed.filter(p => p).length}, 未處理照片數: ${photoProcessed.filter(p => !p).length}`);
    
    // 檢查是否有照片未被處理
    const unprocessedIndices = [];
    for (let i = 0; i < photos.length; i++) {
        if (!photoProcessed[i]) {
            unprocessedIndices.push(i);
        }
    }
    
    if (unprocessedIndices.length > 0) {
        console.error(`發現 ${unprocessedIndices.length} 張照片未被處理！索引:`, unprocessedIndices);
    }
    
    if (photoIndex < photos.length) {
        console.error(`還有 ${photos.length - photoIndex} 張照片沒有被處理！`);
        console.log('未處理的照片索引:', Array.from({ length: photos.length - photoIndex }, (_, i) => photoIndex + i));
        
        // 將剩餘的照片按順序分配到各個牆面，確保所有照片都能顯示
        const remainingPhotos = photos.slice(photoIndex);
        console.log(`將剩餘的 ${remainingPhotos.length} 張照片分配到各個牆面`);
        
        // 按順序分配到各個牆面，確保所有照片都能顯示
            for (let i = 0; i < remainingPhotos.length; i++) {
                const photo = remainingPhotos[i];
            if (!photo) {
                photoIndex++;
                continue;
            }
            
            // 輪流分配到各個牆面
            const targetWallIndex = i % walls.length;
            const targetWall = walls[targetWallIndex];
            
            // 計算該牆面上已有的照片數（根據分配方案）
            const basePhotosOnThisWall = wallPhotoCounts[targetWallIndex] || 0;
            const additionalPhotosOnThisWall = Math.floor(i / walls.length);
            const photosOnThisWall = basePhotosOnThisWall + additionalPhotosOnThisWall;
            
            // 計算該牆面總共需要顯示的照片數
            const totalPhotosOnThisWall = photosOnThisWall + 1;
            
            // 計算位置
            const positions = calculatePhotoPositions(totalPhotosOnThisWall, targetWall.width);
            const positionIndex = photosOnThisWall;
            
            if (positionIndex < positions.length) {
                const pos = positions[positionIndex];
                let finalPosition;
                
                if (targetWallIndex === 0) {
                    // 前牆
                    finalPosition = [
                        targetWall.position[0] + pos.x,
                        targetWall.position[1] + pos.y,
                        targetWall.position[2]
                    ];
                } else if (targetWallIndex === 1) {
                    // 後牆
                    finalPosition = [
                        targetWall.position[0] + pos.x,
                        targetWall.position[1] + pos.y,
                        targetWall.position[2]
                    ];
                } else {
                    // 左牆
                    finalPosition = [
                        targetWall.position[0],
                        targetWall.position[1] + pos.y,
                        targetWall.position[2] + pos.x
                    ];
                }
                
                console.log(`補處理照片 ${photoIndex}，分配到 ${targetWall.name}，位置: (${finalPosition[0].toFixed(2)}, ${finalPosition[1].toFixed(2)}, ${finalPosition[2].toFixed(2)})`);
                
                try {
                    await createPhotoFrame(photo, finalPosition, targetWall.rotation);
                        successCount++;
                        console.log(`補處理照片 ${photoIndex} 創建成功`);
                    } catch (error) {
                        failCount++;
                        console.error(`補處理照片 ${photoIndex} 失敗:`, error);
                    }
            } else {
                // 如果位置不足，使用最後一個位置並偏移
                const lastPos = positions[positions.length - 1] || { x: 0, y: 0 };
                const offset = (positionIndex - positions.length + 1) * (PHOTO_WIDTH + PHOTO_SPACING);
                
                let finalPosition;
                if (targetWallIndex === 0 || targetWallIndex === 1) {
                    finalPosition = [
                        targetWall.position[0] + lastPos.x + offset,
                        targetWall.position[1] + lastPos.y,
                        targetWall.position[2]
                    ];
                } else {
                    finalPosition = [
                        targetWall.position[0],
                        targetWall.position[1] + lastPos.y,
                        targetWall.position[2] + lastPos.x + offset
                    ];
                }
                
                console.log(`補處理照片 ${photoIndex}（使用偏移位置），最終位置=(${finalPosition[0].toFixed(2)}, ${finalPosition[1].toFixed(2)}, ${finalPosition[2].toFixed(2)})`);
                
                try {
                    await createPhotoFrame(photo, finalPosition, targetWall.rotation);
                    successCount++;
                    console.log(`補處理照片 ${photoIndex} 創建成功（使用偏移位置）`);
                } catch (error) {
                    failCount++;
                    console.error(`補處理照片 ${photoIndex} 失敗:`, error);
                }
            }
            
            photoIndex++;
        }
    }
    
    console.log('所有照片載入完成');
    console.log('預期照片數:', totalPhotos);
    console.log('實際創建的照片數:', photoFrames.length);
    console.log('成功創建:', successCount, '失敗:', failCount);
    console.log('處理的照片索引範圍: 0 到', photoIndex - 1);
    
    // 詳細日誌：列出所有照片的狀態
    console.log('=== 照片載入詳細報告 ===');
    console.log('照片分配方案:', wallPhotoCounts);
    console.log('照片數組長度:', photos.length);
    console.log('photoFrames數組長度:', photoFrames.length);
    photos.forEach((photo, idx) => {
        // 檢查照片是否在photoFrames中（通過ID或照片對象匹配）
        const found = photoFrames.some(frame => {
            if (!frame.userData) return false;
            return (frame.userData.photoId === photo?.id) || 
                   (frame.userData.photo === photo);
        });
        console.log(`照片 ${idx}: ${found ? '✓ 已顯示' : '✗ 未顯示'}`, {
            id: photo?.id,
            hasFile: !!photo?.file,
            hasThumbnail: !!photo?.thumbnail,
            fileSize: photo?.file?.size || photo?.thumbnail?.size || 0
        });
        
        // 如果照片未顯示，記錄詳細信息
        if (!found) {
            console.warn(`照片 ${idx} 未顯示！`, {
                photoId: photo?.id,
                hasFile: !!photo?.file,
                hasThumbnail: !!photo?.thumbnail,
                fileType: photo?.file?.type || photo?.thumbnail?.type,
                fileSize: photo?.file?.size || photo?.thumbnail?.size
            });
        }
    });
    console.log('=== 報告結束 ===');
    
    // 統計每面牆的照片數量
    const wallCounts = [0, 0, 0, 0];
    photoFrames.forEach(frame => {
        if (frame.userData && frame.userData.wallIndex !== undefined) {
            const wallIdx = frame.userData.wallIndex;
            if (wallIdx >= 0 && wallIdx < 4) {
                wallCounts[wallIdx]++;
            }
        }
    });
    console.log(`=== 照片顯示統計 ===`);
    console.log(`總照片數: ${totalPhotos}`);
    console.log(`實際顯示: ${photoFrames.length}`);
    console.log(`前牆: ${wallCounts[0]} 張`);
    console.log(`後牆: ${wallCounts[1]} 張`);
    console.log(`左牆: ${wallCounts[2]} 張`);
    console.log(`右牆: ${wallCounts[3]} 張`);
    console.log(`成功: ${successCount}, 失敗: ${failCount}`);
    
    if (photoFrames.length !== totalPhotos) {
        console.warn(`⚠️ 照片數量不匹配！預期: ${totalPhotos}, 實際: ${photoFrames.length}`);
        console.warn(`成功: ${successCount}, 失敗: ${failCount}, 處理的索引: 0-${photoIndex - 1}`);
        console.log('照片分配方案:', wallPhotoCounts);
        console.log('照片數組長度:', photos.length);
        
        // 檢查是否有照片沒有被處理
        if (photoIndex < photos.length) {
            console.warn(`還有 ${photos.length - photoIndex} 張照片沒有被處理！`);
            console.log('未處理的照片索引:', Array.from({ length: photos.length - photoIndex }, (_, i) => photoIndex + i));
        }
        
        // 如果照片數量不匹配，嘗試重新加載失敗的照片
        if (photoFrames.length < totalPhotos && failCount > 0) {
            console.log(`嘗試重新加載 ${failCount} 張失敗的照片...`);
            // 這裡可以添加重試邏輯，但為了避免無限循環，暫時只記錄
        }
    } else {
        console.log(`✓ 所有 ${totalPhotos} 張照片都已成功載入！`);
        console.log(`✓ 前牆: ${wallCounts[0]} 張, 後牆: ${wallCounts[1]} 張, 左牆: ${wallCounts[2]} 張`);
    }
}

/**
 * 計算照片位置 - 完全重寫，簡單可靠的方法
 * 確保照片嚴格在牆體內，不重疊，有足夠間距
 */
function calculatePhotoPositions(count, wallWidth) {
    if (count === 0) return [];
    
    // 安全邊距：確保照片邊緣不會超出牆體
    const safeMargin = 1.2; // 較大的安全邊距
    const photoHalfWidth = PHOTO_WIDTH / 2;
    const photoHalfHeight = PHOTO_HEIGHT / 2;
    
    // 計算牆體的實際可用邊界（從中心到邊緣的距離）
    const wallLeftBound = -wallWidth / 2 + photoHalfWidth + safeMargin;
    const wallRightBound = wallWidth / 2 - photoHalfWidth - safeMargin;
    const wallTopBound = WALL_HEIGHT / 2 - photoHalfHeight - safeMargin;
    const wallBottomBound = -WALL_HEIGHT / 2 + photoHalfHeight + safeMargin;
    
    // 計算可用空間
    const availableWidth = wallRightBound - wallLeftBound;
    const availableHeight = wallTopBound - wallBottomBound;
    
    if (availableWidth <= 0 || availableHeight <= 0) {
        console.error(`可用空間不足！牆寬: ${wallWidth}, 可用寬: ${availableWidth}, 可用高: ${availableHeight}`);
        return [];
    }
    
    // 照片間距（垂直方向使用更大的間距）
    const horizontalSpacing = PHOTO_SPACING;
    const verticalSpacing = PHOTO_SPACING * 1.5; // 垂直間距增加50%
    
    // 每張照片需要的空間
    const photoSpaceWidth = PHOTO_WIDTH + horizontalSpacing;
    const photoSpaceHeight = PHOTO_HEIGHT + verticalSpacing;
    
    // 計算最大可容納的列數和行數
    const maxCols = Math.max(1, Math.floor(availableWidth / photoSpaceWidth));
    const maxRows = Math.max(1, Math.floor(availableHeight / photoSpaceHeight));
    
    // 計算最佳的行列數 - 所有照片都在同一水平線上（單行顯示）
    let cols, rows;
    
    // 強制使用單行布局，確保所有照片在同一水平線上
    rows = 1; // 固定為1行
    cols = count; // 列數等於照片數量
    
    // 確保不超過最大列數限制
    if (cols > maxCols) {
        console.warn(`照片數量 ${count} 超過最大列數 ${maxCols}，需要調整`);
        // 如果照片太多，仍然使用單行，但調整間距
        cols = maxCols;
        // 注意：如果照片數量超過最大列數，可能需要調整照片大小或間距
    }
    
    cols = Math.min(cols, maxCols);
    rows = 1; // 強制保持1行
    
    // 確保能容納所有照片（單行布局，只增加列數）
    // 由於強制使用單行，只需要確保列數足夠
    if (cols < count && cols < maxCols) {
        // 如果照片數量超過當前列數，嘗試增加列數（但保持單行）
        cols = Math.min(count, maxCols);
    }
    
    // 如果照片數量超過最大列數，發出警告
    if (count > maxCols) {
        console.warn(`照片數量 ${count} 超過最大列數 ${maxCols}，可能無法完全顯示在同一行`);
    }
    
    // 計算實際使用的寬度和高度
    const totalWidth = cols * PHOTO_WIDTH + (cols - 1) * horizontalSpacing;
    const totalHeight = rows * PHOTO_HEIGHT + (rows - 1) * verticalSpacing;
    
    // 確保不超過可用空間
    if (totalWidth > availableWidth) {
        cols = Math.max(1, Math.floor(availableWidth / photoSpaceWidth));
        rows = Math.ceil(count / cols);
    }
    if (totalHeight > availableHeight) {
        rows = Math.max(1, Math.floor(availableHeight / photoSpaceHeight));
        cols = Math.ceil(count / rows);
    }
    
    // 重新計算實際使用的寬度和高度
    const finalTotalWidth = cols * PHOTO_WIDTH + (cols - 1) * horizontalSpacing;
    const finalTotalHeight = rows * PHOTO_HEIGHT + (rows - 1) * verticalSpacing;
    
    // 計算起始位置（居中對齊，但確保在牆體內）
    // 使用固定的計算方式，確保相同數量的照片總是得到相同的位置
    const centerX = (wallLeftBound + wallRightBound) / 2;
    const centerY = (wallTopBound + wallBottomBound) / 2;
    
    // 從中心開始，水平居中，垂直居中（單行布局，所有照片在同一水平線上）
    let startX = centerX - finalTotalWidth / 2 + photoHalfWidth;
    let startY = centerY; // 單行布局，Y軸居中，所有照片在同一水平線
    
    // 確保不超出邊界
    if (startX - photoHalfWidth < wallLeftBound) {
        startX = wallLeftBound + photoHalfWidth;
    }
    if (startX + (cols - 1) * photoSpaceWidth + photoHalfWidth > wallRightBound) {
        startX = wallRightBound - (cols - 1) * photoSpaceWidth - photoHalfWidth;
    }
    // 單行布局，只需確保Y軸在範圍內
    if (startY + photoHalfHeight > wallTopBound) {
        startY = wallTopBound - photoHalfHeight;
    }
    if (startY - photoHalfHeight < wallBottomBound) {
        startY = wallBottomBound + photoHalfHeight;
    }
    
    // 生成位置數組 - 所有照片在同一水平線上，間距完全一致
    const positions = [];
    
    // 計算實際需要的總寬度（照片寬度 + 間距）
    const actualTotalWidth = count * PHOTO_WIDTH + (count - 1) * horizontalSpacing;
    
    // 重新計算起始X位置，確保所有照片居中且間距一致
    let calculatedStartX = centerX - actualTotalWidth / 2 + photoHalfWidth;
    
    // 確保不超出邊界
    if (calculatedStartX - photoHalfWidth < wallLeftBound) {
        calculatedStartX = wallLeftBound + photoHalfWidth;
    }
    const rightmostX = calculatedStartX + (count - 1) * photoSpaceWidth + photoHalfWidth;
    if (rightmostX > wallRightBound) {
        calculatedStartX = wallRightBound - (count - 1) * photoSpaceWidth - photoHalfWidth;
    }
    
    // 所有照片使用相同的Y座標（同一水平線）
    // 稍微偏下一點，避免太高
    const fixedY = centerY - 0.5; // 從垂直中心稍微向下偏移0.5單位
    // 確保Y座標在牆體內
    const finalY = Math.max(wallBottomBound + photoHalfHeight, 
                           Math.min(wallTopBound - photoHalfHeight, fixedY));
    
    // 生成位置，確保間距完全一致
    for (let i = 0; i < count; i++) {
        // X座標：從起始位置開始，每個照片間隔 photoSpaceWidth（完全一致的間距）
        const x = calculatedStartX + i * photoSpaceWidth;
        
        // Y座標：所有照片都相同（同一水平線）
        const y = finalY;
        
        // 最終驗證：確保在牆體內
        const finalX = Math.max(wallLeftBound + photoHalfWidth, 
                                Math.min(wallRightBound - photoHalfWidth, x));
        
        positions.push({ x: finalX, y: y });
    }
    
    // 驗證所有照片Y座標是否相同
    const firstY = positions[0]?.y;
    const allSameY = positions.every(pos => Math.abs(pos.y - firstY) < 0.01);
    if (!allSameY) {
        console.warn('⚠️ 照片Y座標不一致，強制統一');
        positions.forEach(pos => pos.y = finalY);
    }
    
    // 驗證間距是否一致
    for (let i = 1; i < positions.length; i++) {
        const spacing = positions[i].x - positions[i-1].x;
        const expectedSpacing = photoSpaceWidth;
        if (Math.abs(spacing - expectedSpacing) > 0.01) {
            console.warn(`照片 ${i-1} 和 ${i} 間距不一致: ${spacing.toFixed(2)} vs ${expectedSpacing.toFixed(2)}`);
            // 強制調整為一致間距
            positions[i].x = positions[i-1].x + expectedSpacing;
        }
    }
    
    // 驗證所有位置都在牆體內且不重疊
    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const left = pos.x - photoHalfWidth;
        const right = pos.x + photoHalfWidth;
        const top = pos.y + photoHalfHeight;
        const bottom = pos.y - photoHalfHeight;
        
        // 強制確保在牆體內
        if (left < wallLeftBound) {
            pos.x = wallLeftBound + photoHalfWidth;
            console.warn(`照片 ${i} 左邊緣超出，調整到: ${pos.x.toFixed(2)}`);
        }
        if (right > wallRightBound) {
            pos.x = wallRightBound - photoHalfWidth;
            console.warn(`照片 ${i} 右邊緣超出，調整到: ${pos.x.toFixed(2)}`);
        }
        if (top > wallTopBound) {
            pos.y = wallTopBound - photoHalfHeight;
            console.warn(`照片 ${i} 上邊緣超出，調整到: ${pos.y.toFixed(2)}`);
        }
        if (bottom < wallBottomBound) {
            pos.y = wallBottomBound + photoHalfHeight;
            console.warn(`照片 ${i} 下邊緣超出，調整到: ${pos.y.toFixed(2)}`);
        }
        
        // 檢查與其他照片的重疊（單行布局，只需檢查X方向間距）
        for (let j = i + 1; j < positions.length; j++) {
            const otherPos = positions[j];
            const dx = Math.abs(pos.x - otherPos.x);
            const dy = Math.abs(pos.y - otherPos.y);
            
            // 檢查Y座標是否相同（應該完全相同）
            if (dy > 0.01) {
                console.warn(`照片 ${i} 和 ${j} Y座標不一致: ${pos.y.toFixed(2)} vs ${otherPos.y.toFixed(2)}，強制統一`);
                otherPos.y = pos.y; // 強制統一Y座標
            }
            
            // 檢查X方向間距是否一致
            if (j === i + 1) { // 只檢查相鄰的照片
                const expectedSpacing = photoSpaceWidth;
                if (Math.abs(dx - expectedSpacing) > 0.01) {
                    console.warn(`照片 ${i} 和 ${j} 間距不一致: ${dx.toFixed(2)} vs ${expectedSpacing.toFixed(2)}，調整為一致間距`);
                    // 強制調整為一致間距
                    if (otherPos.x > pos.x) {
                        otherPos.x = pos.x + expectedSpacing;
                    } else {
                        otherPos.x = pos.x - expectedSpacing;
                    }
                    // 確保不超出邊界
                    otherPos.x = Math.max(wallLeftBound + photoHalfWidth, 
                                         Math.min(wallRightBound - photoHalfWidth, otherPos.x));
                }
            }
        }
    }
    
    console.log(`布局計算：${count}張照片，${cols}列 x ${rows}行`);
    console.log(`牆體邊界: 左=${wallLeftBound.toFixed(2)}, 右=${wallRightBound.toFixed(2)}, 上=${wallTopBound.toFixed(2)}, 下=${wallBottomBound.toFixed(2)}`);
    console.log(`起始位置: startX=${startX.toFixed(2)}, startY=${startY.toFixed(2)}`);
    console.log(`位置數量: ${positions.length}, 照片數量: ${count}`);
    
    // 驗證位置數量，確保與照片數量一致
    if (positions.length !== count) {
        console.error(`⚠️ 位置數量不匹配！需要: ${count}, 實際: ${positions.length}`);
        // 強制修正
        while (positions.length < count) {
            const lastIdx = positions.length;
            const col = lastIdx % cols;
            const row = Math.floor(lastIdx / cols);
            positions.push({
                x: startX + col * photoSpaceWidth,
                y: startY - row * photoSpaceHeight
            });
        }
        if (positions.length > count) {
            positions.splice(count);
        }
        console.log(`已修正位置數量到: ${positions.length}`);
    }
    
    // 輸出所有位置的詳細信息（用於調試和驗證位置固定性）
    if (count <= 10) {
        positions.forEach((pos, idx) => {
            console.log(`  照片位置 ${idx}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
        });
    }
    
    return positions;
}

/**
 * 创建照片相框
 */
async function createPhotoFrame(photo, position, rotation) {
    return new Promise((resolve, reject) => {
        // 检查照片对象
        if (!photo) {
            console.error('照片對象為空');
            reject(new Error('照片對象為空'));
            return;
        }

        // 檢查照片文件 - 優先使用縮圖，如果沒有則使用原圖
        let imageBlob = photo.thumbnail || photo.file;
        if (!imageBlob) {
            console.error('照片沒有文件或縮圖', {
                id: photo?.id,
                hasFile: !!photo?.file,
                hasThumbnail: !!photo?.thumbnail,
                keys: Object.keys(photo || {})
            });
            reject(new Error('照片沒有文件或縮圖'));
            return;
        }
        
        // 確保imageBlob是Blob對象
        if (!(imageBlob instanceof Blob)) {
            console.error('照片文件不是Blob對象', {
                id: photo?.id,
                imageBlobType: typeof imageBlob,
                imageBlob: imageBlob
            });
            reject(new Error('照片文件格式錯誤'));
            return;
        }
        
        console.log(`開始創建照片相框，照片ID: ${photo?.id}, 文件大小: ${imageBlob.size}, 文件類型: ${imageBlob.type}`);

        // 創建精美的相框 - 帶有裝飾效果
        // 外框（較厚，作為裝飾）
        const outerFrameGeometry = new THREE.BoxGeometry(PHOTO_WIDTH + 0.1, PHOTO_HEIGHT + 0.1, PHOTO_FRAME_DEPTH * 0.3);
        const outerFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a, // 深黑色外框
            roughness: 0.2,
            metalness: 0.4
        });
        const outerFrame = new THREE.Mesh(outerFrameGeometry, outerFrameMaterial);
        outerFrame.position.set(...position);
        outerFrame.rotation.set(...rotation);
        outerFrame.castShadow = true;
        outerFrame.receiveShadow = true;
        
        // 內框（主要相框）
        const frameGeometry = new THREE.BoxGeometry(PHOTO_WIDTH, PHOTO_HEIGHT, PHOTO_FRAME_DEPTH);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a, // 深灰色，更優雅
            roughness: 0.15, // 更光滑
            metalness: 0.35 // 增加金屬感
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(...position);
        frame.rotation.set(...rotation);
        frame.castShadow = true;
        frame.receiveShadow = true;

        // 創建照片平面 - 精美的內邊距設計
        const photoInset = 0.12; // 優雅的內邊距
        const photoGeometry = new THREE.PlaneGeometry(
            PHOTO_WIDTH - photoInset * 2, 
            PHOTO_HEIGHT - photoInset * 2
        );
        
        // 載入紋理 - 改進的加載邏輯
        const textureLoader = new THREE.TextureLoader();
        let imageUrl = null;
        
        // 驗證Blob是否有效
        if (imageBlob.size === 0) {
            console.error('照片文件大小為0，無法加載');
            reject(new Error('照片文件大小為0'));
            return;
        }
        
        try {
            imageUrl = URL.createObjectURL(imageBlob);
            console.log('createPhotoFrame: 創建圖片URL', imageUrl, '文件大小:', imageBlob.size, '文件類型:', imageBlob.type);
        } catch (urlError) {
            console.error('創建圖片URL失敗:', urlError);
            reject(new Error('創建圖片URL失敗'));
            return;
        }
        
        // 添加超时机制，避免卡住
        const timeout = 15000; // 增加到15秒超时
        const timeoutId = setTimeout(() => {
            if (imageUrl) {
                console.error('照片加載超時:', imageUrl);
                URL.revokeObjectURL(imageUrl);
            }
            if (!isResolved) {
                isResolved = true;
                reject(new Error('照片加載超時'));
            }
        }, timeout);
        
        let isResolved = false;
        
        textureLoader.load(
            imageUrl,
            (texture) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);
                
                // 驗證紋理是否有效
                if (!texture || !texture.image) {
                    console.error('紋理加載失敗：紋理或圖片無效');
                    URL.revokeObjectURL(imageUrl);
                    reject(new Error('紋理加載失敗：紋理無效'));
                    return;
                }
                
                // 驗證圖片尺寸
                if (texture.image.width === 0 || texture.image.height === 0) {
                    console.error('紋理加載失敗：圖片尺寸為0');
                    texture.dispose();
                    URL.revokeObjectURL(imageUrl);
                    reject(new Error('紋理加載失敗：圖片尺寸為0'));
                    return;
                }
                
                console.log('紋理加載成功:', imageUrl, '圖片尺寸:', texture.image.width, 'x', texture.image.height);
                
                // 優化紋理設置
                try {
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.format = THREE.RGBAFormat;
                    texture.flipY = true; // 修正：Three.js默認需要flipY=true來正確顯示圖片
                    texture.needsUpdate = true;
                    
                    // 強制更新紋理
                    texture.updateMatrix();
                } catch (textureError) {
                    console.error('設置紋理屬性失敗:', textureError);
                }
                
                // 創建精美的照片材質，帶有科技感光澤
                const photoMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    roughness: 0.05, // 非常光滑
                    metalness: 0.1,
                    emissive: 0x001122, // 輕微藍色發光
                    emissiveIntensity: 0.1,
                    envMapIntensity: 0.4,
                    transparent: false, // 改為不透明，確保圖片顯示
                    opacity: 1 // 完全不透明
                });
                
                // 確保材質正確設置
                photoMaterial.needsUpdate = true;
                
                const photoMesh = new THREE.Mesh(photoGeometry, photoMaterial);
                
                // 驗證mesh創建成功
                if (!photoMesh || !photoMesh.material || !photoMesh.material.map) {
                    console.error('照片mesh創建失敗');
                    texture.dispose();
                    photoMaterial.dispose();
                    URL.revokeObjectURL(imageUrl);
                    reject(new Error('照片mesh創建失敗'));
                    return;
                }
                
                // 根據牆面旋轉角度，正確設置照片位置，確保照片朝向房間內部
                // 增加偏移距離，確保照片不會重疊
                const zOffset = PHOTO_FRAME_DEPTH / 2 + 0.025;
                
                // 初始化位置
                photoMesh.position.set(position[0], position[1], position[2]);
                
                // 根據旋轉角度調整位置，確保照片緊貼牆面並朝向房間內部
                const tolerance = 0.01;
                if (Math.abs(rotation[1]) < tolerance) {
                    // 前牆：rotation[1] = 0，照片向前（正Z方向），緊貼牆面
                    photoMesh.position.z = position[2] + zOffset;
                    photoMesh.position.x = position[0];
                    photoMesh.position.y = position[1];
                } else if (Math.abs(rotation[1] - Math.PI) < tolerance) {
                    // 後牆：rotation[1] = Math.PI，照片向前（負Z方向），緊貼牆面
                    photoMesh.position.z = position[2] - zOffset;
                    photoMesh.position.x = position[0];
                    photoMesh.position.y = position[1];
                } else if (Math.abs(rotation[1] - Math.PI / 2) < tolerance) {
                    // 左牆：rotation[1] = Math.PI/2，照片向前（正X方向），緊貼牆面
                    photoMesh.position.x = position[0] + zOffset;
                    photoMesh.position.y = position[1];
                    photoMesh.position.z = position[2];
                } else if (Math.abs(rotation[1] + Math.PI / 2) < tolerance) {
                    // 右牆：rotation[1] = -Math.PI/2，照片向前（負X方向），緊貼牆面
                    photoMesh.position.x = position[0] - zOffset;
                    photoMesh.position.y = position[1];
                    photoMesh.position.z = position[2];
                } else {
                    // 默認情況：使用Z偏移
                    photoMesh.position.z = position[2] + zOffset;
                    photoMesh.position.x = position[0];
                    photoMesh.position.y = position[1];
                }
                
                // 驗證照片位置是否在合理範圍內
                const maxDist = Math.max(ROOM_WIDTH, ROOM_DEPTH) / 2 + 2;
                if (Math.abs(photoMesh.position.x) > maxDist || 
                    Math.abs(photoMesh.position.y) > ROOM_HEIGHT + 2 || 
                    Math.abs(photoMesh.position.z) > maxDist) {
                    console.warn(`照片位置可能超出範圍！`, {
                        x: photoMesh.position.x,
                        y: photoMesh.position.y,
                        z: photoMesh.position.z,
                        rotation: rotation
                    });
                }
                
                photoMesh.rotation.set(...rotation);
                photoMesh.castShadow = true;
                photoMesh.receiveShadow = true;
                
                // 創建照片組，包含外框、內框和照片
                const group = new THREE.Group();
                group.add(outerFrame);
                group.add(frame);
                group.add(photoMesh);
                
                // 添加照片周圍的光暈效果（使用點光源）
                const photoLight = new THREE.PointLight(0xffffff, 0.3, 5);
                photoLight.position.set(position[0], position[1], position[2]);
                photoLight.castShadow = false;
                scene.add(photoLight);
                group.userData.photoLight = photoLight; // 保存光源引用以便後續管理
                // 保存照片索引和ID以便追踪
                group.userData.photoIndex = photoFrames.length; // 使用当前photoFrames长度作为索引
                group.userData.photoMaterial = photoMaterial; // 保存材質引用以便動畫
                group.userData.animationStartTime = Date.now(); // 記錄動畫開始時間
                group.userData.isAnimating = true; // 標記正在動畫
                group.userData.photoId = photo?.id; // 保存照片ID
                group.userData.photo = photo; // 保存照片对象引用
                
                scene.add(group);
                photoFrames.push(group);
                
                console.log(`照片相框已添加到場景，photoIndex: ${group.userData.photoIndex}, photoId: ${group.userData.photoId}, 當前photoFrames數量: ${photoFrames.length}`);
                
                // 添加照片周圍的科技感光暈
                const glowGeometry = new THREE.PlaneGeometry(
                    PHOTO_WIDTH + 0.2, 
                    PHOTO_HEIGHT + 0.2
                );
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.1,
                    side: THREE.DoubleSide
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.copy(photoMesh.position);
                glow.rotation.copy(photoMesh.rotation);
                glow.position.z += 0.01;
                group.add(glow);
                
                // 啟動疊化動畫（淡入效果）
                animatePhotoFadeIn(group, photoMaterial);
                
                console.log('照片相框創建成功，位置:', position);
                resolve();
            },
            (progress) => {
                // 加載進度
                if (progress.lengthComputable) {
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log('紋理加載進度:', percentComplete.toFixed(2) + '%');
                }
            },
            (error) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);
                
                console.error('載入紋理失敗:', error, '圖片URL:', imageUrl);
                console.error('照片對象:', {
                    id: photo?.id,
                    hasFile: !!photo?.file,
                    hasThumbnail: !!photo?.thumbnail,
                    fileSize: photo?.file?.size,
                    thumbnailSize: photo?.thumbnail?.size,
                    fileType: photo?.file?.type,
                    thumbnailType: photo?.thumbnail?.type
                });
                
                if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                }
                
                // 嘗試使用Canvas創建一個占位符圖片
                try {
                    console.log('嘗試創建占位符圖片');
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 384;
                    const ctx = canvas.getContext('2d');
                    
                    // 繪製灰色背景
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // 繪製文字提示
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '24px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('圖片加載失敗', canvas.width / 2, canvas.height / 2 - 20);
                    ctx.fillText('請重新上傳', canvas.width / 2, canvas.height / 2 + 20);
                    
                    // 創建紋理
                    const placeholderTexture = new THREE.CanvasTexture(canvas);
                    placeholderTexture.needsUpdate = true;
                    
                    const placeholderMaterial = new THREE.MeshStandardMaterial({
                        map: placeholderTexture,
                        side: THREE.DoubleSide,
                        transparent: false,
                        opacity: 1
                    });
                    
                    const placeholderPhoto = new THREE.Mesh(photoGeometry, placeholderMaterial);
                    placeholderPhoto.position.set(...position);
                    placeholderPhoto.rotation.set(...rotation);
                    
                    const group = new THREE.Group();
                    group.add(outerFrame);
                    group.add(frame);
                    group.add(placeholderPhoto);
                    scene.add(group);
                    photoFrames.push(group);
                    
                    console.log('已創建占位符相框');
                    resolve(); // 即使失敗也resolve，避免阻塞其他照片
                } catch (createError) {
                    console.error('創建占位符相框失敗:', createError);
                    reject(error);
                }
            }
        );
    });
}

/**
 * 设置射线检测
 */
function setupRaycaster() {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    const canvas = document.getElementById('galleryCanvas');
    canvas.addEventListener('click', onPhotoClick);
}

/**
 * 照片点击事件
 */
function onPhotoClick(event) {
    const canvas = document.getElementById('galleryCanvas');
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoFrames, true);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object.parent;
        if (clickedObject.userData.photoIndex !== undefined) {
            const index = clickedObject.userData.photoIndex;
            if (window.showFullscreen) {
                window.showFullscreen(index);
            }
        }
    }
}

/**
 * 照片疊化動畫 - 淡入效果
 */
function animatePhotoFadeIn(group, material) {
    // 動畫持續時間（毫秒）
    const duration = 800; // 0.8秒
    const startTime = Date.now();
    
    // 將動畫信息存儲在group中
    group.userData.fadeAnimation = {
        startTime: startTime,
        duration: duration,
        material: material,
        isActive: true
    };
}

/**
 * 更新照片動畫
 */
function updatePhotoAnimations() {
    if (!photoFrames || photoFrames.length === 0) return;
    
    const currentTime = Date.now();
    
    photoFrames.forEach((group, index) => {
        if (!group || !group.userData) return;
        
        const fadeAnim = group.userData.fadeAnimation;
        if (fadeAnim && fadeAnim.isActive && fadeAnim.material) {
            const elapsed = currentTime - fadeAnim.startTime;
            const progress = Math.min(elapsed / fadeAnim.duration, 1);
            
            // 使用緩動函數（ease-out）使動畫更自然
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            // 更新透明度：從0淡入到1
            fadeAnim.material.opacity = easedProgress;
            
            // 如果動畫完成，設置最終透明度並移除動畫標記
            if (progress >= 1) {
                fadeAnim.material.opacity = 1;
                fadeAnim.isActive = false;
                group.userData.isAnimating = false;
            }
        }
    });
}

/**
 * 更新展廳裝飾動畫
 */
function updateTechAnimations() {
    if (!techElements || techElements.length === 0) return;
    
    const time = Date.now() * 0.001; // 轉換為秒
    
    techElements.forEach((element) => {
        if (!element) return;
        
        // 聚光燈動畫（輕微呼吸效果）
        if (element.type === 'SpotLight') {
            const originalIntensity = element.userData.originalIntensity || 1.2;
            const offset = element.userData.animationOffset || 0;
            element.intensity = originalIntensity + Math.sin(time * 1.5 + offset) * 0.1;
        }
        
        // 點光源動畫（呼吸效果）
        if (element.type === 'PointLight') {
            const originalIntensity = element.userData.originalIntensity || 1;
            const offset = element.userData.animationOffset || 0;
            element.intensity = originalIntensity + Math.sin(time * 2 + offset) * 0.2;
        }
        
        // 發光球體動畫（輕微脈動）
        if (element.geometry && element.geometry.type === 'SphereGeometry' && element.material && element.material.emissive) {
            const originalIntensity = element.material.emissiveIntensity || 1;
            const offset = element.userData.animationOffset || 0;
            element.material.emissiveIntensity = originalIntensity + Math.sin(time * 2 + offset) * 0.2;
        }
        
        // 地面裝飾圓圈動畫（旋轉）
        if (element.geometry && element.geometry.type === 'RingGeometry' && !element.userData.originalRadius) {
            element.rotation.z += 0.001;
        }
        
        // 牆面光帶動畫（輕微亮度變化）
        if (element.geometry && element.geometry.type === 'PlaneGeometry' && element.material && element.material.opacity !== undefined && !element.userData.originalY) {
            const originalOpacity = element.userData.originalOpacity || element.material.opacity;
            const offset = element.userData.animationOffset || 0;
            element.material.opacity = originalOpacity + Math.sin(time * 1.5 + offset) * 0.05;
        }
        
        // 粒子系統動畫（移動）
        if (element.type === 'Points' && element.userData.velocities) {
            const positions = element.userData.positions;
            const velocities = element.userData.velocities;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
                
                // 邊界檢測和重置
                if (positions[i] > ROOM_WIDTH / 2 || positions[i] < -ROOM_WIDTH / 2) velocities[i] *= -1;
                if (positions[i + 1] > WALL_HEIGHT || positions[i + 1] < 0.5) velocities[i + 1] *= -1;
                if (positions[i + 2] > ROOM_DEPTH / 2 || positions[i + 2] < -ROOM_DEPTH / 2) velocities[i + 2] *= -1;
            }
            element.geometry.attributes.position.needsUpdate = true;
        }
        
        // 數據流線條動畫（垂直移動）
        if (element.type === 'Line' && element.userData.originalY) {
            const offset = element.userData.animationOffset || 0;
            const positions = element.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] = (positions[i] + 0.02) % WALL_HEIGHT;
            }
            element.geometry.attributes.position.needsUpdate = true;
        }
        
        // 懸浮裝飾物動畫（上下浮動和旋轉）
        if (element.geometry && element.geometry.type === 'TetrahedronGeometry') {
            const offset = element.userData.animationOffset || 0;
            element.position.y = element.userData.originalY + Math.sin(time * 1.5 + offset) * 0.3;
            element.rotation.y += 0.02;
            element.rotation.x += 0.01;
        }
        
        // 光環動畫（旋轉和脈動）
        if (element.geometry && element.geometry.type === 'RingGeometry' && element.userData.animationOffset !== undefined) {
            const offset = element.userData.animationOffset || 0;
            element.rotation.z += 0.01;
            element.rotation.y += 0.005;
            // 添加脈動效果
            if (element.material && element.material.opacity !== undefined) {
                const originalOpacity = element.userData.originalOpacity || element.material.opacity;
                element.material.opacity = originalOpacity + Math.sin(time * 2 + offset) * 0.2;
            }
        }
        
        // 科技感燈具組動畫（整體輕微浮動）
        if (element.type === 'Group' && element.children.length > 0) {
            // 檢查是否包含科技感燈具（通過檢查是否有發光核心）
            const hasTechLight = element.children.some(child => 
                child.material && child.material.emissive && child.material.emissiveIntensity > 1
            );
            if (hasTechLight && element.userData.originalY === undefined) {
                element.userData.originalY = element.position.y;
                element.userData.animationOffset = Math.random() * Math.PI * 2;
            }
            if (element.userData.originalY !== undefined) {
                const offset = element.userData.animationOffset || 0;
                element.position.y = element.userData.originalY + Math.sin(time * 1.5 + offset) * 0.05;
            }
        }
        
        // 掃描線動畫（上下移動）
        if (element.geometry && element.geometry.type === 'PlaneGeometry' && element.userData.originalY !== undefined && element.userData.animationOffset !== undefined) {
            const offset = element.userData.animationOffset || 0;
            element.position.y = element.userData.originalY + Math.sin(time * 2 + offset) * (WALL_HEIGHT * 0.4);
        }
        
        // 能量波紋動畫（擴散效果）
        if (element.geometry && element.geometry.type === 'RingGeometry' && element.userData.originalRadius !== undefined) {
            const offset = element.userData.animationOffset || 0;
            const scale = 1 + Math.sin(time * 1.5 + offset) * 0.3;
            element.scale.set(scale, scale, 1);
            element.material.opacity = 0.3 - (element.userData.originalRadius - 0.5) * 0.1 + Math.sin(time * 2 + offset) * 0.1;
        }
    });
}

/**
 * 動畫循環
 */
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // 檢查所有必要的組件是否存在
    if (!controls) {
        console.error('controls為null，無法更新');
        cancelAnimationFrame(animationId);
        return;
    }
    
    if (!renderer || !scene || !camera) {
        console.error('渲染組件不完整', {
            renderer: !!renderer,
            scene: !!scene,
            camera: !!camera
        });
        cancelAnimationFrame(animationId);
        return;
    }
    
    try {
        controls.update();
        
        // 更新照片疊化動畫
        updatePhotoAnimations();
        
        // 更新科技感裝飾動畫
        updateTechAnimations();
        
        renderer.render(scene, camera);
        
        // 只在第一次渲染時輸出日誌
        if (!animate.hasRendered) {
            const size = new THREE.Vector2();
            renderer.getSize(size);
            console.log('首次渲染完成', {
                sceneChildren: scene.children.length,
                photoFrames: photoFrames.length,
                rendererSize: `${size.width}x${size.height}`
            });
            animate.hasRendered = true;
        }
    } catch (error) {
        console.error('渲染錯誤:', error);
        cancelAnimationFrame(animationId);
    }
}

/**
 * 窗口大小调整
 */
function onWindowResize() {
    const canvas = document.getElementById('galleryCanvas');
    if (!canvas || !camera || !renderer) return;
    
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

/**
 * 重置视角
 */
function resetView() {
    if (camera && controls) {
        camera.position.set(0, 3.5, 2); // 與初始化時保持一致，在展廳內部
        controls.target.set(0, 3.2, 0);
        controls.update();
    }
}

/**
 * 銷毀3D場景
 */
function destroy3DGallery() {
    // 停止動畫循環
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    
    if (controls) {
        controls.dispose();
        controls = null;
    }
    
    if (scene) {
        // 清理照片相框
        photoFrames.forEach(frame => {
            scene.remove(frame);
            frame.traverse((child) => {
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
        
        // 清理科技感裝飾元素
        techElements.forEach(element => {
            scene.remove(element);
            if (element.geometry) element.geometry.dispose();
            if (element.material) {
                if (Array.isArray(element.material)) {
                    element.material.forEach(mat => mat.dispose());
                } else {
                    element.material.dispose();
                }
            }
        });
        
        scene = null;
    }
    
    photoFrames = [];
    techElements = [];
    particles = null;
    camera = null;
    raycaster = null;
    mouse = null;
    
    window.removeEventListener('resize', onWindowResize);
}

// 导出函数供外部调用
window.init3DGallery = init3DGallery;
window.destroy3DGallery = destroy3DGallery;
window.reset3DView = resetView;



