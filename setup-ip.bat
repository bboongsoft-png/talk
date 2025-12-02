@echo off
echo 🔍 네트워크 IP 주소를 찾는 중...

REM IP 주소 감지
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set IP=%%j
        goto :found
    )
)

:found
if "%IP%"=="" (
    echo ❌ IP 주소를 자동으로 찾을 수 없습니다.
    echo 수동으로 IP 주소를 확인하고 다음 파일들을 수정하세요:
    echo - frontend/api/axiosInstance.js
    echo - frontend/hooks/useSocket.js
    pause
    exit /b 1
)

echo ✅ 감지된 IP 주소: %IP%

REM 백업 생성
echo 📦 기존 파일 백업 중...
copy "frontend\api\axiosInstance.js" "frontend\api\axiosInstance.js.backup"
copy "frontend\hooks\useSocket.js" "frontend\hooks\useSocket.js.backup"

REM IP 주소 교체
echo 🔧 IP 주소 업데이트 중...
powershell -Command "(Get-Content 'frontend\api\axiosInstance.js') -replace '192\.168\.1\.100', '%IP%' | Set-Content 'frontend\api\axiosInstance.js'"
powershell -Command "(Get-Content 'frontend\hooks\useSocket.js') -replace '192\.168\.1\.100', '%IP%' | Set-Content 'frontend\hooks\useSocket.js'"

echo ✅ IP 주소가 성공적으로 업데이트되었습니다!
echo 📱 이제 Expo Go에서 테스트할 수 있습니다.
echo.
echo 다음 단계:
echo 1. cd backend ^&^& npm start
echo 2. cd frontend ^&^& npm start
echo 3. Expo Go에서 QR 코드 스캔
pause