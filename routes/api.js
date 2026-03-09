const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

const router = express.Router();

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ msg: 'Username is required' });
  }
  try {
    let user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      user = new User({ username: username.toLowerCase() });
      await user.save();
    }
    res.json(user.toObject());
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/messages/:chatId
router.get('/messages/:chatId', async (req, res) => {
  const { chatId } = req.params;
  try {
    const [id1, id2] = chatId.split('_');
    if (!mongoose.Types.ObjectId.isValid(id1) || !mongoose.Types.ObjectId.isValid(id2)) {
      return res.status(400).json({ msg: 'Invalid chatId format' });
    }
    const messages = await Message.find({
      $or: [
        { sender: id1, receiver: id2 },
        { sender: id2, receiver: id1 },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    messages.reverse();
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/users/active — BUTİN userləri qaytar (özünü frontend filtrəleyir)
router.get('/users/active', async (req, res) => {
  try {
    const users = await User.find({}).lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;