import { Router } from 'express';
import { body, param } from 'express-validator';
import { AuthController } from '@controllers/AuthController';
import { authenticate, optionalAuth } from '@middleware/auth';
import { validateRequest } from '@middleware/validation';
import { catchAsync } from '@utils/errors';

const router = Router();
const authController = new AuthController();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number is required'),
  body('name')
    .isLength({ min: 2, max: 50 })
    .trim()
    .withMessage('Name must be between 2 and 50 characters'),
  body('role')
    .isIn(['customer', 'mill', 'delivery'])
    .withMessage('Role must be customer, mill, or delivery'),
  body('firebase_uid')
    .isLength({ min: 1 })
    .withMessage('Firebase UID is required'),
];

const loginValidation = [
  body('firebase_uid')
    .isLength({ min: 1 })
    .withMessage('Firebase UID is required'),
];

const verifyPhoneValidation = [
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number is required'),
];

// Routes

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  registerValidation,
  validateRequest,
  catchAsync(authController.register)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with Firebase UID
 * @access  Public
 */
router.post('/login',
  loginValidation,
  validateRequest,
  catchAsync(authController.login)
);

/**
 * @route   POST /api/v1/auth/verify-phone
 * @desc    Verify user's phone number
 * @access  Private
 */
router.post('/verify-phone',
  authenticate,
  verifyPhoneValidation,
  validateRequest,
  catchAsync(authController.verifyPhone)
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh user token and update profile from Firebase
 * @access  Private
 */
router.post('/refresh',
  authenticate,
  catchAsync(authController.refresh)
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authenticate,
  catchAsync(authController.logout)
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authenticate,
  catchAsync(authController.getProfile)
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile',
  authenticate,
  [
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .trim()
      .withMessage('Name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Valid Indian phone number is required'),
    body('profile_image')
      .optional()
      .isURL()
      .withMessage('Profile image must be a valid URL'),
  ],
  validateRequest,
  catchAsync(authController.updateProfile)
);

/**
 * @route   POST /api/v1/auth/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate',
  authenticate,
  catchAsync(authController.deactivateAccount)
);

/**
 * @route   POST /api/v1/auth/delete
 * @desc    Delete user account permanently
 * @access  Private
 */
router.delete('/delete',
  authenticate,
  [
    body('confirmation')
      .equals('DELETE_MY_ACCOUNT')
      .withMessage('Please type "DELETE_MY_ACCOUNT" to confirm deletion'),
  ],
  validateRequest,
  catchAsync(authController.deleteAccount)
);

/**
 * @route   POST /api/v1/auth/check-availability
 * @desc    Check if email or phone is available
 * @access  Public
 */
router.post('/check-availability',
  [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Valid Indian phone number is required'),
  ],
  validateRequest,
  catchAsync(authController.checkAvailability)
);

export default router;