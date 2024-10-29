// sync.js
const sequelize = require('./db');
const User = require('./models/User');

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await sequelize.sync(); // This creates the table if it doesn't exist
    console.log('Tables created (if it did not exist)');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

syncDatabase();
