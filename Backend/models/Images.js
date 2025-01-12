// models/Images.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Images = sequelize.define('Images', {
  imageID: { // Fix typo from iamgeID to imageID
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  photo: DataTypes.TEXT,
  imageName: DataTypes.STRING,
}, {
    tableName: 'images', // Explicitly define table name in lowercase
});

module.exports = Images;
