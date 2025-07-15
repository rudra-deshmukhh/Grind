import logger from './logger';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400);
    this.fields = fields;
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Payment error class
 */
export class PaymentError extends AppError {
  public readonly paymentId?: string;
  public readonly gatewayError?: any;

  constructor(message: string, paymentId?: string, gatewayError?: any) {
    super(message, 402);
    this.paymentId = paymentId;
    this.gatewayError = gatewayError;
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: any;

  constructor(service: string, message: string = 'External service error', originalError?: any) {
    super(`${service}: ${message}`, 503);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * File upload error class
 */
export class FileUploadError extends AppError {
  constructor(message: string = 'File upload failed') {
    super(message, 400);
  }
}

/**
 * Subscription error class
 */
export class SubscriptionError extends AppError {
  constructor(message: string = 'Subscription operation failed') {
    super(message, 400);
  }
}

/**
 * Handle async errors in express routes
 */
export const catchAsync = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle Sequelize database errors
 */
export const handleSequelizeError = (error: any): AppError => {
  if (error.name === 'SequelizeValidationError') {
    const fields: Record<string, string> = {};
    error.errors.forEach((err: any) => {
      fields[err.path] = err.message;
    });
    return new ValidationError('Validation failed', fields);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'field';
    return new ConflictError(`${field} already exists`);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Invalid reference to related resource');
  }

  if (error.name === 'SequelizeDatabaseError') {
    return new DatabaseError('Database operation failed');
  }

  if (error.name === 'SequelizeConnectionError') {
    return new DatabaseError('Database connection failed');
  }

  return new DatabaseError(error.message || 'Database error occurred');
};

/**
 * Handle Joi validation errors
 */
export const handleJoiError = (error: any): ValidationError => {
  const fields: Record<string, string> = {};
  
  if (error.details) {
    error.details.forEach((detail: any) => {
      fields[detail.path.join('.')] = detail.message;
    });
  }

  return new ValidationError('Validation failed', fields);
};

/**
 * Handle Firebase errors
 */
export const handleFirebaseError = (error: any): AppError => {
  const { code, message } = error;

  switch (code) {
    case 'auth/id-token-expired':
    case 'auth/id-token-revoked':
      return new AuthenticationError('Token expired or revoked');
    
    case 'auth/invalid-id-token':
      return new AuthenticationError('Invalid token format');
    
    case 'auth/user-not-found':
      return new NotFoundError('User');
    
    case 'auth/user-disabled':
      return new AuthenticationError('Account disabled');
    
    case 'auth/email-already-exists':
      return new ConflictError('Email already registered');
    
    case 'auth/phone-number-already-exists':
      return new ConflictError('Phone number already registered');
    
    case 'auth/invalid-email':
      return new ValidationError('Invalid email format');
    
    case 'auth/invalid-phone-number':
      return new ValidationError('Invalid phone number format');
    
    case 'auth/weak-password':
      return new ValidationError('Password is too weak');
    
    default:
      return new ExternalServiceError('Firebase', message || 'Firebase operation failed', error);
  }
};

/**
 * Handle Razorpay errors
 */
export const handleRazorpayError = (error: any): PaymentError => {
  const { error: razorpayError } = error;
  
  if (razorpayError) {
    const { code, description, reason } = razorpayError;
    
    switch (code) {
      case 'BAD_REQUEST_ERROR':
        return new PaymentError('Invalid payment request');
      
      case 'GATEWAY_ERROR':
        return new PaymentError('Payment gateway error');
      
      case 'SERVER_ERROR':
        return new PaymentError('Payment server error');
      
      default:
        return new PaymentError(description || reason || 'Payment failed');
    }
  }

  return new PaymentError(error.message || 'Payment operation failed');
};

/**
 * Log error details
 */
export const logError = (error: Error, context?: any): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
  };

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.isOperational = error.isOperational;
  }

  logger.error('Application Error:', errorInfo);
};

/**
 * Send error response
 */
export const sendErrorResponse = (res: any, error: Error, isDevelopment: boolean = false): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    
    if (error instanceof ValidationError) {
      details = { fields: error.fields };
    }
    
    if (error instanceof PaymentError) {
      details = {
        paymentId: error.paymentId,
        gatewayError: isDevelopment ? error.gatewayError : undefined,
      };
    }
  }

  const response: any = {
    success: false,
    message,
    timestamp: new Date(),
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export default {
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  PaymentError,
  ExternalServiceError,
  FileUploadError,
  SubscriptionError,
  catchAsync,
  handleSequelizeError,
  handleJoiError,
  handleFirebaseError,
  handleRazorpayError,
  logError,
  sendErrorResponse,
};