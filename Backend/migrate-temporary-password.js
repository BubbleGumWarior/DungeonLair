// Run this script with: node migrate-temporary-password.js
const sequelize = require('./db');

async function migrateTempPasswordFields() {
  try {
    console.log('Starting migration: Adding temporary password fields...');

    // Add isTemporaryPassword column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "isTemporaryPassword" BOOLEAN DEFAULT false
    `);
    console.log('✅ Added isTemporaryPassword column');

    // Add temporaryPasswordExpires column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "temporaryPasswordExpires" TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Added temporaryPasswordExpires column');

    // Update existing records
    await sequelize.query(`
      UPDATE users 
      SET "isTemporaryPassword" = false 
      WHERE "isTemporaryPassword" IS NULL
    `);
    console.log('✅ Updated existing records with default values');

    // Verify the migration
    const [results] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('isTemporaryPassword', 'temporaryPasswordExpires')
    `);

    console.log('✅ Migration completed successfully!');
    console.log('New columns:');
    console.table(results);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTempPasswordFields();
