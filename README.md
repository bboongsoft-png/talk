# Talk3 - 랜덤 채팅 & 위치 기반 매칭 앱

React Native(Expo) 기반의 랜덤 1:1 채팅 어플리케이션입니다.
유저는 앱을 실행하여 닉네임 설정 → 위치 권한 승인 → 랜덤 매칭 → Socket.io를 통한 실시간 채팅을 이용할 수 있습니다.

## 🚀 기술 스택

### 프론트엔드 (React Native - Expo)
- React Native (Expo)
- React Navigation
- Axios
- Socket.io-client
- Expo-location (GPS)

### 백엔드 (Node.js)
- Node.js (Express)
- Socket.io
- MongoDB(Local) + Mongoose
- REST API
- Haversine distance 계산

## 🔧 로컬 개발 환경 설정

### 필수 요구사항
- Node.js (v16 이상)
- MongoDB (로컬 설치)
- Expo CLI
- 안드로이드 스튜디오 또는 iOS 시뮬레이터 (선택사항)

### 1. MongoDB 설치 및 실행
```bash
# MongoDB 서비스 시작
mongod

# 또는 MongoDB Compass를 사용하여 localhost:27017로 연결
```

### 2. 백엔드 서버 실행
```bash
cd backend
npm install
npm start

# 실행 포트
# REST API: http://localhost:3000
# Socket.io: http://localhost:3001
```

### 3. 프론트엔드 앱 실행
```bash
cd frontend
npm install
npm start

# Expo DevTools가 열리면:
# - a: Android 에뮬레이터에서 실행
# - i: iOS 시뮬레이터에서 실행
# - w: 웹 브라우저에서 실행
```

## 📱 주요 기능

1. **닉네임 설정** → 간단 회원 생성
2. **현재 위치(GPS)** 서버로 전송
3. **랜덤 매칭** (Socket.io)
4. **매칭된 유저와 실시간 채팅**
5. **Haversine 거리 계산**하여 상대방 거리 제공
6. **채팅 로그 MongoDB에 저장**
7. **매칭 종료** → 재매칭 가능

## 🌐 API 엔드포인트

### REST API (포트 3000)
- `POST /user/upsert` - 닉네임 등록/업데이트
- `POST /user/location` - 위치 업데이트
- `GET /user/:deviceId` - 유저 정보 조회
- `GET /health` - 서버 상태 확인

### Socket.io 이벤트 (포트 3001)

**클라이언트 → 서버**
- `join_queue` - 랜덤 매칭 큐 등록
- `leave_queue` - 매칭 대기 취소
- `send_message` - 채팅 메시지 전송
- `leave_room` - 방 나가기

**서버 → 클라이언트**
- `match_success` - 매칭 성공, roomId, 상대 닉네임, 거리 제공
- `receive_message` - 메시지 수신
- `room_closed` - 상대방 방 나감
- `error` - 오류 메시지

## 📊 데이터베이스 스키마

### User
```javascript
{
  _id: ObjectId,
  nickname: String,
  deviceId: String,   // Expo의 SecureStore 이용
  location: { lat: Number, lng: Number },
  isOnline: Boolean,
  socketId: String,
  createdAt: Date
}
```

### Room
```javascript
{
  _id: ObjectId,
  users: [userId1, userId2],
  isActive: Boolean,
  distance: Number,
  createdAt: Date
}
```

### Message
```javascript
{
  _id: ObjectId,
  roomId: ObjectId,
  senderId: ObjectId,
  message: String,
  messageType: String,
  createdAt: Date
}
```

## 🔍 개발 시 확인사항

### 네트워크 설정
- 백엔드 서버: `localhost:3000` (REST API), `localhost:3001` (Socket.io)
- 프론트엔드: `localhost:19000` (Expo)
- MongoDB: `localhost:27017`

### 권한 설정
- 위치 권한 필요 (앱에서 자동 요청)
- Expo 앱에서는 실제 GPS 사용

### 테스트 방법
1. 두 개의 다른 디바이스/시뮬레이터에서 앱 실행
2. 각각 다른 닉네임으로 등록
3. 매칭 시작하면 자동으로 연결됨
4. 실시간 채팅 테스트

## 🐛 트러블슈팅

### 자주 발생하는 문제

1. **MongoDB 연결 오류**
   - MongoDB 서비스가 실행 중인지 확인
   - 포트 27017이 사용 가능한지 확인

2. **Socket.io 연결 실패**
   - 백엔드 서버가 실행 중인지 확인
   - 방화벽 설정 확인

3. **위치 권한 오류**
   - 앱 설정에서 위치 권한 허용
   - GPS가 활성화되어 있는지 확인

4. **Expo 실행 오류**
   - `npm install` 다시 실행
   - Expo CLI 최신 버전 확인

## 📂 프로젝트 구조

```
talk3/
├── backend/                 # Node.js 백엔드
│   ├── config/
│   │   └── db.js           # MongoDB 연결
│   ├── models/
│   │   ├── User.js         # 유저 모델
│   │   ├── Room.js         # 방 모델
│   │   └── Message.js      # 메시지 모델
│   ├── routes/
│   │   └── user.js         # 유저 API 라우터
│   ├── utils/
│   │   └── haversine.js    # 거리 계산
│   ├── socket.js           # Socket.io 핸들러
│   ├── server.js           # 메인 서버
│   └── package.json
├── frontend/                # React Native 프론트엔드
│   ├── screens/
│   │   ├── NicknameScreen.js   # 닉네임 입력
│   │   ├── MatchScreen.js      # 매칭 대기
│   │   ├── ChatScreen.js       # 채팅
│   │   └── EndScreen.js        # 매칭 종료
│   ├── components/
│   │   └── ChatBubble.js       # 채팅 버블
│   ├── api/
│   │   └── axiosInstance.js    # API 클라이언트
│   ├── hooks/
│   │   └── useSocket.js        # Socket.io 훅
│   ├── App.js              # 메인 앱
│   └── package.json
└── README.md
```

## 🎯 향후 개발 계획

- [ ] 프로필 이미지 업로드
- [ ] 채팅방 히스토리 조회
- [ ] 친구 추가 기능
- [ ] 푸시 알림
- [ ] 다크 모드 지원

## 📄 라이선스

MIT License