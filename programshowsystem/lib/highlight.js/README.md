# Highlight.js 安裝說明

本系統使用 highlight.js 進行程式碼語法高亮。

## 安裝方式

### 方式1：使用CDN（推薦，無需下載）

在 `display.html` 中，將 highlight.js 的引用改為CDN：

```html
<!-- 替換現有的 highlight.js 引用 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
```

### 方式2：下載檔案

1. 訪問 https://highlightjs.org/download/
2. 選擇需要的語言（至少選擇 Python）
3. 選擇樣式（推薦：GitHub）
4. 下載並解壓
5. 將以下檔案複製到對應位置：
   - `highlight.min.js` → `lib/highlight.js/highlight.min.js`
   - `styles/github.min.css` → `lib/highlight.js/styles/github.min.css`

## 當前設定

系統預設使用本地檔案，如果檔案不存在，請使用方式1（CDN）或方式2（下載）。
