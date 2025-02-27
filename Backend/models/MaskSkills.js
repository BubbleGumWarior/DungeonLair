const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaskSkills = sequelize.define('MaskSkills', {
  skillID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  skillName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mainStat: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mainStatPercentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  cooldown: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amountOfStrikes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // Default value is 1
  },
  onHitEffect: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'None', // Default value is 'None'
  },
  isMultiTarget: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // Default value is false
  },
}, {
  tableName: 'mask_skills',
});

module.exports = MaskSkills;
