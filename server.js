require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const escapeHtml = require('escape-html');
const connectDB = require('./config/db');
const User = require('./models/User');
const Message = require('./models/Message');
const apiRoutes = require('./routes/api');

connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://layapp.onrender.com'
].filter(Boolean);

// ✅ FIX: const io — əvvəl var/const yox idi, global leak olurdu
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ FIX: OPTIONS preflight request-lərini handle et
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_connected', async (data) => {
    const { userId } = data;
    if (!userId) return;
    try {
      const user = await User.findById(userId);
      if (user) {
        user.onlineStatus = true;
        user.socketId = socket.id;
        user.lastActive = new Date();
        await user.save();
        socket.userId = userId;
        io.emit('user_status_changed', { userId, status: true });
        console.log(`User ${user.username} online`);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('private_message', async (data) => {
    const { to, text } = data;
    if (!socket.userId || !to || !text) return;
    const sanitizedText = escapeHtml(text);
    try {
      const receiver = await User.findById(to);
      if (!receiver) return;
      const message = new Message({
        sender: socket.userId,
        receiver: to,
        text: sanitizedText,
      });
      await message.save();

      if (receiver.socketId) {
        io.to(receiver.socketId).emit('new_message', {
          sender: socket.userId,
          text: sanitizedText,
          timestamp: message.timestamp,
        });
      }

      socket.emit('new_message', {
        sender: socket.userId,
        text: sanitizedText,
        timestamp: message.timestamp,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        const user = await User.findById(socket.userId);
        if (user) {
          user.onlineStatus = false;
          user.socketId = null;
          user.lastActive = new Date();
          await user.save();
          io.emit('user_status_changed', { userId: socket.userId, status: false });
          console.log(`User ${user.username} offline`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));