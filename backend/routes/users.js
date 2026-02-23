const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users except current user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      'username email avatar status lastSeen publicKey'
    );

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'username email avatar status lastSeen publicKey'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

/**
 * @route   GET /api/users/search/:query
 * @desc    Search users by username
 * @access  Private
 */
router.get('/search/:query', protect, async (req, res) => {
  try {
    const { query } = req.params;
    const currentUserId = req.user.id;

    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    }).select('username email avatar status lastSeen publicKey');

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
});

module.exports = router;
