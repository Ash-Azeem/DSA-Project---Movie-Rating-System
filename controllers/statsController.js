const sequelize = require('../config/database');

// @desc    Get database statistics
// @route   GET /api/stats/database
// @access  Public
exports.getDatabaseStats = async (req, res) => {
  try {
    // Total movies
    const totalMoviesResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM movies',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalMovies = totalMoviesResult[0].count;

    // Total users
    const totalUsersResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM users WHERE is_active = true',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalUsers = totalUsersResult[0].count;

    // Total genres
    const totalGenresResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM genres',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalGenres = totalGenresResult[0].count;

    // Average runtime
    const avgRuntimeResult = await sequelize.query(
      'SELECT AVG(runtime_minutes) as avg FROM movies WHERE runtime_minutes IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    const avgRuntime = avgRuntimeResult[0].avg ? Math.round(avgRuntimeResult[0].avg) : 0;

    // Oldest movie year
    const oldestYearResult = await sequelize.query(
      'SELECT MIN(YEAR(release_date)) as year FROM movies WHERE release_date IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    const oldestYear = oldestYearResult[0].year || 0;

    // Latest movie year
    const latestYearResult = await sequelize.query(
      'SELECT MAX(YEAR(release_date)) as year FROM movies WHERE release_date IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    const latestYear = latestYearResult[0].year || 0;

    // Total runtime in hours
    const totalRuntimeResult = await sequelize.query(
      'SELECT SUM(runtime_minutes) as total FROM movies WHERE runtime_minutes IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalRuntime = totalRuntimeResult[0].total ? Math.round(totalRuntimeResult[0].total / 60) : 0;

    // Average rating
    const avgRatingResult = await sequelize.query(
      'SELECT AVG(rating) as avg FROM ratings',
      { type: sequelize.QueryTypes.SELECT }
    );
    const avgRating = avgRatingResult[0].avg ? parseFloat(avgRatingResult[0].avg).toFixed(1) : 0;

    // Total ratings
    const totalRatingsResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM ratings',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalRatings = totalRatingsResult[0].count;

    // Total reviews
    const totalReviewsResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM reviews',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalReviews = totalReviewsResult[0].count;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMovies,
          totalUsers,
          totalGenres,
          avgRuntime,
          oldestYear,
          latestYear,
          totalRuntime,
          avgRating,
          totalRatings,
          totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get years with multiple releases
// @route   GET /api/stats/years-with-multiple-releases
// @access  Public
exports.getYearsWithMultipleReleases = async (req, res) => {
  try {
    const yearsWithMultipleReleases = await sequelize.query(`
      SELECT YEAR(release_date) as year, COUNT(*) as count
      FROM movies
      WHERE release_date IS NOT NULL
      GROUP BY YEAR(release_date)
      HAVING COUNT(*) > 1
      ORDER BY count DESC, year DESC
      LIMIT 20
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        years: yearsWithMultipleReleases
      }
    });
  } catch (error) {
    console.error('Get years with multiple releases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get top decades by average runtime
// @route   GET /api/stats/top-decades-by-runtime
// @access  Public
exports.getTopDecadesByRuntime = async (req, res) => {
  try {
    const topDecadesByRuntime = await sequelize.query(`
      SELECT FLOOR(YEAR(release_date) / 10) * 10 as decade, AVG(runtime_minutes) as avgRuntime
      FROM movies
      WHERE release_date IS NOT NULL AND runtime_minutes IS NOT NULL
      GROUP BY decade
      -- FIX: This line was too restrictive and has been commented out
      -- HAVING avgRuntime > 140
      ORDER BY avgRuntime DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        decades: topDecadesByRuntime.map(item => ({
          decade: `${item.decade}s`,
          avgRuntime: Math.round(item.avgRuntime)
        }))
      }
    });
  } catch (error) {
    console.error('Get top decades by runtime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get genre distribution
// @route   GET /api/stats/genre-distribution
// @access  Public
exports.getGenreDistribution = async (req, res) => {
  try {
    const genreDistribution = await sequelize.query(`
      SELECT g.name, COUNT(mg.movie_id) as count
      FROM genres g
      LEFT JOIN movie_genres mg ON g.genre_id = mg.genre_id
      GROUP BY g.genre_id, g.name
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        genres: genreDistribution
      }
    });
  } catch (error) {
    console.error('Get genre distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get rating distribution
// @route   GET /api/stats/rating-distribution
// @access  Public
exports.getRatingDistribution = async (req, res) => {
  try {
    const ratingDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN rating >= 9 THEN '9-10'
          WHEN rating >= 8 THEN '8-8.9'
          WHEN rating >= 7 THEN '7-7.9'
          WHEN rating >= 6 THEN '6-6.9'
          WHEN rating >= 5 THEN '5-5.9'
          WHEN rating >= 4 THEN '4-4.9'
          WHEN rating >= 3 THEN '3-3.9'
          WHEN rating >= 2 THEN '2-2.9'
          ELSE '0-1.9'
        END as rating_range,
        COUNT(*) as count
      FROM ratings
      GROUP BY rating_range
      ORDER BY rating_range DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        ratings: ratingDistribution
      }
    });
  } catch (error) {
    console.error('Get rating distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user activity stats
// @route   GET /api/stats/user-activity
// @access  Private
exports.getUserActivityStats = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // User's rating distribution
    const ratingDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN rating >= 9 THEN '9-10'
          WHEN rating >= 8 THEN '8-8.9'
          WHEN rating >= 7 THEN '7-7.9'
          WHEN rating >= 6 THEN '6-6.9'
          WHEN rating >= 5 THEN '5-5.9'
          WHEN rating >= 4 THEN '4-4.9'
          WHEN rating >= 3 THEN '3-3.9'
          WHEN rating >= 2 THEN '2-2.9'
          ELSE '0-1.9'
        END as rating_range,
        COUNT(*) as count
      FROM ratings
      WHERE user_id = ?
      GROUP BY rating_range
      ORDER BY rating_range DESC
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    // User's genre preferences
    const genrePreferences = await sequelize.query(`
      SELECT g.name, COUNT(*) as count
      FROM genres g
      JOIN movie_genres mg ON g.genre_id = mg.genre_id
      JOIN ratings r ON mg.movie_id = r.movie_id
      WHERE r.user_id = ?
      GROUP BY g.genre_id, g.name
      ORDER BY count DESC
      LIMIT 10
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    // User's activity over time
    const activityOverTime = await sequelize.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m') as month,
        COUNT(*) as count
      FROM user_activity
      WHERE user_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    res.status(200).json({
      success: true,
      data: {
        ratingDistribution,
        genrePreferences,
        activityOverTime
      }
    });
  } catch (error) {
    console.error('Get user activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};