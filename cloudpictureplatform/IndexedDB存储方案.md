# IndexedDB存储方案（GitHub Pages兼容）

## 一、为什么使用IndexedDB

### 1.1 GitHub Pages限制
- **静态网站**：GitHub Pages只支持静态HTML/CSS/JavaScript
- **无后端支持**：无法使用服务器端存储
- **无数据库**：无法使用传统数据库

### 1.2 LocalStorage的限制
- **容量限制**：通常只有5-10MB，不适合存储图片
- **数据类型限制**：只能存储字符串，需要序列化
- **同步操作**：同步API可能阻塞主线程

### 1.3 IndexedDB的优势
- **大容量**：通常几百MB到几GB，足够存储20张照片
- **Blob支持**：可以直接存储二进制数据（照片文件）
- **结构化数据**：支持对象存储，无需序列化
- **异步操作**：不会阻塞主线程
- **事务支持**：保证数据一致性
- **GitHub Pages兼容**：纯前端API，无需服务器

---

## 二、数据库设计

### 2.1 数据库结构

```javascript
数据库名称: CloudPicturePlatform
数据库版本: 1

对象存储1: photos
  - keyPath: "id" (自增ID)
  - 索引: uploadTime (用于排序)
  - 值结构:
    {
      id: "photo_001",
      file: Blob,              // 照片文件数据
      thumbnail: Blob,        // 缩略图数据
      uploadTime: 1234567890,
      fileSize: 1024000,
      width: 1920,
      height: 1080
    }

对象存储2: metadata
  - keyPath: "id"
  - 索引: uploadTime, category, tags
  - 值结构:
    {
      id: "photo_001",
      filename: "IMG_001.jpg",
      originalName: "IMG_001.jpg",
      uploadTime: 1234567890,
      fileSize: 1024000,
      width: 1920,
      height: 1080,
      category: "风景",
      tags: ["自然", "风景"],
      description: "美丽的风景照"
    }

对象存储3: settings
  - keyPath: "key"
  - 值结构:
    {
      key: "system",
      value: {
        maxPhotos: 20,
        currentCount: 15,
        theme: "classic",
        layout: "3d",
        lastUpdate: 1234567890
      }
    }
```

### 2.2 数据关系

```
photos对象存储 (照片文件)
    │
    │ id (主键)
    └──► metadata对象存储 (元数据)
            │
            │ id (外键，关联photos)
            └──► 通过id关联，确保数据一致性
```

---

## 三、实现方案

### 3.1 数据库初始化

```javascript
// storage.js

const DB_NAME = 'CloudPicturePlatform';
const DB_VERSION = 1;

let db = null;

// 初始化数据库
function initDB() {
    return new Promise((resolve, reject) => {
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
                metadataStore.createIndex('category', 'category', { unique: false });
            }
            
            // 创建settings对象存储
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', {
                    keyPath: 'key'
                });
            }
        };
    });
}
```

### 3.2 照片存储

```javascript
// 保存照片
async function savePhoto(photoFile, thumbnail, metadata) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');
        
        // 保存照片文件
        const photoData = {
            file: photoFile,
            thumbnail: thumbnail,
            uploadTime: Date.now(),
            fileSize: photoFile.size,
            width: metadata.width,
            height: metadata.height
        };
        
        const photosRequest = transaction.objectStore('photos').add(photoData);
        
        photosRequest.onsuccess = () => {
            const photoId = photosRequest.result;
            
            // 保存元数据（使用相同的ID）
            metadata.id = photoId;
            const metadataRequest = transaction.objectStore('metadata').add(metadata);
            
            metadataRequest.onsuccess = () => {
                // 更新照片计数
                updatePhotoCount(transaction);
                resolve(photoId);
            };
            
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        
        photosRequest.onerror = () => reject(photosRequest.error);
    });
}
```

### 3.3 照片读取

```javascript
// 读取所有照片
async function getAllPhotos() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readonly');
        const photosStore = transaction.objectStore('photos');
        const metadataStore = transaction.objectStore('metadata');
        
        const photos = [];
        let count = 0;
        let total = 0;
        
        // 先获取总数
        const countRequest = photosStore.count();
        countRequest.onsuccess = () => {
            total = countRequest.result;
            
            if (total === 0) {
                resolve([]);
                return;
            }
            
            // 读取所有照片
            const request = photosStore.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    const photoData = cursor.value;
                    
                    // 读取对应的元数据
                    const metadataRequest = metadataStore.get(photoData.id);
                    
                    metadataRequest.onsuccess = () => {
                        photos.push({
                            ...photoData,
                            metadata: metadataRequest.result
                        });
                        
                        count++;
                        if (count === total) {
                            // 按上传时间排序
                            photos.sort((a, b) => b.uploadTime - a.uploadTime);
                            resolve(photos);
                        }
                    };
                    
                    cursor.continue();
                }
            };
            
            request.onerror = () => reject(request.error);
        };
    });
}
```

### 3.4 照片删除

```javascript
// 删除照片
async function deletePhoto(photoId) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata', 'settings'], 'readwrite');
        
        // 删除照片文件
        const photosRequest = transaction.objectStore('photos').delete(photoId);
        
        photosRequest.onsuccess = () => {
            // 删除元数据
            const metadataRequest = transaction.objectStore('metadata').delete(photoId);
            
            metadataRequest.onsuccess = () => {
                // 更新照片计数
                updatePhotoCount(transaction);
                resolve();
            };
            
            metadataRequest.onerror = () => reject(metadataRequest.error);
        };
        
        photosRequest.onerror = () => reject(photosRequest.error);
    });
}
```

### 3.5 设置管理

```javascript
// 获取设置
async function getSettings() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const request = transaction.objectStore('settings').get('system');
        
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : {
                maxPhotos: 20,
                currentCount: 0,
                theme: 'classic',
                layout: '3d'
            });
        };
        
        request.onerror = () => reject(request.error);
    });
}

// 更新设置
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

// 更新照片计数
async function updatePhotoCount(transaction) {
    if (!transaction) {
        if (!db) await initDB();
        transaction = db.transaction(['photos', 'settings'], 'readwrite');
    }
    
    const countRequest = transaction.objectStore('photos').count();
    
    countRequest.onsuccess = async () => {
        const currentCount = countRequest.result;
        const settings = await getSettings();
        
        await updateSettings({
            ...settings,
            currentCount: currentCount
        });
    };
}
```

---

## 四、使用示例

### 4.1 上传照片

```javascript
// upload.js

async function handleUpload(files) {
    // 1. 初始化数据库
    await initDB();
    
    // 2. 检查数量限制
    const settings = await getSettings();
    const currentPhotos = await getAllPhotos();
    
    if (currentPhotos.length + files.length > settings.maxPhotos) {
        alert(`最多只能上传${settings.maxPhotos}张照片`);
        return;
    }
    
    // 3. 处理每张照片
    for (const file of files) {
        // 压缩图片
        const compressedFile = await compressImage(file);
        
        // 生成缩略图
        const thumbnail = await generateThumbnail(file);
        
        // 提取元数据
        const metadata = {
            filename: file.name,
            originalName: file.name,
            uploadTime: Date.now(),
            fileSize: file.size,
            width: 0,  // 需要从图片中提取
            height: 0, // 需要从图片中提取
            category: '',
            tags: [],
            description: ''
        };
        
        // 保存到IndexedDB
        await savePhoto(compressedFile, thumbnail, metadata);
    }
    
    // 4. 更新计数
    await updatePhotoCount();
    
    alert('上传成功！');
}
```

### 4.2 加载展览

```javascript
// gallery.js

async function loadGallery() {
    // 1. 初始化数据库
    await initDB();
    
    // 2. 读取所有照片
    const photos = await getAllPhotos();
    
    if (photos.length === 0) {
        showEmptyMessage();
        return;
    }
    
    // 3. 初始化3D场景
    init3DScene();
    
    // 4. 加载照片到3D场景
    for (const photo of photos) {
        // 创建Object URL用于显示
        const imageUrl = URL.createObjectURL(photo.file);
        const thumbnailUrl = URL.createObjectURL(photo.thumbnail);
        
        // 添加到3D场景
        addPhotoToScene(imageUrl, thumbnailUrl, photo.metadata);
    }
}
```

---

## 五、性能优化

### 5.1 批量操作

```javascript
// 批量保存照片（使用单个事务）
async function savePhotosBatch(photosData) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['photos', 'metadata'], 'readwrite');
        
        const promises = photosData.map(({ file, thumbnail, metadata }) => {
            return new Promise((res, rej) => {
                const photoData = {
                    file: file,
                    thumbnail: thumbnail,
                    uploadTime: Date.now(),
                    fileSize: file.size,
                    width: metadata.width,
                    height: metadata.height
                };
                
                const photosRequest = transaction.objectStore('photos').add(photoData);
                
                photosRequest.onsuccess = () => {
                    metadata.id = photosRequest.result;
                    const metadataRequest = transaction.objectStore('metadata').add(metadata);
                    metadataRequest.onsuccess = () => res();
                    metadataRequest.onerror = () => rej(metadataRequest.error);
                };
                
                photosRequest.onerror = () => rej(photosRequest.error);
            });
        });
        
        Promise.all(promises).then(() => {
            updatePhotoCount(transaction);
            resolve();
        }).catch(reject);
    });
}
```

### 5.2 索引使用

```javascript
// 使用索引快速查询
async function getPhotosByCategory(category) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const index = transaction.objectStore('metadata').index('category');
        const request = index.getAll(category);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
```

---

## 六、错误处理

### 6.1 数据库错误处理

```javascript
function handleDBError(error) {
    console.error('IndexedDB错误:', error);
    
    // 根据错误类型处理
    if (error.name === 'QuotaExceededError') {
        alert('存储空间不足，请删除一些照片');
    } else if (error.name === 'InvalidStateError') {
        // 数据库被关闭，重新初始化
        initDB();
    } else {
        alert('数据存储失败，请刷新页面重试');
    }
}
```

### 6.2 兼容性检查

```javascript
function checkIndexedDBSupport() {
    if (!window.indexedDB) {
        alert('您的浏览器不支持IndexedDB，无法使用本系统');
        return false;
    }
    return true;
}

// 页面加载时检查
window.addEventListener('load', () => {
    if (!checkIndexedDBSupport()) {
        document.body.innerHTML = '<h1>浏览器不支持</h1><p>请使用现代浏览器（Chrome、Firefox、Safari、Edge）</p>';
    }
});
```

---

## 七、GitHub Pages部署

### 7.1 部署步骤
1. 将所有文件推送到GitHub仓库
2. 在GitHub仓库设置中启用GitHub Pages
3. 选择分支和目录（通常是main分支的根目录）
4. 访问 `https://username.github.io/repository-name`

### 7.2 注意事项
- **HTTPS要求**：GitHub Pages使用HTTPS，IndexedDB可以正常工作
- **无跨域问题**：IndexedDB是本地API，无跨域限制
- **数据持久化**：数据存储在用户浏览器中，不会上传到GitHub
- **隐私保护**：所有数据都在本地，保护用户隐私

---

## 八、总结

### 8.1 优势
- ✅ GitHub Pages完全兼容
- ✅ 大容量存储（足够20张照片）
- ✅ 支持Blob数据（照片文件）
- ✅ 结构化数据存储（元数据）
- ✅ 异步操作，性能好
- ✅ 事务支持，数据一致

### 8.2 限制
- ⚠️ 数据存储在用户浏览器中
- ⚠️ 清除浏览器数据会丢失照片
- ⚠️ 不同设备间不同步
- ⚠️ 需要现代浏览器支持

### 8.3 适用场景
- ✅ 个人使用的云展览系统
- ✅ 临时展览展示
- ✅ 隐私要求高的场景
- ✅ 无需云端同步的场景

通过IndexedDB，我们可以在GitHub Pages上实现完整的数据存储功能，无需后端服务器。












