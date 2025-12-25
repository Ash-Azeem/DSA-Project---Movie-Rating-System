const { Review, Movie, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { movie_id, title, content, is_spoiler } = req.body;

    // Check if movie exists
    const movie = await Movie.findByPk(movie_id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Check if user has already reviewed this movie
    const existingReview = await Review.findOne({
      where: {
        user_id: req.user.user_id,
        movie_id
      }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this movie'
      });
    }

    // Create review
    const review = await Review.create({
      user_id: req.user.user_id,
      movie_id,
      title,
      content,
      is_spoiler: is_spoiler || false
    });

    // Get the review with user and movie data
    const newReview = await Review.findByPk(review.review_id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: Movie,
          attributes: ['movie_id', 'title', 'poster_path']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review: newReview
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, is_spoiler } = req.body;

    const review = await Review.findByPk(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    await review.update({
      title: title || review.title,
      content: content || review.content,
      is_spoiler: is_spoiler !== undefined ? is_spoiler : review.is_spoiler
    });

    // Get the updated review with user and movie data
    const updatedReview = await Review.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: Movie,
          attributes: ['movie_id', 'title', 'poster_path']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: updatedReview
      }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.destroy();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get reviews for a movie
// @route   GET /api/reviews/movie/:movieId
// @access  Public
exports.getMovieReviews = async (req, res) => {
  try {
    const { movieId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    // Check if movie exists
    const movie = await Movie.findByPk(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Build order clause
    const validSortFields = ['created_at', 'updated_at', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = [[sortField, sortOrder.toUpperCase()]];

    const { count, rows } = await Review.findAndCountAll({
      where: { movie_id: movieId },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'first_name', 'last_name', 'profile_image_url']
        }
      ],
      order,
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
    console.error('Get movie reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get a single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: Movie,
          attributes: ['movie_id', 'title', 'poster_path']
        }
      ]
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Get review by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};