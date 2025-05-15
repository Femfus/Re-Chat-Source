import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VerificationPage.css';

const VerificationPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate verification process
    const verifyCode = () => {
      setTimeout(() => {
        setVerifying(false);
        
        // Check if code exists in localStorage (in a real app, this would be server-side)
        const usernames = Object.keys(localStorage)
          .filter(key => key.startsWith('verification_'))
          .map(key => key.replace('verification_', ''));
        
        let verified = false;
        
        for (const username of usernames) {
          const storedCode = localStorage.getItem(`verification_${username}`);
          if (storedCode === code) {
            // Mark as verified
            localStorage.setItem(`pgp_verified_${username}`, 'true');
            localStorage.setItem('current_verified_user', username);
            verified = true;
            break;
          }
        }
        
        if (verified) {
          setSuccess(true);
          // Redirect to dashboard after a delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          setError('Invalid or expired verification code.');
        }
      }, 2000);
    };
    
    verifyCode();
  }, [code, navigate]);

  return (
    <div className="verification-page">
      <div className="verification-card">
        <h2>PGP Verification</h2>
        
        {verifying && (
          <div className="verification-status">
            <div className="verification-spinner"></div>
            <p>Verifying your PGP key...</p>
          </div>
        )}
        
        {!verifying && success && (
          <div className="verification-success">
            <div className="success-icon">✓</div>
            <h3>Verification Successful!</h3>
            <p>Your PGP key has been verified. Redirecting to dashboard...</p>
          </div>
        )}
        
        {!verifying && !success && (
          <div className="verification-error">
            <div className="error-icon">✗</div>
            <h3>Verification Failed</h3>
            <p>{error}</p>
            <button 
              className="verification-button"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationPage;
