const { pool } = require('./db');

async function checkAndUpdateSchema() {
  try {
    console.log('Checking existing schema...');
    
    // Check if last_password_reset column exists in users table
    const [userColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'rechat_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'last_password_reset'
    `);
    
    // Check if user_details table exists
    const [userDetailsTable] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'rechat_db' 
      AND TABLE_NAME = 'user_details'
    `);
    
    // Add last_password_reset column if it doesn't exist
    if (userColumns.length === 0) {
      console.log('Adding last_password_reset column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN last_password_reset DATETIME DEFAULT NULL
      `);
      console.log('Column added successfully.');
    } else {
      console.log('last_password_reset column already exists.');
    }
    
    // Create user_details table if it doesn't exist
    if (userDetailsTable.length === 0) {
      console.log('Creating user_details table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_details (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          operating_system VARCHAR(255) DEFAULT NULL,
          country VARCHAR(100) DEFAULT NULL,
          ip_address VARCHAR(45) DEFAULT NULL,
          user_agent TEXT DEFAULT NULL,
          last_login_date DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        )
      `);
      console.log('Table created successfully.');
      
      // Insert sample data
      console.log('Inserting sample data into user_details...');
      await pool.query(`
        INSERT INTO user_details (user_id, operating_system, country, ip_address, user_agent, last_login_date)
        VALUES
        (1, 'Windows 11', 'United States', '192.168.1.1', 'Chrome on Windows', '2025-05-07 15:30:00'),
        (2, 'macOS Monterey', 'Canada', '192.168.1.2', 'Safari on macOS', '2025-05-08 09:15:00'),
        (3, 'Ubuntu 22.04', 'Germany', '192.168.1.3', 'Firefox on Linux', '2025-05-01 11:20:00')
      `);
      console.log('Sample data inserted successfully.');
    } else {
      console.log('user_details table already exists.');
    }
    
    // Update last_password_reset dates for sample users
    console.log('Updating last_password_reset dates for sample users...');
    await pool.query(`
      UPDATE users SET last_password_reset = '2025-04-20 10:15:00' WHERE id = 1 AND last_password_reset IS NULL
    `);
    await pool.query(`
      UPDATE users SET last_password_reset = '2025-04-25 14:30:00' WHERE id = 2 AND last_password_reset IS NULL
    `);
    await pool.query(`
      UPDATE users SET last_password_reset = '2025-04-30 09:45:00' WHERE id = 3 AND last_password_reset IS NULL
    `);
    console.log('User data updated successfully.');
    
    console.log('Database schema update completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error.message);
    process.exit(1);
  }
}

checkAndUpdateSchema();
