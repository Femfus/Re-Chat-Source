const { pool } = require('./db');

async function addMoreCountries() {
  try {
    console.log('Adding more countries to user_details...');
    
    // First, let's create some additional users for our new countries
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const startId = userCount[0].count + 1;
    
    // Create 10 new users
    for (let i = 0; i < 10; i++) {
      const username = `user${startId + i}`;
      const email = `${username}@rechat.to`;
      const hashedPassword = '$2b$10$1234567890abcdefghijkl'; // Dummy hashed password
      
      await pool.query(
        'INSERT INTO users (username, email, password, plan, status, join_date, last_online) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [username, email, hashedPassword, 'premium', 'active']
      );
    }
    
    // Add country data for the new users
    const smallCountries = [
      'Faroe Islands',
      'Iceland',
      'Greenland',
      'Luxembourg',
      'Monaco',
      'Liechtenstein',
      'Andorra',
      'San Marino',
      'Vatican City',
      'Malta'
    ];
    
    for (let i = 0; i < smallCountries.length; i++) {
      const userId = startId + i;
      const country = smallCountries[i];
      const operatingSystems = ['Windows 11', 'macOS Monterey', 'Ubuntu 22.04', 'iOS 16', 'Android 13'];
      const randomOS = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
      const randomIP = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      // Check if user_details entry exists for this user
      const [existingDetails] = await pool.query(
        'SELECT * FROM user_details WHERE user_id = ?',
        [userId]
      );
      
      if (existingDetails.length === 0) {
        // Insert new user_details
        await pool.query(
          'INSERT INTO user_details (user_id, operating_system, country, ip_address, user_agent, last_login_date) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, randomOS, country, randomIP, `Browser on ${randomOS}`]
        );
        console.log(`Added user_details for user ${userId} from ${country}`);
      } else {
        // Update existing user_details
        await pool.query(
          'UPDATE user_details SET country = ? WHERE user_id = ?',
          [country, userId]
        );
        console.log(`Updated user_details for user ${userId} to ${country}`);
      }
    }
    
    console.log('Successfully added more countries to the database!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding countries:', error.message);
    process.exit(1);
  }
}

addMoreCountries();
