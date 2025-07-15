import { DataTypes, Model } from 'sequelize';
import database from '@config/database';

export class TrackingInfoModel extends Model {
  public id!: string;
  public order_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TrackingInfoModel.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  order_id: { type: DataTypes.UUID, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize: database.sequelize,
  tableName: 'tracking_info',
  modelName: 'TrackingInfo',
});

export default TrackingInfoModel;