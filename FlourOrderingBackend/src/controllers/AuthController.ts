import { Request, Response } from 'express';
import { AuthenticatedRequest, UserRole, CreateUserRequest, UpdateUserRequest } from '@types/index';
import { UserModel } from '@models/User';
import firebaseService from '@services/firebase';
import logger, { logSecurity } from '@utils/logger';
import { AppError, NotFoundError, ConflictError, ValidationError } from '@utils/errors';

export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { firebase_uid, email, phone, name, role }: CreateUserRequest = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findOne({
        where: {
          [UserModel.sequelize?.Op.or as any]: [
            { firebase_uid },
            { email },
            { phone: phone.replace(/[^\d]/g, '') }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.firebase_uid === firebase_uid) {
          throw new ConflictError('User already registered with this Firebase account');
        }
        if (existingUser.email === email.toLowerCase()) {
          throw new ConflictError('User already registered with this email');
        }
        if (existingUser.phone === phone.replace(/[^\d]/g, '')) {
          throw new ConflictError('User already registered with this phone number');
        }
      }

      // Verify Firebase user exists
      try {
        await firebaseService.getUserByUid(firebase_uid);
      } catch (error) {
        throw new ValidationError('Invalid Firebase UID');
      }

      // Create user in database
      const user = await UserModel.create({
        firebase_uid,
        email: email.toLowerCase(),
        phone: phone.replace(/[^\d]/g, ''),
        name,
        role: role as UserRole,
        is_verified: false,
        is_active: true,
      });

      // Set custom claims in Firebase
      await firebaseService.setCustomClaims(firebase_uid, {
        role: user.role,
        userId: user.id,
        isVerified: user.is_verified,
      });

      logger.info(`New user registered: ${user.id} (${user.role})`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Registration error:', error);
        res.status(500).json({
          success: false,
          message: 'Registration failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Login user with Firebase UID
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { firebase_uid } = req.body;

      // Find user in database
      const user = await UserModel.findOne({
        where: { firebase_uid },
        include: ['addresses'], // Include addresses for customer
      });

      if (!user) {
        throw new NotFoundError('User not found. Please register first.');
      }

      if (!user.is_active) {
        logSecurity('INACTIVE_USER_LOGIN', user.id, req.ip);
        throw new AppError('Account is deactivated. Please contact support.', 403);
      }

      // Update last login
      await user.update({ last_login: new Date() });

      // Update Firebase custom claims if needed
      await firebaseService.setCustomClaims(firebase_uid, {
        role: user.role,
        userId: user.id,
        isVerified: user.is_verified,
      });

      logger.info(`User logged in: ${user.id} (${user.role})`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Login error:', error);
        res.status(500).json({
          success: false,
          message: 'Login failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Verify user's phone number
   */
  async verifyPhone(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      const userId = req.user!.id;

      // Update user's phone verification status
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update phone number and set as verified
      await user.update({
        phone: phone.replace(/[^\d]/g, ''),
        is_verified: true,
      });

      // Update Firebase custom claims
      await firebaseService.setCustomClaims(user.firebase_uid, {
        role: user.role,
        userId: user.id,
        isVerified: true,
      });

      logger.info(`Phone verified for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Phone number verified successfully',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Phone verification error:', error);
        res.status(500).json({
          success: false,
          message: 'Phone verification failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Refresh user token and profile
   */
  async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Get updated user data
      const user = await UserModel.findByPk(userId, {
        include: ['addresses'],
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update last login
      await user.update({ last_login: new Date() });

      res.status(200).json({
        success: true,
        message: 'Profile refreshed successfully',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Refresh error:', error);
        res.status(500).json({
          success: false,
          message: 'Profile refresh failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Logout user
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      logger.info(`User logged out: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await UserModel.findByPk(userId, {
        include: ['addresses'],
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Get profile error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve profile',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const updateData: UpdateUserRequest = req.body;

      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check for conflicts if updating email or phone
      if (updateData.phone) {
        const normalizedPhone = updateData.phone.replace(/[^\d]/g, '');
        const existingUser = await UserModel.findOne({
          where: {
            phone: normalizedPhone,
            id: { [UserModel.sequelize?.Op.ne as any]: userId },
          },
        });
        if (existingUser) {
          throw new ConflictError('Phone number already in use');
        }
        updateData.phone = normalizedPhone;
      }

      // Update user
      await user.update(updateData);

      logger.info(`Profile updated for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Update profile error:', error);
        res.status(500).json({
          success: false,
          message: 'Profile update failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Deactivate account
      await user.update({ is_active: false });

      // Disable Firebase user
      await firebaseService.updateUser(user.firebase_uid, { disabled: true });

      logSecurity('ACCOUNT_DEACTIVATED', userId, req.ip);
      logger.info(`Account deactivated for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Deactivate account error:', error);
        res.status(500).json({
          success: false,
          message: 'Account deactivation failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Delete user account permanently
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check for pending orders or active subscriptions
      // This should be implemented based on business logic

      // Delete Firebase user
      await firebaseService.deleteUser(user.firebase_uid);

      // Delete user from database (cascade will handle related records)
      await user.destroy();

      logSecurity('ACCOUNT_DELETED', userId, req.ip);
      logger.info(`Account deleted for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      } else {
        logger.error('Delete account error:', error);
        res.status(500).json({
          success: false,
          message: 'Account deletion failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Check if email or phone is available
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone } = req.body;

      const checks: any = {};

      if (email) {
        const emailExists = await UserModel.findOne({
          where: { email: email.toLowerCase() },
        });
        checks.email = {
          available: !emailExists,
          message: emailExists ? 'Email already in use' : 'Email is available',
        };
      }

      if (phone) {
        const normalizedPhone = phone.replace(/[^\d]/g, '');
        const phoneExists = await UserModel.findOne({
          where: { phone: normalizedPhone },
        });
        checks.phone = {
          available: !phoneExists,
          message: phoneExists ? 'Phone number already in use' : 'Phone number is available',
        };
      }

      res.status(200).json({
        success: true,
        message: 'Availability check completed',
        data: checks,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Check availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Availability check failed',
        timestamp: new Date(),
      });
    }
  }
}