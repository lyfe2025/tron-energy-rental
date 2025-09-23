import dotenv from 'dotenv';
import { Client } from 'pg';

// 加载环境变量
dotenv.config();

const createDatabase = async (): Promise<void> => {
  // 连接到默认的postgres数据库来创建新数据库
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'db_tron_admin',
    password: process.env.DB_PASSWORD || 'AZDTswBsRbhTpbAm',
    database: 'postgres', // 连接到默认数据库
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    const dbName = process.env.DB_NAME || 'tron_energy';
    
    // 检查数据库是否已存在
    const checkDbQuery = 'SELECT 1 FROM pg_database WHERE datname = $1';
    const result = await client.query(checkDbQuery, [dbName]);
    
    if (result.rows.length > 0) {
      console.log(`Database '${dbName}' already exists`);
    } else {
      // 创建数据库
      const createDbQuery = `CREATE DATABASE "${dbName}"`;
      await client.query(createDbQuery);
      console.log(`Database '${dbName}' created successfully`);
    }
    
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await client.end();
  }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

export { createDatabase };
