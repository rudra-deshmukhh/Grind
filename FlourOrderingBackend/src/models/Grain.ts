import { DataTypes, Model, Optional } from 'sequelize';
import database from '@config/database';
import { Grain as IGrain, GrainCategory } from '@types/index';

interface GrainCreationAttributes extends Optional<IGrain, 'id' | 'created_at' | 'updated_at'> {}

export class GrainModel extends Model<IGrain, GrainCreationAttributes> implements IGrain {
  public id!: string;
  public name!: string;
  public description!: string;
  public category!: GrainCategory;
  public price_per_kg!: number;
  public image_url?: string;
  public is_available!: boolean;
  public nutritional_info?: {
    protein: number;
    carbohydrates: number;
    fiber: number;
    fat: number;
    calories: number;
    vitamins?: string[];
    minerals?: string[];
  };
  public mill_id?: string;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public static associate(models: any) {
    GrainModel.belongsTo(models.UserModel, {
      foreignKey: 'mill_id',
      as: 'mill',
      onDelete: 'CASCADE',
    });

    GrainModel.hasMany(models.OrderItemModel, {
      foreignKey: 'grain_id',
      as: 'order_items',
      onDelete: 'RESTRICT',
    });

    GrainModel.hasMany(models.CustomProductModel, {
      foreignKey: 'grain_id',
      as: 'custom_products',
      onDelete: 'RESTRICT',
    });
  }
}

GrainModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 1000],
      },
    },
    category: {
      type: DataTypes.ENUM(...Object.values(GrainCategory)),
      allowNull: false,
    },
    price_per_kg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 10000,
      },
    },
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    nutritional_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidNutrition(value: any) {
          if (value && typeof value === 'object') {
            const required = ['protein', 'carbohydrates', 'fiber', 'fat', 'calories'];
            for (const field of required) {
              if (typeof value[field] !== 'number' || value[field] < 0) {
                throw new Error(`${field} must be a non-negative number`);
              }
            }
          }
        },
      },
    },
    mill_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database.sequelize,
    tableName: 'grains',
    modelName: 'Grain',
    timestamps: true,
    indexes: [
      {
        fields: ['category'],
      },
      {
        fields: ['mill_id'],
      },
      {
        fields: ['is_available'],
      },
      {
        fields: ['price_per_kg'],
      },
      {
        fields: ['name'],
      },
      {
        unique: true,
        fields: ['name', 'mill_id'],
        name: 'unique_grain_per_mill',
      },
    ],
    scopes: {
      available: {
        where: {
          is_available: true,
        },
      },
      byCategory: (category: GrainCategory) => ({
        where: {
          category,
        },
      }),
      byMill: (millId: string) => ({
        where: {
          mill_id: millId,
        },
      }),
      global: {
        where: {
          mill_id: null,
        },
      },
      priceRange: (min: number, max: number) => ({
        where: {
          price_per_kg: {
            [database.sequelize.Op.between]: [min, max],
          },
        },
      }),
    },
  }
);

// Instance methods
GrainModel.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

GrainModel.prototype.getFormattedPrice = function(): string {
  return `₹${parseFloat(this.price_per_kg.toString()).toFixed(2)}/kg`;
};

GrainModel.prototype.isInStock = function(): boolean {
  return this.is_available;
};

GrainModel.prototype.getNutritionSummary = function(): string {
  if (!this.nutritional_info) return 'Nutrition information not available';
  
  const { protein, carbohydrates, fiber, calories } = this.nutritional_info;
  return `Protein: ${protein}g, Carbs: ${carbohydrates}g, Fiber: ${fiber}g, Calories: ${calories} per 100g`;
};

// Static methods
GrainModel.findAvailable = function() {
  return this.scope('available').findAll({
    order: [['name', 'ASC']],
  });
};

GrainModel.findByCategory = function(category: GrainCategory) {
  return this.scope({ method: ['byCategory', category] }).findAll({
    where: { is_available: true },
    order: [['name', 'ASC']],
  });
};

GrainModel.findByMill = function(millId: string) {
  return this.scope({ method: ['byMill', millId] }).findAll({
    order: [['name', 'ASC']],
  });
};

GrainModel.findGlobalGrains = function() {
  return this.scope('global').findAll({
    where: { is_available: true },
    order: [['category', 'ASC'], ['name', 'ASC']],
  });
};

GrainModel.findByPriceRange = function(min: number, max: number) {
  return this.scope({ method: ['priceRange', min, max] }).findAll({
    where: { is_available: true },
    order: [['price_per_kg', 'ASC']],
  });
};

GrainModel.searchByName = function(searchTerm: string) {
  return this.findAll({
    where: {
      name: {
        [database.sequelize.Op.iLike]: `%${searchTerm}%`,
      },
      is_available: true,
    },
    order: [['name', 'ASC']],
  });
};

GrainModel.getFeaturedGrains = function(limit: number = 10) {
  return this.findAll({
    where: {
      is_available: true,
      mill_id: null, // Global grains only
    },
    order: [['created_at', 'DESC']],
    limit,
  });
};

GrainModel.getPopularGrains = async function(limit: number = 10) {
  // This would require order statistics
  // For now, we'll return recently added grains
  return this.findAll({
    where: {
      is_available: true,
    },
    order: [['created_at', 'DESC']],
    limit,
  });
};

GrainModel.getCategorySummary = async function() {
  const summary = await this.findAll({
    attributes: [
      'category',
      [database.sequelize.fn('COUNT', database.sequelize.col('id')), 'count'],
      [database.sequelize.fn('AVG', database.sequelize.col('price_per_kg')), 'avg_price'],
      [database.sequelize.fn('MIN', database.sequelize.col('price_per_kg')), 'min_price'],
      [database.sequelize.fn('MAX', database.sequelize.col('price_per_kg')), 'max_price'],
    ],
    where: {
      is_available: true,
    },
    group: ['category'],
    raw: true,
  });

  return summary.map((item: any) => ({
    category: item.category,
    count: parseInt(item.count),
    avgPrice: parseFloat(item.avg_price),
    minPrice: parseFloat(item.min_price),
    maxPrice: parseFloat(item.max_price),
  }));
};

export { GrainModel };
export default GrainModel;