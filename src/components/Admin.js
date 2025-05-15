import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import './AdminSettings.css';
import '@fortawesome/fontawesome-free/css/all.css';

// Cookie helper functions
const setCookie = (name, value, days) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const Admin = () => {
  const navigate = useNavigate();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // State for users data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Admin panel appearance settings
  const [adminSettings, setAdminSettings] = useState({
    theme: 'dark',
    accentColor: 'purple',
    sidebarStyle: 'default',
    cardStyle: 'default',
    animation: true,
    compactMode: false,
    fontScale: 1
  });
  
  // System metrics data
  const [reportsPeriod, setReportsPeriod] = useState('week');
  const [systemData, setSystemData] = useState({
    newUsers: [
      { date: '2025-05-04', count: 12 },
      { date: '2025-05-05', count: 8 },
      { date: '2025-05-06', count: 15 },
      { date: '2025-05-07', count: 10 },
      { date: '2025-05-08', count: 6 },
      { date: '2025-05-09', count: 11 },
      { date: '2025-05-10', count: 9 }
    ],
    pgpVerification: [
      { date: '2025-05-04', verified: 8, unverified: 4 },
      { date: '2025-05-05', verified: 6, unverified: 2 },
      { date: '2025-05-06', verified: 10, unverified: 5 },
      { date: '2025-05-07', verified: 7, unverified: 3 },
      { date: '2025-05-08', verified: 4, unverified: 2 },
      { date: '2025-05-09', verified: 9, unverified: 2 },
      { date: '2025-05-10', verified: 7, unverified: 2 }
    ],
    userStatus: {
      active: 145,
      suspended: 18,
      banned: 7
    },
    systemMetrics: {
      uptime: '99.98%',
      responseTime: '0.42s',
      pgpVerificationTime: '1.8s',
      activeConnections: 78
    }
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('users');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // User reports data
  const [userReports, setUserReports] = useState([
    {
      id: 1,
      reportedBy: { id: 2, username: 'john_doe' },
      reportedUser: { id: 3, username: 'jane_smith' },
      reason: 'Inappropriate behavior',
      details: 'User sent unsolicited messages with suspicious links regarding PGP keys.',
      status: 'pending',
      date: '2025-05-09T14:23:45Z',
      evidence: 'Screenshot attached (not shown in demo)'
    },
    {
      id: 2,
      reportedBy: { id: 4, username: 'alex_green' },
      reportedUser: { id: 7, username: 'blocked_user' },
      reason: 'Harassment',
      details: 'User is attempting to intimidate others by claiming they can crack PGP keys.',
      status: 'resolved',
      date: '2025-05-08T09:15:32Z',
      evidence: 'Multiple screenshots and logs provided'
    },
    {
      id: 3,
      reportedBy: { id: 6, username: 'taylor_swift' },
      reportedUser: { id: 7, username: 'blocked_user' },
      reason: 'Spam',
      details: 'User repeatedly sending the same message about compromising encryption.',
      status: 'in_progress',
      date: '2025-05-07T18:42:10Z',
      evidence: 'None provided'
    },
    {
      id: 4,
      reportedBy: { id: 5, username: 'sam_jackson' },
      reportedUser: { id: 3, username: 'jane_smith' },
      reason: 'Impersonation',
      details: 'Claiming to be a system administrator and asking for private keys.',
      status: 'pending',
      date: '2025-05-10T11:05:37Z',
      evidence: 'Chat transcript provided'
    },
    {
      id: 5,
      reportedBy: { id: 2, username: 'john_doe' },
      reportedUser: { id: 7, username: 'blocked_user' },
      reason: 'Threats',
      details: 'User threatening to expose private information if PGP keys not shared.',
      status: 'resolved',
      date: '2025-05-06T15:30:22Z',
      evidence: 'Message screenshots provided'
    }
  ]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // API URL
  const API_URL = 'http://localhost:3000/api';
  
  // Load users on component mount
  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      // This would be replaced with a real authentication check in production
      // Checking if token exists in localStorage and hasn't expired
      const adminAuthToken = localStorage.getItem('adminAuthToken');
      const adminAuthExpiry = localStorage.getItem('adminAuthExpiry');
      
      // Check if auth token exists and is not expired
      if (!adminAuthToken || !adminAuthExpiry || new Date().getTime() > parseInt(adminAuthExpiry)) {
        // Not authenticated, redirect to admin login
        navigate('/admin/login');
        return;
      }
      
      setIsAuthenticated(true);
      setAuthChecking(false);
    };
    
    checkAuth();
  }, [navigate]);
  
  // Load saved settings from cookies
  useEffect(() => {
    // Load saved appearance settings
    const savedTheme = getCookie('admin_theme');
    const savedAccentColor = getCookie('admin_accent_color');
    const savedSidebarStyle = getCookie('admin_sidebar_style');
    const savedCardStyle = getCookie('admin_card_style');
    const savedAnimation = getCookie('admin_animation');
    const savedCompactMode = getCookie('admin_compact_mode');
    const savedFontScale = getCookie('admin_font_scale');
    
    // Update settings with saved values if they exist
    setAdminSettings(prev => ({
      ...prev,
      theme: savedTheme || prev.theme,
      accentColor: savedAccentColor || prev.accentColor,
      sidebarStyle: savedSidebarStyle || prev.sidebarStyle,
      cardStyle: savedCardStyle || prev.cardStyle,
      animation: savedAnimation ? savedAnimation === 'true' : prev.animation,
      compactMode: savedCompactMode ? savedCompactMode === 'true' : prev.compactMode,
      fontScale: savedFontScale ? parseFloat(savedFontScale) : prev.fontScale
    }));
  }, []);
  
  // Apply appearance settings to document
  useEffect(() => {
    const container = document.querySelector('.admin-container');
    if (container) {
      // Apply theme
      container.classList.remove('theme-dark', 'theme-light', 'theme-midnight');
      container.classList.add(`theme-${adminSettings.theme}`);
      
      // Apply accent color
      container.classList.remove('accent-purple', 'accent-blue', 'accent-green', 'accent-red');
      container.classList.add(`accent-${adminSettings.accentColor}`);
      
      // Apply sidebar style
      container.classList.remove('sidebar-default', 'sidebar-compact', 'sidebar-expanded');
      container.classList.add(`sidebar-${adminSettings.sidebarStyle}`);
      
      // Apply card style
      container.classList.remove('cards-default', 'cards-flat', 'cards-elevated');
      container.classList.add(`cards-${adminSettings.cardStyle}`);
      
      // Apply animation setting
      container.classList.toggle('no-animations', !adminSettings.animation);
      
      // Apply compact mode
      container.classList.toggle('compact-mode', adminSettings.compactMode);
      
      // Apply font scale
      document.documentElement.style.setProperty('--admin-font-scale', adminSettings.fontScale);
    }
  }, [adminSettings]);

  // Save appearance settings to cookies when they change
  const saveSettings = (newSettings) => {
    // Update state
    setAdminSettings(newSettings);
    
    // Save to cookies (30 days expiration)
    setCookie('admin_theme', newSettings.theme, 30);
    setCookie('admin_accent_color', newSettings.accentColor, 30);
    setCookie('admin_sidebar_style', newSettings.sidebarStyle, 30);
    setCookie('admin_card_style', newSettings.cardStyle, 30);
    setCookie('admin_animation', newSettings.animation.toString(), 30);
    setCookie('admin_compact_mode', newSettings.compactMode.toString(), 30);
    setCookie('admin_font_scale', newSettings.fontScale.toString(), 30);
    
    // Show success notification
    setNotificationMessage('Settings saved successfully!');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };
  
  // Reset settings to defaults
  const resetSettings = () => {
    const defaultSettings = {
      theme: 'dark',
      accentColor: 'purple',
      sidebarStyle: 'default',
      cardStyle: 'default',
      animation: true,
      compactMode: false,
      fontScale: 1
    };
    
    saveSettings(defaultSettings);
  };
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would fetch from your API
        // For demo purposes, using mock data
        const mockUsers = [
          { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', status: 'active', pgpVerified: true, lastActive: new Date().toISOString(), joinDate: '2025-02-15T00:00:00Z' },
          { id: 2, username: 'john_doe', email: 'john@example.com', role: 'user', status: 'active', pgpVerified: true, lastActive: new Date().toISOString(), joinDate: '2025-03-05T00:00:00Z' },
          { id: 3, username: 'jane_smith', email: 'jane@example.com', role: 'user', status: 'suspended', pgpVerified: false, lastActive: new Date().toISOString(), joinDate: '2025-03-15T00:00:00Z' },
          { id: 4, username: 'alex_green', email: 'alex@example.com', role: 'user', status: 'active', pgpVerified: true, lastActive: new Date().toISOString(), joinDate: '2025-04-01T00:00:00Z' },
          { id: 5, username: 'sam_jackson', email: 'sam@example.com', role: 'admin', status: 'active', pgpVerified: true, lastActive: new Date().toISOString(), joinDate: '2025-02-20T00:00:00Z' },
          { id: 6, username: 'taylor_swift', email: 'taylor@example.com', role: 'user', status: 'suspended', pgpVerified: false, lastActive: new Date().toISOString(), joinDate: '2025-03-25T00:00:00Z' },
          { id: 7, username: 'blocked_user', email: 'blocked@example.com', role: 'user', status: 'banned', pgpVerified: false, lastActive: '2025-04-10T00:00:00Z', joinDate: '2025-01-15T00:00:00Z' }
        ];
        
        setUsers(mockUsers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Filter users based on search and status filter
  const filteredUsers = users.filter(user => {
    // Filter by status
    if (statusFilter !== 'all' && user.status !== statusFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Send automated response to reporter
  const sendAutomatedResponse = (reportId, actionType) => {
    // This would normally make an API call to a notification system
    // But for demo purposes, we'll just show a notification
    let responseMessage = '';
    
    if (actionType === 'resolved') {
      responseMessage = "We've reviewed your report and have taken appropriate action. For privacy reasons, we cannot disclose specific details, but please be assured that the issue has been addressed. Thank you for helping maintain the safety and integrity of our platform.";
    } else if (actionType === 'banned') {
      responseMessage = "We've reviewed your report and determined that the reported user has violated our community guidelines. The user has been banned from the platform. For privacy reasons, we cannot disclose additional details. Thank you for your vigilance in maintaining the safety of our platform.";
    }
    
    setNotificationMessage(`Automated response sent: "${responseMessage.substring(0, 60)}..."\n\nNote: Admins cannot see who reported the user. This is an automated response.`);
    setShowNotification(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
    
    console.log(`Automated response for report #${reportId} (${actionType}): ${responseMessage}`);
    
    return responseMessage;
  };

  // Handle user selection for bulk actions
  const handleSelectUser = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Select all users for bulk actions
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === currentUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(currentUsers.map(user => user.id));
    }
  };

  // Open user details modal
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Handle ban user action
  const handleBanUser = (userId) => {
    setSelectedUser(users.find(user => user.id === userId));
    setConfirmAction('ban');
    setShowConfirmModal(true);
  };

  // Handle suspend user action
  const handleSuspendUser = (userId) => {
    setSelectedUser(users.find(user => user.id === userId));
    setConfirmAction('suspend');
    setShowConfirmModal(true);
  };

  // Handle activate user action
  const handleActivateUser = (userId) => {
    setSelectedUser(users.find(user => user.id === userId));
    setConfirmAction('activate');
    setShowConfirmModal(true);
  };

  // Confirm action execution
  const executeAction = async () => {
    if (!selectedUser || !confirmAction) return;
    
    try {
      // In a real app, these would make API calls
      let newStatus;
      switch (confirmAction) {
        case 'ban':
          newStatus = 'banned';
          break;
        case 'suspend':
          newStatus = 'suspended';
          break;
        case 'activate':
          newStatus = 'active';
          break;
        default:
          return;
      }
      
      // Update local state
      setUsers(users.map(user => {
        if (user.id === selectedUser.id) {
          return { ...user, status: newStatus };
        }
        return user;
      }));
      
      // Reset states
      setShowConfirmModal(false);
      setConfirmAction(null);
      setSelectedUser(null);
    } catch (err) {
      console.error(`Error ${confirmAction}ing user:`, err);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedUserIds.length === 0) return;
    
    // In a real app, this would make API calls
    let newStatus;
    switch (action) {
      case 'ban':
        newStatus = 'banned';
        break;
      case 'suspend':
        newStatus = 'suspended';
        break;
      case 'activate':
        newStatus = 'active';
        break;
      default:
        return;
    }
    
    // Update local state
    setUsers(users.map(user => {
      if (selectedUserIds.includes(user.id)) {
        return { ...user, status: newStatus };
      }
      return user;
    }));
    
    // Reset selection
    setSelectedUserIds([]);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    let className = 'status-badge';
    switch (status) {
      case 'active':
        className += ' status-active';
        break;
      case 'suspended':
        className += ' status-suspended';
        break;
      case 'banned':
        className += ' status-banned';
        break;
      default:
        break;
    }
    return <span className={className}>{status}</span>;
  };

  // Render user action buttons
  const renderUserActions = (user) => {
    return (
      <div className="user-actions">
        <button className="action-btn view-btn" onClick={() => handleViewUser(user)}>
          <i className="fas fa-eye"></i>
        </button>
        
        {user.status !== 'banned' && (
          <button className="action-btn ban-btn" onClick={() => handleBanUser(user.id)}>
            <i className="fas fa-ban"></i>
          </button>
        )}
        
        {user.status === 'active' && (
          <button className="action-btn suspend-btn" onClick={() => handleSuspendUser(user.id)}>
            <i className="fas fa-pause-circle"></i>
          </button>
        )}
        
        {(user.status === 'suspended' || user.status === 'banned') && (
          <button className="action-btn activate-btn" onClick={() => handleActivateUser(user.id)}>
            <i className="fas fa-play-circle"></i>
          </button>
        )}
      </div>
    );
  };

  // PGP verification status badge
  const PgpBadge = ({ verified }) => {
    return (
      <span className={`pgp-badge ${verified ? 'verified' : 'not-verified'}`}>
        <i className={`fas ${verified ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
        {verified ? 'Verified' : 'Not Verified'}
      </span>
    );
  };

  // Pagination component
  const Pagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= Math.ceil(filteredUsers.length / usersPerPage); i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="pagination">
        <button 
          className="pagination-btn" 
          disabled={currentPage === 1}
          onClick={() => paginate(currentPage - 1)}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        
        {pageNumbers.map(number => (
          <button
            key={number}
            className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
            onClick={() => paginate(number)}
          >
            {number}
          </button>
        ))}
        
        <button 
          className="pagination-btn" 
          disabled={currentPage === pageNumbers.length}
          onClick={() => paginate(currentPage + 1)}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  // User Modal Component
  const UserModal = () => {
    if (!selectedUser) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>User Details</h2>
            <button className="close-btn" onClick={() => setShowUserModal(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="modal-body">
            <div className="user-detail-card">
              <div className="user-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              
              <div className="user-info-grid">
                <div className="info-item">
                  <span className="info-label">Username</span>
                  <span className="info-value">{selectedUser.username}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{selectedUser.email}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-value role-badge">{selectedUser.role}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <StatusBadge status={selectedUser.status} />
                </div>
                
                <div className="info-item">
                  <span className="info-label">PGP Verification</span>
                  <PgpBadge verified={selectedUser.pgpVerified} />
                </div>
                
                <div className="info-item">
                  <span className="info-label">Join Date</span>
                  <span className="info-value">{formatDate(selectedUser.joinDate)}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Last Active</span>
                  <span className="info-value">{formatDate(selectedUser.lastActive)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <div className="action-buttons">
              {selectedUser.status !== 'banned' && (
                <button className="btn-ban" onClick={() => {
                  setShowUserModal(false);
                  handleBanUser(selectedUser.id);
                }}>
                  <i className="fas fa-ban"></i> Ban User
                </button>
              )}
              
              {selectedUser.status === 'active' && (
                <button className="btn-suspend" onClick={() => {
                  setShowUserModal(false);
                  handleSuspendUser(selectedUser.id);
                }}>
                  <i className="fas fa-pause-circle"></i> Suspend User
                </button>
              )}
              
              {(selectedUser.status === 'suspended' || selectedUser.status === 'banned') && (
                <button className="btn-activate" onClick={() => {
                  setShowUserModal(false);
                  handleActivateUser(selectedUser.id);
                }}>
                  <i className="fas fa-play-circle"></i> Activate User
                </button>
              )}
            </div>
            
            <button className="btn-close" onClick={() => setShowUserModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Confirmation Modal
  const ConfirmModal = () => {
    if (!selectedUser || !confirmAction) return null;
    
    const actionMap = {
      ban: { title: 'Ban User', text: 'Are you sure you want to ban', buttonClass: 'btn-ban', icon: 'fa-ban' },
      suspend: { title: 'Suspend User', text: 'Are you sure you want to suspend', buttonClass: 'btn-suspend', icon: 'fa-pause-circle' },
      activate: { title: 'Activate User', text: 'Are you sure you want to activate', buttonClass: 'btn-activate', icon: 'fa-play-circle' }
    };
    
    const action = actionMap[confirmAction];
    
    return (
      <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
        <div className="confirm-modal" onClick={e => e.stopPropagation()}>
          <div className="confirm-header">
            <h3>{action.title}</h3>
            <button className="close-btn" onClick={() => setShowConfirmModal(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="confirm-body">
            <p>
              {action.text} <strong>{selectedUser.username}</strong>?
            </p>
            <p className="confirm-warning">
              This action can be reversed later.
            </p>
          </div>
          
          <div className="confirm-footer">
            <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button className={action.buttonClass} onClick={executeAction}>
              <i className={`fas ${action.icon}`}></i> Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render method
  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <i className="fas fa-shield-alt"></i>
          <h2>Admin Panel</h2>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              <i className="fas fa-users"></i>
              <span>Users</span>
            </li>
            <li className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
              <i className="fas fa-flag"></i>
              <span>User Reports</span>
            </li>
            <li className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>
              <i className="fas fa-chart-bar"></i>
              <span>System</span>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
              <i className="fas fa-cog"></i>
              <span>Settings</span>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="admin-content">
        <div className="admin-header">
          <h1 className="page-title">
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'reports' && 'User Reports'}
            {activeTab === 'system' && 'System Analytics'}
            {activeTab === 'settings' && 'System Settings'}
          </h1>
        </div>
        
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="filters-bar">
              <div className="filters-section">
                <div className="status-filters">
                  <button 
                    className={statusFilter === 'all' ? 'active' : ''}
                    onClick={() => setStatusFilter('all')}
                  >
                    All Users
                  </button>
                  <button 
                    className={statusFilter === 'active' ? 'active' : ''}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active
                  </button>
                  <button 
                    className={statusFilter === 'suspended' ? 'active' : ''}
                    onClick={() => setStatusFilter('suspended')}
                  >
                    Suspended
                  </button>
                  <button 
                    className={statusFilter === 'banned' ? 'active' : ''}
                    onClick={() => setStatusFilter('banned')}
                  >
                    Banned
                  </button>
                </div>
              
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {selectedUserIds.length > 0 && (
                <div className="bulk-actions">
                  <span className="selected-count">{selectedUserIds.length} selected</span>
                  <button className="bulk-btn ban" onClick={() => handleBulkAction('ban')}>
                    <i className="fas fa-ban"></i> Ban
                  </button>
                  <button className="bulk-btn suspend" onClick={() => handleBulkAction('suspend')}>
                    <i className="fas fa-pause-circle"></i> Suspend
                  </button>
                  <button className="bulk-btn activate" onClick={() => handleBulkAction('activate')}>
                    <i className="fas fa-play-circle"></i> Activate
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Loading users...</span>
              </div>
            ) : error ? (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            ) : (
              <>
                <div className="users-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th className="checkbox-col">
                          <input 
                            type="checkbox" 
                            checked={selectedUserIds.length === currentUsers.length && currentUsers.length > 0}
                            onChange={handleSelectAllUsers}
                          />
                        </th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>PGP</th>
                        <th>Join Date</th>
                        <th>Last Active</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="no-results">
                            <i className="fas fa-search"></i>
                            <span>No users found</span>
                          </td>
                        </tr>
                      ) : (
                        currentUsers.map(user => (
                          <tr key={user.id} className={selectedUserIds.includes(user.id) ? 'selected' : ''}>
                            <td>
                              <input 
                                type="checkbox" 
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => handleSelectUser(user.id)}
                              />
                            </td>
                            <td className="username-cell">{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`role-badge ${user.role}`}>{user.role}</span>
                            </td>
                            <td>
                              <StatusBadge status={user.status} />
                            </td>
                            <td>
                              <PgpBadge verified={user.pgpVerified} />
                            </td>
                            <td>{formatDate(user.joinDate)}</td>
                            <td>{formatDate(user.lastActive)}</td>
                            <td>
                              {renderUserActions(user)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="table-footer">
                  <div className="showing-info">
                    Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <Pagination />
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="settings-panel">
              <div className="settings-section">
                <h2><i className="fas fa-palette"></i> Appearance Settings</h2>
                <p className="settings-description">Customize how your admin panel looks. These settings will be saved for your account only.</p>
                
                <div className="settings-grid">
                  <div className="setting-item">
                    <label className="setting-label">Theme</label>
                    <div className="setting-controls">
                      <select 
                        value={adminSettings.theme}
                        onChange={(e) => saveSettings({...adminSettings, theme: e.target.value})}
                        className="settings-select"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="midnight">Midnight</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Accent Color</label>
                    <div className="setting-controls color-options">
                      <button 
                        className={`color-option purple ${adminSettings.accentColor === 'purple' ? 'active' : ''}`}
                        onClick={() => saveSettings({...adminSettings, accentColor: 'purple'})}
                      ></button>
                      <button 
                        className={`color-option blue ${adminSettings.accentColor === 'blue' ? 'active' : ''}`}
                        onClick={() => saveSettings({...adminSettings, accentColor: 'blue'})}
                      ></button>
                      <button 
                        className={`color-option green ${adminSettings.accentColor === 'green' ? 'active' : ''}`}
                        onClick={() => saveSettings({...adminSettings, accentColor: 'green'})}
                      ></button>
                      <button 
                        className={`color-option red ${adminSettings.accentColor === 'red' ? 'active' : ''}`}
                        onClick={() => saveSettings({...adminSettings, accentColor: 'red'})}
                      ></button>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Sidebar Style</label>
                    <div className="setting-controls">
                      <select 
                        value={adminSettings.sidebarStyle}
                        onChange={(e) => saveSettings({...adminSettings, sidebarStyle: e.target.value})}
                        className="settings-select"
                      >
                        <option value="default">Default</option>
                        <option value="compact">Compact</option>
                        <option value="expanded">Expanded</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Card Style</label>
                    <div className="setting-controls">
                      <select 
                        value={adminSettings.cardStyle}
                        onChange={(e) => saveSettings({...adminSettings, cardStyle: e.target.value})}
                        className="settings-select"
                      >
                        <option value="default">Default</option>
                        <option value="flat">Flat</option>
                        <option value="elevated">Elevated</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Animations</label>
                    <div className="setting-controls toggle-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox"
                          checked={adminSettings.animation}
                          onChange={() => saveSettings({...adminSettings, animation: !adminSettings.animation})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">{adminSettings.animation ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Compact Mode</label>
                    <div className="setting-controls toggle-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox"
                          checked={adminSettings.compactMode}
                          onChange={() => saveSettings({...adminSettings, compactMode: !adminSettings.compactMode})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">{adminSettings.compactMode ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label">Font Size</label>
                    <div className="setting-controls">
                      <div className="slider-container">
                        <input 
                          type="range"
                          min="0.8"
                          max="1.2"
                          step="0.05"
                          value={adminSettings.fontScale}
                          onChange={(e) => saveSettings({...adminSettings, fontScale: parseFloat(e.target.value)})}
                          className="settings-slider"
                        />
                        <div className="slider-labels">
                          <span>Small</span>
                          <span>Normal</span>
                          <span>Large</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="settings-actions">
                  <button className="btn-reset" onClick={resetSettings}>
                    <i className="fas fa-undo"></i> Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
            
            <div className="settings-preview">
              <h3>Preview</h3>
              <div className={`preview-card ${adminSettings.theme === 'light' ? 'light-preview' : 'dark-preview'}`}>
                <div className="preview-content">
                  <div className="preview-header" style={{backgroundColor: `var(--${adminSettings.accentColor})`}}></div>
                  <div className="preview-body">
                    <div className="preview-sidebar"></div>
                    <div className="preview-main">
                      <div className="preview-element"></div>
                      <div className="preview-element short"></div>
                      <div className="preview-element"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'reports' && (
          <div className="reports-tab">
            <div className="reports-header">
              <div className="status-filters">
                <button 
                  className={reportStatusFilter === 'all' ? 'active' : ''}
                  onClick={() => setReportStatusFilter('all')}
                >
                  All Reports
                </button>
                <button 
                  className={reportStatusFilter === 'pending' ? 'active' : ''}
                  onClick={() => setReportStatusFilter('pending')}
                >
                  Pending
                </button>
                <button 
                  className={reportStatusFilter === 'in_progress' ? 'active' : ''}
                  onClick={() => setReportStatusFilter('in_progress')}
                >
                  In Progress
                </button>
                <button 
                  className={reportStatusFilter === 'resolved' ? 'active' : ''}
                  onClick={() => setReportStatusFilter('resolved')}
                >
                  Resolved
                </button>
              </div>
              
              <div className="search-bar">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Search reports..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="reports-list-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Reported User</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userReports
                    .filter(report => {
                      // Filter by status
                      if (reportStatusFilter !== 'all' && report.status !== reportStatusFilter) {
                        return false;
                      }
                      
                      // Filter by search query
                      if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        return (
                          report.reportedUser.username.toLowerCase().includes(query) ||
                          report.reason.toLowerCase().includes(query) ||
                          report.details.toLowerCase().includes(query)
                        );
                      }
                      
                      return true;
                    })
                    .map(report => (
                      <tr key={report.id}>
                        <td>#{report.id}</td>
                        <td className="user-cell">{report.reportedUser.username}</td>
                        <td>{report.reason}</td>
                        <td>{formatDate(report.date)}</td>
                        <td>
                          <span className={`report-status ${report.status}`}>
                            {report.status === 'in_progress' ? 'In Progress' : 
                             report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="report-actions">
                            <button 
                              className="action-btn view-btn" 
                              onClick={() => {
                                setSelectedReport(report);
                                setShowReportModal(true);
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            
                            {report.status === 'pending' && (
                              <button 
                                className="action-btn process-btn" 
                                onClick={() => {
                                  // Mark as in progress
                                  setUserReports(userReports.map(r => 
                                    r.id === report.id ? {...r, status: 'in_progress'} : r
                                  ));
                                }}
                              >
                                <i className="fas fa-play"></i>
                              </button>
                            )}
                            
                            {(report.status === 'pending' || report.status === 'in_progress') && (
                              <button 
                                className="action-btn resolve-btn" 
                                onClick={() => {
                                  // Mark as resolved
                                  setUserReports(userReports.map(r => 
                                    r.id === report.id ? {...r, status: 'resolved'} : r
                                  ));
                                  // Send automated response
                                  sendAutomatedResponse(report.id, 'resolved');
                                }}
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Report Detail Modal */}
        {showReportModal && selectedReport && (
          <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Report #{selectedReport.id}</h2>
                <button className="close-btn" onClick={() => setShowReportModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="report-detail-grid">
                  <div className="report-detail-section">
                    <h3>Status</h3>
                    <span className={`report-status ${selectedReport.status}`}>
                      {selectedReport.status === 'in_progress' ? 'In Progress' : 
                       selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="report-detail-section">
                    <h3>Date Reported</h3>
                    <p>{new Date(selectedReport.date).toLocaleString()}</p>
                  </div>
                  
                  <div className="report-detail-section">
                    <h3>Reported User</h3>
                    <div className="report-user-info">
                      <span className="username">{selectedReport.reportedUser.username}</span>
                      <button className="view-user-btn" onClick={() => {
                        // Find the reported user in the users array
                        const reportedUser = users.find(u => u.id === selectedReport.reportedUser.id);
                        if (reportedUser) {
                          setSelectedUser(reportedUser);
                          setShowUserModal(true);
                          setShowReportModal(false);
                        }
                      }}>
                        View Profile
                      </button>
                    </div>
                  </div>
                  
                  <div className="report-detail-section full-width">
                    <h3>Reason</h3>
                    <p className="report-reason">{selectedReport.reason}</p>
                  </div>
                  
                  <div className="report-detail-section full-width">
                    <h3>Details</h3>
                    <p className="report-details">{selectedReport.details}</p>
                  </div>
                  
                  <div className="report-detail-section full-width">
                    <h3>Evidence</h3>
                    <p className="report-evidence">{selectedReport.evidence}</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <div className="action-buttons">
                  {selectedReport.status === 'pending' && (
                    <button className="btn-process" onClick={() => {
                      // Mark as in progress
                      setUserReports(userReports.map(r => 
                        r.id === selectedReport.id ? {...r, status: 'in_progress'} : r
                      ));
                      setSelectedReport({...selectedReport, status: 'in_progress'});
                    }}>
                      <i className="fas fa-play"></i> Mark as In Progress
                    </button>
                  )}
                  
                  {(selectedReport.status === 'pending' || selectedReport.status === 'in_progress') && (
                    <button className="btn-resolve" onClick={() => {
                      // Mark as resolved
                      setUserReports(userReports.map(r => 
                        r.id === selectedReport.id ? {...r, status: 'resolved'} : r
                      ));
                      setSelectedReport({...selectedReport, status: 'resolved'});
                      // Send automated response
                      sendAutomatedResponse(selectedReport.id, 'resolved');
                    }}>
                      <i className="fas fa-check"></i> Mark as Resolved
                    </button>
                  )}
                  
                  <button className="btn-ban" onClick={() => {
                    // Find the reported user in the users array
                    const reportedUser = users.find(u => u.id === selectedReport.reportedUser.id);
                    if (reportedUser) {
                      setSelectedUser(reportedUser);
                      setConfirmAction('ban');
                      setShowConfirmModal(true);
                      setShowReportModal(false);
                      // Send automated response
                      sendAutomatedResponse(selectedReport.id, 'banned');
                    }
                  }}>
                    <i className="fas fa-ban"></i> Ban User
                  </button>
                </div>
                
                <button className="btn-close" onClick={() => setShowReportModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'system' && (
          <div className="reports-tab">
            <div className="reports-header">
              <div className="period-selector">
                <button 
                  className={reportsPeriod === 'day' ? 'active' : ''} 
                  onClick={() => setReportsPeriod('day')}
                >
                  Day
                </button>
                <button 
                  className={reportsPeriod === 'week' ? 'active' : ''} 
                  onClick={() => setReportsPeriod('week')}
                >
                  Week
                </button>
                <button 
                  className={reportsPeriod === 'month' ? 'active' : ''} 
                  onClick={() => setReportsPeriod('month')}
                >
                  Month
                </button>
              </div>
            </div>
            
            <div className="reports-grid">
              {/* User Metrics Cards */}
              <div className="metric-card total-users">
                <div className="metric-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="metric-data">
                  <h3>Total Users</h3>
                  <div className="metric-value">{systemData.userStatus.active + systemData.userStatus.suspended + systemData.userStatus.banned}</div>
                  <div className="metric-description">All registered users</div>
                </div>
              </div>
              
              <div className="metric-card active-users">
                <div className="metric-icon">
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="metric-data">
                  <h3>Active Users</h3>
                  <div className="metric-value">{systemData.userStatus.active}</div>
                  <div className="metric-description">Currently active accounts</div>
                </div>
              </div>
              
              <div className="metric-card suspended-users">
                <div className="metric-icon">
                  <i className="fas fa-user-clock"></i>
                </div>
                <div className="metric-data">
                  <h3>Suspended</h3>
                  <div className="metric-value">{systemData.userStatus.suspended}</div>
                  <div className="metric-description">Temporarily suspended accounts</div>
                </div>
              </div>
              
              <div className="metric-card banned-users">
                <div className="metric-icon">
                  <i className="fas fa-user-slash"></i>
                </div>
                <div className="metric-data">
                  <h3>Banned</h3>
                  <div className="metric-value">{systemData.userStatus.banned}</div>
                  <div className="metric-description">Permanently banned accounts</div>
                </div>
              </div>
              
              {/* System Metrics */}
              <div className="system-metrics-card">
                <h3>System Performance</h3>
                <div className="system-metrics-grid">
                  <div className="system-metric">
                    <div className="metric-label">Uptime</div>
                    <div className="metric-number">{systemData.systemMetrics.uptime}</div>
                  </div>
                  <div className="system-metric">
                    <div className="metric-label">Response Time</div>
                    <div className="metric-number">{systemData.systemMetrics.responseTime}</div>
                  </div>
                  <div className="system-metric">
                    <div className="metric-label">PGP Verification</div>
                    <div className="metric-number">{systemData.systemMetrics.pgpVerificationTime}</div>
                  </div>
                  <div className="system-metric">
                    <div className="metric-label">Active Connections</div>
                    <div className="metric-number">{systemData.systemMetrics.activeConnections}</div>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="chart-card new-users-chart">
                <h3>New User Registrations</h3>
                <div className="chart-area">
                  {systemData.newUsers.map((day, index) => (
                    <div key={`new-${index}`} className="chart-bar" style={{ height: `${day.count * 8}px` }}>
                      <div className="bar-tooltip">{day.count} users</div>
                    </div>
                  ))}
                </div>
                <div className="chart-labels">
                  {systemData.newUsers.map((day, index) => (
                    <div key={`label-${index}`} className="chart-label">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="chart-card verification-chart">
                <h3>PGP Verification Rates</h3>
                <div className="chart-stacked-area">
                  {systemData.pgpVerification.map((day, index) => (
                    <div key={`pgp-${index}`} className="chart-stacked-bar">
                      <div 
                        className="bar-segment verified" 
                        style={{ height: `${day.verified * 6}px` }}
                      >
                        <div className="bar-tooltip">{day.verified} verified</div>
                      </div>
                      <div 
                        className="bar-segment unverified" 
                        style={{ height: `${day.unverified * 6}px` }}
                      >
                        <div className="bar-tooltip">{day.unverified} unverified</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chart-labels">
                  {systemData.pgpVerification.map((day, index) => (
                    <div key={`v-label-${index}`} className="chart-label">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color verified"></span>
                    <span className="legend-label">Verified</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color unverified"></span>
                    <span className="legend-label">Unverified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showUserModal && <UserModal />}
      {showConfirmModal && <ConfirmModal />}
      
      {/* Notification Toast */}
      {showNotification && (
        <div className="notification-toast">
          <div className="notification-content">
            <i className="fas fa-paper-plane notification-icon"></i>
            <div className="notification-message">
              {notificationMessage.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <button className="notification-close" onClick={() => setShowNotification(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
