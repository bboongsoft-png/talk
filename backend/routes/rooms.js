const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');

// 방 상태 확인 API
router.get('/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;
    
    console.log('🏠 [DEBUG] === 방 상태 확인 API 시작 ===');
    console.log('🏠 [DEBUG] 요청 파라미터:', { roomId, userId });
    console.log('🏠 [DEBUG] 요청 시간:', new Date().toISOString());
    
    console.log('🏠 [DEBUG] Room.findById 호출:', roomId);
    const room = await Room.findById(roomId);
    
    console.log('🏠 [DEBUG] DB 조회 결과 - Room:', {
      found: !!room,
      roomId: room?._id,
      isActive: room?.isActive,
      users: room?.users,
      createdAt: room?.createdAt,
      distance: room?.distance
    });
    
    if (!room) {
      console.log('🏠 [DEBUG] 방을 찾을 수 없음 - 비활성 응답');
      return res.json({
        success: true,
        data: {
          isActive: false,
          message: '방을 찾을 수 없습니다.'
        }
      });
    }
    
    // 사용자가 해당 방의 참여자인지 확인
    const isParticipant = room.users.includes(userId);
    console.log('🏠 [DEBUG] 참여 권한 확인:', { userId, roomUsers: room.users, isParticipant });
    
    if (!isParticipant) {
      console.log('🏠 [DEBUG] 참여 권한 없음 - 비활성 응답');
      return res.json({
        success: true,
        data: {
          isActive: false,
          message: '방 참여 권한이 없습니다.'
        }
      });
    }
    
    // 상대방 정보 조회
    const partnerUserId = room.users.find(id => id !== userId);
    console.log('🏠 [DEBUG] 상대방 userId:', partnerUserId);
    
    const partner = await User.findOne({ userId: partnerUserId });
    console.log('🏠 [DEBUG] 상대방 정보:', {
      found: !!partner,
      userId: partner?.userId,
      nickname: partner?.nickname,
      isOnline: partner?.isOnline,
      currentStatus: partner?.currentStatus
    });
    
    const responseData = {
      isActive: room.isActive,
      participants: room.users,
      partner: partner ? {
        userId: partner.userId,
        nickname: partner.nickname,
        isOnline: partner.isOnline
      } : null,
      distance: room.distance,
      createdAt: room.createdAt
    };
    
    console.log('🏠 [DEBUG] === 최종 응답 데이터 ===');
    console.log('🏠 [DEBUG] responseData:', responseData);
    console.log('🏠 [DEBUG] 응답 시간:', new Date().toISOString());
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('🏠 [ERROR] === 방 상태 확인 API 오류 ===');
    console.error('🏠 [ERROR] 오류 내용:', {
      message: error.message,
      stack: error.stack,
      roomId: req.params.roomId,
      userId: req.query.userId
    });
    
    res.status(500).json({
      success: false,
      message: '방 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;