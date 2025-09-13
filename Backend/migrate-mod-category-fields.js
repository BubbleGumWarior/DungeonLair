// Run this script with: node migrate-mod-category-fields.js
const sequelize = require('./db');

async function migrateModCategoryFields() {
  try {
    console.log('Starting migration: Adding mod category and stat type fields...');

    // Add modCategory column
    await sequelize.query(`
      ALTER TABLE mod_list 
      ADD COLUMN IF NOT EXISTS "modCategory" VARCHAR(50)
    `);
    console.log('✅ Added modCategory column');

    // Add statType column
    await sequelize.query(`
      ALTER TABLE mod_list 
      ADD COLUMN IF NOT EXISTS "statType" VARCHAR(50)
    `);
    console.log('✅ Added statType column');

    // Update existing records to have 'skill' as default category
    await sequelize.query(`
      UPDATE mod_list 
      SET "modCategory" = 'skill' 
      WHERE "modCategory" IS NULL
    `);
    console.log('✅ Updated existing records with default category "skill"');

    // Verify the migration
    const [results] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'mod_list' 
      AND column_name IN ('modCategory', 'statType')
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

migrateModCategoryFields();
