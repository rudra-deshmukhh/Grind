import { DataTypes, Model } from 'sequelize';
import database from '@config/database';

export class OrderItemModel extends Model {
  public id!: string;
  public order_id!: string;
  public grain_id?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

OrderItemModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  order_id: { type: DataTypes.UUID, allowNull: false },
  grain_id: { type: DataTypes.UUID, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize: database.sequelize,
  tableName: 'order_items',
  modelName: 'OrderItem',
});

export default OrderItemModel;