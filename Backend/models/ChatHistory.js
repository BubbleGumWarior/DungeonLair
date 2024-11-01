// models/ChatHistory.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ChatHistory = sequelize.define('ChatHistory', {
  username: DataTypes.STRING,
  message: DataTypes.TEXT,
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chat_history', // Explicitly define table name in lowercase
});

module.exports = ChatHistory;
