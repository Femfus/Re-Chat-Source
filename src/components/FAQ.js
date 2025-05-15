import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqs = [
    {
      question: 'How secure is Re-Chat.to?',
      answer: 'Re-Chat.to uses state-of-the-art end-to-end encryption for all messages and files. This means that only you and the recipient can read the messages - not even our servers can access the content. We also implement perfect forward secrecy, which means that even if your keys are compromised in the future, your past conversations remain secure.'
    },
    {
      question: 'Do you collect any user data?',
      answer: 'We are committed to zero data collection. We do not store any metadata about your conversations, contacts, or usage patterns. The only information we keep is what\'s absolutely necessary for your account to function, such as your encrypted account credentials. We never sell or share any user data with third parties.'
    },
    {
      question: 'Can I use Re-Chat.to on multiple devices?',
      answer: 'Yes! Depending on your plan, you can use Re-Chat.to on multiple devices simultaneously. The Free plan supports up to 3 devices, Premium up to 10 devices, and Business plan offers unlimited devices. Your message history and settings will sync securely across all your devices.'
    },
    {
      question: 'How do self-destructing messages work?',
      answer: 'Self-destructing messages allow you to set a timer for how long a message should be available after it\'s been read. Once the timer expires, the message is permanently deleted from both your device and the recipient\'s device. You can set timers ranging from 5 seconds to 1 week.'
    },
    {
      question: 'Is Re-Chat.to open source?',
      answer: 'Yes, our client applications are fully open source, allowing security researchers and the community to verify our security claims. Our server code is partially open source, with the critical security components available for public review while keeping proprietary features private.'
    },
    {
      question: 'What happens if I forget my password?',
      answer: 'Due to our zero-knowledge encryption design, we cannot reset your password if you forget it. However, we offer an optional recovery key system that you can set up. This recovery key is generated on your device and should be stored in a safe place. Without either your password or recovery key, your encrypted data cannot be accessed.'
    },
    {
      question: 'How can I pay for Premium or Business plans?',
      answer: 'We accept various payment methods including credit/debit cards, PayPal, and cryptocurrencies like Bitcoin and Monero for enhanced privacy. All payment processing is handled through secure third-party processors with no access to your messaging data.'
    }
  ];

  return (
    <section className="faq" id="faq">
      <div className="container">
        <h2 className="section-title text-center">Frequently Asked Questions</h2>
        <p className="section-subtitle text-center">
          Got questions about our service? Find answers to the most common questions below.
        </p>
        
        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div 
              className={`faq-item ${activeIndex === index ? 'active' : ''}`} 
              key={index}
            >
              <div 
                className="faq-question"
                onClick={() => toggleAccordion(index)}
              >
                <h3>{faq.question}</h3>
                <span className="faq-icon">
                  {activeIndex === index ? '−' : '+'}
                </span>
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="faq-cta">
          <p>Still have questions?</p>
          <a href="#contact" className="btn btn-primary">Contact Us</a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
