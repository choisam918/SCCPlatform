# GitHub 部署方案

## 一、GitHub 部署選項分析

由於需要在 GitHub 上架構系統，以下是幾種可行的方案：

### 方案選項對比

| 方案 | 前端部署 | 後端部署 | 檔案儲存 | 適用場景 |
|------|---------|---------|---------|---------|
| **方案1：純前端（GitHub Pages）** ⭐ | GitHub Pages | 無 | 瀏覽器 LocalStorage | 簡單展示，無需持久化 |
| **方案2：前端+後端分離** | GitHub Pages | GitHub Actions/外部服務 | 外部儲存 | 需要持久化，願意使用外部服務 |
| **方案3：GitHub Codespaces** | 內建 | Codespaces運行 | GitHub儲存 | 開發/測試環境 |
| **方案4：混合方案** | GitHub Pages | Vercel/Railway | 雲端儲存 | 生產環境推薦 |

## 二、推薦方案詳解

### 🎯 方案1：純前端 + GitHub Pages（最適合GitHub）

#### 架構設計
```
GitHub Repository
    │
    ├── 前端檔案 (HTML/CSS/JS)
    │   ├── index.html
    │   ├── display.html
    │   ├── css/
    │   ├── js/
    │   └── lib/
    │
    └── GitHub Pages 自動部署
        │
        └── 靜態網站 (https://username.github.io/repo/)
```

#### ✅ 優點
- **完全免費**：GitHub Pages 免費託管
- **部署簡單**：推送到 GitHub 自動部署
- **無需伺服器**：純靜態檔案
- **版本控制**：所有檔案都在 Git 中
- **CDN加速**：GitHub Pages 有全球 CDN

#### ⚠️ 限制與解決方案
- **限制1：無法持久化儲存**
  - **解決方案**：使用瀏覽器 LocalStorage 或 IndexedDB
  - 檔案存在使用者瀏覽器中，關閉後可保留（LocalStorage）
  
- **限制2：無法後端處理**
  - **解決方案**：所有處理在前端完成
  - 使用 FileReader API 讀取檔案
  - 使用 highlight.js 在瀏覽器端高亮

#### 📁 目錄結構
```
programshowsystem/
├── index.html              # 主頁面
├── display.html            # 展示頁面
├── css/
│   └── style.css
├── js/
│   ├── main.js            # 主要邏輯
│   ├── fileHandler.js     # 檔案處理
│   └── storage.js         # LocalStorage管理
├── lib/
│   └── highlight.js       # 程式碼高亮
├── .gitignore
├── README.md
└── docs/                   # 文檔目錄
    ├── 系統設計建議.md
    └── ...
```

#### 🔧 技術實現要點

**1. 檔案儲存（LocalStorage）**
```javascript
// 使用 LocalStorage 儲存檔案內容
// 限制：約 5-10MB（依瀏覽器而定）
// 格式：JSON 序列化
```

**2. 檔案上傳處理**
- 使用 `<input type="file" multiple>` 或拖放
- FileReader API 讀取檔案內容
- 儲存到 LocalStorage

**3. 程式碼展示**
- 從 LocalStorage 讀取檔案
- highlight.js 進行語法高亮
- 動態生成 HTML

#### 📋 GitHub Pages 設定步驟

1. **建立 GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/programshowsystem.git
   git push -u origin main
   ```

2. **啟用 GitHub Pages**
   - 進入 Repository Settings
   - 找到 Pages 設定
   - Source 選擇 `main` 分支
   - 選擇 `/ (root)` 或 `/docs` 目錄
   - 儲存後自動部署

3. **訪問網站**
   - URL: `https://username.github.io/programshowsystem/`

---

### 🔄 方案2：前端+後端分離（進階）

#### 架構設計
```
GitHub Repository
    │
    ├── frontend/          # 前端（部署到 GitHub Pages）
    │   └── ...
    │
    └── backend/           # 後端（部署到外部服務）
        ├── app.py
        └── ...
```

#### 後端部署選項

**選項A：Vercel（推薦）**
- 支援 Python Flask
- 免費額度充足
- 自動部署
- 設定簡單

**選項B：Railway**
- 支援 Python
- 免費額度
- 易於設定

**選項C：Render**
- 免費方案
- 支援 Flask
- 自動部署

#### 工作流程
1. 前端：GitHub Pages（靜態檔案）
2. 後端：Vercel/Railway（API服務）
3. 檔案儲存：後端伺服器檔案系統或雲端儲存

---

### 🛠️ 方案3：GitHub Codespaces（開發環境）

#### 適用場景
- 開發和測試
- 需要完整後端功能
- 臨時使用

#### 設定方式
1. 在 GitHub Repository 中開啟 Codespaces
2. 在 Codespaces 中運行 Flask 應用
3. 透過 Port Forwarding 訪問

---

## 三、GitHub 專案結構建議

### 完整專案結構（方案1：純前端）
```
programshowsystem/
├── .github/
│   └── workflows/         # GitHub Actions（可選）
│       └── deploy.yml
├── docs/                  # 文檔
│   ├── 系統設計建議.md
│   ├── 方案對比表.md
│   ├── 系統架構流程圖.md
│   └── GitHub部署方案.md
├── index.html             # 主頁面
├── display.html           # 展示頁面
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── fileHandler.js
│   ├── storage.js
│   └── display.js
├── lib/
│   └── highlight.js/
│       ├── highlight.min.js
│       └── styles/
├── .gitignore
├── README.md
└── LICENSE                # 可選
```

### .gitignore 建議
```
# 不需要上傳的檔案
.DS_Store
Thumbs.db
*.log
node_modules/
.env
.venv/
__pycache__/
*.pyc
```

## 四、GitHub Pages 部署詳細步驟

### 步驟1：準備專案
```bash
# 1. 初始化 Git
git init

# 2. 建立基本結構
mkdir -p css js lib docs

# 3. 建立 .gitignore
echo "*.log" > .gitignore
echo ".DS_Store" >> .gitignore
```

### 步驟2：推送到 GitHub
```bash
# 1. 添加檔案
git add .

# 2. 提交
git commit -m "Initial commit: 程式展示系統"

# 3. 建立 GitHub Repository（在 GitHub 網站上）

# 4. 連接遠端
git remote add origin https://github.com/username/programshowsystem.git

# 5. 推送
git push -u origin main
```

### 步驟3：啟用 GitHub Pages
1. 進入 Repository
2. 點擊 **Settings**
3. 左側選單找到 **Pages**
4. **Source** 選擇 `main` 分支
5. **Folder** 選擇 `/ (root)`
6. 點擊 **Save**

### 步驟4：訪問網站
- 等待幾分鐘後，訪問：`https://username.github.io/programshowsystem/`
- 或自訂域名（可選）

## 五、功能實現調整（純前端方案）

### 5.1 檔案儲存策略

**方案A：LocalStorage（推薦）**
- 優點：簡單，無需額外設定
- 限制：約 5-10MB
- 適用：小量檔案（<50個檔案）

**方案B：IndexedDB**
- 優點：容量更大（數百MB）
- 缺點：實作較複雜
- 適用：大量檔案

**方案C：匯出/匯入功能**
- 優點：可保存到本地檔案
- 實現：使用 Blob API 下載 JSON

### 5.2 資料格式設計

```javascript
// LocalStorage 儲存格式
{
  "files": [
    {
      "id": "file1",
      "name": "student1.py",
      "content": "def hello():\n    print('Hello')",
      "size": 1024,
      "uploadTime": "2024-01-01T12:00:00Z"
    }
  ],
  "settings": {
    "theme": "light",
    "highlightStyle": "github"
  }
}
```

## 六、GitHub Actions 自動化（可選）

### 自動部署工作流
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## 七、安全性考量（純前端）

### 需要注意的問題
1. **檔案大小限制**：提醒使用者檔案大小
2. **檔案數量限制**：建議最多 50-100 個檔案
3. **資料備份**：提供匯出功能
4. **隱私保護**：資料只存在本地瀏覽器

### 最佳實踐
- 提供「匯出資料」功能
- 提供「清除資料」功能
- 顯示儲存空間使用情況
- 提醒使用者定期備份

## 八、推薦方案總結

### 🏆 最佳選擇：方案1（純前端 + GitHub Pages）

**理由**：
1. ✅ **完全免費**：GitHub Pages 免費
2. ✅ **部署簡單**：推送到 GitHub 即可
3. ✅ **無需維護**：無需管理伺服器
4. ✅ **版本控制**：所有變更都在 Git 中
5. ✅ **適合需求**：滿足基本展示需求

**技術棧**：
- 前端：HTML + CSS + JavaScript
- 儲存：LocalStorage / IndexedDB
- 部署：GitHub Pages
- 程式碼高亮：highlight.js

**功能調整**：
- 檔案儲存在瀏覽器（LocalStorage）
- 提供匯出/匯入功能
- 所有處理在前端完成

## 九、開發建議

### 開發流程
1. **本地開發**：在本地建立和測試
2. **Git 管理**：使用 Git 版本控制
3. **推送到 GitHub**：定期推送變更
4. **自動部署**：GitHub Pages 自動更新

### 測試建議
- 在不同瀏覽器測試（Chrome、Firefox、Safari、Edge）
- 測試 LocalStorage 限制
- 測試大量檔案的情況
- 測試匯出/匯入功能

---

**總結**：對於需要在 GitHub 上架構的需求，**純前端 + GitHub Pages 方案**是最佳選擇，既簡單又免費，完全滿足展示需求。
