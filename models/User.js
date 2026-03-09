const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    lowercase: true,
    required: true,
  },
  onlineStatus: {
    type: Boolean,
    default: false,
  },
  socketId: {
    type: String,
    default: null,
  },
  lastActive: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('User', userSchema);