const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  users: [{
    type: String,
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  distance: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// 방이 2명으로 구성되어야 함
roomSchema.pre('save', function(next) {
  if (this.users.length !== 2) {
    const error = new Error('A room must have exactly 2 users');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);