const { Sequelize } = require('sequelize');
require('dotenv').config()

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql',
    // logging: console.log // Optional: disable SQL logging
  }
);
sequelize.authenticate().then(() => console.log('MySql DB Connected')).catch((err) => console.error('DB Connection erro', err))

module.exports = sequelize