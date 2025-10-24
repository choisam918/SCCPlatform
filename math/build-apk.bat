@echo off
echo ================================
echo 數學練習App APK構建腳本
echo ================================
echo.

REM 檢查Node.js是否安裝
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 錯誤: 未找到 Node.js，請先安裝 Node.js
    echo 下載地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查npm是否安裝
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 錯誤: 未找到 npm
    pause
    exit /b 1
)

echo 檢查並安裝 Cordova...
call npm list -g cordova >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 正在安裝 Cordova CLI...
    call npm install -g cordova
    if %ERRORLEVEL% NEQ 0 (
        echo 錯誤: Cordova 安裝失敗
        pause
        exit /b 1
    )
)

echo Cordova 已安裝完成
echo.

REM 創建Cordova項目
if not exist "math-app" (
    echo 創建 Cordova 項目...
    call cordova create math-app com.mathpractice.app "數學練習"
    if %ERRORLEVEL% NEQ 0 (
        echo 錯誤: 創建 Cordova 項目失敗
        pause
        exit /b 1
    )
)

echo 複製項目文件到 www 目錄...
if exist "math-app\www\index.html" del "math-app\www\index.html"
if exist "math-app\www\js" rmdir /s /q "math-app\www\js"
if exist "math-app\www\css" rmdir /s /q "math-app\www\css"
if exist "math-app\www\img" rmdir /s /q "math-app\www\img"

copy "index.html" "math-app\www\"
copy "style.css" "math-app\www\"
copy "script.js" "math-app\www\"
if exist "admin.html" copy "admin.html" "math-app\www\"
copy "config.xml" "math-app\"

cd math-app

echo 添加 Android 平台...
call cordova platform add android
if %ERRORLEVEL% NEQ 0 (
    echo 警告: 添加 Android 平台時出現問題，可能已經添加過
)

echo.
echo 選擇構建類型:
echo 1. Debug APK (用於測試)
echo 2. Release APK (用於發布)
set /p choice="請選擇 (1 或 2): "

if "%choice%"=="1" (
    echo 正在構建 Debug APK...
    call cordova build android
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ================================
        echo 構建成功！
        echo APK 位置: platforms\android\app\build\outputs\apk\debug\app-debug.apk
        echo ================================
    ) else (
        echo 構建失敗，請檢查錯誤信息
    )
) else if "%choice%"=="2" (
    echo 正在構建 Release APK...
    call cordova build android --release
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ================================
        echo 構建成功！
        echo APK 位置: platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk
        echo 注意: Release APK 需要簽名才能安裝
        echo ================================
    ) else (
        echo 構建失敗，請檢查錯誤信息
    )
) else (
    echo 無效選擇
)

cd ..
echo.
echo 按任意鍵退出...
pause >nul 