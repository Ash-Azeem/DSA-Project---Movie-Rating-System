// In backend/models/genre.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Genre = sequelize.define('Genre', {
  genre_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  }
}, {
  tableName: 'genres',
  timestamps: false
});

// =============================================================
// PASTE THIS CODE AT THE END OF THE FILE
// =============================================================
Genre.associate = function(models) {
  // A Genre can have many Movies.
  // We also specify the join table 'movie_genres'.
  Genre.belongsToMany(models.Movie, {
    through: 'movie_genres', // The name of the join table
    foreignKey: 'genre_id',  // The key in the join table that links to this model
    otherKey: 'movie_id',    // The key in the join table that links to the other model
    as: 'movies'             // An alias for when you query
  });
};
// =============================================================

module.exports = Genre;