const { Sequelize } = require('sequelize');
const sequelize = require('./db');

async function updateToBigInt() {
  try {
    console.log('Converting INTEGER columns to BIGINT...');
    
    await sequelize.query(`
      ALTER TABLE masks_list 
      ALTER COLUMN "attackDamage" TYPE BIGINT,
      ALTER COLUMN "abilityDamage" TYPE BIGINT,
      ALTER COLUMN "magicResist" TYPE BIGINT,
      ALTER COLUMN "protections" TYPE BIGINT,
      ALTER COLUMN "health" TYPE BIGINT,
      ALTER COLUMN "currentHealth" TYPE BIGINT;
    `);
    
    console.log('Successfully converted stat columns to BIGINT!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating columns:', error);
    process.exit(1);
  }
}

updateToBigInt();
