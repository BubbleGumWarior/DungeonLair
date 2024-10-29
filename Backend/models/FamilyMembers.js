// models/FamilyMember.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const CharacterInfo = require('./CharacterInfo'); // Import the CharacterInfo model

const FamilyMember = sequelize.define('FamilyMember', {
  characterID: DataTypes.INTEGER,
  characterName: DataTypes.STRING,
  age: DataTypes.INTEGER,
  race: DataTypes.STRING,
  photo: DataTypes.TEXT,
}, {
  tableName: 'family_members', // Define the table name as lowercase
});

module.exports = FamilyMember;
