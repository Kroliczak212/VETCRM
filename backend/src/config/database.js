const mysql = require('mysql2/promise');
const config = require('./index');

// Create MySQL connection pool
const pool = mysql.createPool(config.database);

// Test connection on startup
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };
