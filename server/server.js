const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, testConnection } = require('./db');
const uuid = require('uuid');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Test database connection
testConnection();

// Routes

// Get user statistics by country (temporarily unprotected for testing)
app.get('/api/stats/users-by-country', async (req, res) => {
  try {
    // Get user count by country
    const [countryStats] = await pool.query(`
      SELECT 
        COALESCE(ud.country, 'Unknown') as country, 
        COUNT(u.id) as user_count 
      FROM 
        users u 
      LEFT JOIN 
        user_details ud ON u.id = ud.user_id 
      GROUP BY 
        ud.country 
      ORDER BY 
        user_count DESC
    `);
    
    res.json(countryStats);
  } catch (error) {
    console.error('Error fetching user statistics by country:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed user information (temporarily unprotected for testing)
app.get('/api/users/:id/details', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get user data
    const [userRows] = await pool.query(
      'SELECT id, username, plan, status, join_date, last_online, last_password_reset FROM users WHERE id = ?',
      [id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user details
    const [detailsRows] = await pool.query(
      'SELECT operating_system, country, ip_address, user_agent, last_login_date FROM user_details WHERE user_id = ?',
      [id]
    );
    
    const userDetails = {
      ...userRows[0],
      ...(detailsRows[0] || {})
    };
    
    res.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (temporarily unprotected for testing)
app.get('/api/users', async (req, res) => {
  // Authentication temporarily disabled for testing
  // Original code:
  // if (req.user.plan !== 'business') {
  //   return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can view all users.' });
  try {
    const [users] = await pool.query('SELECT id, username, plan, status, role, join_date, last_online FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, plan, status, role, 
      DATE_FORMAT(join_date, '%Y-%m-%d %H:%i:%s') as join_date, 
      DATE_FORMAT(last_online, '%Y-%m-%d %H:%i:%s') as last_online 
      FROM users WHERE id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change user plan
app.put('/api/users/:id/plan', async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  
  try {
    const [result] = await pool.query('UPDATE users SET plan = ? WHERE id = ?', [plan, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User plan updated successfully' });
  } catch (error) {
    console.error('Error updating user plan:', error.message);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

// Change user role
app.put('/api/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  // Validate role
  const validRoles = ['user', 'staff', 'dev', 'owner'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  try {
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error.message);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update user plan (protected route)
app.put('/api/users/:id/plan', authenticateToken, async (req, res) => {
  const { plan } = req.body;
  
  if (!plan || !['free', 'premium', 'business'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan' });
  }
  
  // Check if user has admin privileges (plan = business)
  if (req.user.plan !== 'business') {
    return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can update user plans.' });
  }
  
  try {
    // Check if user exists
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await pool.query(
      'UPDATE users SET plan = ? WHERE id = ?',
      [plan, req.params.id]
    );
    
    // Log the activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.userId, 'UPDATE_USER_PLAN', `Updated user ID: ${req.params.id} plan to ${plan}`]
    );
    
    res.json({ message: 'User plan updated successfully' });
  } catch (error) {
    console.error('Error updating user plan:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status (temporarily unprotected for testing)
app.put('/api/users/:id/status', async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['active', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  // Authentication temporarily disabled for testing
  // Original code:
  // if (req.user.plan !== 'business') {
  //   return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can update user status.' });
  // }
  
  try {
    // Check if user exists
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Skip self-suspension check since we're bypassing authentication
    // Original code:
    // if (parseInt(req.params.id) === req.user.userId && status === 'suspended') {
    //   return res.status(400).json({ message: 'You cannot suspend your own account' });
    // }
    
    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    
    // Skip activity logging since we're bypassing authentication
    // Original code:
    // await pool.query(
    //   'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
    //   [req.user.userId, 'UPDATE_USER_STATUS', `Updated user ID: ${req.params.id} status to ${status}`]
    // );
    
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all invite codes (protected route)
app.get('/api/invite-codes', async (req, res) => {
  // Authentication temporarily disabled for testing
  // Original code:
  // if (req.user.plan !== 'business') {
  //   return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can view all invite codes.' });
  // }
  
  try {
    const [rows] = await pool.query(`
      SELECT ic.id, ic.code, ic.plan, ic.used, 
      DATE_FORMAT(ic.created_at, '%Y-%m-%d') as created_at,
      DATE_FORMAT(ic.expires_at, '%Y-%m-%d') as expires_at,
      u.username as used_by_username
      FROM invite_codes ic
      LEFT JOIN users u ON ic.used_by = u.id
      ORDER BY ic.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching invite codes:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate password reset link for user (temporarily unprotected for testing)
app.post('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if user exists
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate a UUID token
    const uuid = require('uuid');
    const token = uuid.v4(); // Generates a random UUID v4 like: 28465151-df9c-4e46-b312-48c2f07cce6d
    
    // Set expiration date to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Delete any existing unused tokens for this user
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE',
      [id]
    );
    
    // Insert the new token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [id, token, expiresAt]
    );
    
    // Generate the reset link
    const resetLink = `http://localhost:3001/password-reset/${token}`;
    
    res.json({ 
      message: 'Password reset link generated successfully',
      resetLink: resetLink
    });
  } catch (error) {
    console.error('Error generating password reset link:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete invite code (temporarily unprotected for testing)
app.delete('/api/invite-codes/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if invite code exists
    const [codeRows] = await pool.query(
      'SELECT * FROM invite_codes WHERE id = ?',
      [id]
    );
    
    if (codeRows.length === 0) {
      return res.status(404).json({ message: 'Invite code not found' });
    }
    
    // Delete the invite code
    await pool.query(
      'DELETE FROM invite_codes WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Invite code deleted successfully' });
  } catch (error) {
    console.error('Error deleting invite code:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Post new invite code (temporarily unprotected for testing)
app.post('/api/invite-codes', async (req, res) => {
  const { plan, quantity = 1, expirationValue = 30, expirationUnit = 'days' } = req.body;
  
  if (!plan || !['premium', 'business'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan' });
  }
  
  if (!expirationValue || expirationValue <= 0) {
    return res.status(400).json({ message: 'Invalid expiration value' });
  }
  
  if (!expirationUnit || !['hours', 'days', 'weeks', 'years'].includes(expirationUnit)) {
    return res.status(400).json({ message: 'Invalid expiration unit' });
  }
  
  // Authentication temporarily disabled for testing
  // Original code:
  // if (req.user.plan !== 'business') {
  //   return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can generate invite codes.' });
  // }
  
  try {
    const newCodes = [];
    const now = new Date();
    let expiresAt;
    
    // Calculate expiration date based on unit
    switch(expirationUnit) {
      case 'hours':
        expiresAt = new Date(now.getTime() + (expirationValue * 60 * 60 * 1000));
        break;
      case 'days':
        expiresAt = new Date(now.getTime() + (expirationValue * 24 * 60 * 60 * 1000));
        break;
      case 'weeks':
        expiresAt = new Date(now.getTime() + (expirationValue * 7 * 24 * 60 * 60 * 1000));
        break;
      case 'years':
        expiresAt = new Date(now.getTime() + (expirationValue * 365 * 24 * 60 * 60 * 1000));
        break;
      default:
        expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Default to 30 days
    }
    
    for (let i = 0; i < quantity; i++) {
      const code = generateInviteCode(plan);
      
      const [result] = await pool.query(
        'INSERT INTO invite_codes (code, plan, expires_at) VALUES (?, ?, ?)',
        [code, plan, expiresAt]
      );
      
      // Skip activity logging since we're bypassing authentication
      // Original code:
      // await pool.query(
      //   'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      //   [req.user.userId, 'GENERATE_INVITE_CODE', `Generated ${plan} invite code`]
      // );
      
      newCodes.push({
        id: result.insertId,
        code,
        plan,
        used: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    }
    
    res.status(201).json(newCodes);
  } catch (error) {
    console.error('Error generating invite codes:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete invite code (protected route)
app.delete('/api/invite-codes/:id', authenticateToken, async (req, res) => {
  // Check if user has admin privileges (plan = business)
  if (req.user.plan !== 'business') {
    return res.status(403).json({ message: 'Insufficient privileges. Only business plan users can delete invite codes.' });
  }
  
  try {
    // Check if code exists and is not used
    const [codeRows] = await pool.query(
      'SELECT * FROM invite_codes WHERE id = ?',
      [req.params.id]
    );
    
    if (codeRows.length === 0) {
      return res.status(404).json({ message: 'Invite code not found' });
    }
    
    if (codeRows[0].used) {
      return res.status(400).json({ message: 'Cannot delete a used invite code' });
    }
    
    await pool.query(
      'DELETE FROM invite_codes WHERE id = ?',
      [req.params.id]
    );
    
    // Log the activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.userId, 'DELETE_INVITE_CODE', `Deleted invite code ID: ${req.params.id}`]
    );
    
    res.json({ message: 'Invite code deleted successfully' });
  } catch (error) {
    console.error('Error deleting invite code:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register user with invite code
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, inviteCode } = req.body;
  
  if (!username || !email || !password || !inviteCode) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    // Check if invite code exists, is unused, and not expired
    const [codeRows] = await pool.query(
      'SELECT * FROM invite_codes WHERE code = ? AND used = FALSE AND (expires_at IS NULL OR expires_at > NOW())',
      [inviteCode]
    );
    
    if (codeRows.length === 0) {
      // Check if the code exists but is expired
      const [expiredRows] = await pool.query(
        'SELECT * FROM invite_codes WHERE code = ? AND used = FALSE AND expires_at <= NOW()',
        [inviteCode]
      );
      
      if (expiredRows.length > 0) {
        return res.status(400).json({ message: 'This invite code has expired' });
      }
      
      // Check if the code exists but is already used
      const [usedRows] = await pool.query(
        'SELECT * FROM invite_codes WHERE code = ? AND used = TRUE',
        [inviteCode]
      );
      
      if (usedRows.length > 0) {
        return res.status(400).json({ message: 'This invite code has already been used' });
      }
      
      return res.status(400).json({ message: 'Invalid invite code' });
    }
    
    const inviteCodeData = codeRows[0];
    
    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with plan from invite code
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, plan) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, inviteCodeData.plan]
    );
    
    const userId = result.insertId;
    
    // Mark invite code as used with username
    await pool.query(
      'UPDATE invite_codes SET used = TRUE, used_by = ?, used_by_username = ? WHERE id = ?',
      [userId, username, inviteCodeData.id]
    );
    
    // Create default user settings
    await pool.query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );
    
    // Log the activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'REGISTER', 'User registered with invite code']
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Find user by username
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }
    
    // Compare password with hashed password in database
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      // Log failed login attempt
      await pool.query(
        'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [user.id, 'LOGIN_FAILED', 'Failed login attempt', req.ip]
      );
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last_online
    await pool.query(
      'UPDATE users SET last_online = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Store session in database
    await pool.query(
      'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
      [user.id, token, req.ip, req.headers['user-agent']]
    );
    
    // Log successful login
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN', 'Successful login', req.ip]
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Error logging in:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate random invite code
function generateInviteCode(plan) {
  const prefix = plan.toUpperCase();
  const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randomPart1}-${randomPart2}`;
}

// Password reset endpoint
app.post('/api/auth/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Check if token exists and is valid
    const [tokenRows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    
    if (tokenRows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    const userId = tokenRows[0].user_id;
    
    // Check if user exists
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    // Mark this specific token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Invalidate the token in the database
    await pool.query(
      'UPDATE sessions SET expires_at = NOW() WHERE user_id = ? AND token = ?',
      [req.user.userId, req.headers['authorization'].split(' ')[1]]
    );
    
    // Log the activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [req.user.userId, 'LOGOUT', 'User logged out', req.ip]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, email, plan, status, 
      DATE_FORMAT(join_date, '%Y-%m-%d %H:%i:%s') as join_date, 
      DATE_FORMAT(last_online, '%Y-%m-%d %H:%i:%s') as last_online,
      profile_picture
      FROM users WHERE id = ?`,
      [req.user.userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user settings
    const [settingsRows] = await pool.query(
      'SELECT theme, notifications_enabled, two_factor_enabled FROM user_settings WHERE user_id = ?',
      [req.user.userId]
    );
    
    const userData = rows[0];
    userData.settings = settingsRows.length > 0 ? settingsRows[0] : null;
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
