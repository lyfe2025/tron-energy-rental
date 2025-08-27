import { Client } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const createDatabase = async () => {
  // 连接到默认的postgres数据库
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // 连接到默认数据库
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    const dbName = process.env.DB_NAME || 'tron_energy_rental';
    
    // 检查数据库是否已存在
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Database '${dbName}' already exists`);
    } else {
      // 创建数据库
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created successfully`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabase();
}

export default createDatabase;