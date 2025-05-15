-- Add last_password_reset field to users table
ALTER TABLE users
ADD COLUMN last_password_reset DATETIME DEFAULT NULL;

-- Create user_details table for additional information
CREATE TABLE IF NOT EXISTS user_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  operating_system VARCHAR(255) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  last_login_date DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Insert sample data for user_details
INSERT INTO user_details (user_id, operating_system, country, ip_address, user_agent, last_login_date)
VALUES
(1, 'Windows 11', 'United States', '192.168.1.1', 'Chrome on Windows', '2025-05-07 15:30:00'),
(2, 'macOS Monterey', 'Canada', '192.168.1.2', 'Safari on macOS', '2025-05-08 09:15:00'),
(3, 'Ubuntu 22.04', 'Germany', '192.168.1.3', 'Firefox on Linux', '2025-05-01 11:20:00');

-- Update users table to set sample last_password_reset dates
UPDATE users SET last_password_reset = '2025-04-20 10:15:00' WHERE id = 1;
UPDATE users SET last_password_reset = '2025-04-25 14:30:00' WHERE id = 2;
UPDATE users SET last_password_reset = '2025-04-30 09:45:00' WHERE id = 3;
