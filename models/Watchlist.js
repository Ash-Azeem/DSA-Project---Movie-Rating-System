const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Watchlist = sequelize.define('Watchlist', {
  watchlist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'movies',
      key: 'movie_id'
    }
  },
  added_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'watchlists',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'movie_id']
    }
  ]
});

module.exports = Watchlist;