## 開啟方式（重要）

請不要用 `file://` 直接打開 `index.html`，Chrome 會把 `file://` 視為「不安全來源」，導致功能被擋並出現像這樣的錯誤：

- `Unsafe attempt to load URL ... file:// ... 'file:' URLs are treated as unique security origins.`

### 方式 A：用 Python（推薦）

在專案資料夾開啟終端機後執行：

```bash
python -m http.server 8000
```

然後用瀏覽器開：

- `http://localhost:8000/`

### 方式 B：用 Node.js

```bash
npx serve .
```

照終端機輸出的網址開啟即可。

