// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('dungeonlair', 'postgres', 'admin', {
  host: 'localhost', // Change if your database is hosted elsewhere
  dialect: 'postgres',
  port: 5432,
});

module.exports = sequelize;
