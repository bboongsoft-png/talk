const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const initializeSocket = require('./socket');

// 환경변수 설정
require('dotenv').config();

// uploads 디렉터리 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);

// CORS 설정
app.use(cors({
  origin: ['http://localhost:19000', 'http://localhost:19001', 'http://localhost:19002'],
  credentials: true
}));

// JSON 파싱 미들웨어
app.use(express.json());

// MongoDB 연결
connectDB();

// REST API 라우터
app.use('/user', require('./routes/user'));
app.use('/upload', require('./routes/upload'));
app.use('/friends', require('./routes/friends'));
app.use('/friend-requests', require('./routes/friendRequests'));
app.use('/messages', require('./routes/messages'));
app.use('/rooms', require('./routes/rooms'));

// 정적 파일 제공 (이미지, 비디오)
app.use('/uploads', express.static('uploads'));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Talk3 Chat Server',
    status: 'Running',
    version: '1.0.0'
  });
});

// 헬스 체크 라우트
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:19000', 'http://localhost:19001', 'http://localhost:19002'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.io 이벤트 핸들러 초기화
initializeSocket(io);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 에러:', err.stack);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.'
  });
});

// 404 에러 핸들링
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청하신 경로를 찾을 수 없습니다.'
  });
});

// 서버 시작
const REST_PORT = process.env.REST_PORT || 3000;
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

// REST API 서버 (Express)
app.listen(REST_PORT, () => {
  console.log(`✅ REST API 서버가 http://localhost:${REST_PORT} 에서 실행 중입니다.`);
});

// Socket.io 서버
server.listen(SOCKET_PORT, () => {
  console.log(`✅ Socket.io 서버가 http://localhost:${SOCKET_PORT} 에서 실행 중입니다.`);
});

// 프로세스 종료 처리
process.on('SIGTERM', () => {
  console.log('서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

module.exports = { app, server, io };