import { DataTypes, Model, Optional } from 'sequelize';
import database from '@config/database';
import { Address as IAddress } from '@types/index';

interface AddressCreationAttributes extends Optional<IAddress, 'id' | 'created_at' | 'updated_at'> {}

export class AddressModel extends Model<IAddress, AddressCreationAttributes> implements IAddress {
  public id!: string;
  public user_id!: string;
  public label!: string;
  public street!: string;
  public city!: string;
  public state!: string;
  public pincode!: string;
  public landmark?: string;
  public location!: { latitude: number; longitude: number; address?: string; city?: string; state?: string; pincode?: string; landmark?: string; };
  public is_default!: boolean;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public static associate(models: any) {
    AddressModel.belongsTo(models.UserModel, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    AddressModel.hasMany(models.OrderModel, {
      foreignKey: 'delivery_address_id',
      as: 'orders',
      onDelete: 'RESTRICT',
    });

    AddressModel.hasMany(models.SubscriptionModel, {
      foreignKey: 'delivery_address_id',
      as: 'subscriptions',
      onDelete: 'RESTRICT',
    });
  }
}

AddressModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    street: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 10],
        isNumeric: true,
      },
    },
    landmark: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidLocation(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Location must be an object');
          }
          if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
            throw new Error('Location must have valid latitude and longitude');
          }
          if (value.latitude < -90 || value.latitude > 90) {
            throw new Error('Latitude must be between -90 and 90');
          }
          if (value.longitude < -180 || value.longitude > 180) {
            throw new Error('Longitude must be between -180 and 180');
          }
        },
      },
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'addresses',
    modelName: 'Address',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['city'],
      },
      {
        fields: ['pincode'],
      },
      {
        fields: ['is_default'],
      },
      {
        unique: true,
        fields: ['user_id', 'is_default'],
        where: {
          is_default: true,
        },
        name: 'unique_default_address_per_user',
      },
    ],
    hooks: {
      beforeCreate: async (address: AddressModel, options) => {
        // If this is set as default, unset other default addresses for this user
        if (address.is_default) {
          await AddressModel.update(
            { is_default: false },
            {
              where: {
                user_id: address.user_id,
                is_default: true,
              },
              transaction: options.transaction,
            }
          );
        }
      },
      beforeUpdate: async (address: AddressModel, options) => {
        // If this is being set as default, unset other default addresses for this user
        if (address.changed('is_default') && address.is_default) {
          await AddressModel.update(
            { is_default: false },
            {
              where: {
                user_id: address.user_id,
                is_default: true,
                id: { [database.sequelize.Op.ne]: address.id },
              },
              transaction: options.transaction,
            }
          );
        }
      },
    },
    scopes: {
      byUser: (userId: string) => ({
        where: {
          user_id: userId,
        },
      }),
      default: {
        where: {
          is_default: true,
        },
      },
      byCity: (city: string) => ({
        where: {
          city: {
            [database.sequelize.Op.iLike]: `%${city}%`,
          },
        },
      }),
      byPincode: (pincode: string) => ({
        where: {
          pincode,
        },
      }),
    },
  }
);

// Instance methods
AddressModel.prototype.toJSON = function() {
  const values = { ...this.get() };
  return values;
};

AddressModel.prototype.getFullAddress = function(): string {
  return `${this.street}, ${this.landmark ? this.landmark + ', ' : ''}${this.city}, ${this.state} - ${this.pincode}`;
};

AddressModel.prototype.getDistance = function(latitude: number, longitude: number): number {
  // Calculate distance using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(latitude - this.location.latitude);
  const dLon = this.toRadians(longitude - this.location.longitude);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.toRadians(this.location.latitude)) * Math.cos(this.toRadians(latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

AddressModel.prototype.toRadians = function(degrees: number): number {
  return degrees * (Math.PI/180);
};

// Static methods
AddressModel.findByUser = function(userId: string) {
  return this.scope({ method: ['byUser', userId] }).findAll({
    order: [['is_default', 'DESC'], ['created_at', 'DESC']],
  });
};

AddressModel.findDefaultByUser = function(userId: string) {
  return this.findOne({
    where: {
      user_id: userId,
      is_default: true,
    },
  });
};

AddressModel.findByPincode = function(pincode: string) {
  return this.scope({ method: ['byPincode', pincode] }).findAll();
};

AddressModel.findByCity = function(city: string) {
  return this.scope({ method: ['byCity', city] }).findAll();
};

AddressModel.findNearby = function(latitude: number, longitude: number, radiusKm: number = 10) {
  // This would require PostGIS for efficient geospatial queries
  // For now, we'll use a simple bounding box approach
  const latDelta = radiusKm / 111; // Approximate km to degree conversion
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  return this.findAll({
    where: database.sequelize.literal(`
      location->>'latitude' BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
      AND location->>'longitude' BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}
    `),
  });
};

export { AddressModel };
export default AddressModel;