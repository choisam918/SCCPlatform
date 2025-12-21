// IndexedDB 存儲管理

const DB_NAME = 'CloudPicturePlatform';
const DB_VERSION = 1;

let db = null;

/**
 * 初始化數據庫
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('瀏覽器不支持IndexedDB'));
            return;
        }
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 創建 photos 對象存儲
            if (!db.objectStoreNames.contains('photos')) {
                const photosStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                photosStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }
            
            // 創建 metadata 對象存儲
            if (!db.objectStoreNames.contains('metadata')) {
                const metadataStore = db.createObjectStore('metadata', { keyPath: 'id' });
                metadataStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }
            
            // 創建 settings 對象存儲
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

/**
 * 獲取照片數量
 */
async function getPhotoCount() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.count();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * 獲取所有照片
 */
async function getAllPhotos() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readonly');
        const photosStore = transaction.objectStore('photos');
        const metadataStore = transaction.objectStore('metadata');
        
        const photosRequest = photosStore.getAll();
        const metadataRequest = metadataStore.getAll();
        
        let photos = [];
        let metadata = [];
        
        photosRequest.onsuccess = () => {
            photos = photosRequest.result;
            if (metadata.length > 0 || metadataRequest.readyState === 'done') {
                combineResults();
            }
        };
        
        metadataRequest.onsuccess = () => {
            metadata = metadataRequest.result;
            if (photos.length > 0 || photosRequest.readyState === 'done') {
                combineResults();
            }
        };
        
        function combineResults() {
            const result = photos.map(photo => {
                const meta = metadata.find(m => m.id === photo.id);
                return {
                    ...photo,
                    ...meta
                };
            });
            resolve(result);
        }
        
        photosRequest.onerror = () => reject(photosRequest.error);
        metadataRequest.onerror = () => reject(metadataRequest.error);
    });
}

/**
 * 保存照片
 */
async function savePhoto(photoFile, thumbnail, metadata) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');
        
        const photoData = {
            file: photoFile,
            thumbnail: thumbnail,
            uploadTime: Date.now(),
            fileSize: photoFile.size,
            width: metadata.width || 0,
            height: metadata.height || 0
        };
        
        const photosRequest = transaction.objectStore('photos').add(photoData);
        
        photosRequest.onsuccess = () => {
            const photoId = photosRequest.result;
            metadata.id = photoId;
            photoData.id = photoId;
            
            const metadataRequest = transaction.objectStore('metadata').add(metadata);
            
            metadataRequest.onsuccess = async () => {
                await updatePhotoCount();
                resolve(photoId);
            };
            
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        
        photosRequest.onerror = () => reject(photosRequest.error);
    });
}

/**
 * 更新照片計數
 */
async function updatePhotoCount() {
    if (!db) await initDB();
    
    const count = await getPhotoCount();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        
        const getRequest = store.get('system');
        
        getRequest.onsuccess = () => {
            const settings = getRequest.result || { key: 'system', value: {} };
            settings.value.currentCount = count;
            settings.value.lastUpdate = Date.now();
            
            const putRequest = store.put(settings);
            
            putRequest.onsuccess = () => resolve(count);
            putRequest.onerror = () => reject(putRequest.error);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * 清除所有照片
 */
async function clearAllPhotos() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');
        
        const photosRequest = transaction.objectStore('photos').clear();
        const metadataRequest = transaction.objectStore('metadata').clear();
        
        let photosDone = false;
        let metadataDone = false;
        
        function checkDone() {
            if (photosDone && metadataDone) {
                updatePhotoCount().then(() => resolve()).catch(reject);
            }
        }
        
        photosRequest.onsuccess = () => {
            photosDone = true;
            checkDone();
        };
        
        metadataRequest.onsuccess = () => {
            metadataDone = true;
            checkDone();
        };
        
        photosRequest.onerror = () => reject(photosRequest.error);
        metadataRequest.onerror = () => reject(metadataRequest.error);
    });
}

/**
 * 刪除單張照片
 */
async function deletePhoto(photoId) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readwrite');
        
        const photosRequest = transaction.objectStore('photos').delete(photoId);
        const metadataRequest = transaction.objectStore('metadata').delete(photoId);
        
        let photosDone = false;
        let metadataDone = false;
        
        function checkDone() {
            if (photosDone && metadataDone) {
                updatePhotoCount().then(() => resolve()).catch(reject);
            }
        }
        
        photosRequest.onsuccess = () => {
            photosDone = true;
            checkDone();
        };
        
        metadataRequest.onsuccess = () => {
            metadataDone = true;
            checkDone();
        };
        
        photosRequest.onerror = () => reject(photosRequest.error);
        metadataRequest.onerror = () => reject(metadataRequest.error);
    });
}

/**
 * 獲取設置
 */
async function getSettings() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('system');
        
        request.onsuccess = () => {
            const result = request.result;
            if (result && result.value) {
                resolve(result.value);
            } else {
                // 默認設置
                resolve({
                    maxPhotos: 12,
                    currentCount: 0,
                    theme: 'classic',
                    layout: '3d'
                });
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}
