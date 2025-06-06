// models/ItemList.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ItemList = sequelize.define('ItemList', {
  itemID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  photo: DataTypes.TEXT,
  itemName: DataTypes.STRING,
  type: DataTypes.STRING,
  mainStat: DataTypes.STRING,
  description: DataTypes.TEXT,
  damage: DataTypes.INTEGER,
  equipped: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
}, {
    tableName: 'item_lists', // Explicitly define table name in lowercase
});

module.exports = ItemList;
