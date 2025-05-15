const fs = require('fs');
const { pool } = require('./db');

async function updateSchema() {
  try {
    console.log('Reading SQL script...');
    const sql = fs.readFileSync('./server/update-schema.sql', 'utf8');
    
    // Split the SQL script into individual statements
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await pool.query(statement);
      }
    }
    
    console.log('Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error.message);
    process.exit(1);
  }
}

updateSchema();
