// In backend/models/index.js

const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Movie = require('./Movie');
const Genre = require('./Genre');
const Person = require('./Person');
const Rating = require('./Rating');
const Review = require('./Review');
const Watchlist = require('./Watchlist');

// Put them all in an object
const models = {
  sequelize,
  User,
  Movie,
  Genre,
  Person,
  Rating,
  Review,
  Watchlist
};

// =============================================================
// PASTE THIS CODE AT THE END OF THE FILE
// =============================================================
// This is the magic part!
// It runs the 'associate' function for each model.
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});
// =============================================================

module.exports = models;