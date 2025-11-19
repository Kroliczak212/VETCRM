/* MySQL connection pool (mysql2/promise) */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'vetuser',
  password: process.env.DB_PASSWORD || 'vetpassword',
  database: process.env.DB_NAME || 'vetcrm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
