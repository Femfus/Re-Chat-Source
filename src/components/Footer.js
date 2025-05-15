import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from '../assets/Logo.svg';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logo} alt="Re-Chat.to Logo" />
              <span>Re-Chat.to</span>
            </div>
            <p className="footer-tagline">
              Privacy-focused messaging for a secure world.
            </p>
            <div className="footer-social">
              <a href="https://twitter.com/rechat" aria-label="Twitter">
                <i className="social-icon">𝕏</i>
              </a>
              <a href="https://github.com/rechat" aria-label="GitHub">
                <i className="social-icon">⌨</i>
              </a>
              <a href="https://reddit.com/r/rechat" aria-label="Reddit">
                <i className="social-icon">ⓡ</i>
              </a>
            </div>
          </div>
          
          <div className="footer-links">
            <div className="footer-links-column">
              <h3>Product</h3>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#download">Download</a></li>
                <li><a href="#updates">Updates</a></li>
              </ul>
            </div>
            
            <div className="footer-links-column">
              <h3>Company</h3>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>
            
            <div className="footer-links-column">
              <h3>Resources</h3>
              <ul>
                <li><a href="#support">Support</a></li>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            
            <div className="footer-links-column">
              <h3>Legal</h3>
              <ul>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
                <li><a href="#compliance">Compliance</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="copyright">
            &copy; {new Date().getFullYear()} Re-Chat.to. All rights reserved.
          </p>
          <div className="footer-language">
            <select name="language" id="language-select">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
