// models/Note.js
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
  timestamps: true,
  tableName: 'notes', // Ensure the table name is appropriate and does not conflict
});

module.exports = Note;
