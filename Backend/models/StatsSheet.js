// models/StatsSheet.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StatsSheet = sequelize.define('StatsSheet', {
  characterID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    unique: true,
  },
  characterName: DataTypes.STRING,
  strength: DataTypes.INTEGER,
  athletics: DataTypes.INTEGER,
  dexterity: DataTypes.INTEGER,
  acrobatics: DataTypes.INTEGER,
  sleightOfHand: DataTypes.INTEGER,
  stealth: DataTypes.INTEGER,
  constitution: DataTypes.INTEGER,
  intelligence: DataTypes.INTEGER,
  history: DataTypes.INTEGER,
  investigation: DataTypes.INTEGER,
  nature: DataTypes.INTEGER,
  wisdom: DataTypes.INTEGER,
  animalHandling: DataTypes.INTEGER,
  insight: DataTypes.INTEGER,
  medicine: DataTypes.INTEGER,
  perception: DataTypes.INTEGER,
  survival: DataTypes.INTEGER,
  charisma: DataTypes.INTEGER,
  deception: DataTypes.INTEGER,
  intimidation: DataTypes.INTEGER,
  performance: DataTypes.INTEGER,
  persuasion: DataTypes.INTEGER,
}, {
    tableName: 'stats_sheets', // Explicitly define table name in lowercase
});

module.exports = StatsSheet;
