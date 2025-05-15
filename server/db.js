const mysql = require('mysql2/promise');
const config = require('./config');

// Create a connection pool
const pool = mysql.createPool({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.database,
  port: config.port,
  waitForConnections: config.waitForConnections,
  connectionLimit: config.connectionLimit,
  queueLimit: config.queueLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    
    // Test query to ensure database is working properly
    const [rows] = await connection.query('SELECT 1 as connection_test');
    if (rows && rows[0] && rows[0].connection_test === 1) {
      console.log('Database query test successful');
    }
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
    console.error('Please make sure your MySQL server is running and the credentials in .env are correct');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
