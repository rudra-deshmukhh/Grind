import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '@utils/errors';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string> = {};
    
    errors.array().forEach((error) => {
      if (error.type === 'field') {
        formattedErrors[error.path] = error.msg;
      }
    });

    const validationError = new ValidationError('Validation failed', formattedErrors);
    
    res.status(400).json({
      success: false,
      message: validationError.message,
      details: {
        fields: formattedErrors,
      },
      timestamp: new Date(),
    });
    return;
  }

  next();
};

/**
 * Custom validation for pagination parameters
 */
export const validatePagination = [
  (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate page
    if (page < 1) {
      const error = new ValidationError('Page must be a positive number');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      const error = new ValidationError('Limit must be between 1 and 100');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    // Add validated values to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
  },
];

/**
 * Custom validation for sorting parameters
 */
export const validateSorting = (allowedFields: string[]) => [
  (req: Request, res: Response, next: NextFunction) => {
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as string;

    // Validate sortBy field
    if (sortBy && !allowedFields.includes(sortBy)) {
      const error = new ValidationError(
        `Sort field must be one of: ${allowedFields.join(', ')}`
      );
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    // Validate sortOrder
    if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      const error = new ValidationError('Sort order must be "asc" or "desc"');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    // Set defaults
    req.query.sortBy = sortBy || 'created_at';
    req.query.sortOrder = sortOrder?.toLowerCase() || 'desc';

    next();
  },
];

/**
 * Custom validation for date range parameters
 */
export const validateDateRange = [
  (req: Request, res: Response, next: NextFunction) => {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (startDate && !isValidDate(startDate)) {
      const error = new ValidationError('Start date must be a valid ISO date string');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    if (endDate && !isValidDate(endDate)) {
      const error = new ValidationError('End date must be a valid ISO date string');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      const error = new ValidationError('Start date must be before end date');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    next();
  },
];

/**
 * Custom validation for location coordinates
 */
export const validateLocation = [
  (req: Request, res: Response, next: NextFunction) => {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    if (req.query.latitude && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      const error = new ValidationError('Latitude must be a number between -90 and 90');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    if (req.query.longitude && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      const error = new ValidationError('Longitude must be a number between -180 and 180');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    next();
  },
];

/**
 * Custom validation for UUID parameters
 */
export const validateUUID = (paramName: string) => [
  (req: Request, res: Response, next: NextFunction) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const value = req.params[paramName];

    if (value && !uuidRegex.test(value)) {
      const error = new ValidationError(`${paramName} must be a valid UUID`);
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    next();
  },
];

/**
 * Custom validation for enum values
 */
export const validateEnum = (paramName: string, allowedValues: string[], location: 'body' | 'query' | 'params' = 'body') => [
  (req: Request, res: Response, next: NextFunction) => {
    let value: string;

    switch (location) {
      case 'body':
        value = req.body[paramName];
        break;
      case 'query':
        value = req.query[paramName] as string;
        break;
      case 'params':
        value = req.params[paramName];
        break;
      default:
        value = req.body[paramName];
    }

    if (value && !allowedValues.includes(value)) {
      const error = new ValidationError(
        `${paramName} must be one of: ${allowedValues.join(', ')}`
      );
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    next();
  },
];

/**
 * Custom validation for file uploads
 */
export const validateFileUpload = (options: {
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
}) => [
  (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    const files = req.files;

    // Check if file is required
    if (options.required && !file && (!files || (Array.isArray(files) && files.length === 0))) {
      const error = new ValidationError('File upload is required');
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date(),
      });
    }

    // Validate single file
    if (file) {
      if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
        const error = new ValidationError(
          `File type must be one of: ${options.allowedMimeTypes.join(', ')}`
        );
        return res.status(400).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      }

      if (options.maxSize && file.size > options.maxSize) {
        const error = new ValidationError(
          `File size must be less than ${options.maxSize / 1024 / 1024}MB`
        );
        return res.status(400).json({
          success: false,
          message: error.message,
          timestamp: new Date(),
        });
      }
    }

    // Validate multiple files
    if (files && Array.isArray(files)) {
      for (const uploadedFile of files) {
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(uploadedFile.mimetype)) {
          const error = new ValidationError(
            `File type must be one of: ${options.allowedMimeTypes.join(', ')}`
          );
          return res.status(400).json({
            success: false,
            message: error.message,
            timestamp: new Date(),
          });
        }

        if (options.maxSize && uploadedFile.size > options.maxSize) {
          const error = new ValidationError(
            `File size must be less than ${options.maxSize / 1024 / 1024}MB`
          );
          return res.status(400).json({
            success: false,
            message: error.message,
            timestamp: new Date(),
          });
        }
      }
    }

    next();
  },
];

/**
 * Helper function to check if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Middleware to sanitize request data
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any empty strings and convert to null
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === '' || value === 'null' || value === 'undefined') {
        sanitized[key] = null;
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  next();
};

export default {
  validateRequest,
  validatePagination,
  validateSorting,
  validateDateRange,
  validateLocation,
  validateUUID,
  validateEnum,
  validateFileUpload,
  sanitizeRequest,
};