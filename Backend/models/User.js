// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  characterID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'character_infos', // Ensure the table name matches the CharacterInfo table
      key: 'characterID'
    }
  },
  noteList: {
    type: DataTypes.ARRAY(DataTypes.INTEGER), // Add array field for note IDs
  },
  isTemporaryPassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  temporaryPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users', // Explicitly define table name in lowercase
});

module.exports = User;
