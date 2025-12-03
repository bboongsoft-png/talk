const express = require('express');
const router = express.Router();
const FriendRequest = require('../models/FriendRequest');
const Friend = require('../models/Friend');

// 친구 요청 전송
router.post('/send', async (req, res) => {
  try {
    const { requesterDeviceId, receiverDeviceId, requesterNickname, receiverNickname, roomId } = req.body;

    if (!requesterDeviceId || !receiverDeviceId || !requesterNickname || !receiverNickname || !roomId) {
      return res.status(400).json({
        success: false,
        message: '모든 필드가 필요합니다.'
      });
    }

    // 자기 자신에게 요청 방지
    if (requesterDeviceId === receiverDeviceId) {
      return res.status(400).json({
        success: false,
        message: '자기 자신에게 친구 요청을 보낼 수 없습니다.'
      });
    }

    // 친구 요청 생성
    const request = await FriendRequest.createRequest(
      requesterDeviceId,
      receiverDeviceId, 
      requesterNickname,
      receiverNickname,
      roomId
    );

    console.log('📤 친구 요청 전송:', {
      from: requesterNickname,
      to: receiverNickname,
      roomId
    });

    res.json({
      success: true,
      message: '친구 요청이 전송되었습니다.',
      data: request
    });

  } catch (error) {
    console.error('❌ 친구 요청 전송 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 전송 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 친구 요청 수락
router.post('/accept', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: '요청 ID가 필요합니다.'
      });
    }

    // 요청 수락
    const request = await FriendRequest.acceptRequest(requestId);

    // 친구 관계 생성
    const friendship = await Friend.createFriendship(
      request.requesterDeviceId,
      request.receiverDeviceId,
      request.requesterNickname,
      request.receiverNickname
    );

    console.log('✅ 친구 요청 수락:', {
      requester: request.requesterNickname,
      receiver: request.receiverNickname
    });

    res.json({
      success: true,
      message: '친구 요청이 수락되었습니다.',
      data: {
        request,
        friendship
      }
    });

  } catch (error) {
    console.error('❌ 친구 요청 수락 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 수락 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 친구 요청 거절
router.post('/decline', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: '요청 ID가 필요합니다.'
      });
    }

    const request = await FriendRequest.declineRequest(requestId);

    console.log('❌ 친구 요청 거절:', {
      requester: request.requesterNickname,
      receiver: request.receiverNickname
    });

    res.json({
      success: true,
      message: '친구 요청이 거절되었습니다.',
      data: request
    });

  } catch (error) {
    console.error('❌ 친구 요청 거절 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 거절 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 룸의 친구 요청 상태 확인
router.get('/status/:roomId/:deviceId', async (req, res) => {
  try {
    const { roomId, deviceId } = req.params;

    const status = await FriendRequest.getRoomRequestStatus(roomId, deviceId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ 친구 요청 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 미처리 친구 요청 목록 조회
router.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 만료된 요청 정리
    await FriendRequest.cleanupExpiredRequests();

    // 미처리 요청 조회
    const pendingRequests = await FriendRequest.getPendingRequests(userId);

    res.json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error('❌ 미처리 친구 요청 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '미처리 친구 요청 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 친구 요청 처리됨 표시
router.post('/mark-processed', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: '요청 ID가 필요합니다.'
      });
    }

    const request = await FriendRequest.markAsProcessed(requestId);

    res.json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('❌ 친구 요청 처리 표시 실패:', error);
    res.status(500).json({
      success: false,
      message: '친구 요청 처리 표시 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;