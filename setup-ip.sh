#!/bin/bash

# IP 주소 자동 감지 및 설정 스크립트

echo "🔍 네트워크 IP 주소를 찾는 중..."

# OS 감지
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    IP=$(ipconfig | grep -A 4 "무선 LAN 어댑터 Wi-Fi" | grep "IPv4 주소" | head -n1 | awk '{print $NF}' | tr -d '\r')
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac
    IP=$(ifconfig en0 | grep "inet " | awk '{print $2}')
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    echo "❌ IP 주소를 자동으로 찾을 수 없습니다."
    echo "수동으로 IP 주소를 확인하고 다음 파일들을 수정하세요:"
    echo "- frontend/api/axiosInstance.js"
    echo "- frontend/hooks/useSocket.js"
    exit 1
fi

echo "✅ 감지된 IP 주소: $IP"

# 백업 생성
echo "📦 기존 파일 백업 중..."
cp frontend/api/axiosInstance.js frontend/api/axiosInstance.js.backup
cp frontend/hooks/useSocket.js frontend/hooks/useSocket.js.backup

# IP 주소 교체
echo "🔧 IP 주소 업데이트 중..."

# axiosInstance.js 수정
sed -i.tmp "s/192\.168\.1\.100/$IP/g" frontend/api/axiosInstance.js
rm frontend/api/axiosInstance.js.tmp

# useSocket.js 수정
sed -i.tmp "s/192\.168\.1\.100/$IP/g" frontend/hooks/useSocket.js
rm frontend/hooks/useSocket.js.tmp

echo "✅ IP 주소가 성공적으로 업데이트되었습니다!"
echo "📱 이제 Expo Go에서 테스트할 수 있습니다."
echo ""
echo "다음 단계:"
echo "1. cd backend && npm start"
echo "2. cd frontend && npm start"
echo "3. Expo Go에서 QR 코드 스캔"