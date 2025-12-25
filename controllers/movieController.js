const { Movie, Genre, Rating, Review, User, Watchlist } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// @desc    Get all movies with pagination, filtering, and sorting
// @route   GET /api/movies
// @access  Public
exports.getMovies = async (req, res) => {
  console.log('🎬 getNewReleases controller was called!'); 
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'title-asc';
    const genre = req.query.genre;
    const year = req.query.year;
    const search = req.query.search;
    const minRating = req.query.minRating;

    // Build where clause
    const whereClause = {};

    if (search) {
      whereClause.title = {
        [Op.like]: `%${search}%`
      };
    }

    if (year) {
      whereClause.release_date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`]
      };
    }

    // Build order clause
    let orderClause;
    switch (sort) {
      case 'title-asc':
        orderClause = [['title', 'ASC']];
        break;
      case 'title-desc':
        orderClause = [['title', 'DESC']];
        break;
      case 'year-asc':
        orderClause = [['release_date', 'ASC']];
        break;
      case 'year-desc':
        orderClause = [['release_date', 'DESC']];
        break;
      case 'rating-asc':
        orderClause = [[sequelize.literal('avgRating'), 'ASC']];
        break;
      case 'rating-desc':
        orderClause = [[sequelize.literal('avgRating'), 'DESC']];
        break;
      default:
        orderClause = [['title', 'ASC']];
    }

    // Build include clause
    const includeClause = [
      {
        model: Genre,
        through: { attributes: [] }
      }
    ];

    if (genre) {
      includeClause[0].where = { name: { [Op.like]: `%${genre}%` } };
    }

    // Get movies with ratings
    const { count, rows } = await Movie.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: orderClause,
      limit,
      offset,
      subQuery: false,
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(AVG(rating), 0)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'avgRating'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'ratingCount'
          ]
        ]
      }
    });

    // Filter by minimum rating if specified
    let filteredMovies = rows;
    if (minRating) {
      filteredMovies = rows.filter(movie => {
        const avgRating = parseFloat(movie.dataValues.avgRating) || 0;
        return avgRating >= parseFloat(minRating);
      });
    }

    res.status(200).json({
      success: true,
      data: {
        movies: filteredMovies,
        pagination: {
          page,
          limit,
          total: minRating ? filteredMovies.length : count,
          pages: Math.ceil((minRating ? filteredMovies.length : count) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get movie by ID
// @route   GET /api/movies/:id
// @access  Public
exports.getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const movie = await Movie.findByPk(id, {
      include: [
        {
          model: Genre,
          as: 'genres',
          through: { attributes: [] }
        }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(AVG(rating), 0)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'avgRating'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'ratingCount'
          ]
        ]
      }
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Get user rating if logged in
    let userRating = null;
    let isInWatchlist = false;
    
    if (req.user) {
      const rating = await Rating.findOne({
        where: {
          user_id: req.user.user_id,
          movie_id: movie.movie_id
        }
      });
      
      if (rating) {
        userRating = rating.rating;
      }

      const watchlistItem = await Watchlist.findOne({
        where: {
          user_id: req.user.user_id,
          movie_id: movie.movie_id
        }
      });
      
      isInWatchlist = !!watchlistItem;
    }

    res.status(200).json({
      success: true,
      data: {
        movie: {
          ...movie.toJSON(),
          avgRating: parseFloat(movie.dataValues.avgRating).toFixed(1),
          ratingCount: parseInt(movie.dataValues.ratingCount),
          userRating,
          isInWatchlist
        }
      }
    });
  } catch (error) {
    console.error('Get movie by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Rate a movie
// @route   POST /api/movies/:id/rate
// @access  Private
exports.rateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    // Validate rating
    if (rating < 0 || rating > 10) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0 and 10'
      });
    }

    // Check if movie exists
    const movie = await Movie.findByPk(id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Check if user has already rated this movie
    const existingRating = await Rating.findOne({
      where: {
        user_id: req.user.user_id,
        movie_id: id
      }
    });

    let userRating;
    if (existingRating) {
      // Update existing rating
      await existingRating.update({ rating });
      userRating = existingRating;
    } else {
      // Create new rating
      userRating = await Rating.create({
        user_id: req.user.user_id,
        movie_id: id,
        rating
      });
    }

    // Log activity
    await sequelize.query(
      'INSERT INTO user_activity (user_id, movie_id, activity_type) VALUES (?, ?, ?)',
      {
        replacements: [req.user.user_id, id, 'rate']
      }
    );

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        rating: userRating
      }
    });
  } catch (error) {
    console.error('Rate movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get top rated movies
// @route   GET /api/movies/top-rated
// @access  Public
exports.getTopRatedMovies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topRatedMovies = await sequelize.query(`
      SELECT m.*, 
             COALESCE(AVG(r.rating), 0) as avgRating, 
             COUNT(r.rating) as ratingCount
      FROM movies m
      LEFT JOIN ratings r ON m.movie_id = r.movie_id
      GROUP BY m.movie_id
      HAVING ratingCount >= 1
      ORDER BY avgRating DESC, ratingCount DESC
      LIMIT ?
    `, {
      replacements: [limit],
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        movies: topRatedMovies.map(movie => ({
          ...movie,
          avgRating: parseFloat(movie.avgRating).toFixed(1)
        }))
      }
    });
  } catch (error) {
    console.error('Get top rated movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get new releases
// @route   GET /api/movies/new-releases
// @access  Public
exports.getNewReleases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'year-desc';

    // Build order clause
    let orderClause;
    switch (sort) {
      case 'year-asc':
        orderClause = [['release_date', 'ASC']];
        break;
      case 'year-desc':
        orderClause = [['release_date', 'DESC']];
        break;
      case 'title-asc':
        orderClause = [['title', 'ASC']];
        break;
      case 'title-desc':
        orderClause = [['title', 'DESC']];
        break;
      case 'rating-asc':
        orderClause = [[sequelize.literal('avgRating'), 'ASC']];
        break;
      case 'rating-desc':
        orderClause = [[sequelize.literal('avgRating'), 'DESC']];
        break;
      default:
        orderClause = [['release_date', 'DESC']];
    }

    const { count, rows } = await Movie.findAndCountAll({
      where: {
        release_date: {
          [Op.not]: null
        }
      },
      order: orderClause,
      limit,
      offset,
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(AVG(rating), 0)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'avgRating'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'ratingCount'
          ]
        ]
      }
    });

    res.status(200).json({
      success: true,
      data: {
        movies: rows.map(movie => ({
          ...movie.toJSON(),
          avgRating: parseFloat(movie.dataValues.avgRating).toFixed(1)
        })),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get new releases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get movies by genre
// @route   GET /api/movies/genre/:genre
// @access  Public
exports.getMoviesByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;

    const moviesByGenre = await sequelize.query(`
      SELECT m.*, 
             COALESCE(AVG(r.rating), 0) as avgRating,
             COUNT(r.rating) as ratingCount
      FROM movies m
      JOIN movie_genres mg ON m.movie_id = mg.movie_id
      JOIN genres g ON mg.genre_id = g.genre_id
      LEFT JOIN ratings r ON m.movie_id = r.movie_id
      WHERE g.name = ?
      GROUP BY m.movie_id
      ORDER BY m.title ASC
      LIMIT ? OFFSET ?
    `, {
      replacements: [genre, limit, offset],
      type: sequelize.QueryTypes.SELECT
    });

    // Get total count for pagination
    const countResult = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM movies m
      JOIN movie_genres mg ON m.movie_id = mg.movie_id
      JOIN genres g ON mg.genre_id = g.genre_id
      WHERE g.name = ?
    `, {
      replacements: [genre],
      type: sequelize.QueryTypes.SELECT
    });

    const count = countResult[0].count;

    res.status(200).json({
      success: true,
      data: {
        movies: moviesByGenre.map(movie => ({
          ...movie,
          avgRating: parseFloat(movie.avgRating).toFixed(1)
        })),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get movies by genre error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// In backend/controllers/movieController.js

// @desc    Get movie recommendations for a user
// @route   GET /api/movies/recommendations
// @access  Private
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 10;

    // Get user's highly rated movies (4+ stars)
    const userHighlyRatedMovies = await sequelize.query(`
      SELECT movie_id, rating
      FROM ratings
      WHERE user_id = ? AND rating >= 4
      ORDER BY rating DESC
      LIMIT 10
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    if (userHighlyRatedMovies.length === 0) {
      // If user hasn't rated any movies, return top rated movies
      return exports.getTopRatedMovies(req, res);
    }

    // Get genres from user's highly rated movies
    const movieIds = userHighlyRatedMovies.map(m => m.movie_id);
    
    const genres = await sequelize.query(`
      SELECT DISTINCT g.name, COUNT(*) as count
      FROM genres g
      JOIN movie_genres mg ON g.genre_id = mg.genre_id
      WHERE mg.movie_id IN (${movieIds.join(',')})
      GROUP BY g.genre_id, g.name
      ORDER BY count DESC
      LIMIT 3
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Get movies from these genres that user hasn't rated
    const genreNames = genres.map(g => g.name);

    // FIX: Handle the case where no genres are found for the user's rated movies
    if (genreNames.length === 0) {
      return exports.getTopRatedMovies(req, res);
    }
    
    const genrePlaceholders = genreNames.map(() => '?').join(',');
    
    const recommendations = await sequelize.query(`
      SELECT DISTINCT m.*, 
             COALESCE(AVG(r.rating), 0) as avgRating,
             COUNT(r.rating) as ratingCount
      FROM movies m
      JOIN movie_genres mg ON m.movie_id = mg.movie_id
      JOIN genres g ON mg.genre_id = g.genre_id
      LEFT JOIN ratings r ON m.movie_id = r.movie_id
      WHERE g.name IN (${genrePlaceholders})
        AND m.movie_id NOT IN (
          SELECT movie_id FROM ratings WHERE user_id = ?
        )
      GROUP BY m.movie_id
      ORDER BY avgRating DESC, ratingCount DESC
      LIMIT ?
    `, {
      replacements: [...genreNames, userId, limit],
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        movies: recommendations.map(movie => ({
          ...movie,
          avgRating: parseFloat(movie.avgRating).toFixed(1)
        }))
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search movies
// @route   GET /api/movies/search
// @access  Public
exports.searchMovies = async (req, res) => {
  try {
    const { q: query, page = 1, limit = 8 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Movie.findAndCountAll({
      where: {
        [Op.or]: [
          {
            title: {
              [Op.like]: `%${query}%`
            }
          },
          {
            overview: {
              [Op.like]: `%${query}%`
            }
          }
        ]
      },
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(AVG(rating), 0)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'avgRating'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM ratings
              WHERE ratings.movie_id = Movie.movie_id
            )`),
            'ratingCount'
          ]
        ]
      },
      order: [['title', 'ASC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: {
        movies: rows.map(movie => ({
          ...movie.toJSON(),
          avgRating: parseFloat(movie.dataValues.avgRating).toFixed(1)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        query
      }
    });
  } catch (error) {
    console.error('Search movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};