const { Sequelize } = require('sequelize');
const sequelize = require('./db');

async function migrateToBigInt() {
  try {
    console.log('Starting migration to BIGINT...');
    
    // Alter columns to BIGINT
    await sequelize.query(`
      ALTER TABLE masks_list 
      ALTER COLUMN "attackDamage" TYPE BIGINT,
      ALTER COLUMN "abilityDamage" TYPE BIGINT,
      ALTER COLUMN "magicResist" TYPE BIGINT,
      ALTER COLUMN "protections" TYPE BIGINT,
      ALTER COLUMN "health" TYPE BIGINT,
      ALTER COLUMN "currentHealth" TYPE BIGINT;
    `);
    
    console.log('Successfully migrated all stat columns to BIGINT');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateToBigInt();
