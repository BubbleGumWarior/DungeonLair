const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ModList = sequelize.define('ModList', {
  modID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  modType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  modRarity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'mod_list',
});

module.exports = ModList;
