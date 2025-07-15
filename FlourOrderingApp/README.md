# FlourOrdering App

A comprehensive cross-platform flour ordering application built with React Native Expo, featuring multi-user roles, real-time tracking, subscription services, and payment integration.

## 🌟 Features

### Customer Features
- **Multi-grain Selection**: Choose from wheat, rice, pulses, millets, spices, and more
- **Custom Grinding Options**: Fine, medium, coarse, or custom grinding specifications
- **Custom Product Builder**: Create custom grain mixes with personalized ratios
- **Subscription Service**: Weekly, bi-weekly, and monthly subscriptions with discounts (5-12% off)
- **Real-time Order Tracking**: Track your order from mill to delivery
- **Mobile OTP Authentication**: Secure login with phone number verification
- **Google Social Login**: Quick authentication with Google account
- **Location-based Mill Assignment**: Orders processed by nearby mills
- **Razorpay Payment Integration**: Secure online payments
- **Push Notifications**: Real-time updates on order status
- **Favorites Management**: Save custom products and frequently ordered items

### Flour Mill Features
- **Order Management Dashboard**: View and manage incoming orders
- **Status Updates**: Update order status (received, grinding, ready)
- **Real-time Notifications**: Get notified of new orders
- **Business Analytics**: Track performance and orders
- **Location-based Service Area**: Serve customers within delivery radius

### Delivery Partner Features
- **Available Orders Dashboard**: View orders ready for delivery
- **GPS Tracking**: Real-time location sharing during delivery
- **Order Assignment**: Club orders by locality for efficient delivery
- **Delivery History**: Track completed deliveries and earnings
- **Route Optimization**: Efficient delivery planning

### Admin Features
- **Comprehensive Dashboard**: Overview of all operations
- **Mill Management**: Register and manage flour mills by locality
- **Order Analytics**: Monitor orders, delays, and performance
- **Customer Management**: View and manage customer accounts
- **Delivery Partner Management**: Oversee delivery operations
- **Real-time Monitoring**: Track all system activities

## 🏗️ Technical Architecture

### Frontend
- **React Native with Expo SDK 53**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **React Navigation**: Navigation system with role-based routing
- **React Native Paper**: Material Design components
- **React Hook Form**: Form handling and validation
- **Expo Location**: GPS tracking and location services
- **Expo Notifications**: Push notification system

### State Management
- **Authentication Store**: User authentication and session management
- **Cart Store**: Shopping cart with persistence
- **Order Store**: Order management and tracking
- **Location Store**: GPS and location services

### Security & Authentication
- **Mobile OTP Verification**: SMS-based authentication
- **Google OAuth**: Social login integration
- **JWT Token Management**: Secure session handling
- **Role-based Access Control**: Different interfaces for each user type

### Payment Integration
- **Razorpay**: Secure payment gateway
- **Multiple Payment Methods**: Online payments and Cash on Delivery
- **Subscription Billing**: Automated recurring payments

### Real-time Features
- **Order Tracking**: Live status updates
- **GPS Tracking**: Real-time delivery partner location
- **Push Notifications**: Instant order updates
- **Live Chat Support**: Customer service integration

## 📁 Project Structure

```
FlourOrderingApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common components
│   │   ├── forms/          # Form components
│   │   └── maps/           # Map-related components
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── customer/       # Customer screens
│   │   ├── mill/           # Mill screens
│   │   ├── delivery/       # Delivery screens
│   │   ├── admin/          # Admin screens
│   │   └── shared/         # Shared screens
│   ├── navigation/         # Navigation configuration
│   ├── stores/             # Zustand stores
│   ├── services/           # API and external services
│   │   ├── api/            # API layer
│   │   ├── payment/        # Payment services
│   │   ├── location/       # Location services
│   │   └── notification/   # Notification services
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # App constants and configuration
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
├── assets/                 # Static assets
├── App.tsx                 # Main app component
└── package.json           # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/flour-ordering-app.git
   cd FlourOrderingApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   RAZORPAY_KEY_ID=your_razorpay_key_id
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   API_BASE_URL=your_api_base_url
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on specific platforms**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 📱 User Roles & Access

### Customer
- Register with phone number verification
- Browse and order grains
- Create custom grain mixes
- Subscribe to products
- Track orders in real-time
- Manage delivery addresses
- Rate and review orders

### Flour Mill
- Register business with service area
- Receive orders from nearby customers
- Update order status through processing stages
- Manage grinding options and pricing
- View business analytics

### Delivery Partner
- Register with vehicle details
- View available orders for delivery
- Accept orders and update GPS location
- Complete deliveries with customer confirmation
- Track earnings and delivery history

### Admin
- Manage all users and operations
- Register new mills by locality
- Monitor order flow and delays
- Generate analytics and reports
- Handle customer support

## 🔧 Configuration

### Payment Setup (Razorpay)
1. Create a Razorpay account
2. Get your Key ID and Key Secret
3. Update the configuration in `src/constants/index.ts`
4. Test with Razorpay test credentials

### Google Maps Setup
1. Enable Google Maps SDK in Google Cloud Console
2. Create an API key with appropriate restrictions
3. Update the configuration for location services

### Push Notifications
1. Configure Firebase for push notifications
2. Update notification settings in `src/services/notification/`
3. Test notification delivery

## 🧪 Testing

### Mock Data
The app includes mock data for development and testing:
- Sample grains and categories
- Mock orders and tracking data
- Test user accounts for each role
- Sample subscription plans

### Test Credentials
For development, use these test credentials:
- **Phone**: Any 10-digit number starting with 6-9
- **OTP**: 123456 (mock verification)

## 🚀 Deployment

### Building for Production

1. **Configure app.json**
   Update app configuration for production:
   ```json
   {
     "expo": {
       "name": "FlourOrdering",
       "slug": "flour-ordering",
       "version": "1.0.0",
       "orientation": "portrait",
       "platforms": ["ios", "android"],
       "ios": {
         "bundleIdentifier": "com.yourcompany.flourordering"
       },
       "android": {
         "package": "com.yourcompany.flourordering"
       }
     }
   }
   ```

2. **Build for stores**
   ```bash
   # Build for iOS App Store
   eas build --platform ios
   
   # Build for Google Play Store
   eas build --platform android
   ```

## 🔒 Security Features

- **Phone Number Verification**: OTP-based authentication
- **JWT Token Management**: Secure session handling
- **Role-based Access Control**: Restricted access by user type
- **Data Encryption**: Sensitive data protection
- **Secure Payment Processing**: PCI-compliant payment handling
- **Location Privacy**: GPS data encryption

## 📊 Analytics & Monitoring

### Business Metrics
- Order volume and trends
- Customer acquisition and retention
- Mill performance and capacity
- Delivery efficiency metrics
- Revenue and subscription analytics

### Technical Monitoring
- App performance metrics
- Crash reporting and error tracking
- API response times
- User engagement analytics

## 🔮 Future Enhancements

### Planned Features
- **AI-powered Recommendations**: Smart product suggestions
- **Voice Ordering**: Voice-based order placement
- **AR Grain Inspection**: Augmented reality quality check
- **Blockchain Traceability**: Complete supply chain tracking
- **Loyalty Program**: Points and rewards system
- **Multi-language Support**: Regional language support
- **Chatbot Integration**: AI customer support
- **IoT Integration**: Smart mill monitoring

### Technical Improvements
- **Offline Support**: App functionality without internet
- **Performance Optimization**: Faster load times
- **Advanced Caching**: Improved data management
- **Machine Learning**: Predictive analytics
- **Microservices Architecture**: Scalable backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use consistent naming conventions
- Write comprehensive tests
- Document new features
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Frontend Team**: React Native specialists
- **Backend Team**: Node.js and cloud architects
- **Design Team**: UI/UX designers
- **QA Team**: Testing and quality assurance
- **DevOps Team**: Deployment and monitoring

## 📞 Support

For support and questions:
- **Email**: support@flourordering.com
- **Phone**: +91-XXXXXXXXXX
- **Documentation**: [docs.flourordering.com](https://docs.flourordering.com)
- **Community**: [community.flourordering.com](https://community.flourordering.com)

---

Made with ❤️ for the flour milling industry