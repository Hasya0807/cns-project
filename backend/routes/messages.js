const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/messages/send
 * @desc    Send an encrypted message
 * @access  Private
 */
router.post('/send', protect, async (req, res) => {
  try {
    const { receiverId, encryptedMessage, iv, authTag, alg, version } = req.body;
    const senderId = req.user.id;
    const normalizedAlg = alg || 'AES-256-CBC';
    const normalizedVersion = Number(version) || 1;

    // Validation
    if (!receiverId || !encryptedMessage || !iv) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['AES-256-CBC', 'AES-256-GCM'].includes(normalizedAlg)) {
      return res.status(400).json({ message: 'Unsupported encryption algorithm' });
    }

    if (![1, 2].includes(normalizedVersion)) {
      return res.status(400).json({ message: 'Unsupported encryption version' });
    }

    if (normalizedAlg === 'AES-256-GCM' && !authTag) {
      return res.status(400).json({ message: 'authTag is required for AES-256-GCM' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    try {

      const newMessage = new Message({
        senderId,
        receiverId,
        encryptedMessage,
        iv,
        authTag: normalizedAlg === 'AES-256-GCM' ? authTag : null,
        alg: normalizedAlg,
        version: normalizedVersion,
        messageHash: '' // Not needed for client-side encryption
      });

      await newMessage.save();

      res.status(201).json({
        success: true,
        message: {
          id: newMessage._id,
          encryptedMessage: newMessage.encryptedMessage,
          iv: newMessage.iv,
          authTag: newMessage.authTag,
          alg: newMessage.alg,
          version: newMessage.version,
          timestamp: newMessage.createdAt
        }
      });
    } catch (dbError) {
      return res.status(400).json({ message: `Database error: ${dbError.message}` });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get conversation with a specific user
 * @access  Private
 */
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch messages between two users
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar');

    // Count total messages
    const total = await Message.countDocuments({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    });

    // Mark messages as read
    await Message.updateMany(
      { senderId: userId, receiverId: currentUserId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

/**
 * @route   GET /api/messages/unread
 * @desc    Get count of unread messages
 * @access  Private
 */
router.get('/unread', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
});

module.exports = router;
