const { User, Rating, Review, Watchlist } = require('../models');
const { Op } = require('sequelize');

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Rating,
          include: ['Movie']
        },
        {
          model: Review,
          include: ['Movie']
        },
        {
          model: Watchlist,
          include: ['Movie']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user statistics
    const stats = {
      totalRatings: user.Ratings.length,
      totalReviews: user.Reviews.length,
      watchlistCount: user.Watchlists.length,
      averageRating: user.Ratings.length > 0 
        ? (user.Ratings.reduce((sum, rating) => sum + parseFloat(rating.rating), 0) / user.Ratings.length).toFixed(1)
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          bio: user.bio,
          profile_image_url: user.profile_image_url,
          created_at: user.created_at
        },
        stats,
        recentActivity: {
          ratings: user.Ratings.slice(0, 5),
          reviews: user.Reviews.slice(0, 5)
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, bio } = req.body;
    
    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    await user.update({
      first_name: first_name || user.first_name,
      last_name: last_name || user.last_name,
      bio: bio || user.bio
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.user_id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          bio: user.bio,
          profile_image_url: user.profile_image_url
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile picture URL
    const profileImageUrl = `/uploads/${req.file.filename}`;
    await user.update({ profile_image_url: profileImageUrl });

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profile_image_url: profileImageUrl
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile picture'
    });
  }
};

// @desc    Get user's ratings
// @route   GET /api/users/ratings
// @access  Private
exports.getUserRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Rating.findAndCountAll({
      where: { user_id: req.user.user_id },
      include: ['Movie'],
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        ratings: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/users/reviews
// @access  Private
exports.getUserReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Review.findAndCountAll({
      where: { user_id: req.user.user_id },
      include: ['Movie'],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        reviews: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's watchlist
// @route   GET /api/users/watchlist
// @access  Private
exports.getUserWatchlist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Watchlist.findAndCountAll({
      where: { user_id: req.user.user_id },
      include: ['Movie'],
      order: [['added_at', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        watchlist: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by deactivating account
    await user.update({ is_active: false });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
};