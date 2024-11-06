const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Note = sequelize.define('Note', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'notes', // Explicitly define table name in lowercase
});

module.exports = Note;
