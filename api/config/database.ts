import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// 创建连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tron_energy',
  user: process.env.DB_USER || 'db_tron_admin',
  password: process.env.DB_PASSWORD || 'AZDTswBsRbhTpbAm',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '30'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 连接池错误处理
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// 测试数据库连接
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// 执行查询的辅助函数
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// 获取客户端连接
export const getClient = async () => {
  return await pool.connect();
};

export default pool;