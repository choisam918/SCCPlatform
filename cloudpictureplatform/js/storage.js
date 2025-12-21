// IndexedDB存儲管理

const DB_NAME = 'CloudPicturePlatform';
const DB_VERSION = 1;
const MAX_PHOTOS = 12; // 最大照片數量（全局常量）

let db = null;

/**
 * 初始化数据库
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        if (!checkIndexedDBSupport()) {
            reject(new Error('浏览器不支持IndexedDB'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB打开失败:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB初始化成功');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 创建photos对象存储
            if (!db.objectStoreNames.contains('photos')) {
                const photosStore = db.createObjectStore('photos', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                photosStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }

            // 创建metadata对象存储
            if (!db.objectStoreNames.contains('metadata')) {
                const metadataStore = db.createObjectStore('metadata', {
                    keyPath: 'id'
                });
                metadataStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }

            // 创建settings对象存储
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', {
                    keyPath: 'key'
                });
            }

            console.log('IndexedDB数据库结构创建完成');
        };
    });
}

/**
 * 获取设置
 */
async function getSettings() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const request = transaction.objectStore('settings').get('system');

        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.value : {
                maxPhotos: MAX_PHOTOS,
                currentCount: 0,
                theme: 'classic',
                layout: '3d'
            });
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * 更新设置
 */
async function updateSettings(settings) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const request = transaction.objectStore('settings').put({
            key: 'system',
            value: {
                ...settings,
                lastUpdate: Date.now()
            }
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
            metadata.uploadTime = Date.now();

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
 * 获取所有照片
 */
async function getAllPhotos() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readonly');
        const photosStore = transaction.objectStore('photos');
        const metadataStore = transaction.objectStore('metadata');

        const photos = [];
        let processed = 0;
        let total = 0;

        const countRequest = photosStore.count();
        countRequest.onsuccess = () => {
            total = countRequest.result;

            if (total === 0) {
                resolve([]);
                return;
            }

            const request = photosStore.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;

                if (cursor) {
                    const photoData = cursor.value;
                    const photoId = cursor.key; // 使用cursor.key作為照片ID（因為使用了autoIncrement）
                    
                    // 確保photoId存在
                    if (!photoId) {
                        console.error('照片ID不存在，跳過:', cursor);
                        cursor.continue();
                        return;
                    }
                    
                    const metadataRequest = metadataStore.get(photoId);

                    metadataRequest.onsuccess = () => {
                        try {
                            const metadata = metadataRequest.result || {};
                            photos.push({
                                ...photoData,
                                id: photoId, // 確保有id
                                metadata: metadata
                            });
                            processed++;

                            if (processed === total) {
                                photos.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));
                                resolve(photos);
                            }
                        } catch (error) {
                            console.error('處理照片數據失敗:', error, { photoId, photoData });
                            processed++;
                            if (processed === total) {
                                photos.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));
                                resolve(photos);
                            }
                        }
                    };

                    metadataRequest.onerror = () => {
                        console.warn('獲取metadata失敗，使用空metadata:', photoId);
                        // 即使metadata獲取失敗，也添加照片（使用空metadata）
                        try {
                            photos.push({
                                ...photoData,
                                id: photoId,
                                metadata: {}
                            });
                            processed++;

                            if (processed === total) {
                                photos.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));
                                resolve(photos);
                            }
                        } catch (error) {
                            console.error('處理照片數據失敗:', error, { photoId, photoData });
                            processed++;
                            if (processed === total) {
                                photos.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));
                                resolve(photos);
                            }
                        }
                    };

                    cursor.continue();
                } else {
                    // 如果沒有更多cursor，檢查是否所有照片都已處理
                    if (processed === total && total > 0) {
                        photos.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));
                        resolve(photos);
                    }
                }
            };

            request.onerror = () => reject(request.error);
        };
    });
}

/**
 * 根据ID获取照片
 */
async function getPhotoById(photoId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readonly');
        const photosStore = transaction.objectStore('photos');
        const metadataStore = transaction.objectStore('metadata');

        const photoRequest = photosStore.get(photoId);
        photoRequest.onsuccess = () => {
            if (!photoRequest.result) {
                resolve(null);
                return;
            }

            const metadataRequest = metadataStore.get(photoId);
            metadataRequest.onsuccess = () => {
                resolve({
                    ...photoRequest.result,
                    metadata: metadataRequest.result || {}
                });
            };
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        photoRequest.onerror = () => reject(photoRequest.error);
    });
}

/**
 * 删除照片
 */
async function deletePhoto(photoId) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');

        const photosRequest = transaction.objectStore('photos').delete(photoId);
        photosRequest.onsuccess = () => {
            const metadataRequest = transaction.objectStore('metadata').delete(photoId);
            metadataRequest.onsuccess = async () => {
                await updatePhotoCount();
                resolve();
            };
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        photosRequest.onerror = () => reject(photosRequest.error);
    });
}

/**
 * 更新照片计数
 */
async function updatePhotoCount() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'settings'], 'readwrite');
        const countRequest = transaction.objectStore('photos').count();

        countRequest.onsuccess = async () => {
            const currentCount = countRequest.result;
            const settings = await getSettings();
            await updateSettings({
                ...settings,
                currentCount: currentCount
            });
            resolve(currentCount);
        };

        countRequest.onerror = () => reject(countRequest.error);
    });
}

/**
 * 獲取照片數量
 */
async function getPhotoCount() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos'], 'readonly');
        const request = transaction.objectStore('photos').count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * 清除所有照片
 */
async function clearAllPhotos() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');
        
        // 清除所有照片
        const photosRequest = transaction.objectStore('photos').clear();
        photosRequest.onsuccess = () => {
            // 清除所有元數據
            const metadataRequest = transaction.objectStore('metadata').clear();
            metadataRequest.onsuccess = async () => {
                // 更新照片計數
                await updatePhotoCount();
                console.log('所有照片已清除');
                resolve();
            };
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        photosRequest.onerror = () => reject(photosRequest.error);
    });
}


