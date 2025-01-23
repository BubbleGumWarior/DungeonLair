// models/CharacterInfo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const CharacterInfo = sequelize.define('CharacterInfo', {
  characterID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    unique: true,
  },
  characterName: DataTypes.STRING,
  race: DataTypes.STRING,
  class: DataTypes.STRING,
  level: DataTypes.INTEGER,
  photo: DataTypes.TEXT, // URL or path to image
  familyMembers: {
    type: DataTypes.ARRAY(DataTypes.INTEGER), // Stores multiple IDs
  },
  friendMembers: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
  },
  itemInventory: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
  },
  skillList: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
  },
  maskID: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null if a character doesn't have a mask
  },
}, {
  tableName: 'character_infos', // Ensure the table name matches the reference in User model
});

module.exports = CharacterInfo;
