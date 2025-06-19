const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Sound = sequelize.define('Sound', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'sounds',
});

module.exports = Sound;
