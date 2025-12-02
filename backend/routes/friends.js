const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');
const User = require('../models/User');

// 친구 추가 (채팅 종료 시 친구로 등록)
router.post('/add', async (req, res) => {
  try {
    const { deviceId1, deviceId2, nickname1, nickname2 } = req.body;

    if (!deviceId1 || !deviceId2 || !nickname1 || !nickname2) {
      return res.status(400).json({
        success: false,
        message: '모든 필드가 필요합니다.'
      });
    }

    // 자기 자신을 친구로 추가하려는 경우 방지
    if (deviceId1 === deviceId2) {
      return res.status(400).json({
        success: false,
        message: '자기 자신을 친구로 추가할 수 없습니다.'
      });
    }

    // 친구 관계 생성
    const friendship = await Friend.createFriendship(deviceId1, deviceId2, nickname1, nickname2);

    console.log('✅ 친구 추가 완료:', {
      deviceId1,
      deviceId2,
      nickname1,
      nickname2
    });

    res.json({
      success: true,
      message: '친구가 추가되었습니다.',
      data: friendship
    });

  } catch (error) {
    console.error('❌ 친구 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 추가 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 사용자의 친구 목록 조회
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: '디바이스 ID가 필요합니다.'
      });
    }

    // 사용자를 deviceId로 찾아서 userId 가져오기
    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log('🔍 친구 목록 조회 요청:', { deviceId, userId: user.userId, nickname: user.nickname });
    
    // 친구 목록 조회 (userId 기반, isActive: true 조건 추가)
    const friends = await Friend.find({
      $or: [
        { requesterUserId: user.userId },
        { receiverUserId: user.userId }
      ],
      isActive: true  // 활성 상태인 친구만 조회
    }).sort({ lastMessageAt: -1 });
    
    console.log('🔍 조회된 Friend 레코드들:', friends.map(f => ({
      id: f._id,
      requester: f.requesterUserId,
      receiver: f.receiverUserId,
      roomId: f.roomId,
      isActive: f.isActive,
      requesterNickname: f.requesterNickname,
      receiverNickname: f.receiverNickname
    })));

    // 각 친구의 정보를 가공하여 반환
    const friendList = friends.map(friend => {
      const isRequester = friend.requesterUserId === user.userId;
      return {
        friendshipId: friend._id,
        friendUserId: isRequester ? friend.receiverUserId : friend.requesterUserId,
        friendNickname: isRequester ? friend.receiverNickname : friend.requesterNickname,
        myNickname: isRequester ? friend.requesterNickname : friend.receiverNickname,
        roomId: friend.roomId,
        lastMessage: friend.lastMessage,
        lastMessageAt: friend.lastMessageAt,
        createdAt: friend.createdAt
      };
    });

    console.log(`📋 ${deviceId}의 친구 목록 조회 완료:`, friendList.length, '명');

    res.json({
      success: true,
      message: '친구 목록을 성공적으로 조회했습니다.',
      data: friendList
    });

  } catch (error) {
    console.error('❌ 친구 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 친구 관계의 마지막 메시지 업데이트
router.put('/update-last-message', async (req, res) => {
  try {
    const { deviceId1, deviceId2, lastMessage } = req.body;

    if (!deviceId1 || !deviceId2) {
      return res.status(400).json({
        success: false,
        message: '디바이스 ID들이 필요합니다.'
      });
    }

    // 정렬하여 친구 관계 찾기
    const [sortedDeviceId1, sortedDeviceId2] = [deviceId1, deviceId2].sort();
    
    const friendship = await Friend.findOneAndUpdate(
      { 
        deviceId1: sortedDeviceId1, 
        deviceId2: sortedDeviceId2,
        isActive: true
      },
      {
        lastMessage: lastMessage || '',
        lastMessageAt: new Date()
      },
      { new: true }
    );

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: '친구 관계를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '마지막 메시지가 업데이트되었습니다.',
      data: friendship
    });

  } catch (error) {
    console.error('❌ 마지막 메시지 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '마지막 메시지 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 친구 관계 삭제 (친구 목록에서 제거)
router.delete('/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const friendship = await Friend.findByIdAndUpdate(
      friendshipId,
      { isActive: false },
      { new: true }
    );

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: '친구 관계를 찾을 수 없습니다.'
      });
    }

    console.log('🗑️ 친구 관계 삭제 완료:', friendshipId);

    res.json({
      success: true,
      message: '친구가 삭제되었습니다.',
      data: friendship
    });

  } catch (error) {
    console.error('❌ 친구 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;