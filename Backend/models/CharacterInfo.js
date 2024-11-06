// models/CharacterInfo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const CharacterInfo = sequelize.define('CharacterInfo', {
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
  noteList: {
    type: DataTypes.ARRAY(DataTypes.INTEGER), // Add array field for note IDs
  },
}, {
  tableName: 'character_infos', // Explicitly define table name in lowercase
});

module.exports = CharacterInfo;
