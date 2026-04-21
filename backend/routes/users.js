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
      'username email avatar status lastSeen publicKey identityPublicKey'
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
 * @route   PUT /api/users/keys
 * @desc    Save/update current user's E2E identity public key
 * @access  Private
 */
router.put('/keys', protect, async (req, res) => {
  try {
    const { identityPublicKey } = req.body;

    if (!identityPublicKey) {
      return res.status(400).json({ message: 'identityPublicKey is required' });
    }

    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(identityPublicKey);
    if (!isBase64 || identityPublicKey.length < 80) {
      return res.status(400).json({ message: 'identityPublicKey format is invalid' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { identityPublicKey },
      { new: true }
    ).select('id username identityPublicKey');

    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update identity key error:', error);
    res.status(500).json({ message: 'Server error while updating identity key' });
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
      'username email avatar status lastSeen publicKey identityPublicKey'
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
    }).select('username email avatar status lastSeen publicKey identityPublicKey');

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
