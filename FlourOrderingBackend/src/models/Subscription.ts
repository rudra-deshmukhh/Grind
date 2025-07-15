import { DataTypes, Model } from 'sequelize';
import database from '@config/database';

export class SubscriptionModel extends Model {
  public id!: string;
  public customer_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

SubscriptionModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  customer_id: { type: DataTypes.UUID, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize: database.sequelize,
  tableName: 'subscriptions',
  modelName: 'Subscription',
});

export default SubscriptionModel;