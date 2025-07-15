// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3000/api' : 'https://api.flourordering.com',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    GOOGLE_LOGIN: '/auth/google',
  },
  
  // User Management
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    DELETE_ACCOUNT: '/users/delete',
    UPLOAD_AVATAR: '/users/avatar',
  },
  
  // Products
  PRODUCTS: {
    GRAINS: '/products/grains',
    GRINDING_OPTIONS: '/products/grinding-options',
    CUSTOM_PRODUCTS: '/products/custom',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
  },
  
  // Orders
  ORDERS: {
    CREATE: '/orders',
    LIST: '/orders',
    DETAILS: '/orders/:id',
    UPDATE_STATUS: '/orders/:id/status',
    CANCEL: '/orders/:id/cancel',
    RATE: '/orders/:id/rate',
    TRACK: '/orders/:id/track',
  },
  
  // Subscriptions
  SUBSCRIPTIONS: {
    CREATE: '/subscriptions',
    LIST: '/subscriptions',
    UPDATE: '/subscriptions/:id',
    CANCEL: '/subscriptions/:id/cancel',
    PAUSE: '/subscriptions/:id/pause',
    RESUME: '/subscriptions/:id/resume',
  },
  
  // Payments
  PAYMENTS: {
    CREATE_ORDER: '/payments/create-order',
    VERIFY: '/payments/verify',
    REFUND: '/payments/refund',
    HISTORY: '/payments/history',
  },
  
  // Mills
  MILLS: {
    LIST: '/mills',
    DETAILS: '/mills/:id',
    NEARBY: '/mills/nearby',
    ORDERS: '/mills/orders',
    UPDATE_STATUS: '/mills/orders/:id/status',
  },
  
  // Delivery
  DELIVERY: {
    AVAILABLE_ORDERS: '/delivery/available-orders',
    ACCEPT_ORDER: '/delivery/orders/:id/accept',
    UPDATE_LOCATION: '/delivery/location',
    COMPLETE_DELIVERY: '/delivery/orders/:id/complete',
    DELIVERY_HISTORY: '/delivery/history',
  },
  
  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    ORDERS: '/admin/orders',
    MILLS: '/admin/mills',
    ANALYTICS: '/admin/analytics',
    NOTIFICATIONS: '/admin/notifications',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: '/notifications/:id',
  },
  
  // Location
  LOCATION: {
    GEOCODE: '/location/geocode',
    REVERSE_GEOCODE: '/location/reverse-geocode',
    DISTANCE: '/location/distance',
  },
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  CART_ITEMS: 'cart_items',
  FAVORITES: 'favorites',
  RECENT_ADDRESSES: 'recent_addresses',
  NOTIFICATION_SETTINGS: 'notification_settings',
  THEME_PREFERENCE: 'theme_preference',
  LANGUAGE_PREFERENCE: 'language_preference',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LOCATION_PERMISSION: 'location_permission',
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'FlourOrdering',
  VERSION: '1.0.0',
  SUPPORTED_LANGUAGES: ['en', 'hi', 'ta', 'te'],
  DEFAULT_LANGUAGE: 'en',
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  DEFAULT_LOCATION: {
    latitude: 12.9716,
    longitude: 77.5946, // Bangalore coordinates
  },
  MAX_DELIVERY_DISTANCE: 10, // km
  MIN_ORDER_AMOUNT: 100, // INR
  MAX_CART_ITEMS: 20,
  OTP_LENGTH: 6,
  OTP_EXPIRY: 300, // 5 minutes
};

// Default Values
export const DEFAULTS = {
  GRINDING_OPTIONS: [
    {
      id: 'fine',
      name: 'Fine',
      description: 'Very fine powder',
      isCustom: false,
      price: 0,
    },
    {
      id: 'medium',
      name: 'Medium',
      description: 'Standard grinding',
      isCustom: false,
      price: 0,
    },
    {
      id: 'coarse',
      name: 'Coarse',
      description: 'Rough texture',
      isCustom: false,
      price: 0,
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Specify your preference',
      isCustom: true,
      price: 10,
    },
  ],
  
  GRAIN_CATEGORIES: [
    { id: 'wheat', name: 'Wheat', icon: '🌾' },
    { id: 'rice', name: 'Rice', icon: '🌾' },
    { id: 'pulses', name: 'Pulses', icon: '🫘' },
    { id: 'millets', name: 'Millets', icon: '🌾' },
    { id: 'spices', name: 'Spices', icon: '🌶️' },
    { id: 'other', name: 'Other', icon: '🌱' },
  ],
  
  SUBSCRIPTION_FREQUENCIES: [
    { id: 'weekly', name: 'Weekly', discount: 5 },
    { id: 'biweekly', name: 'Bi-weekly', discount: 8 },
    { id: 'monthly', name: 'Monthly', discount: 12 },
  ],
  
  ORDER_STATUSES: [
    { id: 'pending', name: 'Pending', color: '#FFA500' },
    { id: 'confirmed', name: 'Confirmed', color: '#4CAF50' },
    { id: 'received', name: 'Received', color: '#2196F3' },
    { id: 'grinding', name: 'Grinding', color: '#FF9800' },
    { id: 'ready', name: 'Ready', color: '#9C27B0' },
    { id: 'out_for_delivery', name: 'Out for Delivery', color: '#3F51B5' },
    { id: 'delivered', name: 'Delivered', color: '#4CAF50' },
    { id: 'cancelled', name: 'Cancelled', color: '#F44336' },
  ],
};

// Theme Colors
export const COLORS = {
  PRIMARY: '#8B4513', // Saddle Brown
  SECONDARY: '#D2691E', // Chocolate
  ACCENT: '#F4A460', // Sandy Brown
  BACKGROUND: '#FFFFFF',
  SURFACE: '#F5F5F5',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
  TEXT_MUTED: '#999999',
  BORDER: '#E0E0E0',
  ERROR: '#F44336',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  INFO: '#2196F3',
  
  // Status Colors
  STATUS: {
    PENDING: '#FFA500',
    CONFIRMED: '#4CAF50',
    RECEIVED: '#2196F3',
    GRINDING: '#FF9800',
    READY: '#9C27B0',
    OUT_FOR_DELIVERY: '#3F51B5',
    DELIVERED: '#4CAF50',
    CANCELLED: '#F44336',
  },
  
  // Gradient Colors
  GRADIENT: {
    PRIMARY: ['#8B4513', '#D2691E'],
    SECONDARY: ['#D2691E', '#F4A460'],
    SUCCESS: ['#4CAF50', '#8BC34A'],
    ERROR: ['#F44336', '#FF7043'],
  },
};

// Typography
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    REGULAR: 'System',
    MEDIUM: 'System',
    BOLD: 'System',
  },
  FONT_SIZE: {
    SMALL: 12,
    MEDIUM: 14,
    LARGE: 16,
    XLARGE: 18,
    XXLARGE: 20,
    HEADING: 24,
    TITLE: 28,
  },
  LINE_HEIGHT: {
    SMALL: 16,
    MEDIUM: 20,
    LARGE: 24,
    XLARGE: 28,
    HEADING: 32,
  },
};

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

// Border Radius
export const BORDER_RADIUS = {
  SMALL: 4,
  MEDIUM: 8,
  LARGE: 12,
  XLARGE: 16,
  ROUND: 50,
};

// Animation Durations
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  OTP_INVALID: 'Invalid OTP. Please try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  PHONE_INVALID: 'Please enter a valid phone number.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  REQUIRED_FIELD: 'This field is required.',
  PASSWORD_WEAK: 'Password must be at least 6 characters long.',
  LOCATION_DENIED: 'Location access denied. Please enable location services.',
  CART_EMPTY: 'Your cart is empty.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  ORDER_NOT_FOUND: 'Order not found.',
  SUBSCRIPTION_ERROR: 'Failed to create subscription. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully!',
  REGISTRATION_SUCCESS: 'Account created successfully!',
  OTP_SENT: 'OTP sent to your phone number.',
  OTP_VERIFIED: 'Phone number verified successfully!',
  ORDER_PLACED: 'Order placed successfully!',
  ORDER_CANCELLED: 'Order cancelled successfully.',
  PAYMENT_SUCCESS: 'Payment completed successfully!',
  SUBSCRIPTION_CREATED: 'Subscription created successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  NOTIFICATION_SETTINGS_UPDATED: 'Notification settings updated.',
  FEEDBACK_SUBMITTED: 'Thank you for your feedback!',
};

// Validation Rules
export const VALIDATION = {
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10,
    PATTERN: /^[6-9]\d{9}$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 20,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  OTP: {
    LENGTH: 6,
    PATTERN: /^\d{6}$/,
  },
  PINCODE: {
    LENGTH: 6,
    PATTERN: /^\d{6}$/,
  },
};

// Feature Flags
export const FEATURES = {
  GOOGLE_LOGIN: true,
  SUBSCRIPTION: true,
  CUSTOM_PRODUCTS: true,
  RAZORPAY_PAYMENT: true,
  PUSH_NOTIFICATIONS: true,
  LOCATION_TRACKING: true,
  RATING_SYSTEM: true,
  REFERRAL_PROGRAM: false,
  LOYALTY_POINTS: false,
  DARK_MODE: true,
  MULTI_LANGUAGE: true,
};

// External Service Keys (These should be moved to environment variables in production)
export const SERVICE_KEYS = {
  RAZORPAY_KEY_ID: 'rzp_test_your_key_id',
  GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key',
  FIREBASE_API_KEY: 'your_firebase_api_key',
  ONE_SIGNAL_APP_ID: 'your_onesignal_app_id',
};

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  ORDER_UPDATE: {
    id: 'order_update',
    name: 'Order Updates',
    description: 'Get notified about order status changes',
    defaultEnabled: true,
  },
  PAYMENT: {
    id: 'payment',
    name: 'Payment Notifications',
    description: 'Payment confirmations and failures',
    defaultEnabled: true,
  },
  DELIVERY: {
    id: 'delivery',
    name: 'Delivery Updates',
    description: 'Delivery status and tracking updates',
    defaultEnabled: true,
  },
  SUBSCRIPTION: {
    id: 'subscription',
    name: 'Subscription Reminders',
    description: 'Upcoming subscription deliveries',
    defaultEnabled: true,
  },
  PROMOTIONS: {
    id: 'promotions',
    name: 'Promotions & Offers',
    description: 'Special offers and discounts',
    defaultEnabled: false,
  },
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  STORAGE_KEYS,
  APP_CONFIG,
  DEFAULTS,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  ANIMATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  FEATURES,
  SERVICE_KEYS,
  NOTIFICATION_CATEGORIES,
};