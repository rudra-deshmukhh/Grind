import { Sequelize } from 'sequelize';
import { config } from './index';
import logger from '@utils/logger';

class Database {
  public sequelize: Sequelize;

  constructor() {
    this.sequelize = new Sequelize({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: config.database.user,
      password: config.database.password,
      dialect: 'postgres',
      dialectOptions: {
        ssl: config.database.ssl ? {
          require: true,
          rejectUnauthorized: false
        } : false,
      },
      logging: (msg) => logger.debug(msg),
      pool: {
        max: 20,
        min: 0,
        acquire: 60000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
      timezone: '+00:00',
    });
  }

  async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.sequelize.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  async sync(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    try {
      await this.sequelize.sync(options);
      logger.info('Database synchronized successfully');
    } catch (error) {
      logger.error('Error synchronizing database:', error);
      throw error;
    }
  }
}

const database = new Database();
export default database;
export { Sequelize } from 'sequelize';