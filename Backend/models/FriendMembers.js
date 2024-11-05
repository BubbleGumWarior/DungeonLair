// models/FriendMembers.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const CharacterInfo = require('./CharacterInfo'); // Import the CharacterInfo model

const FriendMembers = sequelize.define('FriendMembers', {
  characterID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CharacterInfo,
      key: 'id'
    }
  },
  characterName: DataTypes.STRING,
  age: DataTypes.INTEGER,
  race: DataTypes.STRING,
  photo: DataTypes.TEXT,
}, {
    tableName: 'friend_members', // Explicitly define table name in lowercase
});

module.exports = FriendMembers;
