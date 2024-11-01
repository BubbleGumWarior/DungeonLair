// models/StatsSheet.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StatsSheet = sequelize.define('StatsSheet', {
  characterName: DataTypes.STRING,
  strength: DataTypes.STRING,
  athletics: DataTypes.STRING,
  swordsmanship: DataTypes.STRING,
  dexterity: DataTypes.STRING,
  acrobatics: DataTypes.STRING,
  sleightOfHand: DataTypes.STRING,
  stealth: DataTypes.STRING,
  marksmanship: DataTypes.STRING,
  pilot: DataTypes.STRING,
  constitution: DataTypes.STRING,
  intelligence: DataTypes.STRING,
  history: DataTypes.STRING,
  investigation: DataTypes.STRING,
  nature: DataTypes.STRING,
  forceStrength: DataTypes.STRING,
  splicing: DataTypes.STRING,
  wisdom: DataTypes.STRING,
  animalHandling: DataTypes.STRING,
  insight: DataTypes.STRING,
  medicine: DataTypes.STRING,
  perception: DataTypes.STRING,
  survival: DataTypes.STRING,
  forceCapacity: DataTypes.STRING,
  mapping: DataTypes.STRING,
  charisma: DataTypes.STRING,
  deception: DataTypes.STRING,
  intimidation: DataTypes.STRING,
  performance: DataTypes.STRING,
  persuasion: DataTypes.STRING,
}, {
    tableName: 'stats_sheets', // Explicitly define table name in lowercase
});

module.exports = StatsSheet;
