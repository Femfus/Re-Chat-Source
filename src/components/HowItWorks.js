import React from 'react';
import './HowItWorks.css';

const HowItWorks = () => {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <h2 className="section-title text-center">HOW IT WORKS</h2>
        <div className="section-underline"></div>
        
        <div className="process-container">
          <div className="process-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Generate Keys</h3>
              <p>Your device generates a unique pair of cryptographic keys - one public, one private.</p>
            </div>
          </div>
          
          <div className="process-connector"></div>
          
          <div className="process-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Encrypt Message</h3>
              <p>Messages are encrypted with the recipient's public key before leaving your device.</p>
            </div>
          </div>
          
          <div className="process-connector"></div>
          
          <div className="process-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Secure Transmission</h3>
              <p>Encrypted data is transmitted through our servers without the ability to decrypt it.</p>
            </div>
          </div>
          
          <div className="process-connector"></div>
          
          <div className="process-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Decrypt Message</h3>
              <p>Only the recipient's device with the matching private key can decrypt and read the message.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
