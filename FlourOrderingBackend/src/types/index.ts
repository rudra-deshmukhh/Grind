import { Request } from 'express';

// Enums
export enum UserRole {
  CUSTOMER = 'customer',
  MILL = 'mill',
  DELIVERY = 'delivery',
  ADMIN = 'admin'
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

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  ONLINE = 'online',
  COD = 'cod'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum SubscriptionFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum GrainCategory {
  WHEAT = 'wheat',
  RICE = 'rice',
  PULSES = 'pulses',
  MILLETS = 'millets',
  SPICES = 'spices',
  OTHER = 'other'
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  SUBSCRIPTION = 'subscription',
  PROMOTION = 'promotion',
  GENERAL = 'general'
}

// Base interfaces
export interface BaseModel {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
}

// User interfaces
export interface User extends BaseModel {
  firebase_uid: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
  profile_image?: string;
  is_active: boolean;
  last_login?: Date;
}

export interface Customer extends User {
  addresses: Address[];
  preferences: CustomerPreferences;
  total_orders: number;
  total_spent: number;
}

export interface Mill extends User {
  business_name: string;
  business_license: string;
  address: Address;
  service_radius: number; // in kilometers
  is_approved: boolean;
  rating: number;
  total_orders: number;
  capacity_per_day: number; // in kg
  working_hours: WorkingHours;
}

export interface DeliveryPartner extends User {
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  is_available: boolean;
  current_location?: Location;
  service_areas: string[]; // array of pincodes
  rating: number;
  total_deliveries: number;
  earnings: number;
}

export interface Admin extends User {
  permissions: string[];
  department?: string;
}

// Address interface
export interface Address extends BaseModel {
  user_id: string;
  label: string; // home, office, etc.
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  location: Location;
  is_default: boolean;
}

// Product interfaces
export interface Grain extends BaseModel {
  name: string;
  description: string;
  category: GrainCategory;
  price_per_kg: number;
  image_url?: string;
  is_available: boolean;
  nutritional_info?: NutritionalInfo;
  mill_id?: string; // if specific to a mill
}

export interface GrindingOption extends BaseModel {
  name: string;
  description: string;
  additional_cost: number;
  is_custom: boolean;
  mill_id?: string; // if specific to a mill
}

export interface CustomProduct extends BaseModel {
  user_id: string;
  name: string;
  description?: string;
  grain_mix: GrainMix[];
  grinding_option_id: string;
  total_price: number;
  is_public: boolean;
  is_favorite: boolean;
}

export interface GrainMix {
  grain_id: string;
  quantity_kg: number;
  percentage: number;
}

// Order interfaces
export interface Order extends BaseModel {
  order_number: string;
  customer_id: string;
  mill_id: string;
  delivery_partner_id?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  delivery_charges: number;
  total_amount: number;
  status: OrderStatus;
  delivery_address: Address;
  estimated_delivery_date: Date;
  actual_delivery_date?: Date;
  notes?: string;
  rating?: number;
  review?: string;
  is_subscription_order: boolean;
  subscription_id?: string;
  payment_info: PaymentInfo;
  tracking_info: TrackingInfo[];
}

export interface OrderItem extends BaseModel {
  order_id: string;
  grain_id?: string;
  custom_product_id?: string;
  grinding_option_id: string;
  quantity_kg: number;
  price_per_kg: number;
  total_price: number;
}

export interface TrackingInfo extends BaseModel {
  order_id: string;
  status: OrderStatus;
  message: string;
  location?: Location;
  updated_by: string;
  timestamp: Date;
}

// Payment interfaces
export interface PaymentInfo extends BaseModel {
  order_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  transaction_id?: string;
  gateway_response?: any;
  failure_reason?: string;
  refund_id?: string;
  refund_amount?: number;
}

// Subscription interfaces
export interface Subscription extends BaseModel {
  customer_id: string;
  items: SubscriptionItem[];
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  next_delivery_date: Date;
  last_order_date?: Date;
  start_date: Date;
  end_date?: Date;
  total_orders: number;
  discount_percentage: number;
  delivery_address: Address;
  notes?: string;
}

export interface SubscriptionItem {
  grain_id?: string;
  custom_product_id?: string;
  grinding_option_id: string;
  quantity_kg: number;
}

// Notification interface
export interface Notification extends BaseModel {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
  is_read: boolean;
  sent_at: Date;
}

// Support interfaces
export interface CustomerPreferences {
  preferred_grains: string[];
  default_grinding_option: string;
  notification_settings: NotificationSettings;
  delivery_instructions?: string;
}

export interface NotificationSettings {
  order_updates: boolean;
  payment_updates: boolean;
  subscription_reminders: boolean;
  promotional_offers: boolean;
  delivery_updates: boolean;
}

export interface NutritionalInfo {
  protein: number;
  carbohydrates: number;
  fiber: number;
  fat: number;
  calories: number;
  vitamins?: string[];
  minerals?: string[];
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  is_open: boolean;
  open_time?: string; // HH:mm format
  close_time?: string; // HH:mm format
  break_time?: {
    start: string;
    end: string;
  };
}

// API interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    firebase_uid: string;
    email: string;
    role: UserRole;
    is_verified: boolean;
  };
}

// Validation schemas types
export interface CreateUserRequest {
  firebase_uid: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  profile_image?: string;
}

export interface CreateOrderRequest {
  mill_id: string;
  items: {
    grain_id?: string;
    custom_product_id?: string;
    grinding_option_id: string;
    quantity_kg: number;
  }[];
  delivery_address_id: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  message?: string;
  location?: Location;
}

export interface CreateSubscriptionRequest {
  items: SubscriptionItem[];
  frequency: SubscriptionFrequency;
  delivery_address_id: string;
  start_date: Date;
  notes?: string;
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
}

// Analytics types
export interface OrderAnalytics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_month: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  top_products: Array<{
    grain_id: string;
    grain_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
}

export interface MillAnalytics {
  total_orders: number;
  total_revenue: number;
  average_processing_time: number;
  capacity_utilization: number;
  customer_rating: number;
  orders_by_status: Record<OrderStatus, number>;
}

export interface DeliveryAnalytics {
  total_deliveries: number;
  total_earnings: number;
  average_delivery_time: number;
  customer_rating: number;
  deliveries_by_area: Array<{
    area: string;
    count: number;
  }>;
}

// File upload types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// Webhook types
export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: any;
    };
    order: {
      entity: any;
    };
  };
  created_at: number;
}

export default {
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  SubscriptionStatus,
  SubscriptionFrequency,
  GrainCategory,
  NotificationType,
};