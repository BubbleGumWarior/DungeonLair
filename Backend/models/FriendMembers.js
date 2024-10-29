// models/FriendMembers.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const FriendMembers = sequelize.define('FriendMembers', {
  characterID: DataTypes.INTEGER,
  characterName: DataTypes.STRING,
  age: DataTypes.INTEGER,
  race: DataTypes.STRING,
  photo: DataTypes.TEXT,
}, {
    tableName: 'friend_members', // Explicitly define table name in lowercase
});

module.exports = FriendMembers;
