const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const ModList = require('./ModList'); // Import ModList model

const MaskList = sequelize.define('MaskList', {
  maskID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: true,
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
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  abilityDamage: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  magicResist: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  protections: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  health: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  currentHealth: {
    type: DataTypes.BIGINT,
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
