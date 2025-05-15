import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PgpVerification from './PgpVerification';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');
  
  // Sample data
  const [chats, setChats] = useState([
    {
      id: 1,
      name: 'Alice',
      avatar: 'https://i.pravatar.cc/150?img=1',
      lastMessage: 'Hey, how are you doing?',
      timestamp: '10:30 AM',
      unread: 2,
      online: true,
      messages: [
        { id: 1, sender: 'Alice', content: 'Hey there!', timestamp: '10:15 AM', read: true },
        { id: 2, sender: 'Alice', content: 'How are you doing?', timestamp: '10:30 AM', read: false },
      ]
    },
    {
      id: 2,
      name: 'Secure Group',
      avatar: 'https://i.pravatar.cc/150?img=2',
      lastMessage: 'Bob: Let\'s discuss the new encryption protocol',
      timestamp: 'Yesterday',
      unread: 5,
      online: false,
      isGroup: true,
      messages: [
        { id: 1, sender: 'Charlie', content: 'Has anyone implemented the new protocol?', timestamp: 'Yesterday, 2:15 PM', read: true },
        { id: 2, sender: 'Bob', content: 'Let\'s discuss the new encryption protocol', timestamp: 'Yesterday, 3:30 PM', read: false },
      ]
    },
    {
      id: 3,
      name: 'Bob',
      avatar: 'https://i.pravatar.cc/150?img=3',
      lastMessage: 'I sent you the encrypted file',
      timestamp: 'Yesterday',
      unread: 0,
      online: false,
      messages: [
        { id: 1, sender: 'Bob', content: 'Do you have a moment to check something?', timestamp: 'Yesterday, 1:15 PM', read: true },
        { id: 2, sender: 'Bob', content: 'I sent you the encrypted file', timestamp: 'Yesterday, 1:30 PM', read: true },
        { id: 3, sender: 'me', content: 'Got it, I\'ll take a look', timestamp: 'Yesterday, 2:00 PM', read: true },
      ]
    },
    {
      id: 4,
      name: 'Charlie',
      avatar: 'https://i.pravatar.cc/150?img=4',
      lastMessage: 'The meeting is scheduled for tomorrow',
      timestamp: 'Monday',
      unread: 0,
      online: true,
      messages: [
        { id: 1, sender: 'Charlie', content: 'Are you available for a meeting?', timestamp: 'Monday, 9:15 AM', read: true },
        { id: 2, sender: 'me', content: 'Yes, what time?', timestamp: 'Monday, 9:30 AM', read: true },
        { id: 3, sender: 'Charlie', content: 'The meeting is scheduled for tomorrow', timestamp: 'Monday, 10:00 AM', read: true },
      ]
    },
  ]);

  // Will be used in future for adding/removing contacts
  const [contacts, setContacts] = useState([ // eslint-disable-line no-unused-vars
    { id: 1, name: 'Alice', avatar: 'https://i.pravatar.cc/150?img=1', online: true, pgpVerified: true },
    { id: 2, name: 'Bob', avatar: 'https://i.pravatar.cc/150?img=3', online: false, pgpVerified: true },
    { id: 3, name: 'Charlie', avatar: 'https://i.pravatar.cc/150?img=4', online: true, pgpVerified: false },
    { id: 4, name: 'David', avatar: 'https://i.pravatar.cc/150?img=5', online: false, pgpVerified: true },
    { id: 5, name: 'Eve', avatar: 'https://i.pravatar.cc/150?img=6', online: true, pgpVerified: false },
  ]);

  useEffect(() => {
    // Check if user is logged in
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const userObj = JSON.parse(loggedInUser);
    setUser(userObj);

    // Check if PGP verification is needed
    const isPgpVerified = localStorage.getItem(`pgp_verified_${userObj.username}`);
    if (!isPgpVerified) {
      setNeedsVerification(true);
    }
  }, [navigate]);

  const handleVerificationComplete = () => {
    setNeedsVerification(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Commands that can be entered in the chat
  const [showCommandInfo, setShowCommandInfo] = useState(false);
  const [commandInfoTimeout, setCommandInfoTimeout] = useState(null);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;
    
    // Check for commands
    if (message.trim() === '/tos') {
      // Navigate to Terms of Service
      navigate('/terms');
      setMessage('');
      return;
    }
    
    // Regular message handling
    const newMessage = {
      id: activeChat.messages.length + 1,
      sender: 'me',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true
    };

    // Update chat with new message
    const updatedChats = chats.map(chat => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: `You: ${message}`,
          timestamp: 'Just now'
        };
      }
      return chat;
    });

    setChats(updatedChats);
    setActiveChat({
      ...activeChat,
      messages: [...activeChat.messages, newMessage],
      lastMessage: `You: ${message}`,
      timestamp: 'Just now'
    });
    setMessage('');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (needsVerification) {
    return <PgpVerification username={user?.username} onVerificationComplete={handleVerificationComplete} />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h3>{user?.username}</h3>
              <span className="user-status">Online</span>
            </div>
          </div>
          <button className="toggle-sidebar" onClick={toggleSidebar}>
            <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'}`}></i>
          </button>
        </div>

        <div className="sidebar-tabs">
          <button 
            className={`tab-button ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <i className="fas fa-comment-alt"></i>
            <span>Chats</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <i className="fas fa-address-book"></i>
            <span>Contacts</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </button>
        </div>

        <div className="sidebar-search">
          <div className="search-container">
            <i className="fas fa-search"></i>
            <input type="text" placeholder={`Search ${activeTab}...`} />
          </div>
        </div>

        <div className="sidebar-content">
          {activeTab === 'chats' && (
            <div className="chat-list">
              {chats.map(chat => (
                <div 
                  key={chat.id} 
                  className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(chat)}
                >
                  <div className="chat-avatar">
                    <img src={chat.avatar} alt={chat.name} />
                    {chat.online && <span className="online-indicator"></span>}
                  </div>
                  <div className="chat-details">
                    <div className="chat-header">
                      <h4>{chat.name}</h4>
                      <span className="chat-time">{chat.timestamp}</span>
                    </div>
                    <div className="chat-message">
                      <p>{chat.lastMessage}</p>
                      {chat.unread > 0 && <span className="unread-count">{chat.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="contact-list">
              {contacts.map(contact => (
                <div key={contact.id} className="contact-item">
                  <div className="contact-avatar">
                    <img src={contact.avatar} alt={contact.name} />
                    {contact.online && <span className="online-indicator"></span>}
                  </div>
                  <div className="contact-details">
                    <h4>{contact.name}</h4>
                    <div className="contact-status">
                      {contact.pgpVerified ? (
                        <span className="pgp-verified">
                          <i className="fas fa-shield-alt"></i> PGP Verified
                        </span>
                      ) : (
                        <span className="pgp-unverified">
                          <i className="fas fa-exclamation-triangle"></i> Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="contact-action">
                    <i className="fas fa-comment-alt"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-list">
              <div className="settings-section">
                <h3>Account</h3>
                <div className="settings-item">
                  <i className="fas fa-user"></i>
                  <span>Profile</span>
                </div>
                <div className="settings-item">
                  <i className="fas fa-key"></i>
                  <span>PGP Keys</span>
                </div>
                <div className="settings-item">
                  <i className="fas fa-bell"></i>
                  <span>Notifications</span>
                </div>
              </div>
              
              <div className="settings-section">
                <h3>Privacy & Security</h3>
                <div className="settings-item">
                  <i className="fas fa-lock"></i>
                  <span>Privacy</span>
                </div>
                <div className="settings-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Security</span>
                </div>
                <div className="settings-item">
                  <i className="fas fa-history"></i>
                  <span>Message History</span>
                </div>
              </div>
              
              <div className="settings-section">
                <h3>App Settings</h3>
                <div className="settings-item">
                  <i className="fas fa-palette"></i>
                  <span>Theme</span>
                </div>
                <div className="settings-item">
                  <i className="fas fa-language"></i>
                  <span>Language</span>
                </div>
              </div>
              
              <div className="logout-button" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-area">
        {activeChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  <img src={activeChat.avatar} alt={activeChat.name} />
                </div>
                <div className="chat-details">
                  <h3>{activeChat.name}</h3>
                  <span className="chat-status">
                    {activeChat.online ? 'Online' : 'Offline'}
                    {activeChat.isGroup && ' • Group Chat'}
                  </span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="action-button">
                  <i className="fas fa-phone"></i>
                </button>
                <button className="action-button">
                  <i className="fas fa-video"></i>
                </button>
                <button className="action-button">
                  <i className="fas fa-info-circle"></i>
                </button>
              </div>
            </div>

            <div className="chat-messages" id="chat-messages">
              {/* Add date separator */}
              <div className="date-separator">
                <span>Today</span>
              </div>
              {activeChat.messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}
                >
                  {msg.sender !== 'me' && (
                    <div className="message-avatar">
                      <img src={activeChat.avatar} alt={msg.sender} />
                    </div>
                  )}
                  <div className="message-content">
                    {msg.sender !== 'me' && activeChat.isGroup && (
                      <div className="message-sender">{msg.sender}</div>
                    )}
                    <div className="message-bubble">
                      <p>{msg.content}</p>
                      <div className="message-meta">
                        <span className="message-time">{msg.timestamp}</span>
                        {msg.sender === 'me' && (
                          <span className="message-status">
                            {msg.read ? (
                              <span className="message-read">
                                <i className="fas fa-check-double"></i>
                              </span>
                            ) : (
                              <i className="fas fa-check"></i>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <div className="input-actions-left">
                <button className="input-action" title="Attach file">
                  <i className="fas fa-paperclip"></i>
                </button>
                <button className="input-action" title="Insert emoji">
                  <i className="fas fa-smile"></i>
                </button>
                <button 
                  className="input-action" 
                  title="Show available commands"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCommandInfo(true);
                    
                    // Clear existing timeout if there is one
                    if (commandInfoTimeout) {
                      clearTimeout(commandInfoTimeout);
                    }
                    
                    // Auto-hide after 5 seconds
                    const timeout = setTimeout(() => {
                      setShowCommandInfo(false);
                    }, 5000);
                    
                    setCommandInfoTimeout(timeout);
                  }}
                >
                  <i className="fas fa-slash"></i>
                </button>
              </div>
              <form onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  placeholder="Type a secure message..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" className="send-button" disabled={!message.trim()}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
              <div className="input-actions-right">
                <button className="input-action" title="End-to-end encrypted">
                  <i className="fas fa-lock"></i>
                </button>
                <button className="input-action" title="Voice message">
                  <i className="fas fa-microphone"></i>
                </button>
              </div>
              
              {/* Command Info Popup */}
              {showCommandInfo && (
                <div className="command-info-popup">
                  <div className="command-info-header">
                    <h4>Available Commands</h4>
                    <button onClick={() => setShowCommandInfo(false)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="command-list">
                    <div className="command-item">
                      <code>/tos</code>
                      <span>View Terms of Service</span>
                    </div>
                  </div>
                  <div className="command-info-footer">
                    <p>Type any command directly in the message input</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <i className="fas fa-comments"></i>
            </div>
            <h2>Select a chat to start messaging</h2>
            <p>Your messages are end-to-end encrypted and verified with PGP</p>
            <div className="security-badges">
              <div className="security-badge">
                <i className="fas fa-lock"></i>
                <span>End-to-End Encrypted</span>
              </div>
              <div className="security-badge">
                <i className="fas fa-shield-alt"></i>
                <span>PGP Verified</span>
              </div>
              <div className="security-badge">
                <i className="fas fa-user-shield"></i>
                <span>Privacy Focused</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Dashboard;
