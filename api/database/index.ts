import { Pool } from 'pg';

// PostgreSQL连接池配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 数据库查询函数
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// 获取数据库客户端
export const getClient = async () => {
  return await pool.connect();
};

// 关闭数据库连接池
export const closePool = async () => {
  await pool.end();
};



// 数据库健康检查
export const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW()');
    return { status: 'healthy', timestamp: result.rows[0].now };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

export default pool;