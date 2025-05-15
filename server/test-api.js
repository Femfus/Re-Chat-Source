const axios = require('axios');
require('dotenv').config();

const API_URL = `http://localhost:${process.env.PORT || 5000}/api`;
let authToken = '';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  inviteCode: 'PREMIUM-1234-ABCD' // This should match an invite code in your database
};

// Admin user data (from init-db.js)
const adminUser = {
  email: 'admin@rechat.to',
  password: 'admin123'
};

// Function to log responses
const logResponse = (title, response) => {
  console.log(`\n===== ${title} =====`);
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(response.data, null, 2));
};

// Function to log errors
const logError = (title, error) => {
  console.log(`\n===== ${title} ERROR =====`);
  console.log('Message:', error.message);
  if (error.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  }
};

// Test API endpoints
async function testAPI() {
  try {
    console.log('\n***** TESTING RE-CHAT.TO API *****\n');
    
    // 1. Register a new user
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
      logResponse('REGISTER USER', registerResponse);
    } catch (error) {
      logError('REGISTER USER', error);
      console.log('Note: If the user already exists, this error is expected.');
    }
    
    // 2. Login as admin
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, adminUser);
      logResponse('ADMIN LOGIN', loginResponse);
      authToken = loginResponse.data.token;
    } catch (error) {
      logError('ADMIN LOGIN', error);
      console.log('Admin login failed. Make sure the admin user exists and the server is running.');
      return;
    }
    
    // Set auth header for subsequent requests
    const authHeader = { headers: { Authorization: `Bearer ${authToken}` } };
    
    // 3. Get all users
    try {
      const usersResponse = await axios.get(`${API_URL}/users`, authHeader);
      logResponse('GET USERS', usersResponse);
    } catch (error) {
      logError('GET USERS', error);
    }
    
    // 4. Get all invite codes
    try {
      const codesResponse = await axios.get(`${API_URL}/invite-codes`, authHeader);
      logResponse('GET INVITE CODES', codesResponse);
    } catch (error) {
      logError('GET INVITE CODES', error);
    }
    
    // 5. Generate a new invite code
    try {
      const newCodeResponse = await axios.post(`${API_URL}/invite-codes`, {
        plan: 'premium',
        quantity: 1
      }, authHeader);
      logResponse('GENERATE INVITE CODE', newCodeResponse);
    } catch (error) {
      logError('GENERATE INVITE CODE', error);
    }
    
    // 6. Get admin profile
    try {
      const profileResponse = await axios.get(`${API_URL}/auth/profile`, authHeader);
      logResponse('GET PROFILE', profileResponse);
    } catch (error) {
      logError('GET PROFILE', error);
    }
    
    // 7. Logout
    try {
      const logoutResponse = await axios.post(`${API_URL}/auth/logout`, {}, authHeader);
      logResponse('LOGOUT', logoutResponse);
    } catch (error) {
      logError('LOGOUT', error);
    }
    
    console.log('\n***** API TESTING COMPLETE *****\n');
    
  } catch (error) {
    console.error('Error during API testing:', error.message);
  }
}

// Run the tests
testAPI();
