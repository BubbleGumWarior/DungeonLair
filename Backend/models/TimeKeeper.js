// models/TimeKeeper.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const TimeKeeper = sequelize.define('TimeKeeper', {
time: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
        is: /^([01]\d|2[0-3]):([0-5]\d)$/ // Validates HH:MM format
    }
}
}, {
    tableName: 'time_keeper', // Explicitly define table name in lowercase
});

module.exports = TimeKeeper;