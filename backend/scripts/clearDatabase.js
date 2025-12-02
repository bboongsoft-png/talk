const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const Room = require('../models/Room');
const Message = require('../models/Message');

async function clearDatabase() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talk3');
    console.log('✅ MongoDB 연결 성공');

    // 모든 컬렉션 데이터 삭제
    console.log('🗑️ 데이터베이스 초기화 시작...');
    
    const userResult = await User.deleteMany({});
    console.log(`❌ Users 삭제: ${userResult.deletedCount}개`);
    
    const friendResult = await Friend.deleteMany({});
    console.log(`❌ Friends 삭제: ${friendResult.deletedCount}개`);
    
    const friendRequestResult = await FriendRequest.deleteMany({});
    console.log(`❌ FriendRequests 삭제: ${friendRequestResult.deletedCount}개`);
    
    const roomResult = await Room.deleteMany({});
    console.log(`❌ Rooms 삭제: ${roomResult.deletedCount}개`);
    
    const messageResult = await Message.deleteMany({});
    console.log(`❌ Messages 삭제: ${messageResult.deletedCount}개`);

    // 현재 데이터 개수 확인
    console.log('\n📊 초기화 후 데이터 개수:');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Friends: ${await Friend.countDocuments()}`);
    console.log(`FriendRequests: ${await FriendRequest.countDocuments()}`);
    console.log(`Rooms: ${await Room.countDocuments()}`);
    console.log(`Messages: ${await Message.countDocuments()}`);

    console.log('\n✅ 데이터베이스 초기화 완료!');
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 해제');
    process.exit(0);
  }
}

clearDatabase();