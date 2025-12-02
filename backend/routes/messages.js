const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// 특정 방의 메시지 조회 (페이지네이션 지원)
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0, userId } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId가 필요합니다.'
      });
    }

    // 메시지 조회 - 생성 시간 순으로 정렬 (오래된 것부터)
    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 }) // 오래된 메시지부터
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // 메시지를 프론트엔드 형식으로 변환
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      messageId: msg._id,
      text: msg.message,
      message: msg.message, // 호환성을 위해 둘 다 포함
      messageType: msg.messageType || 'text',
      mediaUrl: msg.mediaUrl,
      mediaSize: msg.mediaSize,
      mediaDuration: msg.mediaDuration,
      senderId: msg.senderId,
      createdAt: msg.createdAt,
      isOwn: msg.senderId === userId // userId가 제공된 경우에만 설정
    }));

    // 총 메시지 개수도 함께 반환 (페이지네이션 정보용)
    const totalCount = await Message.countDocuments({ roomId });

    console.log(`📋 방 ${roomId}의 메시지 조회:`, {
      총개수: totalCount,
      조회개수: formattedMessages.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      message: '메시지 조회가 완료되었습니다.',
      data: {
        messages: formattedMessages,
        totalCount,
        hasMore: parseInt(offset) + formattedMessages.length < totalCount,
        currentOffset: parseInt(offset),
        currentLimit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ 메시지 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '메시지 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 사용자의 최근 메시지가 있는 방 목록 조회
router.get('/rooms/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId가 필요합니다.'
      });
    }

    // 사용자가 메시지를 보낸 방들의 최근 메시지 조회
    const recentRooms = await Message.aggregate([
      // 해당 사용자가 참여한 메시지만 필터
      { $match: { senderId: userId } },
      
      // 방별로 그룹화하고 최신 메시지 찾기
      {
        $group: {
          _id: '$roomId',
          lastMessage: { $last: '$message' },
          lastMessageAt: { $last: '$createdAt' },
          lastMessageType: { $last: '$messageType' },
          messageCount: { $sum: 1 }
        }
      },
      
      // 최근 메시지 시간순으로 정렬
      { $sort: { lastMessageAt: -1 } },
      
      // 제한
      { $limit: parseInt(limit) }
    ]);

    console.log(`📋 사용자 ${userId}의 최근 대화방 조회:`, recentRooms.length, '개');

    res.json({
      success: true,
      message: '최근 대화방 조회가 완료되었습니다.',
      data: recentRooms
    });

  } catch (error) {
    console.error('❌ 최근 대화방 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '최근 대화방 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 방의 메시지 개수 조회
router.get('/:roomId/count', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId가 필요합니다.'
      });
    }

    const count = await Message.countDocuments({ roomId });

    res.json({
      success: true,
      message: '메시지 개수 조회가 완료되었습니다.',
      data: { roomId, count }
    });

  } catch (error) {
    console.error('❌ 메시지 개수 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '메시지 개수 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;