// Core User Types
export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  CUSTOMER = 'customer',
  MILL = 'mill',
  DELIVERY = 'delivery',
  ADMIN = 'admin'
}

export interface Customer extends User {
  address: Address;
  preferences: CustomerPreferences;
  favouriteProducts: string[];
  subscriptions: Subscription[];
}

export interface Mill extends User {
  businessName: string;
  address: Address;
  serviceArea: string[];
  isActive: boolean;
  rating: number;
  totalOrders: number;
}

export interface DeliveryBoy extends User {
  vehicleNumber: string;
  isAvailable: boolean;
  currentLocation: Location;
  assignedOrders: string[];
  rating: number;
}

export interface Admin extends User {
  permissions: string[];
}

// Location and Address Types
export interface Location {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  location: Location;
}

// Product Types
export interface Grain {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
  imageUrl: string;
  category: GrainCategory;
  isAvailable: boolean;
  nutritionInfo?: NutritionInfo;
}

export enum GrainCategory {
  WHEAT = 'wheat',
  RICE = 'rice',
  PULSES = 'pulses',
  MILLETS = 'millets',
  SPICES = 'spices',
  OTHER = 'other'
}

export interface NutritionInfo {
  protein: number;
  carbohydrates: number;
  fiber: number;
  fat: number;
  calories: number;
}

export interface GrindingOption {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  price: number;
}

export interface CustomProduct {
  id: string;
  name: string;
  grains: GrainMix[];
  grindingOption: GrindingOption;
  totalPrice: number;
  createdBy: string;
  isPublic: boolean;
}

export interface GrainMix {
  grain: Grain;
  quantity: number;
  percentage: number;
}

// Order Types
export interface Order {
  id: string;
  customerId: string;
  millId: string;
  deliveryBoyId?: string;
  products: OrderProduct[];
  status: OrderStatus;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  isSubscription: boolean;
  subscriptionId?: string;
  deliveryAddress: Address;
  orderDate: Date;
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  rating?: number;
  review?: string;
  trackingInfo: TrackingInfo[];
  paymentInfo: PaymentInfo;
}

export interface OrderProduct {
  id: string;
  grain?: Grain;
  customProduct?: CustomProduct;
  quantity: number;
  grindingOption: GrindingOption;
  price: number;
  totalPrice: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RECEIVED = 'received',
  GRINDING = 'grinding',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface TrackingInfo {
  status: OrderStatus;
  timestamp: Date;
  message: string;
  location?: Location;
  updatedBy: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  customerId: string;
  products: OrderProduct[];
  frequency: SubscriptionFrequency;
  isActive: boolean;
  nextDeliveryDate: Date;
  startDate: Date;
  endDate?: Date;
  totalAmount: number;
  createdAt: Date;
}

export enum SubscriptionFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

// Payment Types
export interface PaymentInfo {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export enum PaymentMethod {
  ONLINE = 'online',
  COD = 'cod'
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  data?: any;
  createdAt: Date;
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  SUBSCRIPTION = 'subscription',
  PROMOTION = 'promotion',
  GENERAL = 'general'
}

// Authentication Types
export interface AuthCredentials {
  phone: string;
  otp?: string;
  email?: string;
  password?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Customer Preferences
export interface CustomerPreferences {
  preferredGrains: string[];
  defaultGrindingOption: string;
  deliveryTimePreference: DeliveryTimePreference;
  notificationSettings: NotificationSettings;
}

export enum DeliveryTimePreference {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  ANYTIME = 'anytime'
}

export interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  subscriptionReminders: boolean;
  deliveryNotifications: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form Types
export interface LoginForm {
  phone: string;
  otp: string;
}

export interface RegisterForm {
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  address: Partial<Address>;
}

export interface OrderForm {
  products: OrderProduct[];
  deliveryAddress: Address;
  notes?: string;
  paymentMethod: PaymentMethod;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  CustomerHome: undefined;
  MillHome: undefined;
  DeliveryHome: undefined;
  AdminHome: undefined;
  OrderDetails: { orderId: string };
  ProductDetails: { productId: string };
  TrackOrder: { orderId: string };
  Profile: undefined;
  Settings: undefined;
  CustomProduct: undefined;
  Subscription: undefined;
  Payment: { orderId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OtpVerification: { phone: string };
  ForgotPassword: undefined;
};

export type CustomerStackParamList = {
  Home: undefined;
  Products: undefined;
  Cart: undefined;
  Orders: undefined;
  Subscriptions: undefined;
  Profile: undefined;
};

export type MillStackParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Products: undefined;
  Profile: undefined;
};

export type DeliveryStackParamList = {
  Dashboard: undefined;
  AvailableOrders: undefined;
  MyDeliveries: undefined;
  Tracking: { orderId: string };
  Profile: undefined;
};

export type AdminStackParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Mills: undefined;
  DeliveryBoys: undefined;
  Customers: undefined;
  Analytics: undefined;
};