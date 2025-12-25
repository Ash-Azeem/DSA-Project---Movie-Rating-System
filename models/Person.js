const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Person = sequelize.define('Person', {
  person_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  biography: {
    type: DataTypes.TEXT,
    validate: {
      len: [0, 5000]
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    validate: {
      isDate: true
    }
  },
  date_of_death: {
    type: DataTypes.DATEONLY,
    validate: {
      isDate: true
    }
  },
  place_of_birth: {
    type: DataTypes.STRING(100)
  },
  profile_path: {
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
  tableName: 'people',
  timestamps: false
});

module.exports = Person;