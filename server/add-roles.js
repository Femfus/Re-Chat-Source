const { pool } = require('./db');

async function addRolesToDatabase() {
  try {
    console.log('Adding roles column to users table...');
    
    // Check if the role column already exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'rechat_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `);
    
    if (columns.length === 0) {
      // Add role column to users table
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(50) DEFAULT 'user' AFTER status
      `);
      console.log('Role column added to users table');
    } else {
      console.log('Role column already exists in users table');
    }
    
    // Update some users with special roles
    await pool.query(`
      UPDATE users 
      SET role = 'dev' 
      WHERE id = 1
    `);
    
    await pool.query(`
      UPDATE users 
      SET role = 'owner' 
      WHERE id = 2
    `);
    
    await pool.query(`
      UPDATE users 
      SET role = 'staff' 
      WHERE id = 3
    `);
    
    console.log('Updated users with special roles');
    
    console.log('Successfully added roles to the database!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding roles:', error.message);
    process.exit(1);
  }
}

addRolesToDatabase();
