// models/SkillList.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SkillList = sequelize.define('SkillList', {
  skillID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Ensure autoIncrement is set to true
  },
  skillName: {
    type: DataTypes.STRING,
    allowNull: false // Ensure skillName is not null
  },
  mainStat: {
    type: DataTypes.STRING,
    allowNull: false // Ensure mainStat is not null
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false // Ensure description is not null
  },
  diceRoll: {
    type: DataTypes.INTEGER,
    allowNull: false // Ensure diceRoll is not null
  }
}, {
  tableName: 'skill_lists', // Explicitly define table name in lowercase
});

module.exports = SkillList;
