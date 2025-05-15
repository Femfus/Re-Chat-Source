import React from 'react';
import { Link } from 'react-router-dom';
import './Pricing.css';

const Pricing = () => {
  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Basic secure messaging for individuals',
      features: [
        'End-to-end encryption',
        'Self-destructing messages',
        'Up to 3 devices',
        '1GB secure file storage',
        'Standard support'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Premium',
      price: '4.99',
      description: 'Enhanced features for privacy enthusiasts',
      features: [
        'Everything in Free',
        'Up to 10 devices',
        '10GB secure file storage',
        'Message scheduling',
        'Custom chat themes',
        'Priority support'
      ],
      cta: 'Try Premium',
      popular: true
    },
    {
      name: 'Business',
      price: '12.99',
      description: 'Advanced security for teams and organizations',
      features: [
        'Everything in Premium',
        'Unlimited devices',
        '100GB secure file storage',
        'Admin console',
        'User management',
        'Team channels',
        'API access',
        '24/7 dedicated support'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <h2 className="section-title text-center">Simple, Transparent Pricing</h2>
        <p className="section-subtitle text-center">
          Choose the plan that's right for you. All plans include our core privacy features.
        </p>
        
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div className={`pricing-card ${plan.popular ? 'popular' : ''}`} key={index}>
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="currency">$</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
              <Link to="/auth" className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                {plan.cta}
              </Link>
              <div className="payment-methods">
                <span>Pay with:</span>
                <div className="crypto-icons-small">
                  <i className="fa-brands fa-bitcoin"></i>
                  <i className="fa-brands fa-ethereum"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pricing-note">
          <p>All plans come with a 14-day money-back guarantee. No questions asked.</p>
          <div className="crypto-payment-notice">
            <div className="crypto-icons">
              <i className="fa-brands fa-bitcoin"></i>
              <i className="fa-brands fa-ethereum"></i>
            </div>
            <p><strong>We only accept Bitcoin and Ethereum payments</strong> to protect against chargebacks and ensure your privacy.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
