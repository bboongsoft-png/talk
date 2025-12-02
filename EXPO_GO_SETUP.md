# Expo Go 테스트 설정 가이드

## 🔧 IP 주소 설정

Expo Go에서 테스트하려면 컴퓨터의 실제 IP 주소가 필요합니다.

### 1. IP 주소 확인

**Windows:**
```bash
ipconfig
```

**Mac/Linux:**
```bash
ifconfig
```

**무선 네트워크 IP 주소를 찾으세요** (예: 192.168.1.100)

### 2. 코드에서 IP 주소 수정

다음 파일들에서 `192.168.1.100`을 본인의 IP 주소로 변경하세요:

1. `frontend/api/axiosInstance.js` - 라인 12
2. `frontend/hooks/useSocket.js` - 라인 12

### 3. 실행 단계

1. **백엔드 서버 실행:**
   ```bash
   cd backend
   npm start
   ```

2. **프론트엔드 실행:**
   ```bash
   cd frontend
   npm start
   ```

3. **Expo Go 앱에서 QR 코드 스캔**

### 4. 네트워크 설정 확인

- 컴퓨터와 휴대폰이 같은 WiFi 네트워크에 연결되어 있어야 합니다
- 방화벽이 포트 3000, 3001을 차단하지 않는지 확인하세요

### 5. 방화벽 설정 (Windows)

Windows 방화벽에서 포트 허용:
```bash
# 관리자 권한으로 명령 프롬프트 실행
netsh advfirewall firewall add rule name="Node.js App" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Socket.io App" dir=in action=allow protocol=TCP localport=3001
```

## 🐛 문제 해결

### 연결 오류가 발생하는 경우:
1. IP 주소가 올바른지 확인
2. 같은 WiFi 네트워크인지 확인
3. 방화벽 설정 확인
4. 백엔드 서버가 실행 중인지 확인

### 위치 권한 오류:
- Expo Go 앱 설정에서 위치 권한 허용

### Socket 연결 실패:
- 백엔드 콘솔에서 연결 로그 확인
- 네트워크 상태 확인