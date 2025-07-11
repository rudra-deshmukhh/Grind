# GrainCraft Local Setup Instructions

## 🚀 Quick Start Guide

### Prerequisites
Before setting up GrainCraft locally, ensure you have the following installed:

```bash
# Required Software
- Node.js (v18+ recommended)
- Python (v3.9+ recommended)
- MongoDB (v6.0+ recommended)
- Git
- Docker & Docker Compose (optional, for enterprise setup)
```

## 📦 Option 1: Basic Local Setup

### 1. Clone and Setup Backend

```bash
# Clone the repository
git clone <your-repo-url>
cd graincraft

# Setup Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your settings:
nano .env
```

**Backend .env Configuration:**
```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="graincraft_db"
RAZORPAY_KEY_ID="rzp_test_demo"
RAZORPAY_KEY_SECRET="demo_secret"
JWT_SECRET="your-super-secret-jwt-key-here"
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### 2. Setup MongoDB

#### Option A: Install MongoDB Locally
```bash
# Install MongoDB Community Server
# Visit: https://www.mongodb.com/try/download/community
# Follow installation instructions for your OS

# Start MongoDB service
# On Windows: Start MongoDB service from Services
# On macOS: brew services start mongodb-community
# On Linux: sudo systemctl start mongod

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

#### Option B: Use MongoDB Atlas (Cloud)
```bash
# 1. Create account at https://cloud.mongodb.com
# 2. Create a free cluster
# 3. Get connection string
# 4. Update MONGO_URL in .env file
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/graincraft_db"
```

### 3. Setup Redis (Optional)

#### Install Redis Locally
```bash
# On Windows: Download from https://redis.io/download
# On macOS:
brew install redis
brew services start redis

# On Ubuntu/Debian:
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Verify Redis is running
redis-cli ping
```

### 4. Start Backend Server

```bash
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at: `http://localhost:8001`

### 5. Setup Frontend

```bash
# Open new terminal
cd frontend

# Install Node.js dependencies
npm install
# Or if you prefer yarn:
yarn install

# Create environment file
cp .env.example .env
# Edit .env:
nano .env
```

**Frontend .env Configuration:**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 6. Start Frontend Server

```bash
cd frontend
npm start
# Or with yarn:
yarn start
```

Frontend will be available at: `http://localhost:3000`

## 🐳 Option 2: Docker Compose Setup (Recommended)

### 1. Prerequisites
```bash
# Install Docker Desktop
# Visit: https://www.docker.com/products/docker-desktop
# Follow installation instructions for your OS
```

### 2. Setup with Docker Compose

```bash
# Clone repository
git clone <your-repo-url>
cd graincraft

# Create environment file
cp .env.example .env
# Edit with your settings

# Start all services
docker-compose up -d
```

**Docker Compose Services:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Nginx**: http://localhost:80
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090

### 3. Initialize Database

```bash
# The backend will automatically create initial data on startup
# Check logs to ensure successful initialization
docker-compose logs backend
```

## 📱 Option 3: React Native Mobile App Setup

### 1. Prerequisites for Mobile Development

```bash
# Install React Native CLI
npm install -g react-native-cli

# For iOS development (macOS only):
# Install Xcode from App Store
# Install CocoaPods:
sudo gem install cocoapods

# For Android development:
# Install Android Studio
# Configure Android SDK and emulator
```

### 2. Setup Mobile App

```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install

# For iOS (macOS only):
cd ios
pod install
cd ..

# For Android:
# Ensure Android emulator is running or device is connected
```

### 3. Run Mobile App

```bash
# For iOS:
npx react-native run-ios

# For Android:
npx react-native run-android

# For development with Metro bundler:
npx react-native start
```

## 🔧 Configuration & Customization

### Environment Variables

**Backend (.env):**
```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="graincraft_db"

# Payment
RAZORPAY_KEY_ID="your_razorpay_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# Security
JWT_SECRET="your-unique-secret-key"

# Cache
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Email (optional)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

**Frontend (.env):**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENVIRONMENT=development
```

### Initial Admin User

The system automatically creates an admin user:
- **Email**: admin@graincraft.com
- **Password**: admin123

## 🧪 Testing the Setup

### 1. Health Check

```bash
# Test backend health
curl http://localhost:8001/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "version": "2.1.0",
  "database": "connected",
  "redis": "connected"
}
```

### 2. Test API Endpoints

```bash
# Get grains
curl http://localhost:8001/api/grains

# Get grind options
curl http://localhost:8001/api/grind-options

# Login as admin
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@graincraft.com","password":"admin123"}'
```

### 3. Test Frontend

1. Open browser: `http://localhost:3000`
2. Try admin login: admin@graincraft.com / admin123
3. Register new customer
4. Test grain catalog and cart functionality

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. Backend Issues

**MongoDB Connection Error:**
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# If not running, start MongoDB service
# Windows: Start MongoDB service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

**Module Import Errors:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Port Already in Use:**
```bash
# Find process using port 8001
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Kill the process or use different port
python -m uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

#### 2. Frontend Issues

**Node Modules Error:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**CORS Errors:**
```bash
# Ensure backend CORS is configured correctly
# Check backend/server.py for CORS middleware
# Verify REACT_APP_BACKEND_URL in frontend/.env
```

**Build Errors:**
```bash
# Clear build cache
rm -rf build/
npm run build
```

#### 3. Database Issues

**Database Not Connecting:**
```bash
# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log  # Linux
# Check Windows Event Viewer for MongoDB errors

# Verify connection string in .env
# Test connection manually:
mongosh "your-connection-string"
```

**Data Not Loading:**
```bash
# Check if initial data was created
mongosh
use graincraft_db
db.grains.find()
db.users.find()

# If empty, restart backend to trigger data initialization
```

#### 4. Redis Issues

**Redis Connection Failed:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis service
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server
# Windows: Start Redis service

# App will work without Redis (caching disabled)
```

### Performance Optimization

#### 1. Development Mode
```bash
# Backend with auto-reload
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend with hot reload
npm start
```

#### 2. Production Mode
```bash
# Build frontend for production
npm run build

# Start backend in production mode
python -m uvicorn server:app --host 0.0.0.0 --port 8001

# Use process manager
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
```

## 📊 Monitoring & Logs

### View Logs

```bash
# Backend logs (if using Docker)
docker-compose logs -f backend

# Frontend logs
npm start  # Will show logs in terminal

# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Redis logs
redis-cli monitor
```

### Performance Monitoring

```bash
# Access Grafana (if using Docker Compose)
http://localhost:3001
# Default: admin/admin

# Access Prometheus
http://localhost:9090
```

## 🚀 Next Steps

1. **Customize Branding**: Update logos, colors, and company information
2. **Configure Payment**: Set up real Razorpay credentials
3. **Set up Email**: Configure SMTP for notifications
4. **Add Content**: Upload real grain images and descriptions
5. **Test Thoroughly**: Test all user flows and edge cases
6. **Deploy**: Follow deployment guide for production setup

## 💡 Development Tips

1. **API Documentation**: Visit `http://localhost:8001/docs` for interactive API docs
2. **Database Admin**: Use MongoDB Compass for database management
3. **State Management**: Redux DevTools for frontend debugging
4. **Testing**: Run `pytest` in backend directory for API tests
5. **Linting**: Use ESLint for frontend and Black for backend code formatting

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs for specific error messages
3. Ensure all prerequisites are properly installed
4. Verify environment variables are correctly set

**Happy Development! 🎉**