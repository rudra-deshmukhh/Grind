import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '@types/index';
import firebaseService from '@services/firebase';
import { UserModel } from '@models/User';
import logger, { logSecurity } from '@utils/logger';
import { AppError } from '@utils/errors';

/**
 * Middleware to authenticate Firebase ID token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401);
    }

    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
      throw new AppError('Access token is required', 401);
    }

    // Verify Firebase ID token
    const decodedToken = await firebaseService.verifyIdToken(idToken);

    // Get user from database
    const user = await UserModel.findOne({
      where: { firebase_uid: decodedToken.uid },
    });

    if (!user) {
      logSecurity('USER_NOT_FOUND', decodedToken.uid, req.ip);
      throw new AppError('User not found', 404);
    }

    if (!user.is_active) {
      logSecurity('INACTIVE_USER_ACCESS', user.id, req.ip);
      throw new AppError('Account is deactivated', 403);
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Add user info to request
    req.user = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      role: user.role as UserRole,
      is_verified: user.is_verified,
    };

    logger.debug(`User authenticated: ${user.id} (${user.role})`);
    next();
  } catch (error) {
    logSecurity('AUTHENTICATION_FAILED', undefined, req.ip, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: req.get('User-Agent'),
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        timestamp: new Date(),
      });
    }
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!roles.includes(req.user.role)) {
        logSecurity('UNAUTHORIZED_ACCESS', req.user.id, req.ip, {
          requiredRoles: roles,
          userRole: req.user.role,
          endpoint: req.originalUrl,
        });
        throw new AppError('Insufficient permissions', 403);
      }

      logger.debug(`User authorized: ${req.user.id} with role ${req.user.role}`);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        res.status(403).json({
          success: false,
          message: 'Authorization failed',
          timestamp: new Date(),
        });
      }
    }
  };
};

/**
 * Middleware to verify user account
 */
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!req.user.is_verified) {
      logSecurity('UNVERIFIED_USER_ACCESS', req.user.id, req.ip, {
        endpoint: req.originalUrl,
      });
      throw new AppError('Account verification required', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Verification required',
        timestamp: new Date(),
      });
    }
  }
};

/**
 * Middleware for optional authentication (for public endpoints that may benefit from user context)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
      return next(); // Continue without authentication
    }

    // Verify Firebase ID token
    const decodedToken = await firebaseService.verifyIdToken(idToken);

    // Get user from database
    const user = await UserModel.findOne({
      where: { firebase_uid: decodedToken.uid },
    });

    if (user && user.is_active) {
      // Add user info to request
      req.user = {
        id: user.id,
        firebase_uid: user.firebase_uid,
        email: user.email,
        role: user.role as UserRole,
        is_verified: user.is_verified,
      };

      // Update last login
      await user.update({ last_login: new Date() });
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail the request if token is invalid
    logger.debug('Optional auth failed, continuing without user context');
    next();
  }
};

/**
 * Middleware to check if user can access their own resources
 */
export const requireOwnership = (resourceUserIdPath: string = 'params.userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      // Extract resource user ID from request
      const pathParts = resourceUserIdPath.split('.');
      let resourceUserId = req as any;
      
      for (const part of pathParts) {
        resourceUserId = resourceUserId[part];
      }

      // Admin can access any resource
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // Check if user is accessing their own resource
      if (req.user.id !== resourceUserId) {
        logSecurity('UNAUTHORIZED_RESOURCE_ACCESS', req.user.id, req.ip, {
          requestedUserId: resourceUserId,
          endpoint: req.originalUrl,
        });
        throw new AppError('You can only access your own resources', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied',
          timestamp: new Date(),
        });
      }
    }
  };
};

/**
 * Middleware to check if mill can access order
 */
export const requireMillAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Admin can access any order
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Only mills can use this middleware
    if (req.user.role !== UserRole.MILL) {
      throw new AppError('Mill access required', 403);
    }

    const orderId = req.params.orderId || req.params.id;
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    // Check if order belongs to this mill
    const { OrderModel } = await import('@models/Order');
    const order = await OrderModel.findByPk(orderId);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.mill_id !== req.user.id) {
      logSecurity('UNAUTHORIZED_ORDER_ACCESS', req.user.id, req.ip, {
        orderId,
        orderMillId: order.mill_id,
      });
      throw new AppError('You can only access orders assigned to your mill', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Access verification failed',
        timestamp: new Date(),
      });
    }
  }
};

/**
 * Middleware to check if delivery partner can access order
 */
export const requireDeliveryAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Admin can access any order
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Only delivery partners can use this middleware
    if (req.user.role !== UserRole.DELIVERY) {
      throw new AppError('Delivery partner access required', 403);
    }

    const orderId = req.params.orderId || req.params.id;
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    // Check if order is assigned to this delivery partner
    const { OrderModel } = await import('@models/Order');
    const order = await OrderModel.findByPk(orderId);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.delivery_partner_id !== req.user.id) {
      logSecurity('UNAUTHORIZED_DELIVERY_ACCESS', req.user.id, req.ip, {
        orderId,
        orderDeliveryPartnerId: order.delivery_partner_id,
      });
      throw new AppError('You can only access orders assigned to you', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Access verification failed',
        timestamp: new Date(),
      });
    }
  }
};