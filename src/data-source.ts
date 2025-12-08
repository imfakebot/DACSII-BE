import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config(); // Tải các biến từ file .env

export const AppDataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false, // Rất quan trọng: Luôn là false khi dùng migration
  logging: true,
  entities: ['dist/**/*.entity{.ts,.js}'], // Trỏ đến các file entity đã được biên dịch
  migrations: ['dist/database/migrations/*{.ts,.js}'], // Trỏ đến các file migration đã được biên dịch
  migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(AppDataSourceOptions);
