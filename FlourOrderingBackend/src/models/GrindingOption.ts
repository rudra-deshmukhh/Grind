import { DataTypes, Model, Optional } from 'sequelize';
import database from '@config/database';
import { GrindingOption as IGrindingOption } from '@types/index';

interface GrindingOptionCreationAttributes extends Optional<IGrindingOption, 'id' | 'created_at' | 'updated_at'> {}

export class GrindingOptionModel extends Model<IGrindingOption, GrindingOptionCreationAttributes> implements IGrindingOption {
  public id!: string;
  public name!: string;
  public description!: string;
  public additional_cost!: number;
  public is_custom!: boolean;
  public mill_id?: string;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associations
  public static associate(models: any) {
    GrindingOptionModel.belongsTo(models.UserModel, {
      foreignKey: 'mill_id',
      as: 'mill',
      onDelete: 'CASCADE',
    });
  }
}

GrindingOptionModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    additional_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_custom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'grinding_options',
    modelName: 'GrindingOption',
    timestamps: true,
  }
);

export { GrindingOptionModel };
export default GrindingOptionModel;