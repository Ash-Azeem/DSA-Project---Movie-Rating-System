const { Watchlist, Movie } = require('../models');
const { Op } = require('sequelize');

// @desc    Add movie to watchlist
// @route   POST /api/watchlists
// @access  Private
exports.addToWatchlist = async (req, res) => {
  try {
    const { movie_id } = req.body;

    // Check if movie exists
    const movie = await Movie.findByPk(movie_id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Check if movie is already in watchlist
    const existingItem = await Watchlist.findOne({
      where: {
        user_id: req.user.user_id,
        movie_id
      }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Movie is already in your watchlist'
      });
    }

    // Add to watchlist
    const watchlistItem = await Watchlist.create({
      user_id: req.user.user_id,
      movie_id
    });

    // Get the watchlist item with movie data
    const newItem = await Watchlist.findByPk(watchlistItem.watchlist_id, {
      include: ['Movie']
    });

    res.status(201).json({
      success: true,
      message: 'Added to watchlist successfully',
      data: {
        watchlistItem: newItem
      }
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove movie from watchlist
// @route   DELETE /api/watchlists/:movieId
// @access  Private
exports.removeFromWatchlist = async (req, res) => {
  try {
    const { movieId } = req.params;

    const watchlistItem = await Watchlist.findOne({
      where: {
        user_id: req.user.user_id,
        movie_id: movieId
      }
    });

    if (!watchlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found in watchlist'
      });
    }

    await watchlistItem.destroy();

    res.status(200).json({
      success: true,
      message: 'Removed from watchlist successfully'
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's watchlist
// @route   GET /api/watchlists
// @access  Private
exports.getWatchlist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'added_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    // Build order clause
    const validSortFields = ['added_at', 'title', 'release_date'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'added_at';
    
    let order;
    if (sortField === 'title') {
      order = [[Movie, sortField, sortOrder.toUpperCase()]];
    } else if (sortField === 'release_date') {
      order = [[Movie, sortField, sortOrder.toUpperCase()]];
    } else {
      order = [[sortField, sortOrder.toUpperCase()]];
    }

    const { count, rows } = await Watchlist.findAndCountAll({
      where: { user_id: req.user.user_id },
      include: ['Movie'],
      order,
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
    console.error('Get watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check if movie is in watchlist
// @route   GET /api/watchlists/check/:movieId
// @access  Private
exports.checkInWatchlist = async (req, res) => {
  try {
    const { movieId } = req.params;

    const watchlistItem = await Watchlist.findOne({
      where: {
        user_id: req.user.user_id,
        movie_id: movieId
      }
    });

    res.status(200).json({
      success: true,
      data: {
        isInWatchlist: !!watchlistItem
      }
    });
  } catch (error) {
    console.error('Check watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};