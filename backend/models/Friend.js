const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  requesterUserId: {
    type: String,
    required: true
  },
  receiverUserId: {
    type: String,
    required: true
  },
  requesterNickname: {
    type: String,
    required: true
  },
  receiverNickname: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 복합 인덱스 생성 - 같은 두 사용자가 중복 친구 관계를 가지지 않도록
friendSchema.index({ requesterUserId: 1, receiverUserId: 1 }, { unique: true });

// 친구 관계 생성하는 정적 메서드
friendSchema.statics.createFriendship = async function(requesterUserId, receiverUserId, requesterNickname, receiverNickname, roomId) {
  console.log('📋 Friend.createFriendship 호출 데이터:', {
    requesterUserId,
    receiverUserId,
    requesterNickname,
    receiverNickname,
    roomId
  });
  
  try {
    const friendship = new this({
      requesterUserId,
      receiverUserId,
      requesterNickname,
      receiverNickname,
      roomId
    });
    
    const savedFriendship = await friendship.save();
    console.log('✅ Friend.createFriendship 성공:', savedFriendship);
    return savedFriendship;
  } catch (error) {
    console.error('❌ Friend.createFriendship 에러:', error);
    // 이미 존재하는 친구 관계인 경우 새로운 roomId로 업데이트
    if (error.code === 11000) {
      console.log('🔄 중복된 친구 관계 발견. 새로운 roomId로 업데이트:', { requesterUserId, receiverUserId, roomId });
      
      const existingFriend = await this.findOneAndUpdate(
        { requesterUserId, receiverUserId },
        { 
          roomId: roomId,  // 새로운 roomId로 업데이트
          isActive: true,  // 활성화
          lastMessageAt: new Date()
        },
        { new: true }
      );
      
      console.log('✅ 기존 친구 관계 업데이트 완료:', existingFriend);
      return existingFriend;
    }
    throw error;
  }
};

// 특정 사용자의 친구 목록 조회 (userId 기반으로 변경)
friendSchema.statics.getUserFriends = async function(userId) {
  console.log('🔍 getUserFriends 호출:', { userId });
  
  const friends = await this.find({
    $or: [
      { requesterUserId: userId },
      { receiverUserId: userId }
    ],
    isActive: true
  }).sort({ lastMessageAt: -1 });
  
  console.log('🔍 getUserFriends 결과:', friends.length, '개 친구 발견');
  return friends;
};

module.exports = mongoose.model('Friend', friendSchema);