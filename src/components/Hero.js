import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <h1>ELEVATE <br /><span className="your-game">YOUR SECURITY</span></h1>
        <p>
          Experience messaging excellence with the most sophisticated and reliable encryption solutions. 
          Stay ahead of the competition with our premium features.
        </p>
        <div className="cta-buttons">
          <Link to="/auth" className="primary-btn">GET STARTED</Link>
          <a href="#faq" className="secondary-btn">FAQ</a>
        </div>
        <div className="feature-container">
          <div className="feature-item">
            <i className="fa-solid fa-lock"></i>
            <span>256-bit Encryption</span>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Advanced Protection</span>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-user-secret"></i>
            <span>Anonymous Browsing</span>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-check-circle"></i>
            <span>Certified Secure</span>
          </div>
        </div>
      </div>
      <div className="hero-image">
        <div className="chat-preview">
          <div className="chat-line purple"></div>
          <div className="chat-line gray"></div>
          <div className="chat-line purple"></div>
          <div className="chat-line gray"></div>
          <div className="chat-line purple"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
