const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 로그인/회원가입 (디바이스 기반)
router.post('/login', async (req, res) => {
  try {
    const { deviceId, nickname, location } = req.body;

    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: '디바이스 ID는 필수입니다.' 
      });
    }

    // 사용자 찾기 또는 생성
    const user = await User.findOrCreateByDeviceId(deviceId, {
      nickname: nickname || '익명',
      location: location || { lat: 0, lng: 0 }
    });

    res.json({
      success: true,
      message: user.isNew ? '새 계정이 생성되었습니다.' : '로그인 성공',
      data: {
        userId: user.userId,
        nickname: user.nickname,
        isOnline: user.isOnline
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

// 닉네임 등록/업데이트 (기존 호환성 유지)
router.post('/upsert', async (req, res) => {
  try {
    const { nickname, deviceId } = req.body;

    if (!nickname || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: '닉네임과 디바이스 ID는 필수입니다.' 
      });
    }

    // 닉네임 길이 체크
    if (nickname.length > 20) {
      return res.status(400).json({
        success: false,
        message: '닉네임은 20자 이하로 입력해주세요.'
      });
    }

    // 기존 유저 찾기 또는 새로 생성
    let user = await User.findOrCreateByDeviceId(deviceId, { nickname });

    // 닉네임 변경 차단 로직 (기존 유저의 경우)
    if (!user.isNew && user.nickname !== nickname) {
      console.log(`🚫 닉네임 변경 시도 차단: ${user.nickname} → ${nickname} (userId: ${user.userId})`);
      return res.status(403).json({
        success: false,
        message: '닉네임은 변경할 수 없습니다.',
        user: {
          id: user._id,
          userId: user.userId,
          nickname: user.nickname,
          deviceId: user.deviceId
        }
      });
    }

    // 새 유저이거나 같은 닉네임인 경우에만 진행
    if (user.isNew && user.nickname !== nickname) {
      // 새 유저의 경우에만 닉네임 업데이트 허용
      user.nickname = nickname;
      await user.save();
      console.log(`✅ 새 유저 닉네임 설정: ${nickname} (userId: ${user.userId})`);
    }

    res.json({
      success: true,
      message: '유저 정보가 저장되었습니다.',
      user: {
        id: user._id,
        userId: user.userId,
        nickname: user.nickname,
        deviceId: user.deviceId
      }
    });

  } catch (error) {
    console.error('User upsert error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 위치 업데이트
router.post('/location', async (req, res) => {
  try {
    const { deviceId, lat, lng } = req.body;

    if (!deviceId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: '디바이스 ID와 위치 정보는 필수입니다.'
      });
    }

    // 위치 유효성 검사
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: '올바른 위치 정보를 입력해주세요.'
      });
    }

    const user = await User.findOne({ deviceId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.'
      });
    }

    user.location.lat = lat;
    user.location.lng = lng;
    await user.save();

    res.json({
      success: true,
      message: '위치가 업데이트되었습니다.',
      location: user.location
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 유저 정보 조회
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findOne({ deviceId }).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        nickname: user.nickname,
        deviceId: user.deviceId,
        location: user.location,
        isOnline: user.isOnline,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('User get error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 프로필 업데이트
router.put('/profile/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { nickname, bio, mbti, hobbies, preferredType, profileImage, profileImages } = req.body;

    console.log('👤 프로필 업데이트 요청:', { deviceId, nickname, mbti, hobbies: hobbies?.length, profileImagesCount: profileImages?.length });

    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 프로필 정보 업데이트
    if (nickname !== undefined) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    if (mbti !== undefined) user.mbti = mbti;
    if (hobbies !== undefined) user.hobbies = hobbies;
    if (preferredType !== undefined) user.preferredType = preferredType;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (profileImages !== undefined) user.profileImages = profileImages;
    
    user.profileUpdatedAt = new Date();
    
    await user.save();

    console.log('✅ 프로필 업데이트 완료:', user.nickname);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: {
        userId: user.userId,
        nickname: user.nickname,
        bio: user.bio,
        mbti: user.mbti,
        hobbies: user.hobbies,
        preferredType: user.preferredType,
        profileImage: user.profileImage,
        profileImages: user.profileImages,
        profileUpdatedAt: user.profileUpdatedAt
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 프로필 조회
router.get('/profile/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.userId,
        nickname: user.nickname,
        bio: user.bio,
        mbti: user.mbti,
        hobbies: user.hobbies,
        preferredType: user.preferredType,
        profileImage: user.profileImage,
        profileImages: user.profileImages,
        profileUpdatedAt: user.profileUpdatedAt
      }
    });

  } catch (error) {
    console.error('User get error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 프로필 조회
router.get('/profile/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        nickname: user.nickname,
        profileImage: user.profileImage,
        profileImages: user.profileImages,
        bio: user.bio,
        mbti: user.mbti,
        hobbies: user.hobbies,
        preferredType: user.preferredType,
        profileUpdatedAt: user.profileUpdatedAt
      }
    });

  } catch (error) {
    console.error('Profile get error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
});

// 프로필 업데이트
router.put('/profile/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { nickname, bio, mbti, hobbies, preferredType, profileImage } = req.body;

    const user = await User.findOne({ deviceId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 닉네임 중복 체크 (자신 제외)
    if (nickname && nickname !== user.nickname) {
      const existingUser = await User.findOne({ 
        nickname, 
        deviceId: { $ne: deviceId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '이미 사용 중인 닉네임입니다.'
        });
      }
    }

    // 프로필 업데이트
    const updateData = {
      profileUpdatedAt: new Date()
    };

    if (nickname) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (mbti) updateData.mbti = mbti;
    if (hobbies !== undefined) updateData.hobbies = hobbies;
    if (preferredType !== undefined) updateData.preferredType = preferredType;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (profileImages !== undefined) updateData.profileImages = profileImages;

    const updatedUser = await User.findOneAndUpdate(
      { deviceId },
      updateData,
      { new: true }
    );

    console.log('✅ 프로필 업데이트 완료:', { deviceId, nickname });

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      data: {
        nickname: updatedUser.nickname,
        profileImage: updatedUser.profileImage,
        profileImages: updatedUser.profileImages,
        bio: updatedUser.bio,
        mbti: updatedUser.mbti,
        hobbies: updatedUser.hobbies,
        preferredType: updatedUser.preferredType,
        profileUpdatedAt: updatedUser.profileUpdatedAt
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: '프로필 업데이트 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;