import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.css';
import './TermsOfService.css';

const TermsOfService = () => {
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'auto';
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="tos-page">
      <nav className="tos-nav">
        <Link to="/" className="back-link">
          <i className="fas fa-arrow-left"></i> Back to Home
        </Link>
      </nav>
      <div className="tos-container">
        <div className="tos-content">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last Updated: May 10, 2025</p>
          
          <div className="tos-section">
            <h2>1. PGP Encryption & Verification</h2>
            <p>
              re-chat.to provides end-to-end encrypted communication with mandatory PGP verification. By using our service, you agree to:
            </p>
            <ul>
              <li>Complete PGP verification each time you access the platform</li>
              <li>Maintain the security of your private PGP key</li>
              <li>Accept that lost keys cannot be recovered by us</li>
            </ul>
          </div>
          
          <div className="tos-section">
            <h2>2. Data Collection & No-Logs Policy</h2>
            <p>
              <strong>Information We Collect:</strong> We collect and store only the minimum required data:  
            </p>
            <ul>
              <li>Username and hashed password</li>
              <li>PGP public key</li>
              <li>IP address and user agent (for security and abuse prevention only)</li>
              <li>Account creation date</li>
            </ul>
            <p>
              <strong>Information We DO NOT Collect:</strong> We do not store message content, conversation history, contact lists, or metadata about your communications. We operate under a strict no-logs policy for messages.  
            </p>
          </div>
          
          <div className="tos-section">
            <h2>3. Prohibited Activities & Enforcement</h2>
            <p>
              <strong>Zero Tolerance Policy:</strong> Strictly prohibited: CSAM content, illegal activities (fraud, terrorism, trafficking), harmful content, harassment, and malware distribution.
            </p>
            <p>
              <strong>Violations result in:</strong> Permanent account termination, IP and device blacklisting, and possible reporting to authorities.
            </p>
          </div>
          
          <div className="tos-section">
            <h2>4. User Reporting System</h2>
            <p>
              <strong>Anonymous Reporting:</strong> Our reporting system preserves complete anonymity for reporters. When you report a user, your identity is never revealed to the reported user or stored with the report.  
            </p>
            <p>
              <strong>Reportable Violations:</strong> You can report users for the prohibited activities listed in Section 3, PGP verification issues, impersonation, or other Terms of Service violations.
            </p>
            <p>
              <strong>Report Processing:</strong> Administrators review reports based solely on the information you provide. Due to our no-logs policy, we cannot access message content to investigate claims. When action is taken, an automated notification is sent to the reporter without compromising anonymity.
            </p>
          </div>
          
          <div className="tos-section">
            <h2>5. Disclaimers and Liability</h2>
            <p>
              The service is provided "as is" without warranties of any kind. We reserve the right to modify or discontinue the service at any time. We are not liable for any damages resulting from your use of or inability to use the service.
            </p>
          </div>
          
          <div className="tos-section">
            <h2>6. Contact</h2>
            <p>
              For questions about these Terms, contact us at legal@re-chat.to.
            </p>
          </div>
          
          <div className="tos-footer">
            <p>© 2025 re-chat.to. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
