// Migration script using Sequelize
// To use this, you'll need to install sequelize-cli: npm install -g sequelize-cli
// Then run: npx sequelize-cli migration:generate --name add-temporary-password-fields

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add isTemporaryPassword column
    await queryInterface.addColumn('users', 'isTemporaryPassword', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add temporaryPasswordExpires column
    await queryInterface.addColumn('users', 'temporaryPasswordExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Update existing records to have default values
    await queryInterface.sequelize.query(
      'UPDATE users SET "isTemporaryPassword" = false WHERE "isTemporaryPassword" IS NULL'
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns if we need to rollback
    await queryInterface.removeColumn('users', 'isTemporaryPassword');
    await queryInterface.removeColumn('users', 'temporaryPasswordExpires');
  }
};
