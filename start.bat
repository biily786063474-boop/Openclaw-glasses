@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title OpenCLAW Traffic Monitor 启动器

echo ======================================
echo   OpenCLAW Traffic Monitor 启动器
echo ======================================
echo.

set "DEFAULT_BACKEND_PORT=8765"
set "DEFAULT_FRONTEND_PORT=3000"

:check_config
if not exist "backend\config.json" (
    if exist "backend\config.example.json" (
        echo 首次启动，需要配置 OpenCLAW 路径...
        echo.
        set /p openclaw_path="请输入 OpenCLAW 目录路径 (默认: %USERPROFILE%\.openclaw): "
        if "!openclaw_path!"=="" set "openclaw_path=%USERPROFILE%\.openclaw"

        (
            echo {
            echo   "openclaw_path": "!openclaw_path!",
            echo   "api_port": !DEFAULT_BACKEND_PORT!,
            echo   "cors_origins": [
            echo     "http://localhost:!DEFAULT_FRONTEND_PORT!",
            echo     "http://localhost:!DEFAULT_FRONTEND_PORT!"
            echo   ]
            echo }
        ) > backend\config.json

        echo 配置文件已创建: backend\config.json
    )
) else (
    findstr /C:"openclaw_path" backend\config.json | findstr /V /C:"example" >nul
    if errorlevel 1 (
        echo 请配置 OpenCLAW 路径...
        set /p openclaw_path="请输入 OpenCLAW 目录路径: "
        if "!openclaw_path!"=="" set "openclaw_path=%USERPROFILE%\.openclaw"
        powershell -Command "(Get-Content backend\config.json) -replace '\"openclaw_path\": \"\"', '\"openclaw_path\": \"!openclaw_path!\"' | Set-Content backend\config.json"
        echo 配置文件已更新
    )
)

echo.
echo 当前配置:
type backend\config.json
echo.

echo 请选择启动模式:
echo   1) 默认端口 ^(后端:8765, 前端:3000^)
echo   2) 自定义端口
echo.
set /p choice="请输入选项 (1-2, 默认1): "

if "!choice!"=="2" (
    set /p backend_port="请输入后端端口 (默认 !DEFAULT_BACKEND_PORT!: "
    if "!backend_port!"=="" set "backend_port=!DEFAULT_BACKEND_PORT!"

    set /p frontend_port="请输入前端端口 (默认 !DEFAULT_FRONTEND_PORT!: "
    if "!frontend_port!"=="" set "frontend_port=!DEFAULT_FRONTEND_PORT!"
) else (
    set "backend_port=!DEFAULT_BACKEND_PORT!"
    set "frontend_port=!DEFAULT_FRONTEND_PORT!"
)

echo.
echo 启动配置:
echo   后端端口: !backend_port!
echo   前端端口: !frontend_port!
echo.

echo 正在启动服务...

echo [1/2] 启动后端...
cd backend
start /b python main.py > ..\tmp\openclaw_backend.log 2>&1
cd ..

timeout /t 2 /nobreak >nul

curl -s http://localhost:!backend_port! >nul 2>&1
if errorlevel 1 (
    echo 后端启动失败，请查看日志
    type tmp\openclaw_backend.log
    pause
    exit /b 1
)
echo 后端启动成功

echo [2/2] 启动前端...
cd frontend
echo VITE_PORT=!frontend_port! > .env
start /b npm run dev > ..\tmp\openclaw_frontend.log 2>&1
cd ..

timeout /t 3 /nobreak >nul

echo 前端启动成功

echo.
echo ======================================
echo   启动完成！
echo ======================================
echo.
echo 访问地址: http://localhost:!frontend_port!
echo API 地址:  http://localhost:!backend_port!
echo.
echo 按任意键停止服务
pause >nul

taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
