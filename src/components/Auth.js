import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Auth = () => {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTosNotification, setShowTosNotification] = useState(false);
  const [tosTimer, setTosTimer] = useState(3);
  // Success message for user feedback - will be implemented in UI in future
  const [successMessage, setSuccessMessage] = useState(''); // eslint-disable-line no-unused-vars
  
  // API URL
  const API_URL = 'http://localhost:5000/api';
  const [success, setSuccess] = useState('');

  const toggleForm = () => {
    setIsSignIn(!isSignIn);
    setError('');
    setSuccess('');
  };

  // TEMPORARY TEST MODE - Remove for production
  const TEST_MODE = true;

  // Check if PGP verification is needed after login
  const checkPgpVerification = (username) => {
    // Check if user has a verified PGP key
    const isPgpVerified = localStorage.getItem(`pgp_verified_${username}`);
    
    // If not verified, redirect to PGP verification
    if (!isPgpVerified) {
      // Store current user temporarily
      localStorage.setItem('temp_user', JSON.stringify({ username, role: 'user' }));
      navigate('/pgp-verification');
    } else {
      // User is already PGP verified, proceed to dashboard
      localStorage.setItem('user', JSON.stringify({ username, role: 'user' }));
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Basic validation
    if (!username || !password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    // TEMPORARY: Test mode to bypass API calls
    if (TEST_MODE) {
      setTimeout(() => {
        if (isSignIn) {
          // Simulate successful login, but check PGP verification first
          checkPgpVerification(username);
        } else {
          // Simulate successful registration
          setSuccess('Account created successfully! You can now sign in.');
          setIsSignIn(true);
          setUsername('');
          setPassword('');
          setConfirmPassword('');
          setInviteCode('');
        }
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      if (!isSignIn) {
        // Registration validation
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (!inviteCode) {
          setError('Invite code is required for registration');
          setIsLoading(false);
          return;
        }
        
        // For registration, we still need an email
        const email = `${username}@rechat.to`; // Generate email from username

        // Register user
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email,
            password,
            inviteCode
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        setSuccess('Account created successfully! You can now sign in.');
        setIsSignIn(true);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setInviteCode('');
      } else {
        // Sign in user
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Store the token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setSuccess('Login successful! Redirecting to your dashboard...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Auth error:', err.message);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth" id="auth">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isSignIn ? 'Sign In' : 'Register'}</h2>
            <p>{isSignIn ? 'Welcome back to Re-Chat.to' : 'Create your Re-Chat.to account'}</p>
          </div>

          {error && <div className="auth-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}
          {success && <div className="auth-success"><i className="fas fa-check-circle"></i> {success}</div>}
          
          {/* TOS Notification will appear after the registration form */}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-row">
                <span className="input-icon">
                  <i className="fas fa-user"></i>
                </span>
                <input 
                  type="text" 
                  id="username" 
                  className="auth-input"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Your username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-row">
                <span className="input-icon">
                  <i className="fas fa-lock"></i>
                </span>
                <input 
                  type="password" 
                  id="password" 
                  className="auth-input"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Your password"
                  required
                />
              </div>
            </div>

            {!isSignIn && (
              <>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-row">
                    <span className="input-icon">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      className="auth-input"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm your password"
                      required={!isSignIn}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="inviteCode">Invite Code</label>
                  <div className="input-row">
                    <span className="input-icon">
                      <i className="fas fa-ticket-alt"></i>
                    </span>
                    <input 
                      type="text" 
                      id="inviteCode" 
                      className="auth-input"
                      value={inviteCode} 
                      onChange={(e) => setInviteCode(e.target.value)} 
                      placeholder="Enter your invite code"
                      required={!isSignIn}
                    />
                  </div>
                </div>

                <div className="invite-info">
                  <i className="fas fa-info-circle"></i>
                  <p>An invite code is required to register. You'll receive an invite code after purchasing a subscription.</p>
                </div>
                
                <div className="tos-notification">
                  <div className="tos-notification-content">
                    <i className="fas fa-gavel"></i>
                    <div className="tos-notification-text">
                      <p><strong>Please read our Terms of Service</strong></p>
                      <p>It's brief and explains prohibited activities and our no-logs policy</p>
                    </div>
                    <Link to="/terms" target="_blank" className="view-tos-btn">View TOS</Link>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> 
                    {isSignIn ? 'Signing In...' : 'Registering...'}
                  </>
                ) : (
                  isSignIn ? 'Sign In' : 'Register'
                )}
              </button>
            </div>

            <div className="auth-toggle">
              {isSignIn ? "Don't have an account?" : "Already have an account?"}
              <button type="button" onClick={toggleForm} className="toggle-button">
                {isSignIn ? 'Register' : 'Sign In'}
              </button>
            </div>
          </form>

          {isSignIn && (
            <div className="auth-footer">
              <a href="#forgot-password" className="forgot-password">Forgot password?</a>
            </div>
          )}
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <i className="fas fa-shield-alt"></i>
            <h3>End-to-End Encryption</h3>
            <p>Your messages are encrypted on your device and can only be read by the intended recipient.</p>
          </div>
          <div className="auth-feature">
            <i className="fas fa-user-secret"></i>
            <p>We don't collect any personal data beyond what's necessary for the service to function.</p>
          </div>
          <div className="auth-feature">
            <i className="fas fa-key"></i>
            <p>Your encryption keys never leave your device, ensuring maximum privacy.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Auth;
