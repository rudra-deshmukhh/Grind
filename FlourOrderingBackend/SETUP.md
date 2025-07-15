# Flour Ordering Backend - Local Setup Guide

## Quick Start

### 1. Prerequisites Installation

**Install Node.js (v18+)**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

**Install PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Windows - Download from https://www.postgresql.org/download/windows/
```

**Install Git**
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
git --version  # Should prompt to install if not present

# Windows - Download from https://git-scm.com/
```

### 2. Project Setup

**Clone and Install**
```bash
# Clone the repository
git clone <repository-url>
cd FlourOrderingBackend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Database Setup

**Start PostgreSQL and Create Database**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS

# Connect as postgres user
sudo -u postgres psql

# Or run the initialization script
sudo -u postgres psql < scripts/init-db.sql
```

**Manual Database Creation (if needed)**
```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE DATABASE flour_ordering_db;
CREATE USER flour_ordering_user WITH PASSWORD 'flour_ordering_password';
GRANT ALL PRIVILEGES ON DATABASE flour_ordering_db TO flour_ordering_user;

-- Connect to the new database
\c flour_ordering_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Exit
\q
```

### 4. Firebase Setup

**Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard

**Enable Authentication**
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable sign-in methods:
   - Phone
   - Google
   - Email/Password

**Generate Service Account Key**
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely

**Update Environment Variables**
```bash
# Edit .env file
nano .env

# Update Firebase configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
```

### 5. Database Configuration

**Update .env file**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flour_ordering_db
DB_USER=flour_ordering_user
DB_PASSWORD=flour_ordering_password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_32_chars_long

# Razorpay Configuration (for payments)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### 6. Start Development Server

**Run Database Migrations and Seed Data**
```bash
# Start the server (this will auto-sync database in development)
npm run dev

# The server will create tables automatically in development mode
# Optionally, seed initial data
npm run seed
```

**Verify Setup**
```bash
# Check if server is running
curl http://localhost:3000/health

# Should return:
# {
#   "success": true,
#   "message": "Server is healthy",
#   "version": "1.0.0",
#   "environment": "development"
# }
```

## API Testing

### Test Authentication

**Register a User**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firebase_uid": "test_firebase_uid",
    "email": "test@example.com",
    "phone": "1234567890",
    "name": "Test User",
    "role": "customer"
  }'
```

**Get Grains**
```bash
curl http://localhost:3000/api/v1/grains
```

**Test with Authentication**
```bash
# First get Firebase ID token from your app, then:
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Check code style
npm run lint
npm run lint:fix

# Database operations
npm run migrate       # Run migrations
npm run migrate:undo  # Undo last migration
npm run seed         # Seed database with initial data
npm run seed:undo    # Undo seed data
```

## Folder Structure

```
FlourOrderingBackend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database configuration
│   │   └── index.ts     # Main config
│   ├── controllers/     # Route controllers
│   │   ├── AuthController.ts
│   │   └── GrainController.ts
│   ├── middleware/      # Custom middleware
│   │   ├── auth.ts      # Authentication middleware
│   │   └── validation.ts # Validation middleware
│   ├── models/          # Database models
│   │   ├── User.ts
│   │   ├── Grain.ts
│   │   └── index.ts     # Model associations
│   ├── routes/          # API routes
│   │   ├── auth.ts
│   │   └── grains.ts
│   ├── services/        # Business logic services
│   │   └── firebase.ts  # Firebase service
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── errors.ts    # Error handling
│   │   └── logger.ts    # Logging
│   ├── server.ts        # Express server setup
│   └── index.ts         # Entry point
├── scripts/
│   ├── init-db.sql      # Database initialization
│   └── seed-data.sql    # Initial seed data
├── logs/                # Application logs
├── uploads/             # File uploads
├── .env.example         # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

Create `.env` file with these variables:

```bash
# Server
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flour_ordering_db
DB_USER=flour_ordering_user
DB_PASSWORD=flour_ordering_password
DB_SSL=false

# Firebase (replace with your values)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_32_chars_long
JWT_EXPIRE=7d

# Razorpay (optional, for payments)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Email (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:19006
```

## Common Issues & Solutions

### Database Connection Issues

**Error: "password authentication failed"**
```bash
# Reset PostgreSQL password
sudo -u postgres psql
\password postgres
# Enter new password

# Or check if service is running
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Error: "database does not exist"**
```bash
# Create database manually
sudo -u postgres createdb flour_ordering_db
```

### Firebase Authentication Issues

**Error: "Invalid Firebase configuration"**
- Verify all Firebase environment variables are correctly set
- Ensure private key is properly formatted with \n for newlines
- Check if Firebase project ID matches

**Error: "Firebase Admin SDK not initialized"**
- Make sure you've downloaded the service account key
- Verify the JSON structure and field names

### Port Issues

**Error: "Port 3000 is already in use"**
```bash
# Find and kill process using port 3000
sudo lsof -t -i tcp:3000 | xargs kill -9

# Or change port in .env file
PORT=3001
```

### Permission Issues

**Error: "Permission denied"**
```bash
# Fix permissions for logs and uploads directories
mkdir -p logs uploads
chmod 755 logs uploads

# Or run with proper permissions
sudo chown -R $USER:$USER .
```

## Next Steps

1. **Test the APIs** using Postman or curl
2. **Set up the React Native app** to connect to this backend
3. **Configure Firebase** in your mobile app
4. **Add more features** like orders, payments, etc.
5. **Deploy to production** when ready

## Support

If you encounter issues:
1. Check the logs in `./logs/app.log`
2. Verify all environment variables are set
3. Ensure PostgreSQL and all services are running
4. Check Firebase configuration and permissions

For additional help, refer to the main README.md file.