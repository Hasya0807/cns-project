const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/encrypted-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Socket.io connection handling
const onlineUsers = new Map(); // userId -> socket.id

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Register user when they come online
  socket.on('register-user', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('user-status', { userId, status: 'online' });
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Handle new messages
  socket.on('send-message', async (messageData) => {
    const { receiverId, encryptedMessage, senderId, messageId, timestamp } = messageData;

    let resolvedMessageId = messageId;
    let resolvedTimestamp = timestamp || new Date();

    // Persist on socket path when no pre-saved message id is provided.
    // This keeps messages available in history even if a client emits socket-only.
    if (!resolvedMessageId && receiverId && senderId && encryptedMessage?.encryptedMessage && encryptedMessage?.iv) {
      try {
        const newMessage = new Message({
          senderId,
          receiverId,
          encryptedMessage: encryptedMessage.encryptedMessage,
          iv: encryptedMessage.iv,
          authTag: encryptedMessage.authTag || null,
          alg: encryptedMessage.alg || 'AES-256-CBC',
          version: Number(encryptedMessage.version) || 1,
          messageHash: ''
        });

        await newMessage.save();
        resolvedMessageId = newMessage._id.toString();
        resolvedTimestamp = newMessage.createdAt;
      } catch (error) {
        console.error('Socket message persistence failed:', error.message);
      }
    }

    // Emit to receiver if online (don't send encryption key over socket)
    if (onlineUsers.has(receiverId)) {
      const receiverSocketId = onlineUsers.get(receiverId);
      io.to(receiverSocketId).emit('receive-message', {
        id: resolvedMessageId,
        senderId,
        encryptedMessage,
        timestamp: resolvedTimestamp
      });
    }
  });

  // Handle typing indicator
  socket.on('user-typing', ({ recipientId, isTyping }) => {
    if (onlineUsers.has(recipientId)) {
      const recipientSocketId = onlineUsers.get(recipientId);
      io.to(recipientSocketId).emit('typing-indicator', {
        senderId: socket.userId,
        isTyping
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user-status', { userId, status: 'offline' });
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };
