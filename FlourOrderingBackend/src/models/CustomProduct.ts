import { DataTypes, Model } from 'sequelize';
import database from '@config/database';

export class CustomProductModel extends Model {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CustomProductModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize: database.sequelize,
  tableName: 'custom_products',
  modelName: 'CustomProduct',
});

export default CustomProductModel;