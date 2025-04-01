const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const ModList = require('./ModList'); // Import ModList model

const MaskList = sequelize.define('MaskList', {
  maskID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  photo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  passiveSkill: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  activeSkills: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: true, // Allow NULL values
    defaultValue: [], // Default value is an empty array
  },
  modList: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: true, // Allow NULL values
    defaultValue: [], // Default value is an empty array
  },
  attackDamage: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  abilityDamage: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  magicResist: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  protections: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  health: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  speed: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'masks_list',
});

module.exports = MaskList;
