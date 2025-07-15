import { Sequelize } from 'sequelize';
import database from '@config/database';

// Import all models
import { UserModel } from './User';
import { AddressModel } from './Address';
import { GrainModel } from './Grain';
import { GrindingOptionModel } from './GrindingOption';
import { CustomProductModel } from './CustomProduct';
import { OrderModel } from './Order';
import { OrderItemModel } from './OrderItem';
import { TrackingInfoModel } from './TrackingInfo';
import { PaymentInfoModel } from './PaymentInfo';
import { SubscriptionModel } from './Subscription';
import { NotificationModel } from './Notification';

// Initialize models object
const models = {
  User: UserModel,
  Address: AddressModel,
  Grain: GrainModel,
  GrindingOption: GrindingOptionModel,
  CustomProduct: CustomProductModel,
  Order: OrderModel,
  OrderItem: OrderItemModel,
  TrackingInfo: TrackingInfoModel,
  PaymentInfo: PaymentInfoModel,
  Subscription: SubscriptionModel,
  Notification: NotificationModel,
  sequelize: database.sequelize,
  Sequelize,
};

// Set up associations
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export default models;
export {
  UserModel,
  AddressModel,
  GrainModel,
  GrindingOptionModel,
  CustomProductModel,
  OrderModel,
  OrderItemModel,
  TrackingInfoModel,
  PaymentInfoModel,
  SubscriptionModel,
  NotificationModel,
};