# Flour Ordering Backend API

A comprehensive Node.js backend API for a flour ordering application with multi-user roles, Firebase authentication, PostgreSQL database, and payment integration.

## Features

### 🔐 Authentication & Authorization
- Firebase Authentication integration
- Role-based access control (Customer, Mill, Delivery Partner, Admin)
- JWT token management
- Phone number verification
- Account management (activation/deactivation)

### 👥 Multi-User System
- **Customers**: Browse grains, create custom mixes, place orders, manage subscriptions
- **Mills**: Manage grain inventory, process orders, update order status
- **Delivery Partners**: View assigned orders, update delivery status, GPS tracking
- **Admins**: System management, analytics, user management

### 🌾 Product Management
- Grain categories (Wheat, Rice, Pulses, Millets, Spices)
- Custom grain mixing with percentage control
- Grinding options and customizations
- Nutritional information
- Product availability management

### 📦 Order Management
- Complete order lifecycle management
- Order tracking with GPS integration
- Status updates and notifications
- Order history and analytics
- Delivery scheduling

### 💰 Payment Integration
- Razorpay payment gateway
- Online payments and COD support
- Payment status tracking
- Refund management
- Payment webhooks

### 📅 Subscription Service
- Weekly, bi-weekly, and monthly subscriptions
- Automatic order generation
- Subscription management
- Discount tiers based on frequency

### 📊 Analytics & Reporting
- Order analytics
- Revenue tracking
- User engagement metrics
- Mill performance analytics
- Delivery analytics

### 🔔 Notifications
- Push notifications via Firebase
- SMS notifications via Twilio
- Email notifications
- Order status updates
- Subscription reminders

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Firebase Admin SDK
- **Payment**: Razorpay
- **File Storage**: Local/Cloud storage
- **Logging**: Winston
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (v13 or higher)
- Firebase project with Admin SDK
- Razorpay account
- (Optional) Redis for caching

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FlourOrderingBackend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory and copy the contents from `.env.example`:

```bash
cp .env.example .env
```

Fill in all the required environment variables:

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flour_ordering_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
```

#### Firebase Configuration
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Fill in the Firebase configuration:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
```

#### Razorpay Configuration
1. Login to Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate Test/Live API keys:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

#### Other Services
```env
# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_here

# Email (Gmail SMTP)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps (for location services)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Database Setup

#### Create PostgreSQL Database

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE flour_ordering_db;
CREATE USER flour_ordering_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE flour_ordering_db TO flour_ordering_user;

-- Exit PostgreSQL
\q
```

#### Run Database Migrations

```bash
# Create and run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 5. Create Required Directories

```bash
mkdir -p uploads logs public
```

### 6. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication and choose sign-in methods:
   - Phone authentication
   - Google authentication
3. Enable Cloud Messaging for push notifications
4. Download the service account key and update your `.env` file

### 7. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

### Main Endpoints

#### Authentication
```http
POST /auth/register        # Register new user
POST /auth/login          # Login user
POST /auth/refresh        # Refresh token
GET  /auth/profile        # Get user profile
PUT  /auth/profile        # Update user profile
```

#### Users
```http
GET    /users             # Get all users (admin only)
GET    /users/:id         # Get user by ID
PUT    /users/:id         # Update user
DELETE /users/:id         # Delete user
```

#### Grains
```http
GET    /grains            # Get all grains
GET    /grains/:id        # Get grain by ID
POST   /grains            # Create grain (mill/admin)
PUT    /grains/:id        # Update grain
DELETE /grains/:id        # Delete grain
```

#### Orders
```http
GET    /orders            # Get orders (filtered by user role)
GET    /orders/:id        # Get order by ID
POST   /orders            # Create new order
PUT    /orders/:id/status # Update order status
DELETE /orders/:id        # Cancel order
```

#### Subscriptions
```http
GET    /subscriptions     # Get user subscriptions
POST   /subscriptions     # Create subscription
PUT    /subscriptions/:id # Update subscription
DELETE /subscriptions/:id # Cancel subscription
```

#### Payments
```http
POST   /payments/create   # Create payment order
POST   /payments/verify   # Verify payment
POST   /payments/webhook  # Razorpay webhook
GET    /payments/:id      # Get payment details
```

### Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "details": {
    "fields": {
      "email": "Email is required"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- --grep "Auth"
```

## Deployment

### Environment Setup

1. Set `NODE_ENV=production` in your environment
2. Use SSL-enabled PostgreSQL database
3. Configure proper CORS origins
4. Set up proper logging and monitoring

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start dist/server.js --name "flour-ordering-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Build and Run Docker Container

```bash
docker build -t flour-ordering-api .
docker run -p 3000:3000 --env-file .env flour-ordering-api
```

## Monitoring & Logging

### Logs Location
- Application logs: `./logs/app.log`
- Error logs: `./logs/error.log`
- Exception logs: `./logs/exceptions.log`

### Health Check
```http
GET /health
```

Returns server status, database connectivity, and system information.

### Performance Monitoring

The application includes:
- Request/response time logging
- Error tracking and alerting
- Database query monitoring
- Memory and CPU usage tracking

## Security Features

- Helmet.js for security headers
- Rate limiting to prevent abuse
- Input validation and sanitization
- SQL injection prevention via Sequelize
- XSS protection
- CORS configuration
- JWT token validation
- Role-based access control

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database exists
psql -U postgres -l
```

#### Firebase Authentication Issues
- Verify Firebase project configuration
- Check service account key format
- Ensure Firebase Authentication is enabled

#### Port Already in Use
```bash
# Kill process using port 3000
sudo lsof -t -i tcp:3000 | xargs kill -9
```

#### Module Not Found Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Performance Optimization

### Database Optimization
- Proper indexing on frequently queried fields
- Connection pooling configuration
- Query optimization with Sequelize

### Caching Strategy
- Redis for session caching
- API response caching
- Database query result caching

### Load Balancing
- PM2 cluster mode for multi-core utilization
- Nginx reverse proxy setup
- Database read replicas

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation and FAQ

---

## Architecture Overview

```
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── uploads/             # File upload directory
├── logs/                # Application logs
├── tests/               # Test files
├── .env.example         # Environment template
└── README.md            # This file
```

This backend provides a robust, scalable foundation for a flour ordering application with comprehensive features for all user types, secure authentication, payment processing, and real-time tracking capabilities.