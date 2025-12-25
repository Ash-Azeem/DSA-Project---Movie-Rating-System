// In backend/models/movie.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movie = sequelize.define('Movie', {
  movie_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  original_title: {
    type: DataTypes.STRING(255)
  },
  tagline: {
    type: DataTypes.STRING(255)
  },
  overview: {
    type: DataTypes.TEXT,
    validate: {
      len: [0, 5000]
    }
  },
  release_date: {
    type: DataTypes.DATEONLY,
    validate: {
      isDate: true
    }
  },
  runtime_minutes: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 1000
    }
  },
  budget: {
    type: DataTypes.BIGINT,
    validate: {
      min: 0
    }
  },
  revenue: {
    type: DataTypes.BIGINT,
    validate: {
      min: 0
    }
  },
  poster_path: {
    type: DataTypes.STRING(255)
  },
  backdrop_path: {
    type: DataTypes.STRING(255)
  },
  imdb_id: {
    type: DataTypes.STRING(20)
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'movies',
  timestamps: false
});

// =============================================================
// PASTE THIS CODE AT THE END OF THE FILE
// =============================================================
Movie.associate = function(models) {
  // A Movie can belong to many Genres.
  // We also specify the join table 'movie_genres'.
  Movie.belongsToMany(models.Genre, {
    through: 'movie_genres', // The name of the join table
    foreignKey: 'movie_id',   // The key in the join table that links to this model
    otherKey: 'genre_id',     // The key in the join table that links to the other model
    as: 'genres'              // An alias for when you query (e.g., Movie.findAll({ include: 'genres' }))
  });
};
// =============================================================

module.exports = Movie;