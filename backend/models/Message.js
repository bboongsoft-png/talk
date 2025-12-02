const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: function() {
      return this.messageType === 'text' || this.messageType === 'system';
    },
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'image', 'video'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.messageType === 'image' || this.messageType === 'video';
    }
  },
  mediaSize: {
    type: Number,
    default: null
  },
  mediaDuration: {
    type: Number, // 비디오 재생 시간(초)
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);