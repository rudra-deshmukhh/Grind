import { DataTypes, Model } from 'sequelize';
import database from '@config/database';

export class OrderModel extends Model {
  public id!: string;
  public customer_id!: string;
  public mill_id!: string;
  public delivery_partner_id?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

OrderModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  customer_id: { type: DataTypes.UUID, allowNull: false },
  mill_id: { type: DataTypes.UUID, allowNull: false },
  delivery_partner_id: { type: DataTypes.UUID, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize: database.sequelize,
  tableName: 'orders',
  modelName: 'Order',
});

export default OrderModel;