import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { GrainController } from '@controllers/GrainController';
import { authenticate, authorize, optionalAuth } from '@middleware/auth';
import { validateRequest, validatePagination, validateSorting, validateUUID } from '@middleware/validation';
import { catchAsync } from '@utils/errors';
import { UserRole, GrainCategory } from '@types/index';

const router = Router();
const grainController = new GrainController();

// Validation rules
const createGrainValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .trim()
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(Object.values(GrainCategory))
    .withMessage('Invalid grain category'),
  body('price_per_kg')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price must be between 0 and 10000'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),
  body('nutritional_info')
    .optional()
    .isObject()
    .withMessage('Nutritional info must be an object'),
];

const updateGrainValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .trim()
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .optional()
    .isIn(Object.values(GrainCategory))
    .withMessage('Invalid grain category'),
  body('price_per_kg')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price must be between 0 and 10000'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),
  body('is_available')
    .optional()
    .isBoolean()
    .withMessage('Availability must be boolean'),
  body('nutritional_info')
    .optional()
    .isObject()
    .withMessage('Nutritional info must be an object'),
];

/**
 * @route   GET /api/v1/grains
 * @desc    Get all grains with filtering and pagination
 * @access  Public
 */
router.get('/',
  optionalAuth,
  [
    query('category')
      .optional()
      .isIn(Object.values(GrainCategory))
      .withMessage('Invalid category'),
    query('mill_id')
      .optional()
      .isUUID()
      .withMessage('Mill ID must be a valid UUID'),
    query('available_only')
      .optional()
      .isBoolean()
      .withMessage('Available only must be boolean'),
    query('min_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Min price must be a positive number'),
    query('max_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Max price must be a positive number'),
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
  ],
  validateRequest,
  validatePagination,
  validateSorting(['name', 'price_per_kg', 'category', 'created_at']),
  catchAsync(grainController.getGrains)
);

/**
 * @route   GET /api/v1/grains/categories
 * @desc    Get grain category summary
 * @access  Public
 */
router.get('/categories',
  catchAsync(grainController.getCategorySummary)
);

/**
 * @route   GET /api/v1/grains/featured
 * @desc    Get featured grains
 * @access  Public
 */
router.get('/featured',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  catchAsync(grainController.getFeaturedGrains)
);

/**
 * @route   GET /api/v1/grains/popular
 * @desc    Get popular grains
 * @access  Public
 */
router.get('/popular',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  validateRequest,
  catchAsync(grainController.getPopularGrains)
);

/**
 * @route   GET /api/v1/grains/:id
 * @desc    Get grain by ID
 * @access  Public
 */
router.get('/:id',
  optionalAuth,
  validateUUID('id'),
  catchAsync(grainController.getGrainById)
);

/**
 * @route   POST /api/v1/grains
 * @desc    Create new grain
 * @access  Private (Mill, Admin)
 */
router.post('/',
  authenticate,
  authorize(UserRole.MILL, UserRole.ADMIN),
  createGrainValidation,
  validateRequest,
  catchAsync(grainController.createGrain)
);

/**
 * @route   PUT /api/v1/grains/:id
 * @desc    Update grain
 * @access  Private (Mill owner, Admin)
 */
router.put('/:id',
  authenticate,
  validateUUID('id'),
  updateGrainValidation,
  validateRequest,
  catchAsync(grainController.updateGrain)
);

/**
 * @route   DELETE /api/v1/grains/:id
 * @desc    Delete grain
 * @access  Private (Mill owner, Admin)
 */
router.delete('/:id',
  authenticate,
  validateUUID('id'),
  catchAsync(grainController.deleteGrain)
);

/**
 * @route   POST /api/v1/grains/:id/toggle-availability
 * @desc    Toggle grain availability
 * @access  Private (Mill owner, Admin)
 */
router.post('/:id/toggle-availability',
  authenticate,
  validateUUID('id'),
  catchAsync(grainController.toggleAvailability)
);

export default router;