import React, { useState } from 'react';

/**
 * Admin Ban Feature
 * 
 * This component handles the banning of users functionality.
 * It includes the ban confirmation modal and API interactions.
 */
export const BanConfirmationModal = ({ user, onClose, onConfirm }) => {
  if (!user) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <h3>Ban User</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="confirm-body">
          <p>
            Are you sure you want to ban <strong>{user.username}</strong>?
          </p>
          <p className="confirm-warning">
            This action will prevent the user from accessing the platform, but can be reversed later.
          </p>
        </div>
        
        <div className="confirm-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-ban" onClick={() => onConfirm(user.id)}>
            <i className="fas fa-ban"></i> Confirm Ban
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Ban User API Call Function
 * 
 * Makes an API call to ban a user and update their status to 'banned'.
 * @param {string|number} userId - The user ID to ban
 * @param {string} API_URL - The base API URL
 * @returns {Promise} - The result of the API call
 */
export const banUser = async (userId, API_URL = 'http://localhost:3000/api') => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'banned' })
    });
    
    if (!response.ok) {
      throw new Error(`Error banning user: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error banning user:', err.message);
    throw err;
  }
};

/**
 * useBanFeature Hook
 * 
 * Custom hook to manage user banning functionality.
 * @param {Function} updateUserCallback - Callback to update the user list after ban
 * @returns {Object} - The ban feature state and handlers
 */
export const useBanFeature = (updateUserCallback) => {
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [banInProgress, setBanInProgress] = useState(false);
  const [banError, setBanError] = useState(null);
  
  const openBanModal = (user) => {
    setUserToBan(user);
    setShowBanModal(true);
    setBanError(null);
  };
  
  const closeBanModal = () => {
    setShowBanModal(false);
    setTimeout(() => {
      setUserToBan(null);
      setBanError(null);
    }, 300); // Short delay to allow modal closing animation
  };
  
  const confirmBan = async (userId) => {
    setBanInProgress(true);
    setBanError(null);
    
    try {
      await banUser(userId);
      
      // Call the callback to update the UI
      if (typeof updateUserCallback === 'function') {
        updateUserCallback(userId, 'banned');
      }
      
      closeBanModal();
    } catch (error) {
      setBanError(`Failed to ban user: ${error.message}`);
    } finally {
      setBanInProgress(false);
    }
  };
  
  return {
    showBanModal,
    userToBan,
    banInProgress,
    banError,
    openBanModal,
    closeBanModal,
    confirmBan
  };
};

export default { BanConfirmationModal, banUser, useBanFeature };