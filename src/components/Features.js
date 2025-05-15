import React from 'react';
import './Features.css';

const Features = () => {
  const features = [
    {
      icon: 'fa-solid fa-lock',
      title: 'END-TO-END ENCRYPTION',
      description: 'Messages are encrypted on your device and can only be decrypted by the intended recipient.'
    },
    {
      icon: 'fa-solid fa-key',
      title: 'PGP SECURITY',
      description: 'Industry-standard PGP encryption ensures your communications remain completely private.'
    },
    {
      icon: 'fa-solid fa-user-shield',
      title: 'PRIVATE BY DESIGN',
      description: 'Our architecture ensures your data remains private, even from our own systems.'
    },
    {
      icon: 'fa-solid fa-fingerprint',
      title: 'KEY VERIFICATION',
      description: 'Verify the identity of your contacts with secure key verification protocols.'
    },
    {
      icon: 'fa-solid fa-eye-slash',
      title: 'ZERO KNOWLEDGE',
      description: 'We have zero knowledge of your conversations, contacts, or personal information.'
    },
    {
      icon: 'fa-solid fa-clock',
      title: 'MESSAGE EXPIRATION',
      description: 'Set messages to automatically delete after they have been read or after a specified time.'
    },
    {
      icon: 'fa-solid fa-signature',
      title: 'DIGITAL SIGNATURES',
      description: 'Verify the authenticity of messages with cryptographic digital signatures.'
    },
    {
      icon: 'fa-solid fa-laptop-code',
      title: 'CROSS-PLATFORM',
      description: 'Available on all major platforms with seamless synchronization between devices.'
    }
  ];

  return (
    <section className="features" id="features">
      <h2>KEY FEATURES</h2>
      
      <div className="key-features-grid">
        {features.map((feature, index) => (
          <div className="key-feature-card" key={index}>
            <div className="key-feature-icon">
              <i className={feature.icon}></i>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
