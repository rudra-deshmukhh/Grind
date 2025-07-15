import { Request, Response } from 'express';
import { AuthenticatedRequest, GrainCategory, UserRole } from '@types/index';
import { GrainModel } from '@models/Grain';
import logger from '@utils/logger';
import { AppError, NotFoundError, ValidationError } from '@utils/errors';
import { Op } from 'sequelize';

export class GrainController {
  /**
   * Get all grains with filtering and pagination
   */
  async getGrains(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        category,
        mill_id,
        available_only = 'true',
        min_price,
        max_price,
        search,
        page = '1',
        limit = '10',
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = req.query;

      // Build where clause
      const whereClause: any = {};

      // Filter by category
      if (category) {
        whereClause.category = category;
      }

      // Filter by mill
      if (mill_id) {
        whereClause.mill_id = mill_id;
      } else if (!req.user || req.user.role !== UserRole.MILL) {
        // For non-mill users, show global grains and approved mill grains
        whereClause.mill_id = null;
      }

      // Filter by availability
      if (available_only === 'true') {
        whereClause.is_available = true;
      }

      // Price range filter
      if (min_price || max_price) {
        whereClause.price_per_kg = {};
        if (min_price) {
          whereClause.price_per_kg[Op.gte] = parseFloat(min_price as string);
        }
        if (max_price) {
          whereClause.price_per_kg[Op.lte] = parseFloat(max_price as string);
        }
      }

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Sorting
      const order: any = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query
      const { count, rows } = await GrainModel.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset,
        order,
        include: mill_id ? ['mill'] : [],
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      res.status(200).json({
        success: true,
        message: 'Grains retrieved successfully',
        data: {
          grains: rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages,
            hasNext,
            hasPrev,
          },
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Get grains error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve grains',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get grain by ID
   */
  async getGrainById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const grain = await GrainModel.findByPk(id, {
        include: ['mill'],
      });

      if (!grain) {
        throw new NotFoundError('Grain not found');
      }

      res.status(200).json({
        success: true,
        message: 'Grain retrieved successfully',
        data: {
          grain,
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
        logger.error('Get grain by ID error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve grain',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Create new grain
   */
  async createGrain(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const grainData = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Set mill_id based on user role
      if (userRole === UserRole.MILL) {
        grainData.mill_id = userId;
      } else if (userRole === UserRole.ADMIN) {
        // Admin can create global grains (mill_id = null) or assign to specific mills
        if (!grainData.mill_id) {
          grainData.mill_id = null;
        }
      }

      // Check for duplicate grain name for the same mill
      const existingGrain = await GrainModel.findOne({
        where: {
          name: grainData.name,
          mill_id: grainData.mill_id,
        },
      });

      if (existingGrain) {
        throw new ValidationError('Grain with this name already exists for this mill');
      }

      // Create grain
      const grain = await GrainModel.create(grainData);

      logger.info(`Grain created: ${grain.id} by user: ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Grain created successfully',
        data: {
          grain,
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
        logger.error('Create grain error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create grain',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Update grain
   */
  async updateGrain(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const grain = await GrainModel.findByPk(id);
      if (!grain) {
        throw new NotFoundError('Grain not found');
      }

      // Check permissions
      if (userRole === UserRole.MILL && grain.mill_id !== userId) {
        throw new AppError('You can only update your own grains', 403);
      }

      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name !== grain.name) {
        const existingGrain = await GrainModel.findOne({
          where: {
            name: updateData.name,
            mill_id: grain.mill_id,
            id: { [Op.ne]: id },
          },
        });

        if (existingGrain) {
          throw new ValidationError('Grain with this name already exists for this mill');
        }
      }

      // Update grain
      await grain.update(updateData);

      logger.info(`Grain updated: ${id} by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Grain updated successfully',
        data: {
          grain,
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
        logger.error('Update grain error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update grain',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Delete grain
   */
  async deleteGrain(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const grain = await GrainModel.findByPk(id);
      if (!grain) {
        throw new NotFoundError('Grain not found');
      }

      // Check permissions
      if (userRole === UserRole.MILL && grain.mill_id !== userId) {
        throw new AppError('You can only delete your own grains', 403);
      }

      // Check if grain is used in any orders (implement this check based on your business logic)
      // For now, we'll just delete the grain

      await grain.destroy();

      logger.info(`Grain deleted: ${id} by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Grain deleted successfully',
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
        logger.error('Delete grain error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete grain',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Toggle grain availability
   */
  async toggleAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const grain = await GrainModel.findByPk(id);
      if (!grain) {
        throw new NotFoundError('Grain not found');
      }

      // Check permissions
      if (userRole === UserRole.MILL && grain.mill_id !== userId) {
        throw new AppError('You can only manage your own grains', 403);
      }

      // Toggle availability
      await grain.update({ is_available: !grain.is_available });

      logger.info(`Grain availability toggled: ${id} to ${grain.is_available} by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: `Grain ${grain.is_available ? 'enabled' : 'disabled'} successfully`,
        data: {
          grain,
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
        logger.error('Toggle availability error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to toggle grain availability',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Get grain category summary
   */
  async getCategorySummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await GrainModel.getCategorySummary();

      res.status(200).json({
        success: true,
        message: 'Category summary retrieved successfully',
        data: {
          categories: summary,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Get category summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category summary',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get featured grains
   */
  async getFeaturedGrains(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const grains = await GrainModel.getFeaturedGrains(limit);

      res.status(200).json({
        success: true,
        message: 'Featured grains retrieved successfully',
        data: {
          grains,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Get featured grains error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve featured grains',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get popular grains
   */
  async getPopularGrains(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const grains = await GrainModel.getPopularGrains(limit);

      res.status(200).json({
        success: true,
        message: 'Popular grains retrieved successfully',
        data: {
          grains,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Get popular grains error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular grains',
        timestamp: new Date(),
      });
    }
  }
}