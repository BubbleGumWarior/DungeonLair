const { Sequelize } = require('sequelize');
const sequelize = require('./db');

async function addNameColumn() {
  try {
    await sequelize.query(`ALTER TABLE masks_list ADD COLUMN IF NOT EXISTS name TEXT;`);
    console.log('Successfully added name column to masks_list table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding name column:', error);
    process.exit(1);
  }
}

addNameColumn();
