// models/Score.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Score = sequelize.define('Score', {
  characterName: DataTypes.STRING,
  wishes: DataTypes.INTEGER,
  antiWishes: DataTypes.INTEGER,
  inspiration: DataTypes.INTEGER,
  discouragement: DataTypes.INTEGER,
}, {
    tableName: 'user_scores', // Explicitly define table name in lowercase
});

module.exports = Score;
