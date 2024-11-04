// models/DMChatHistory.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const DMChatHistory = sequelize.define('DMChatHistory', {
  username: DataTypes.STRING,
  message: DataTypes.TEXT,
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'dm_chat_history', // Explicitly define table name in lowercase
});

module.exports = DMChatHistory;
