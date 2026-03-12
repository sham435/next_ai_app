import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const host = process.env.POSTGRES_HOST || process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432');
  const user = process.env.POSTGRES_USER || process.env.DATABASE_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
  const database = process.env.POSTGRES_DATABASE || process.env.DATABASE_NAME || 'scrape_platform';
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const options: DataSourceOptions = {
  type: 'postgres',
  url: getDatabaseUrl(),
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*.ts'],
  migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(options);

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('📦 Database connection closed');
  }
}

export async function runMigrations() {
  await initializeDatabase();
  
  try {
    const pendingMigrations = await AppDataSource.showMigrations();
    if (pendingMigrations) {
      console.log('🔄 Running pending migrations...');
      await AppDataSource.runMigrations();
      console.log('✅ Migrations completed successfully');
    } else {
      console.log('✅ Database is up to date');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
