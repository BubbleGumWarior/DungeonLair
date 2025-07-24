const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaskCollection = sequelize.define('MaskCollection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  maskID: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'mask_collection', // Explicitly define table name in lowercase
});

module.exports = MaskCollection;
