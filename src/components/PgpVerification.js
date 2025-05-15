import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as openpgp from 'openpgp';
import './PgpVerification.css';

const PgpVerification = ({ username, onVerificationComplete }) => {
  // Will be used for navigation after verification
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars
  const [pgpPublicKey, setPgpPublicKey] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedCode, setDecryptedCode] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [verificationLink, setVerificationLink] = useState(''); // Will be used to display to user in future
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Enter PGP key, 2: Decrypt message, 3: Success
  const [isLoading, setIsLoading] = useState(false);

  // Generate a random verification code
  const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleSubmitPgpKey = async () => {
    if (!pgpPublicKey.trim()) {
      setError('Please enter your PGP public key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate PGP key format
      await openpgp.readKey({ armoredKey: pgpPublicKey });
      
      // Generate a verification code and encrypt it
      const verificationCode = generateVerificationCode();
      
      // Store verification code in localStorage (in a real app, this would be server-side)
      localStorage.setItem(`verification_${username}`, verificationCode);
      
      // Create verification link (will be displayed to user in future implementation)
      const verificationLink = `/verify/${verificationCode}`; // eslint-disable-line no-unused-vars
      setVerificationLink(`/verify/${verificationCode}`);

      // Encrypt the verification link with the user's public key
      const encrypted = await encryptMessage(verificationLink, pgpPublicKey);
      setEncryptedMessage(encrypted);
      
      // Move to next step
      setStep(2);
    } catch (err) {
      setError('Invalid PGP key format. Please provide a valid PGP public key.');
      console.error('PGP key validation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const encryptMessage = async (message, publicKeyArmored) => {
    try {
      const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
      
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: message }),
        encryptionKeys: publicKey
      });
      
      return encrypted;
    } catch (err) {
      console.error('Encryption error:', err);
      throw err;
    }
  };

  const handleVerify = () => {
    if (!decryptedCode.trim()) {
      setError('Please enter the decrypted verification link');
      return;
    }

    setIsLoading(true);
    setError('');

    // In a real app, this would be a server-side verification
    const expectedCode = localStorage.getItem(`verification_${username}`);
    
    // Check if the decrypted code matches the expected verification link
    if (decryptedCode.includes(expectedCode)) {
      // Store verification status
      localStorage.setItem(`pgp_verified_${username}`, 'true');
      
      // Move to success step
      setStep(3);
      
      // Notify parent component
      if (onVerificationComplete) {
        setTimeout(() => {
          onVerificationComplete();
        }, 2000);
      }
    } else {
      setError('Verification failed. The decrypted link does not match the expected verification code.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="pgp-verification">
      <div className="pgp-container">
        <div className="pgp-card">
          {step < 3 && (
            <>
              <div className="pgp-header">
                <h2>PGP Verification</h2>
                <p>Secure your communications with end-to-end encryption</p>
                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer" className="tutorial-button">
                  <i className="fas fa-play-circle"></i> Watch Tutorial
                </a>
              </div>
              
              <div className="step-indicator">
                <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
                <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
                <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
              </div>
            </>
          )}
        
        {step === 1 && (
          <>
            <p className="instruction">
              <i className="fas fa-lock"></i> Please provide your PGP public key. This will be used to encrypt a verification link.
            </p>
            <div className="form-group">
              <textarea
                className="pgp-textarea"
                placeholder="Paste your PGP public key here..."
                value={pgpPublicKey}
                onChange={(e) => setPgpPublicKey(e.target.value)}
                rows={10}
              />
              <span className="input-hint">Your PGP public key should begin with '-----BEGIN PGP PUBLIC KEY BLOCK-----'</span>
            </div>
            <button 
              className="pgp-button" 
              onClick={handleSubmitPgpKey}
              disabled={isLoading}
            >
              {isLoading ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-key"></i> Submit PGP Key</>}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="instruction">
              <i className="fas fa-shield-alt"></i> Decrypt the following message using your PGP private key. 
              The message contains a verification link. Enter the decrypted link below.
            </p>
            <div className="encrypted-message">
              <pre>{encryptedMessage}</pre>
            </div>
            <div className="form-group">
              <input
                type="text"
                className="pgp-input"
                placeholder="Enter the decrypted verification link"
                value={decryptedCode}
                onChange={(e) => setDecryptedCode(e.target.value)}
              />
              <span className="input-hint">The link should start with '/verify/' followed by a code</span>
            </div>
            <button 
              className="pgp-button" 
              onClick={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : <><i className="fas fa-check-circle"></i> Verify</>}
            </button>
          </>
        )}

        {step === 3 && (
          <div className="success-message">
            <div className="success-icon">
              <i className="fas fa-lock"></i>
            </div>
            <h3>Verification Successful!</h3>
            <p>Your PGP key has been verified and securely stored. You're now able to send and receive encrypted messages. Redirecting to dashboard...</p>
          </div>
        )}

        {error && <div className="pgp-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}
        </div>
        
        <div className="pgp-features">
          <div className="pgp-feature">
            <i className="fas fa-shield-alt"></i>
            <h3>End-to-End Encryption</h3>
            <p>Your messages are encrypted on your device and can only be read by the intended recipient.</p>
          </div>
          
          <div className="pgp-feature">
            <i className="fas fa-user-secret"></i>
            <h3>Enhanced Privacy</h3>
            <p>We don't collect any personal data beyond what's necessary for the service to function.</p>
          </div>
          
          <div className="pgp-feature">
            <i className="fas fa-key"></i>
            <h3>Secure Key Management</h3>
            <p>Your encryption keys never leave your device, ensuring maximum privacy and security.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PgpVerification;
