# 程式展示系統 - 設計文檔總覽

## 📚 文檔導覽

本專案包含完整的系統設計建議，請按以下順序閱讀：

### 1. 📊 [方案對比表.md](./方案對比表.md) - **先看這個！**
   - 三種實現方案的快速對比
   - 優缺點分析
   - 推薦決策流程
   - **建議：先看這個決定採用哪個方案**

### 2. 🚀 [GitHub部署方案.md](./GitHub部署方案.md) - **GitHub部署必讀！** ⭐
   - GitHub Pages 部署詳細步驟
   - 純前端方案完整說明
   - 檔案儲存策略（LocalStorage）
   - **建議：如果要在GitHub部署，必看此文件**

### 3. 📋 [系統設計建議.md](./系统设计建议.md) - **詳細設計**
   - 完整的系統架構設計
   - 功能模組詳細說明
   - 技術選型建議
   - 目錄結構建議
   - 介面設計建議
   - **建議：決定方案後看這個了解細節**

### 4. 🔄 [系統架構流程圖.md](./系統架構流程圖.md) - **流程理解**
   - 視覺化的流程圖
   - 系統架構圖
   - 資料流向圖
   - **建議：需要理解運作流程時參考**

## 🎯 快速決策

### 如果需要在GitHub部署：**方案A（純前端方案）** ⭐

**為什麼？**
- ✅ **完美適配GitHub**：可直接使用 GitHub Pages 免費部署
- ✅ **部署極簡**：推送到 GitHub 即可自動部署
- ✅ **零成本**：完全免費，無需額外服務
- ✅ **版本控制**：所有變更都在 Git 中
- ✅ **滿足需求**：對於展示需求完全足夠

**技術棧**：
- 前端：HTML + CSS + JavaScript + highlight.js
- Python執行：Pyodide（在瀏覽器中執行Python）⭐
- 儲存：LocalStorage / IndexedDB（瀏覽器）
- 部署：GitHub Pages

### 如果需要持久化儲存：**方案B（輕量後端方案）**

**為什麼？**
- ✅ 功能完整（檔案持久化、管理功能）
- ✅ 開發難度適中（3-5天）
- ✅ 易於部署和維護
- ✅ 滿足大多數使用需求
- ⚠️ 需配合 Vercel/Railway 等外部服務部署後端

**技術棧**：
- 前端：HTML + CSS + JavaScript + highlight.js
- 後端：Python Flask
- 儲存：本地檔案系統

## 📖 系統概述

### 核心功能
1. **檔案上傳**：教師可上傳多個學生Python檔案
2. **檔案管理**：查看、預覽、刪除已上傳檔案
3. **程式碼展示**：以HTML格式展示所有收集的Python程式碼
4. **程式碼高亮**：使用highlight.js實現語法高亮
5. **程式碼執行**：在瀏覽器中直接執行Python程式碼並顯示結果 ⭐ 新功能

### 使用流程
```
教師上傳Python檔案 → 系統收集儲存 → 生成HTML展示頁面 → 查看/匯出
```

## 🏗️ 系統架構（方案B）

```
前端 (HTML/CSS/JS)
    ↓
後端 (Flask API)
    ↓
檔案系統 (uploads/)
```

## 📁 預期目錄結構

### 方案A（純前端 + GitHub Pages）⭐ 推薦
```
programshowsystem/
├── .github/
│   └── workflows/        # GitHub Actions（可選）
├── docs/                 # 文檔目錄
├── index.html            # 上傳介面
├── display.html          # 展示頁面
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── fileHandler.js    # 檔案處理
│   └── storage.js        # LocalStorage管理
├── lib/                  # highlight.js
└── README.md
```

### 方案B（輕量後端）
```
programshowsystem/
├── app.py                 # Flask主程式
├── templates/             # HTML模板
│   ├── index.html        # 上傳介面
│   └── display.html      # 展示頁面
├── static/               # 靜態資源
│   ├── css/
│   ├── js/
│   └── lib/              # highlight.js
├── uploads/              # 上傳檔案儲存
└── requirements.txt       # Python依賴
```

## 🚀 GitHub 部署步驟（方案A）

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
   - 選擇 `/ (root)` 目錄
   - 儲存後自動部署

3. **訪問網站**
   - URL: `https://username.github.io/programshowsystem/`

詳細步驟請參考 [GitHub部署方案.md](./GitHub部署方案.md)

## 🚀 開發階段建議

### 階段1：MVP（最小可行產品）
- [x] 檔案上傳
- [x] 基本展示
- [x] 程式碼高亮
- [x] LocalStorage 儲存

### 階段2：功能完善
- [ ] 檔案管理（刪除、預覽）
- [ ] 介面美化
- [ ] 匯出/匯入功能

### 階段3：優化擴展
- [ ] 響應式設計
- [ ] 搜尋功能
- [ ] 進階功能

## 💡 關鍵設計決策

1. **檔案儲存**：使用本地檔案系統（uploads/目錄）
2. **程式碼高亮**：使用highlight.js（輕量且功能完整）
3. **後端框架**：選擇Flask（輕量級，易於學習）
4. **前端架構**：原生JavaScript（無需複雜框架）

## ⚠️ 注意事項

- 檔案類型驗證（只允許.py檔案）
- 檔案大小限制
- 檔案名稱清理（安全性）
- 上傳目錄權限設定

## 🎉 系統已初步完成！

系統已經建立完成，包含以下檔案：

### 核心檔案
- `index.html` - 上傳頁面
- `display.html` - 展示頁面
- `css/style.css` - 樣式檔案
- `js/storage.js` - 儲存管理
- `js/fileHandler.js` - 檔案處理
- `js/main.js` - 主程式邏輯
- `js/display.js` - 展示頁面邏輯
- `js/pythonRunner.js` - Python 執行器 ⭐ 新功能

### 使用方式

1. **本地測試**：直接用瀏覽器開啟 `index.html`
2. **GitHub部署**：推送到 GitHub 並啟用 Pages
3. **詳細說明**：查看 [使用說明.md](./使用說明.md)

## 📝 下一步

1. **測試系統**：在本地測試所有功能
2. **自訂樣式**：根據需求調整 CSS
3. **部署到GitHub**：參考 [GitHub部署方案.md](./GitHub部署方案.md)
4. **閱讀文檔**：查看 `docs/` 目錄了解設計細節

## 🔗 相關資源

- **highlight.js**：https://highlightjs.org/
- **Pyodide**：https://pyodide.org/（Python執行環境）
- **使用說明**：查看 [使用說明.md](./使用說明.md)
- **執行功能說明**：查看 [執行功能說明.md](./執行功能說明.md) ⭐

---

**提示**：這些文檔只包含設計建議，不包含實際程式碼。如需開始開發，請參考設計文檔中的技術選型和架構建議。
