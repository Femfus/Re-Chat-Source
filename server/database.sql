-- Create the database
CREATE DATABASE IF NOT EXISTS rechat_db;
USE rechat_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  plan ENUM('free', 'premium', 'business') DEFAULT 'free',
  status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_online DATETIME DEFAULT CURRENT_TIMESTAMP,
  profile_picture VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_status (status),
  INDEX idx_plan (plan),
  INDEX idx_join_date (join_date)
);

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  plan ENUM('premium', 'business') NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by INT DEFAULT NULL,
  used_by_username VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT NULL,
  FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_used (used),
  INDEX idx_plan (plan),
  INDEX idx_expires_at (expires_at)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  self_destruct BOOLEAN DEFAULT FALSE,
  self_destruct_time INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- User activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  theme ENUM('dark', 'light') DEFAULT 'dark',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  auto_delete_messages BOOLEAN DEFAULT FALSE,
  auto_delete_time INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample data
INSERT INTO users (username, email, password, plan, status, join_date, last_online)
VALUES 
('user1', 'user1@example.com', '$2b$10$1234567890abcdefghijkl', 'premium', 'active', '2025-04-15 10:00:00', '2025-05-07 15:30:00'),
('user2', 'user2@example.com', '$2b$10$1234567890abcdefghijkm', 'business', 'active', '2025-04-20 14:20:00', '2025-05-08 09:15:00'),
('user3', 'user3@example.com', '$2b$10$1234567890abcdefghijkn', 'free', 'suspended', '2025-04-25 09:45:00', '2025-05-01 11:20:00');

INSERT INTO invite_codes (code, plan, used, used_by, created_at)
VALUES 
('PREMIUM-1234-ABCD', 'premium', TRUE, 1, '2025-05-01 08:30:00'),
('PREMIUM-5678-EFGH', 'premium', FALSE, NULL, '2025-05-02 14:45:00'),
('BUSINESS-9012-IJKL', 'business', FALSE, NULL, '2025-05-03 11:20:00'),
('PREMIUM-ABCD-1234', 'premium', FALSE, NULL, '2025-05-04 09:15:00'),
('BUSINESS-EFGH-5678', 'business', FALSE, NULL, '2025-05-05 16:30:00');

-- Insert sample data for user settings
INSERT INTO user_settings (user_id, theme, notifications_enabled, two_factor_enabled)
VALUES
(1, 'dark', TRUE, FALSE),
(2, 'light', TRUE, TRUE),
(3, 'dark', FALSE, FALSE);

-- Insert sample data for password reset tokens
INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
VALUES
(3, 'reset-token-123456', DATE_ADD(NOW(), INTERVAL 24 HOUR), FALSE);
