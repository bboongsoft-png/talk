const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  roomId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// 같은 룸에서 중복 요청 방지
friendRequestSchema.index({ roomId: 1, requesterUserId: 1, receiverUserId: 1 }, { unique: true });

// 친구 요청 생성
friendRequestSchema.statics.createRequest = async function(requesterUserId, receiverUserId, requesterNickname, receiverNickname, roomId) {
  try {
    const request = new this({
      requesterUserId,
      receiverUserId,
      requesterNickname,
      receiverNickname,
      roomId
    });
    
    return await request.save();
  } catch (error) {
    // 이미 요청이 있는 경우
    if (error.code === 11000) {
      return await this.findOne({ roomId, requesterUserId, receiverUserId });
    }
    throw error;
  }
};

// 요청 수락
friendRequestSchema.statics.acceptRequest = async function(requestId) {
  const request = await this.findByIdAndUpdate(
    requestId,
    { 
      status: 'accepted',
      respondedAt: new Date()
    },
    { new: true }
  );
  
  if (!request) {
    throw new Error('친구 요청을 찾을 수 없습니다.');
  }
  
  console.log('✅ FriendRequest.acceptRequest - 반환 데이터:', {
    requestId: request._id,
    requesterUserId: request.requesterUserId,
    receiverUserId: request.receiverUserId,
    requesterNickname: request.requesterNickname,
    receiverNickname: request.receiverNickname,
    status: request.status
  });
  
  return request;
};

// 요청 거절
friendRequestSchema.statics.declineRequest = async function(requestId) {
  const request = await this.findByIdAndUpdate(
    requestId,
    { 
      status: 'declined',
      respondedAt: new Date()
    },
    { new: true }
  );
  
  if (!request) {
    throw new Error('친구 요청을 찾을 수 없습니다.');
  }
  
  return request;
};

// 특정 룸의 요청 상태 확인
friendRequestSchema.statics.getRoomRequestStatus = async function(roomId, userId) {
  const sentRequest = await this.findOne({
    roomId,
    requesterUserId: userId
  });
  
  const receivedRequest = await this.findOne({
    roomId,
    receiverUserId: userId
  });
  
  return {
    sentRequest,
    receivedRequest
  };
};

module.exports = mongoose.model('FriendRequest', friendRequestSchema);