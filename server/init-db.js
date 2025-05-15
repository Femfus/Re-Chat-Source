const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Attempting to connect to MySQL server with the following config:');
    console.log(`Host: ${config.host}`);
    console.log(`User: ${config.user}`);
    console.log(`Port: ${config.port}`);
    console.log('Password: [HIDDEN]');
    
    // Create connection without database selection
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    console.log(`Database '${config.database}' created or already exists`);
    
    // Use the database
    await connection.query(`USE ${config.database}`);
    
    // Read and execute SQL script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    
    // Split script into individual statements
    const statements = sqlScript
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement + ';');
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        console.error(`Error executing statement: ${statement}`);
        console.error(error.message);
      }
    }
    
    console.log('Database initialization completed successfully');
    
    // Create admin user if it doesn't exist
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    try {
      // Check if admin exists
      const [adminCheck] = await connection.query(
        'SELECT * FROM users WHERE email = ?', 
        ['admin@rechat.to']
      );
      
      if (adminCheck.length === 0) {
        // Create admin user
        const [result] = await connection.query(
          'INSERT INTO users (username, email, password, plan, status) VALUES (?, ?, ?, ?, ?)',
          ['admin', 'admin@rechat.to', hashedPassword, 'business', 'active']
        );
        
        const adminId = result.insertId;
        
        // Create admin settings
        await connection.query(
          'INSERT INTO user_settings (user_id, theme) VALUES (?, ?)',
          [adminId, 'dark']
        );
        
        console.log('Admin user created successfully');
        console.log('Email: admin@rechat.to');
        console.log('Password: admin123');
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error creating admin user:', error.message);
    }
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error('Full error:', error);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure MySQL server is running');
    console.error('2. Check that the username and password in .env are correct');
    console.error('3. Ensure MySQL server is accepting connections on the specified port');
    console.error('4. If using a remote MySQL server, check firewall settings');
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the initialization
initializeDatabase();
