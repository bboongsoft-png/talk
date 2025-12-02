const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
const Friend = require('./models/Friend');
const FriendRequest = require('./models/FriendRequest');
const haversine = require('./utils/haversine');

// 매칭 큐 (메모리에 저장)
const matchingQueue = [];

function initializeSocket(io) {
  
  io.on('connection', (socket) => {
    console.log(`새로운 클라이언트 연결: ${socket.id}`);

    // 유저 온라인 상태 업데이트
    socket.on('user_online', async (data) => {
      try {
        const { deviceId, userId } = data;
        console.log('🔄 유저 온라인 상태 업데이트 요청:', { deviceId, userId, socketId: socket.id });
        
        const user = await User.findOneAndUpdate(
          { $or: [{ deviceId }, { userId }] },
          { isOnline: true, socketId: socket.id },
          { new: true }
        );
        
        if (user) {
          console.log(`✅ 유저 온라인 상태 업데이트 성공: ${user.nickname} (userId: ${user.userId}, socketId: ${socket.id})`);
          
          // 기존 매칭 큐에서 해당 사용자 제거 (재연결 시 중복 방지)
          const removedItems = [];
          for (let i = matchingQueue.length - 1; i >= 0; i--) {
            const item = matchingQueue[i];
            if (item.userId === user.userId || item.deviceId === user.deviceId || item.socketId === socket.id) {
              removedItems.push(matchingQueue.splice(i, 1)[0]);
            }
          }
          
          if (removedItems.length > 0) {
            console.log(`🧹 재연결로 인한 기존 큐 항목 정리:`, {
              removedCount: removedItems.length,
              removedUsers: removedItems.map(item => ({ nickname: item.nickname, socketId: item.socketId })),
              newQueueLength: matchingQueue.length
            });
          }
        } else {
          console.error('❌ 유저를 찾을 수 없음:', { deviceId, userId });
        }
      } catch (error) {
        console.error('User online update error:', error);
      }
    });

    // 랜덤 매칭 큐 참가
    socket.on('join_queue', async (data) => {
      try {
        const { deviceId, userId, preventFriendMatching = true } = data;
        
        console.log('🎯 매칭 큐 참가 요청:', {
          deviceId,
          userId,
          preventFriendMatching,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        
        // 유저 정보 확인 (userId 우선, deviceId 백업)
        const user = await User.findOne({ 
          $or: [{ userId }, { deviceId }] 
        });
        
        if (!user) {
          socket.emit('error', { message: '유저 정보를 찾을 수 없습니다.' });
          return;
        }

        // 기존 큐 항목 완전 정리 (사용자 정보 기반)
        const removedItems = [];
        for (let i = matchingQueue.length - 1; i >= 0; i--) {
          const item = matchingQueue[i];
          if (item.userId === user.userId || item.deviceId === user.deviceId) {
            removedItems.push(matchingQueue.splice(i, 1)[0]);
          }
        }
        
        if (removedItems.length > 0) {
          console.log(`🧹 기존 큐 항목 정리 완료:`, {
            removedCount: removedItems.length,
            removedUsers: removedItems.map(item => ({ nickname: item.nickname, socketId: item.socketId })),
            reason: 'join_queue 요청으로 인한 중복 제거'
          });
        }
        
        // 현재 소켓ID 기반 중복 검사 (추가 안전장치)
        const socketDuplicateIndex = matchingQueue.findIndex(item => item.socketId === socket.id);
        if (socketDuplicateIndex !== -1) {
          const removed = matchingQueue.splice(socketDuplicateIndex, 1)[0];
          console.log(`🧹 소켓ID 기반 중복 항목 제거:`, {
            removed: { nickname: removed.nickname, socketId: removed.socketId },
            reason: '동일 소켓ID 중복 방지'
          });
        }

        // 큐에 추가
        const queueItem = {
          userId: user.userId,
          deviceId: user.deviceId,
          socketId: socket.id,
          location: user.location,
          nickname: user.nickname,
          preventFriendMatching: preventFriendMatching,
          joinedAt: new Date()
        };

        matchingQueue.push(queueItem);
        console.log(`✅ 매칭 큐 참가 완료: ${user.nickname}`, {
          userId: user.userId,
          preventFriendMatching,
          queueLength: matchingQueue.length,
          timestamp: new Date().toISOString()
        });

        // 매칭 시도
        if (matchingQueue.length >= 2) {
          console.log('🔄 매칭 시도 시작 - 큐 길이:', matchingQueue.length);
          await attemptMatching();
        }

      } catch (error) {
        console.error('Join queue error:', error);
        socket.emit('error', { message: '매칭 참가 중 오류가 발생했습니다.' });
      }
    });

    // 매칭 큐에서 나가기
    socket.on('leave_queue', (data) => {
      try {
        const { deviceId } = data;
        const index = matchingQueue.findIndex(item => item.deviceId === deviceId);
        
        console.log('🚺 매칭 큐 나가기 요청:', {
          deviceId,
          found: index !== -1,
          queueLength: matchingQueue.length,
          timestamp: new Date().toISOString()
        });
        
        if (index !== -1) {
          const removedUser = matchingQueue.splice(index, 1)[0];
          console.log(`✅ 매칭 큐에서 제거 완료:`, {
            removedUser: { nickname: removedUser.nickname, userId: removedUser.userId },
            newQueueLength: matchingQueue.length,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('⚠️ 매칭 큐에서 해당 사용자를 찾을 수 없음:', deviceId);
        }
      } catch (error) {
        console.error('❌ Leave queue error:', {
          error: error.message,
          deviceId: data?.deviceId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 채팅 메시지 전송 (텍스트, 이미지, 비디오)
    socket.on('send_message', async (data) => {
      try {
        const { roomId, senderId, message, messageType, mediaUrl, mediaSize, mediaDuration } = data;

        // 메시지 저장
        const messageData = {
          roomId,
          senderId, // 이미 userId임
          messageType: messageType || 'text'
        };

        // 메시지 타입에 따른 데이터 설정
        if (messageType === 'text' || messageType === 'system') {
          messageData.message = message;
        } else if (messageType === 'image' || messageType === 'video') {
          messageData.mediaUrl = mediaUrl;
          messageData.mediaSize = mediaSize;
          if (messageType === 'video' && mediaDuration) {
            messageData.mediaDuration = mediaDuration;
          }
        }

        const newMessage = new Message(messageData);
        await newMessage.save();

        // 방에 있는 모든 유저에게 메시지 전송
        const room = await Room.findById(roomId);
        if (room) {
          console.log('📨 메시지 브로드캐스트 시작:', {
            roomId,
            senderId,
            roomUsers: room.users,
            messageType: newMessage.messageType
          });

          // Room.users는 이제 userId 배열이므로 userId로 사용자 조회
          const roomUsers = await User.find({
            userId: { $in: room.users }
          });

          console.log('🔍 방 사용자 조회 결과:', roomUsers.map(u => ({
            userId: u.userId,
            nickname: u.nickname,
            socketId: u.socketId,
            isOnline: u.isOnline
          })));

          const messagePayload = {
            messageId: newMessage._id,
            messageType: newMessage.messageType,
            senderId: newMessage.senderId,
            createdAt: newMessage.createdAt
          };

          // 메시지 타입에 따른 페이로드 설정
          if (newMessage.messageType === 'text' || newMessage.messageType === 'system') {
            messagePayload.message = newMessage.message;
          } else if (newMessage.messageType === 'image' || newMessage.messageType === 'video') {
            messagePayload.mediaUrl = newMessage.mediaUrl;
            messagePayload.mediaSize = newMessage.mediaSize;
            if (newMessage.messageType === 'video' && newMessage.mediaDuration) {
              messagePayload.mediaDuration = newMessage.mediaDuration;
            }
          }

          // 메시지 전송자를 제외한 다른 사용자들에게 메시지 전송
          roomUsers.forEach(user => {
            if (user.socketId && user.userId !== senderId) {
              console.log(`📤 메시지 전송: ${user.nickname} (socketId: ${user.socketId})`);
              io.to(user.socketId).emit('receive_message', messagePayload);
            }
          });

          console.log(`✅ 메시지 저장 완료: ${messagePayload.messageId}`);
        }

        // 발신자에게 확인 메시지
        const confirmPayload = {
          messageId: newMessage._id,
          messageType: newMessage.messageType,
          createdAt: newMessage.createdAt
        };

        if (newMessage.messageType === 'text' || newMessage.messageType === 'system') {
          confirmPayload.message = newMessage.message;
        } else if (newMessage.messageType === 'image' || newMessage.messageType === 'video') {
          confirmPayload.mediaUrl = newMessage.mediaUrl;
          confirmPayload.mediaSize = newMessage.mediaSize;
          if (newMessage.messageType === 'video' && newMessage.mediaDuration) {
            confirmPayload.mediaDuration = newMessage.mediaDuration;
          }
        }

        socket.emit('message_sent', confirmPayload);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
      }
    });

    // 방 나가기
    socket.on('leave_room', async (data) => {
      try {
        const { roomId, deviceId } = data;

        // 방 비활성화
        const room = await Room.findByIdAndUpdate(roomId, { isActive: false }, { new: true });

        if (room) {
          // 나가는 사용자 찾기
          const leavingUser = await User.findOne({ 
            $or: [{ deviceId }, { userId: deviceId }] 
          });

          if (leavingUser) {
            // 사용자들의 상태를 idle로 변경
            await User.updateMany(
              { userId: { $in: room.users } },
              {
                currentStatus: 'idle',
                currentRoomId: null
              }
            );

            // 상대방에게 알림
            const partnerUsers = await User.find({
              userId: { $in: room.users },
              userId: { $ne: leavingUser.userId }
            });

            partnerUsers.forEach(user => {
              if (user.socketId) {
                io.to(user.socketId).emit('room_closed', {
                  message: '상대방이 채팅을 종료했습니다.'
                });
              }
            });
          }
        }

        console.log(`방 나가기: ${deviceId} (${roomId})`);

      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // 친구 요청 전송
    socket.on('send_friend_request', async (data) => {
      try {
        const { roomId, requesterDeviceId, receiverDeviceId, requesterNickname, receiverNickname } = data;
        
        console.log(`📫 친구 요청 데이터 수신:`, {
          roomId,
          requesterDeviceId,
          receiverDeviceId,
          requesterNickname,
          receiverNickname
        });

        // 친구 요청 생성 (deviceId는 실제로 userId임)
        const request = await FriendRequest.createRequest(
          requesterDeviceId, // 실제로는 userId
          receiverDeviceId,  // 실제로는 userId
          requesterNickname,
          receiverNickname,
          roomId
        );

        console.log(`📫 친구 요청 생성 완료: ${requesterNickname} → ${receiverNickname}, requestId: ${request._id}`);
        
        // 상대방에게 친구 요청 알림 (userId 기준으로 조회)
        const receiver = await User.findOne({ userId: receiverDeviceId });
        
        console.log(`🔍 수신자 조회 결과:`, {
          receiverUserId: receiverDeviceId,
          found: !!receiver,
          nickname: receiver?.nickname,
          socketId: receiver?.socketId,
          isOnline: receiver?.isOnline
        });

        if (receiver && receiver.socketId) {
          console.log(`📬 상대방에게 friend_request_received 이벤트 전송 (socketId: ${receiver.socketId})`);
          io.to(receiver.socketId).emit('friend_request_received', {
            requestId: request._id,
            requesterNickname,
            requesterDeviceId,
            roomId
          });
        } else {
          console.log(`❌ 상대방이 오프라인이거나 소켓 ID가 없음`);
        }

        // 요청자에게 전송 완료 알림
        console.log(`📤 요청자에게 friend_request_sent 이벤트 전송`);
        socket.emit('friend_request_sent', {
          requestId: request._id,
          status: 'pending',
          receiverNickname
        });

      } catch (error) {
        console.error('Send friend request error:', error);
        socket.emit('error', { message: '친구 요청 전송 중 오류가 발생했습니다.' });
      }
    });

    // 친구 요청 수락
    socket.on('accept_friend_request', async (data) => {
      try {
        const { requestId } = data;
        
        console.log('🤝 친구 요청 수락 시작:', { requestId });
        console.log('📋 현재 소켓 ID:', socket.id);
        
        // 요청 수락 및 친구 관계 생성
        const request = await FriendRequest.acceptRequest(requestId);
        
        console.log('📋 Friend.createFriendship 호출 데이터:', {
          requesterUserId: request.requesterUserId,
          receiverUserId: request.receiverUserId,
          requesterNickname: request.requesterNickname,
          receiverNickname: request.receiverNickname
        });
        
        const friendship = await Friend.createFriendship(
          request.requesterUserId,
          request.receiverUserId,
          request.requesterNickname,
          request.receiverNickname,
          request.roomId
        );

        console.log(`✅ 친구 요청 수락: ${request.requesterNickname} ↔ ${request.receiverNickname}`);
        console.log('🔗 생성된 friendship 데이터:', {
          friendshipId: friendship._id,
          roomId: friendship.roomId,
          requesterUserId: friendship.requesterUserId,
          receiverUserId: friendship.receiverUserId
        });
        
        // 양쪽 사용자에게 알림 (새 친구 데이터 포함)
        console.log('👥 사용자 조회 시작:', {
          requesterUserId: request.requesterUserId,
          receiverUserId: request.receiverUserId
        });
        
        const users = await User.find({
          userId: { $in: [request.requesterUserId, request.receiverUserId] }
        });
        
        console.log('👥 조회된 사용자들:', users.map(u => ({
          userId: u.userId,
          nickname: u.nickname,
          socketId: u.socketId,
          isOnline: u.isOnline
        })));

        console.log('📤 이벤트 전송 시작. 대상 사용자 수:', users.length);
        
        if (users.length === 0) {
          console.error('❌ 소켓 연결된 사용자가 없음! 이벤트 전송 불가');
          return;
        }
        
        users.forEach(user => {
          console.log('🔍 사용자 처리:', {
            userId: user.userId,
            nickname: user.nickname,
            socketId: user.socketId,
            hasSocketId: !!user.socketId
          });
          
          if (user.socketId) {
            const isRequester = user.userId === request.requesterUserId;
            const partnerNickname = isRequester ? request.receiverNickname : request.requesterNickname;
            const partnerUserId = isRequester ? request.receiverUserId : request.requesterUserId;
            
            // 새 친구 데이터 생성
            const newFriend = {
              friendshipId: friendship._id,
              friendUserId: partnerUserId,
              friendNickname: partnerNickname,
              myNickname: isRequester ? request.requesterNickname : request.receiverNickname,
              roomId: friendship.roomId,
              lastMessage: '',
              lastMessageAt: friendship.lastMessageAt || friendship.createdAt,
              createdAt: friendship.createdAt
            };
            
            console.log('🎯 생성된 newFriend 데이터:', newFriend);
            
            // 친구 요청 수락 알림
            console.log(`📤 friend_request_accepted 이벤트 전송 → ${user.nickname} (socketId: ${user.socketId})`);
            io.to(user.socketId).emit('friend_request_accepted', {
              friendship,
              partnerNickname,
              newFriend
            });
            
            // 친구 목록 업데이트 전용 이벤트 발송
            console.log(`📤 friend_list_updated 이벤트 전송 → ${user.nickname} (socketId: ${user.socketId})`);
            io.to(user.socketId).emit('friend_list_updated', {
              action: 'add',
              friend: newFriend
            });
            
            console.log('✅ 이벤트 전송 완료:', user.nickname);
          } else {
            console.warn(`⚠️ ${user.nickname}(${user.userId})의 socketId가 없음`);
          }
        });

      } catch (error) {
        console.error('Accept friend request error:', error);
        socket.emit('error', { message: '친구 요청 수락 중 오류가 발생했습니다.' });
      }
    });

    // 친구 요청 거절
    socket.on('decline_friend_request', async (data) => {
      try {
        const { requestId } = data;
        
        const request = await FriendRequest.declineRequest(requestId);

        console.log(`❌ 친구 요청 거절: ${request.requesterNickname} ← ${request.receiverNickname}`);
        
        // 요청자에게 거절 알림
        const requester = await User.findOne({ userId: request.requesterUserId });
        if (requester && requester.socketId) {
          io.to(requester.socketId).emit('friend_request_declined', {
            partnerNickname: request.receiverNickname
          });
        }

      } catch (error) {
        console.error('Decline friend request error:', error);
        socket.emit('error', { message: '친구 요청 거절 중 오류가 발생했습니다.' });
      }
    });

    // 연결 해제
    socket.on('disconnect', async () => {
      console.log('🔌 클라이언트 연결 해제 시작:', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      try {
        // 유저 오프라인 상태로 변경 및 상태 초기화
        const user = await User.findOneAndUpdate(
          { socketId: socket.id },
          { 
            isOnline: false, 
            socketId: null,
            currentStatus: 'idle',
            currentRoomId: null
          },
          { new: true }
        );
        
        if (user) {
          console.log(`❌ 사용자 오프라인 처리 완료:`, {
            nickname: user.nickname,
            userId: user.userId,
            socketId: socket.id
          });
        } else {
          console.log('⚠️ 연결 해제된 소켓에 해당하는 사용자를 찾을 수 없음:', socket.id);
        }

        // 매칭 큐에서 제거
        const queueIndex = matchingQueue.findIndex(item => item.socketId === socket.id);
        if (queueIndex !== -1) {
          const removedUser = matchingQueue.splice(queueIndex, 1)[0];
          console.log(`🗑️ 연결 해제로 인한 매칭 큐 제거:`, {
            removedUser: { nickname: removedUser.nickname, userId: removedUser.userId },
            newQueueLength: matchingQueue.length
          });
        } else {
          console.log('ℹ️ 매칭 큐에 해당 사용자 없음:', socket.id);
        }

        console.log(`✅ 클라이언트 연결 해제 완료: ${socket.id}`);
      } catch (error) {
        console.error('❌ Disconnect 처리 중 오류:', {
          error: error.message,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  // 친구 관계 확인 헬퍼 함수 (DB 조회 기반)
  async function checkIfFriends(user1, user2) {
    console.log('🔍 친구 관계 확인 시작:', {
      user1: { userId: user1.userId, nickname: user1.nickname },
      user2: { userId: user2.userId, nickname: user2.nickname },
      timestamp: new Date().toISOString()
    });
    
    try {
      // Friend 모델에서 직접 친구 관계 조회
      const friendship = await Friend.findOne({
        $or: [
          { requesterUserId: user1.userId, receiverUserId: user2.userId },
          { requesterUserId: user2.userId, receiverUserId: user1.userId }
        ],
        isActive: true
      });
      
      const isFriend = !!friendship;
      
      console.log('🔍 친구 관계 확인 결과:', {
        user1Nickname: user1.nickname,
        user2Nickname: user2.nickname,
        isFriend,
        friendshipId: friendship?._id,
        timestamp: new Date().toISOString()
      });
      
      return isFriend;
    } catch (error) {
      console.error('❌ 친구 관계 확인 중 오류:', error);
      return false; // 오류 발생 시 친구가 아닌 것으로 처리
    }
  }

  // 매칭 시도 함수
  async function attemptMatching() {
    if (matchingQueue.length < 2) {
      console.log('⏸️ 매칭 시도 중단: 큐에 충분한 사용자가 없음 (현재:', matchingQueue.length, '명)');
      return;
    }

    try {
      console.log('🎯 매칭 시도 시작:', {
        queueLength: matchingQueue.length,
        queueUsers: matchingQueue.map(u => ({ nickname: u.nickname, preventFriendMatching: u.preventFriendMatching })),
        timestamp: new Date().toISOString()
      });
      
      // 큐에서 두 유저 가져오기 (FIFO)
      const user1 = matchingQueue.shift();
      const user2 = matchingQueue.shift();
      
      console.log('👥 매칭 후보:', {
        user1: { nickname: user1.nickname, userId: user1.userId, preventFriendMatching: user1.preventFriendMatching },
        user2: { nickname: user2.nickname, userId: user2.userId, preventFriendMatching: user2.preventFriendMatching }
      });

      // 둘 중 하나라도 친구 매칭 방지가 활성화되어 있으면 친구 관계 확인
      const shouldCheckFriendship = user1.preventFriendMatching || user2.preventFriendMatching;
      
      console.log('🔒 친구 매칭 방지 검사 필요:', shouldCheckFriendship);
      
      if (shouldCheckFriendship) {
        const isFriend = await checkIfFriends(user1, user2);
        if (isFriend) {
          console.log(`🚫 친구 매칭 방지 적용: ${user1.nickname} ↔ ${user2.nickname}는 이미 친구관계입니다.`);
          
          // 한 명을 큐 맨 뒤로 보내고 다른 사용자와 매칭 시도
          matchingQueue.push(user2);
          matchingQueue.unshift(user1);
          
          console.log('🔄 큐 재배치 완료. 다시 매칭 시도:', {
            queueLength: matchingQueue.length,
            frontUser: matchingQueue[0]?.nickname,
            timestamp: new Date().toISOString()
          });
          
          // 다른 매칭 시도 (무한루프 방지를 위해 조건 추가)
          if (matchingQueue.length >= 2) {
            await attemptMatching();
          }
          return;
        } else {
          console.log('✅ 친구 관계 아님 - 매칭 진행 가능');
        }
      } else {
        console.log('⏭️ 친구 매칭 방지 비활성화 - 친구 관계 검사 건너뜀');
      }

      // 거리 계산
      const distance = haversine(
        user1.location.lat,
        user1.location.lng,
        user2.location.lat,
        user2.location.lng
      );
      
      console.log('📏 거리 계산 완료:', {
        user1: { nickname: user1.nickname, lat: user1.location.lat, lng: user1.location.lng },
        user2: { nickname: user2.nickname, lat: user2.location.lat, lng: user2.location.lng },
        distance: `${distance}km`
      });

      // 방 생성
      const room = new Room({
        users: [user1.userId, user2.userId],
        distance: distance
      });
      await room.save();

      console.log(`🎉 매칭 성공:`, {
        user1: { nickname: user1.nickname, userId: user1.userId },
        user2: { nickname: user2.nickname, userId: user2.userId },
        roomId: room._id,
        distance: `${distance}km`,
        timestamp: new Date().toISOString()
      });

      // 두 유저에게 매칭 성공 알림
      const matchData1 = {
        roomId: room._id,
        partnerNickname: user2.nickname,
        partnerUserId: user2.userId,
        partnerDeviceId: user2.deviceId,
        distance: distance,
        message: `${user2.nickname}님과 매칭되었습니다!`
      };
      
      const matchData2 = {
        roomId: room._id,
        partnerNickname: user1.nickname,
        partnerUserId: user1.userId,
        partnerDeviceId: user1.deviceId,
        distance: distance,
        message: `${user1.nickname}님과 매칭되었습니다!`
      };

      console.log(`📤 매칭 알림 전송:`, {
        to: user1.nickname,
        socketId: user1.socketId,
        partnerNickname: user2.nickname
      });
      io.to(user1.socketId).emit('match_success', matchData1);

      console.log(`📤 매칭 알림 전송:`, {
        to: user2.nickname,
        socketId: user2.socketId,
        partnerNickname: user1.nickname
      });
      io.to(user2.socketId).emit('match_success', matchData2);

    } catch (error) {
      console.error('❌ 매칭 처리 중 오류 발생:', {
        error: error.message,
        stack: error.stack,
        user1: user1 ? { nickname: user1.nickname, userId: user1.userId } : 'undefined',
        user2: user2 ? { nickname: user2.nickname, userId: user2.userId } : 'undefined',
        timestamp: new Date().toISOString()
      });
      
      // 오류 발생 시 유저들을 다시 큐에 추가
      if (user1) {
        matchingQueue.unshift(user1);
        console.log(`🔄 user1(${user1.nickname}) 큐에 재추가`);
      }
      if (user2) {
        matchingQueue.unshift(user2);
        console.log(`🔄 user2(${user2.nickname}) 큐에 재추가`);
      }
    }
  }
}

module.exports = initializeSocket;