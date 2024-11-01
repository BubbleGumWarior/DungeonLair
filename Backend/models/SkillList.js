// models/SkillList.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SkillList = sequelize.define('SkillList', {
  skillID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  skillName: DataTypes.STRING,
  mainStat: DataTypes.STRING,
  description: DataTypes.TEXT,
  diceRoll: DataTypes.INTEGER,
}, {
  tableName: 'skill_lists', // Explicitly define table name in lowercase
});

module.exports = SkillList;
