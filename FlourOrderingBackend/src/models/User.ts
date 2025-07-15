import { DataTypes, Model, Optional } from 'sequelize';
import database from '@config/database';
import { User as IUser, UserRole } from '@types/index';

interface UserCreationAttributes extends Optional<IUser, 'id' | 'created_at' | 'updated_at'> {}

export class UserModel extends Model<IUser, UserCreationAttributes> implements IUser {
  public id!: string;
  public firebase_uid!: string;
  public email!: string;
  public phone!: string;
  public name!: string;
  public role!: UserRole;
  public is_verified!: boolean;
  public profile_image?: string;
  public is_active!: boolean;
  public last_login?: Date;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public static associate(models: any) {
    // User has many addresses
    UserModel.hasMany(models.AddressModel, {
      foreignKey: 'user_id',
      as: 'addresses',
      onDelete: 'CASCADE',
    });

    // User has many orders (as customer)
    UserModel.hasMany(models.OrderModel, {
      foreignKey: 'customer_id',
      as: 'customer_orders',
      onDelete: 'RESTRICT',
    });

    // User has many orders (as mill)
    UserModel.hasMany(models.OrderModel, {
      foreignKey: 'mill_id',
      as: 'mill_orders',
      onDelete: 'RESTRICT',
    });

    // User has many orders (as delivery partner)
    UserModel.hasMany(models.OrderModel, {
      foreignKey: 'delivery_partner_id',
      as: 'delivery_orders',
      onDelete: 'RESTRICT',
    });

    // User has many subscriptions
    UserModel.hasMany(models.SubscriptionModel, {
      foreignKey: 'customer_id',
      as: 'subscriptions',
      onDelete: 'CASCADE',
    });

    // User has many custom products
    UserModel.hasMany(models.CustomProductModel, {
      foreignKey: 'user_id',
      as: 'custom_products',
      onDelete: 'CASCADE',
    });

    // User has many notifications
    UserModel.hasMany(models.NotificationModel, {
      foreignKey: 'user_id',
      as: 'notifications',
      onDelete: 'CASCADE',
    });

    // User has many grains (if mill)
    UserModel.hasMany(models.GrainModel, {
      foreignKey: 'mill_id',
      as: 'grains',
      onDelete: 'CASCADE',
    });

    // User has many grinding options (if mill)
    UserModel.hasMany(models.GrindingOptionModel, {
      foreignKey: 'mill_id',
      as: 'grinding_options',
      onDelete: 'CASCADE',
    });
  }
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firebase_uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 128],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
        len: [5, 255],
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 15],
        isNumeric: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CUSTOMER,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    profile_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    paranoid: false, // Don't use soft deletes for users
    indexes: [
      {
        unique: true,
        fields: ['firebase_uid'],
      },
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['phone'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['is_verified'],
      },
      {
        fields: ['created_at'],
      },
    ],
    hooks: {
      beforeCreate: (user: UserModel) => {
        // Normalize email to lowercase
        user.email = user.email.toLowerCase().trim();
        
        // Normalize phone number (remove spaces and special characters)
        user.phone = user.phone.replace(/[^\d]/g, '');
        
        // Capitalize name
        user.name = user.name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      },
      beforeUpdate: (user: UserModel) => {
        if (user.changed('email')) {
          user.email = user.email.toLowerCase().trim();
        }
        
        if (user.changed('phone')) {
          user.phone = user.phone.replace(/[^\d]/g, '');
        }
        
        if (user.changed('name')) {
          user.name = user.name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
      },
    },
    scopes: {
      active: {
        where: {
          is_active: true,
        },
      },
      verified: {
        where: {
          is_verified: true,
        },
      },
      customer: {
        where: {
          role: UserRole.CUSTOMER,
        },
      },
      mill: {
        where: {
          role: UserRole.MILL,
        },
      },
      delivery: {
        where: {
          role: UserRole.DELIVERY,
        },
      },
      admin: {
        where: {
          role: UserRole.ADMIN,
        },
      },
      withoutSensitiveData: {
        attributes: {
          exclude: ['firebase_uid'],
        },
      },
    },
  }
);

// Instance methods
UserModel.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Remove sensitive data from JSON response
  delete values.firebase_uid;
  
  return values;
};

UserModel.prototype.isCustomer = function(): boolean {
  return this.role === UserRole.CUSTOMER;
};

UserModel.prototype.isMill = function(): boolean {
  return this.role === UserRole.MILL;
};

UserModel.prototype.isDelivery = function(): boolean {
  return this.role === UserRole.DELIVERY;
};

UserModel.prototype.isAdmin = function(): boolean {
  return this.role === UserRole.ADMIN;
};

UserModel.prototype.canAccessResource = function(resourceUserId: string): boolean {
  return this.isAdmin() || this.id === resourceUserId;
};

// Static methods
UserModel.findByFirebaseUid = function(firebaseUid: string) {
  return this.findOne({
    where: { firebase_uid: firebaseUid },
  });
};

UserModel.findByEmail = function(email: string) {
  return this.findOne({
    where: { email: email.toLowerCase().trim() },
  });
};

UserModel.findByPhone = function(phone: string) {
  return this.findOne({
    where: { phone: phone.replace(/[^\d]/g, '') },
  });
};

UserModel.findActiveUsers = function(options: any = {}) {
  return this.scope('active').findAll(options);
};

UserModel.findVerifiedUsers = function(options: any = {}) {
  return this.scope('verified').findAll(options);
};

UserModel.findByRole = function(role: UserRole, options: any = {}) {
  return this.findAll({
    where: { role },
    ...options,
  });
};

UserModel.findNearbyMills = function(latitude: number, longitude: number, radius: number = 10) {
  // This would require PostGIS extension for actual distance calculation
  // For now, we'll return all mills and handle distance calculation in service layer
  return this.findAll({
    where: { 
      role: UserRole.MILL,
      is_active: true,
    },
    include: ['addresses'],
  });
};

UserModel.getUserStats = async function() {
  const stats = await this.findAll({
    attributes: [
      'role',
      [database.sequelize.fn('COUNT', database.sequelize.col('id')), 'count'],
    ],
    group: ['role'],
    raw: true,
  });

  return stats.reduce((acc: any, stat: any) => {
    acc[stat.role] = parseInt(stat.count);
    return acc;
  }, {});
};

export { UserModel };
export default UserModel;