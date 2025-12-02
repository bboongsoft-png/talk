const mongoose = require('mongoose');
const { generateUserId } = require('../utils/uuid');

const userSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: false,  // 스키마 레벨 검증 제거, pre save에서 수동 처리
    unique: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  currentStatus: {
    type: String,
    enum: ['idle', 'matching', 'chatting'],
    default: 'idle'
  },
  currentRoomId: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  },
  // 프로필 정보
  profileImage: {
    type: String,
    default: null
  },
  profileImages: {
    type: [String],
    default: [],
    validate: {
      validator: function(images) {
        return images.length <= 5;
      },
      message: '프로필 이미지는 최대 5개까지 등록할 수 있습니다.'
    }
  },
  bio: {
    type: String,
    default: '',
    maxlength: 200
  },
  mbti: {
    type: String,
    default: '',
    enum: ['', 'ENFP', 'ENFJ', 'ENTP', 'ENTJ', 'ESFP', 'ESFJ', 'ESTP', 'ESTJ', 
           'INFP', 'INFJ', 'INTP', 'INTJ', 'ISFP', 'ISFJ', 'ISTP', 'ISTJ']
  },
  hobbies: {
    type: [String],
    default: []
  },
  preferredType: {
    type: String,
    default: '',
    maxlength: 150
  },
  profileUpdatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// userId 자동 생성 (중복 체크 포함)
userSchema.pre('save', async function(next) {
  try {
    // userId가 없는 경우 생성 (새 문서든 기존 문서든 관계없이)
    if (!this.userId) {
      let userId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      console.log(`userId 생성 시작: ${this.nickname} (isNew: ${this.isNew})`);
      
      // 중복되지 않는 userId 생성
      while (!isUnique && attempts < maxAttempts) {
        userId = generateUserId();
        const existingUser = await this.constructor.findOne({ userId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        const error = new Error(`Failed to generate unique userId after ${maxAttempts} attempts`);
        return next(error);
      }
      
      this.userId = userId;
      console.log(`✅ userId 생성 완료: ${this.nickname} (userId: ${userId})`);
    }
    
    // 수동 검증: userId가 반드시 있어야 함
    if (!this.userId) {
      const error = new Error('userId is required but not generated');
      return next(error);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in User pre save hook:', error);
    next(error);
  }
});

// 정적 메서드: deviceId로 사용자 찾기 또는 생성
userSchema.statics.findOrCreateByDeviceId = async function(deviceId, userInfo) {
  let user = await this.findOne({ deviceId });
  
  if (!user) {
    // userId는 pre save 훅에서 자동 생성됨
    user = await this.create({
      deviceId,
      ...userInfo
    });
    console.log(`새 사용자 생성: ${userInfo.nickname} (userId: ${user.userId})`);
  } else {
    // 기존 사용자에게 userId가 없는 경우 생성
    if (!user.userId) {
      // save() 시 pre 훅에서 자동으로 userId 생성됨
      await user.save();
      console.log(`기존 사용자에 userId 추가: ${user.nickname} (userId: ${user.userId})`);
    }
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);