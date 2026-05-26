@echo off
chcp 65001 >nul
echo ========================================
echo   跳绳赛事报名系统 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js (https://nodejs.org)
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "server\node_modules" (
    echo [信息] 正在安装后端依赖...
    cd server && npm install && cd ..
)
if not exist "admin-frontend\node_modules" (
    echo [信息] 正在安装管理后台依赖...
    cd admin-frontend && npm install && cd ..
)
if not exist "registration-frontend\node_modules" (
    echo [信息] 正在安装报名前端依赖...
    cd registration-frontend && npm install && cd ..
)

:: 检查是否已构建前端
if not exist "admin-frontend\dist" (
    echo [信息] 正在构建管理后台...
    cd admin-frontend && npm run build && cd ..
)
if not exist "registration-frontend\dist" (
    echo [信息] 正在构建报名前端...
    cd registration-frontend && npm run build && cd ..
)

echo.
echo [信息] 启动服务器...
echo.
echo ========================================
echo   系统已启动！
echo.
echo   在线报名地址: http://localhost:3000
echo   后台管理地址: http://localhost:3000/admin
echo   管理员账号: admin
echo   管理员密码: admin123
echo.
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

cd server && node index.js
