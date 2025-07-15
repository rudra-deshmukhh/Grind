import 'express-async-errors';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config, isDevelopment } from '@config/index';
import database from '@config/database';
import logger, { stream } from '@utils/logger';
import { 
  AppError, 
  handleSequelizeError, 
  handleJoiError, 
  handleFirebaseError, 
  handleRazorpayError,
  sendErrorResponse,
  logError
} from '@utils/errors';

// Import services
import firebaseService from '@services/firebase';

// Import routes
import authRoutes from '@routes/auth';
import userRoutes from '@routes/users';
import grainRoutes from '@routes/grains';
import orderRoutes from '@routes/orders';
import subscriptionRoutes from '@routes/subscriptions';
import paymentRoutes from '@routes/payments';
import notificationRoutes from '@routes/notifications';
import analyticsRoutes from '@routes/analytics';
import uploadRoutes from '@routes/uploads';

// Extend Request interface for custom properties
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

class Server {
  private app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = config.server.port;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(morgan('combined', { stream }));

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/public', express.static(path.join(__dirname, '../public')));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = require('uuid').v4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Custom middleware for request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id,
        });
      });
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date(),
        version: '1.0.0',
        environment: config.server.env,
      });
    });

    // API routes
    const apiRouter = express.Router();
    
    // Mount route modules
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/grains', grainRoutes);
    apiRouter.use('/orders', orderRoutes);
    apiRouter.use('/subscriptions', subscriptionRoutes);
    apiRouter.use('/payments', paymentRoutes);
    apiRouter.use('/notifications', notificationRoutes);
    apiRouter.use('/analytics', analyticsRoutes);
    apiRouter.use('/uploads', uploadRoutes);

    // Mount API router
    this.app.use(`/api/${config.server.apiVersion}`, apiRouter);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: `${config.server.appName} API`,
        version: '1.0.0',
        environment: config.server.env,
        documentation: `${config.server.appUrl}/api/${config.server.apiVersion}/docs`,
        timestamp: new Date(),
      });
    });

    // 404 handler for unknown routes
    this.app.all('*', (req: Request, res: Response, next: NextFunction) => {
      const error = new AppError(`Can't find ${req.originalUrl} on this server`, 404);
      next(error);
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      let handledError: AppError;

      // Log the error
      logError(error, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
      });

      // Handle different types of errors
      if (error.name?.includes('Sequelize')) {
        handledError = handleSequelizeError(error);
      } else if (error.name === 'ValidationError' && error.message?.includes('Joi')) {
        handledError = handleJoiError(error);
      } else if (error.name?.includes('Firebase') || error.message?.includes('Firebase')) {
        handledError = handleFirebaseError(error);
      } else if (error.message?.includes('Razorpay')) {
        handledError = handleRazorpayError(error);
      } else if (error instanceof AppError) {
        handledError = error;
      } else {
        // Unknown error
        handledError = new AppError(
          isDevelopment ? error.message : 'Something went wrong',
          500
        );
      }

      // Send error response
      sendErrorResponse(res, handledError, isDevelopment);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Close server gracefully
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      // Close server gracefully
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT signal (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT signal received');
      this.gracefulShutdown('SIGINT');
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close database connections
      await database.disconnect();
      logger.info('Database connections closed');

      // Exit process
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await database.connect();
      logger.info('Database connected successfully');

      // Sync database models (only in development)
      if (isDevelopment) {
        await database.sync({ alter: true });
        logger.info('Database models synchronized');
      }

      // Initialize Firebase
      // Firebase service is initialized in its constructor

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`${config.server.appName} server started`, {
          port: this.port,
          environment: config.server.env,
          processId: process.pid,
          nodeVersion: process.version,
          apiVersion: config.server.apiVersion,
          timestamp: new Date(),
        });

        // Log available routes in development
        if (isDevelopment) {
          this.logRoutes();
        }
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private logRoutes(): void {
    const routes: string[] = [];
    
    const extractRoutes = (stack: any[], basePath: string = '') => {
      stack.forEach((layer: any) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods)
            .filter(method => layer.route.methods[method])
            .map(method => method.toUpperCase())
            .join(', ');
          routes.push(`${methods} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle?.stack) {
          const routerPath = layer.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/^\^/, '')
            .replace(/\$$/, '');
          extractRoutes(layer.handle.stack, basePath + routerPath);
        }
      });
    };

    if (this.app._router?.stack) {
      extractRoutes(this.app._router.stack);
      logger.info('Available routes:', routes);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Create and start server
const server = new Server();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default server;
export { Server };