// models/SpaceshipImages.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SpaceshipImages = sequelize.define('SpaceshipImages', {
  spaceshipImageID: { // Fix typo from iamgeID to spaceshipImageID
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  photo: DataTypes.TEXT,
  spaceshipImageName: DataTypes.STRING,  
  shipClass: DataTypes.STRING,  
  shipSize: DataTypes.STRING, 
  atmosphereSpeed: DataTypes.STRING,   
  spaceSpeed: DataTypes.STRING, 
  description: DataTypes.TEXT,
}, {
    tableName: 'spaceship_images', // Explicitly define table name in lowercase
});

module.exports = SpaceshipImages;
