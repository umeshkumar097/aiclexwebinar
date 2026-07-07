import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env for CLI usage (typeorm migration:run, etc.)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  database: process.env['DB_NAME'] ?? 'zonvo_dev',
  username: process.env['DB_USER'] ?? 'zonvo',
  password: process.env['DB_PASSWORD'] ?? '',
  ssl: process.env['DB_SSL'] === 'true',
  entities: [path.resolve(__dirname, '../modules/**/*.entity.{ts,js}')],
  migrations: [path.resolve(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
