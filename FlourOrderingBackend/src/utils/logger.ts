import winston from 'winston';
import path from 'path';
import { config } from '@config/index';

const logDir = path.dirname(config.logging.file);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Define different log formats for console and file
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  })
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: config.logging.level,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: config.logging.file,
    format: logFormat,
    level: config.logging.level,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Separate file for errors
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    format: logFormat,
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.server.appName },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    format: logFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    format: logFormat,
  })
);

// Create a stream object for Morgan middleware
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logWithContext = (level: string, message: string, context?: any) => {
  const logObject: any = { message };
  if (context) {
    logObject.context = context;
  }
  logger.log(level, logObject);
};

export const logError = (error: Error, context?: any) => {
  const logObject: any = {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };
  if (context) {
    logObject.context = context;
  }
  logger.error(logObject);
};

export const logRequest = (req: any, res: any, responseTime?: number) => {
  const logObject = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  };
  logger.info('HTTP Request', logObject);
};

export const logPayment = (action: string, paymentId: string, amount: number, status: string, context?: any) => {
  const logObject = {
    action,
    paymentId,
    amount,
    status,
    context,
  };
  logger.info('Payment Activity', logObject);
};

export const logOrder = (action: string, orderId: string, userId: string, context?: any) => {
  const logObject = {
    action,
    orderId,
    userId,
    context,
  };
  logger.info('Order Activity', logObject);
};

export const logSecurity = (event: string, userId?: string, ip?: string, context?: any) => {
  const logObject = {
    event,
    userId,
    ip,
    context,
  };
  logger.warn('Security Event', logObject);
};

export default logger;