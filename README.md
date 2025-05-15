# Re-Chat.to

A secure, encrypted chat application with user authentication, invite code system, and admin panel.

## Features

- **User Authentication**: Secure sign-in and registration with email and password
- **Invite Code System**: Registration requires an invite code, which is provided after payment
- **Admin Panel**: Manage invite codes and user rankings
- **Encrypted Chat**: End-to-end encrypted messaging (coming soon)
- **Modern UI**: Dark theme with purple accents

## Tech Stack

- **Frontend**: React.js with React Router
- **Backend**: Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens) and bcrypt for password hashing

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server

### Database Setup

1. Create a MySQL database named `rechat_db`
2. Run the SQL script in `server/database.sql` to set up the database schema

```bash
mysql -u root -p < server/database.sql
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rechat_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Installation

1. Clone the repository
2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

This will start both the React frontend (port 3000) and Express backend (port 5000) concurrently.

## Project Structure

- `/src`: React frontend code
  - `/components`: React components
  - `/App.js`: Main application component with routing
- `/server`: Express backend code
  - `/server.js`: Main server file
  - `/db.js`: Database connection
  - `/config.js`: Configuration settings
  - `/database.sql`: SQL schema

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user with invite code
- `POST /api/auth/login`: Login with email and password
- `POST /api/auth/logout`: Logout and invalidate token
- `GET /api/auth/profile`: Get current user profile

### Invite Codes

- `GET /api/invite-codes`: Get all invite codes (admin only)
- `POST /api/invite-codes`: Generate new invite codes (admin only)
- `DELETE /api/invite-codes/:id`: Delete an invite code (admin only)

### Users

- `GET /api/users`: Get all users (admin only)
- `GET /api/users/:id`: Get user by ID (admin only)
- `PUT /api/users/:id/plan`: Update user plan (admin only)
- `PUT /api/users/:id/status`: Update user status (admin only)

## License

MIT License
