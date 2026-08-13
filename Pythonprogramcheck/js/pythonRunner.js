/**
 * Python 執行器模組
 * 使用 Pyodide 在瀏覽器中執行 Python 程式碼
 */

let pyodide = null;
let pyodideLoading = false;
let pyodideLoadProgress = null;

/**
 * 初始化 Pyodide
 */
async function ensurePyodideLoaded(progressCallback = null) {
    if (pyodide) {
        return pyodide; // 已經載入
    }
    
    if (pyodideLoading) {
        // 正在載入中，等待載入完成
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (pyodide) {
                    clearInterval(checkInterval);
                    resolve(pyodide);
                } else if (!pyodideLoading) {
                    // 載入失敗
                    clearInterval(checkInterval);
                    reject(new Error('Pyodide 載入失敗'));
                }
            }, 100);
            
            // 設置超時（5分鐘）
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Pyodide 載入超時，請檢查網路連線'));
            }, 300000);
        });
    }
    
    pyodideLoading = true;
    
    try {
        // 檢查 Pyodide 是否可用
        if (typeof window.loadPyodide === 'undefined') {
            // 執行網路診斷
            if (typeof showNetworkDiagnostics === 'function') {
                showNetworkDiagnostics();
            }
            
            // 顯示狀態錯誤
            if (typeof showPyodideError === 'function') {
                showPyodideError('Pyodide 腳本未載入，請檢查網路連線');
            }
            
            const errorMsg = `Pyodide 腳本未載入。

請立即檢查：
1. 按 F12 打開瀏覽器控制台
2. 查看 Console 標籤中的錯誤訊息
3. 切換到 Network 標籤，搜尋 "pyodide"
4. 確認可以訪問 cdn.jsdelivr.net

可能原因：
- 網路連線問題
- CDN 無法訪問
- 腳本載入失敗
- 廣告攔截器阻擋`;
            
            throw new Error(errorMsg);
        }
        
        // 更新進度回調
        if (progressCallback) {
            pyodideLoadProgress = progressCallback;
        }
        
        console.log('開始載入 Pyodide...');
        
        // 創建一個 Promise 來處理超時
        const loadPromise = window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
            stdout: (msg) => {
                // 可以捕獲載入過程中的輸出
                if (progressCallback) {
                    progressCallback(msg);
                }
            },
            stderr: (msg) => {
                console.warn('Pyodide stderr:', msg);
            }
        });
        
        // 設置載入超時（2分鐘，更合理的時間）
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                pyodideLoading = false;
                reject(new Error('Pyodide 載入超時（超過2分鐘）\n\n可能的原因：\n1. 網路連線緩慢或不穩定\n2. CDN 無法訪問\n3. 防火牆阻擋\n\n建議：\n- 檢查網路連線\n- 嘗試重新整理頁面\n- 檢查瀏覽器控制台（F12）查看詳細錯誤'));
            }, 120000); // 2分鐘
        });
        
        // 添加載入進度檢測
        let lastProgressTime = Date.now();
        const progressCheckInterval = setInterval(() => {
            const now = Date.now();
            // 如果超過30秒沒有進度更新，顯示提示
            if (now - lastProgressTime > 30000 && progressCallback) {
                progressCallback('載入時間較長，請確認網路連線正常...');
            }
        }, 5000);
        
        // 使用 Promise.race 來處理超時
        try {
            pyodide = await Promise.race([loadPromise, timeoutPromise]);
            clearInterval(progressCheckInterval);
        } catch (error) {
            clearInterval(progressCheckInterval);
            throw error;
        }
        
        console.log('Pyodide 載入成功！');
        pyodideLoading = false;
        pyodideLoadProgress = null;
        hardenPyodideSandbox(pyodide);
        return pyodide;
    } catch (error) {
        console.error('Pyodide 載入失敗:', error);
        pyodideLoading = false;
        pyodideLoadProgress = null;
        
        // 提供更詳細的錯誤訊息
        let errorMsg = 'Pyodide 載入失敗';
        if (error.message) {
            errorMsg = error.message;
        } else if (error.toString) {
            errorMsg = error.toString();
        }
        
        throw new Error(`${errorMsg}\n\n可能的原因：\n1. 網路連線問題\n2. CDN 無法訪問\n3. 瀏覽器不支援 WebAssembly\n4. 防火牆阻擋\n\n建議：\n- 檢查網路連線\n- 重新整理頁面重試\n- 查看瀏覽器控制台獲取詳細錯誤`);
    }
}

/**
 * 限制學生程式可匯入的模組，避免透過 js / pyodide 橋接操作此分頁
 */
function hardenPyodideSandbox(py) {
    try {
        py.runPython(`
import sys
import builtins

for _mod in ('js', 'pyodide', 'pyodide_js', 'micropip', 'pyodide_http'):
    sys.modules.pop(_mod, None)

_BLOCKED_MODULES = frozenset({
    'js', 'pyodide', 'pyodide_js', 'micropip', 'pyodide_http',
    'urllib', 'http', 'socket', 'webbrowser', 'ctypes'
})

_real_import = builtins.__import__

def _classroom_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = (name or '').split('.')[0]
    if name in _BLOCKED_MODULES or root in _BLOCKED_MODULES:
        raise ImportError('此模組在課堂作業環境中不可使用：' + str(name))
    return _real_import(name, globals, locals, fromlist, level)

builtins.__import__ = _classroom_import
`);
    } catch (e) {
        console.warn('Pyodide 沙盒限制套用失敗:', e);
    }
}

/**
 * 在隔離命名空間執行學生程式，避免覆寫執行器內部變數
 */
function runStudentPython(code) {
    pyodide.globals.set('STUDENT_CODE', String(code == null ? '' : code));
    try {
        pyodide.runPython(`
_student_ns = {'__name__': '__main__'}
try:
    exec(STUDENT_CODE, _student_ns)
finally:
    _student_ns.clear()
`);
    } finally {
        try {
            pyodide.runPython('del STUDENT_CODE');
        } catch (e) {}
    }
}

/**
 * 執行 Python 程式碼
 */
async function runPythonCode(code, outputElement) {
    if (!outputElement) {
        console.error('輸出元素不存在');
        return;
    }
    
    const startTime = Date.now();
    
    // 顯示載入中
    outputElement.innerHTML = `
        <div class="output-header">運行結果</div>
        <div class="output-loading">
            <div class="loading-spinner">🔄</div>
            <p>執行中，請稍候...</p>
        </div>
    `;
    outputElement.style.display = 'block';
    
    try {
        // 確保 Pyodide 已載入
        if (!pyodide) {
            let progressText = '首次執行：正在載入 Python 執行環境...';
            let progressCount = 0;
            
            // 進度更新函數
            const updateProgress = (message) => {
                progressCount++;
                if (message) {
                    progressText = `載入中... ${message}`;
                } else {
                    progressText = `載入中... (${progressCount})`;
                }
                
                const progressElement = outputElement.querySelector('.loading-progress-text');
                if (progressElement) {
                    progressElement.textContent = progressText;
                }
            };
            
            outputElement.innerHTML = `
                <div class="output-header">運行結果</div>
                <div class="output-loading">
                    <div class="loading-spinner">📦</div>
                    <p class="loading-progress-text">${progressText}</p>
                    <p class="loading-hint">這可能需要 10-30 秒，請耐心等待</p>
                    <div class="loading-details">
                        <small>正在從 CDN 下載 Pyodide（約 10MB）...</small>
                        <br><small style="color: var(--secondary-color); margin-top: 5px; display: block;">
                            如果載入時間過長，請按 F12 打開控制台查看詳細資訊
                        </small>
                    </div>
                </div>
            `;
            
            try {
                // 添加載入開始時間
                const loadStartTime = Date.now();
                
                // 定期更新載入時間顯示
                const timeUpdateInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - loadStartTime) / 1000);
                    const progressElement = outputElement.querySelector('.loading-progress-text');
                    if (progressElement) {
                        progressElement.textContent = `載入中... (已等待 ${elapsed} 秒)`;
                    }
                }, 1000);
                
                await ensurePyodideLoaded(updateProgress);
                
                clearInterval(timeUpdateInterval);
                
                // 更新狀態顯示
                if (typeof checkPyodideStatus === 'function') {
                    checkPyodideStatus();
                }
                
                // 載入完成後更新提示
                outputElement.innerHTML = `
                    <div class="output-header">運行結果</div>
                    <div class="output-loading">
                        <div class="loading-spinner">🔄</div>
                        <p>環境載入完成，正在執行程式碼...</p>
                    </div>
                `;
            } catch (loadError) {
                clearInterval(timeUpdateInterval);
                
                // 更新狀態顯示
                if (typeof showPyodideError === 'function') {
                    showPyodideError('無法載入 Python 執行環境');
                }
                
                // 載入失敗，顯示詳細錯誤
                const errorDetails = loadError.message || loadError.toString();
                outputElement.innerHTML = `
                    <div class="output-header">
                        <span class="output-status error">❌ 載入失敗</span>
                    </div>
                    <div class="output-content output-error">
                        <div class="output-label">錯誤訊息：</div>
                        <pre>${escapeHtml(errorDetails)}</pre>
                        <div class="error-troubleshoot">
                            <strong>解決方案：</strong>
                            <ul>
                                <li>檢查網路連線是否正常</li>
                                <li>確認可以訪問 <code>cdn.jsdelivr.net</code></li>
                                <li>檢查瀏覽器控制台（按 F12）是否有詳細錯誤</li>
                                <li>嘗試重新整理頁面（Ctrl+F5 強制重新整理）</li>
                                <li>確認瀏覽器支援 WebAssembly（Chrome、Firefox、Safari、Edge 最新版本）</li>
                                <li>檢查防火牆或代理設定是否阻擋 CDN</li>
                            </ul>
                            <div style="margin-top: 15px; padding: 10px; background: rgba(220, 53, 69, 0.1); border-radius: 4px;">
                                <strong>快速診斷：</strong>
                                <ol style="margin: 10px 0 0 20px; padding: 0;">
                                    <li>按 F12 打開瀏覽器控制台</li>
                                    <li>查看是否有紅色錯誤訊息</li>
                                    <li>檢查 Network（網路）標籤，查看 pyodide.js 是否成功載入</li>
                                    <li>如果看到 404 或網路錯誤，可能是 CDN 無法訪問</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                `;
                throw loadError; // 重新拋出錯誤，讓外層處理
            }
        }
        
        // 設置輸出捕獲
        let output = '';
        let errorOutput = '';
        
        // 初始化輸出捕獲系統
        try {
            // 先檢查是否已經初始化
            const isInitialized = pyodide.runPython(`
try:
    'stdout_capture' in globals()
except:
    False
`);
            
            if (!isInitialized) {
                // 初始化輸出捕獲系統
                pyodide.runPython(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.buffer = StringIO()
    
    def write(self, s):
        if s is not None:
            self.buffer.write(str(s))
    
    def flush(self):
        pass
    
    def getvalue(self):
        return self.buffer.getvalue()
    
    def reset(self):
        self.buffer = StringIO()

stdout_capture = OutputCapture()
stderr_capture = OutputCapture()
sys.stdout = stdout_capture
sys.stderr = stderr_capture
`);
                console.log('輸出捕獲系統初始化完成');
            } else {
                // 重置捕獲器
                pyodide.runPython(`
stdout_capture.reset()
stderr_capture.reset()
sys.stdout = stdout_capture
sys.stderr = stderr_capture
`);
            }
        } catch (e) {
            console.error('輸出捕獲系統初始化失敗:', e);
            // 嘗試重新初始化
            try {
                pyodide.runPython(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.buffer = StringIO()
    
    def write(self, s):
        if s is not None:
            self.buffer.write(str(s))
    
    def flush(self):
        pass
    
    def getvalue(self):
        return self.buffer.getvalue()
    
    def reset(self):
        self.buffer = StringIO()

stdout_capture = OutputCapture()
stderr_capture = OutputCapture()
sys.stdout = stdout_capture
sys.stderr = stderr_capture
`);
                console.log('輸出捕獲系統重新初始化完成');
            } catch (e2) {
                console.error('無法初始化輸出捕獲系統:', e2);
            }
        }
        
        // 執行使用者程式碼
        let executionTime = '0.00';
        try {
            console.log('開始執行程式碼...');
            runStudentPython(code);
            console.log('程式碼執行完成');
            
            // 獲取輸出
            try {
                output = pyodide.runPython('stdout_capture.getvalue()');
                errorOutput = pyodide.runPython('stderr_capture.getvalue()');
                console.log('輸出獲取完成, stdout:', output, 'stderr:', errorOutput);
            } catch (e) {
                console.error('獲取輸出失敗:', e);
                // 嘗試直接獲取
                try {
                    output = pyodide.runPython('str(stdout_capture.getvalue())');
                    errorOutput = pyodide.runPython('str(stderr_capture.getvalue())');
                } catch (e2) {
                    console.error('無法獲取輸出:', e2);
                }
            }
            
            // 清理輸出（移除多餘的換行，但保留內容）
            if (output !== null && output !== undefined) {
                output = String(output).trim();
            } else {
                output = '';
            }
            
            if (errorOutput !== null && errorOutput !== undefined) {
                errorOutput = String(errorOutput).trim();
            } else {
                errorOutput = '';
            }
            
            console.log('處理後的輸出, stdout:', output, 'stderr:', errorOutput);
            
            // 恢復標準輸出（可選，因為每次執行都會重新設置）
            // pyodide.runPython(`
            // import sys
            // sys.stdout = sys.__stdout__
            // sys.stderr = sys.__stderr__
            // `);
            
            // 計算執行時間
            executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            // 顯示運行結果
            console.log('準備顯示結果, output:', output, 'errorOutput:', errorOutput);
            
            // 確保輸出不為 null 或 undefined
            const hasOutput = output && output.length > 0;
            const hasError = errorOutput && errorOutput.length > 0;
            
            if (hasError) {
                outputElement.innerHTML = `
                    <div class="output-header">
                        <span class="output-status error">⚠️ 執行完成（有警告/錯誤）</span>
                        <span class="execution-time">執行時間：${executionTime} 秒</span>
                    </div>
                    ${hasOutput ? `
                    <div class="output-content">
                        <div class="output-label">標準輸出：</div>
                        <pre>${escapeHtml(String(output))}</pre>
                    </div>
                    ` : ''}
                    <div class="output-content output-error">
                        <div class="output-label">錯誤/警告訊息：</div>
                        <pre>${escapeHtml(String(errorOutput))}</pre>
                    </div>
                `;
            } else if (hasOutput) {
                outputElement.innerHTML = `
                    <div class="output-header">
                        <span class="output-status success">✅ 執行成功</span>
                        <span class="execution-time">執行時間：${executionTime} 秒</span>
                    </div>
                    <div class="output-content">
                        <pre>${escapeHtml(String(output))}</pre>
                    </div>
                `;
            } else {
                outputElement.innerHTML = `
                    <div class="output-header">
                        <span class="output-status success">✅ 執行完成</span>
                        <span class="execution-time">執行時間：${executionTime} 秒</span>
                    </div>
                    <div class="output-content output-success">
                        <pre>程式執行完成，無輸出內容</pre>
                        <small style="display: block; margin-top: 10px; color: var(--secondary-color);">
                            提示：如果程式應該有輸出但沒有顯示，請確認程式碼中有使用 print() 函數
                        </small>
                    </div>
                `;
            }
            
            console.log('結果顯示完成');
            
        } catch (error) {
            // Python 執行錯誤
            console.error('Python 執行錯誤:', error);
            executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            let errorMsg = '';
            
            // 嘗試提取更詳細的錯誤訊息
            if (error.message) {
                errorMsg = error.message;
            } else if (error.toString) {
                errorMsg = error.toString();
            } else {
                errorMsg = String(error);
            }
            
            // 嘗試獲取已經捕獲的輸出（即使有錯誤）
            try {
                const capturedOutput = pyodide.runPython('stdout_capture.getvalue()');
                const capturedError = pyodide.runPython('stderr_capture.getvalue()');
                
                if (capturedOutput && capturedOutput.trim()) {
                    output = String(capturedOutput).trim();
                }
                if (capturedError && capturedError.trim()) {
                    errorOutput = String(capturedError).trim();
                }
            } catch (e) {
                console.log('無法獲取已捕獲的輸出:', e);
            }
            
            // 格式化錯誤訊息（移除 Pyodide 的冗長堆疊）
            const lines = errorMsg.split('\n');
            const relevantLines = lines.filter(line => 
                !line.includes('pyodide') && 
                !line.includes('wasm') &&
                !line.includes('at Object.runPython') &&
                line.trim().length > 0
            ).slice(0, 15); // 顯示前15行相關錯誤
            
            // 如果有輸出，也顯示出來
            const hasOutput = output && output.length > 0;
            const hasErrorOutput = errorOutput && errorOutput.length > 0;
            
            outputElement.innerHTML = `
                <div class="output-header">
                    <span class="output-status error">❌ 執行錯誤</span>
                    <span class="execution-time">執行時間：${executionTime} 秒</span>
                </div>
                ${hasOutput ? `
                <div class="output-content">
                    <div class="output-label">標準輸出（執行錯誤前的輸出）：</div>
                    <pre>${escapeHtml(String(output))}</pre>
                </div>
                ` : ''}
                ${hasErrorOutput ? `
                <div class="output-content output-error">
                    <div class="output-label">錯誤輸出：</div>
                    <pre>${escapeHtml(String(errorOutput))}</pre>
                </div>
                ` : ''}
                <div class="output-content output-error">
                    <div class="output-label">執行錯誤：</div>
                    <pre>${escapeHtml(relevantLines.join('\n'))}</pre>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('執行 Python 程式碼失敗:', error);
        let errorMsg = error.message || error.toString();
        
        // 檢查是否是載入錯誤
        const isLoadError = errorMsg.includes('載入') || errorMsg.includes('load') || errorMsg.includes('Pyodide');
        
        outputElement.innerHTML = `
            <div class="output-header">
                <span class="output-status error">❌ ${isLoadError ? '載入失敗' : '無法執行'}</span>
            </div>
            <div class="output-content output-error">
                <div class="output-label">錯誤原因：</div>
                <pre>${escapeHtml(errorMsg)}</pre>
                <div class="error-troubleshoot">
                    <strong>${isLoadError ? '載入問題解決方案：' : '執行問題請確認：'}</strong>
                    <ul>
                        ${isLoadError ? `
                        <li>檢查網路連線是否正常</li>
                        <li>確認可以訪問 <code>cdn.jsdelivr.net</code></li>
                        <li>檢查瀏覽器控制台（F12）是否有詳細錯誤</li>
                        <li>嘗試重新整理頁面</li>
                        <li>確認瀏覽器支援 WebAssembly（Chrome、Firefox、Safari、Edge 最新版本）</li>
                        <li>檢查防火牆或代理設定是否阻擋 CDN</li>
                        ` : `
                        <li>網路連線正常（需要載入 Pyodide，約 10MB）</li>
                        <li>程式碼語法正確</li>
                        <li>瀏覽器支援 WebAssembly</li>
                        <li>未使用不支援的功能（檔案操作、網路請求等）</li>
                        `}
                    </ul>
                    ${isLoadError ? `
                    <p style="margin-top: 10px; padding: 10px; background: rgba(220, 53, 69, 0.1); border-radius: 4px;">
                        <strong>提示：</strong>如果持續無法載入，可能是 CDN 無法訪問。請檢查網路設定或聯繫管理員。
                    </p>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

/**
 * 執行指定檔案的 Python 程式碼
 */
async function runFile(fileId) {
    const file = getFile(fileId);
    if (!file) {
        alert('檔案不存在！');
        return;
    }
    
    // fileId 在 onclick 中已經過 escapeAttrId 處理，這裡需要轉為 HTML 格式用於 ID
    // 但 getFile 需要原始 ID，所以先嘗試原始 ID，如果失敗再嘗試轉義後的
    const safeId = escapeHtml(String(fileId));
    const outputElement = document.getElementById(`output-${safeId}`);
    const runButton = document.getElementById(`run-btn-${safeId}`);
    
    if (!outputElement) {
        console.error('找不到輸出元素，fileId:', fileId, 'safeId:', safeId);
        // 嘗試使用原始 ID
        const altOutputElement = document.getElementById(`output-${fileId}`);
        if (altOutputElement) {
            altOutputElement.id = `output-${safeId}`; // 更新 ID 以保持一致性
            return runFile(fileId); // 重試
        }
        return;
    }
    
    // 禁用按鈕，防止重複執行
    if (runButton) {
        runButton.disabled = true;
        runButton.innerHTML = '🔄 執行中...';
        runButton.classList.add('btn-loading');
    }
    
    try {
        await runPythonCode(file.content, outputElement);
    } finally {
        // 恢復按鈕狀態
        if (runButton) {
            runButton.disabled = false;
            runButton.innerHTML = '▶️ 執行程式碼';
            runButton.classList.remove('btn-loading');
        }
    }
}

/**
 * HTML轉義
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 測試 Pyodide 是否可用
function testPyodideAvailable() {
    if (typeof window.loadPyodide === 'undefined') {
        console.error('❌ Pyodide 不可用：window.loadPyodide 未定義');
        return false;
    }
    console.log('✓ Pyodide 可用：window.loadPyodide 已定義');
    return true;
}

// 頁面載入時檢查 Pyodide
document.addEventListener('DOMContentLoaded', function() {
    // 延遲檢查，確保腳本已載入
    setTimeout(() => {
        testPyodideAvailable();
    }, 500);
});

// 將函數暴露到全局
window.runFile = runFile;
window.runPythonCode = runPythonCode;
