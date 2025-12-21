# SCC 雲展覽平台

一個基於WebGL和Three.js的3D虛擬展覽館系統，支持照片上傳、3D展覽和相冊瀏覽。

## 功能特點

- 📷 **照片上傳**：支持拖拽上傳，最多12張照片
- 🏛️ **3D虛擬展覽館**：沉浸式3D展覽體驗，4面牆體，360度旋轉
- 📚 **相冊模式**：傳統網格布局瀏覽
- 📱 **移動端優化**：完美支持手機和平板設備
- 💾 **本地存儲**：使用IndexedDB存儲，無需服務器

## 快速開始

1. 直接在瀏覽器中打開 `index.html`
2. 點擊"上傳照片"上傳您的照片
3. 點擊"SCC雲展覽"進入3D展覽模式
4. 使用鼠標拖拽旋轉視角，滾輪縮放

## 文件結構

```
cloudpictureplatform/
├── index.html          # 主頁
├── upload.html         # 上傳頁面
├── gallery.html        # 展覽頁面
├── css/                # 樣式文件
│   ├── main.css
│   ├── index.css
│   ├── upload.css
│   └── gallery.css
├── js/                 # JavaScript文件
│   ├── storage.js      # 數據庫管理
│   ├── gallery.js      # 展覽功能
│   ├── 3d-gallery.js   # 3D展覽核心
│   ├── upload.js       # 上傳功能
│   ├── main.js         # 主頁邏輯
│   ├── utils.js        # 工具函數
│   └── image-processor.js # 圖片處理
├── mobile-fixes.css    # 移動端修復樣式
└── mobile-fixes.js     # 移動端修復腳本
```

## 系統要求

- 現代瀏覽器（Chrome、Firefox、Safari、Edge）
- 支持WebGL和IndexedDB
- 網絡連接（用於加載Three.js庫）

## 技術棧

- **前端**：HTML5、CSS3、JavaScript (ES6+)
- **3D渲染**：Three.js、WebGL
- **數據存儲**：IndexedDB
- **圖片處理**：Canvas API

## 瀏覽器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 許可證

本項目僅供學習和個人使用。

