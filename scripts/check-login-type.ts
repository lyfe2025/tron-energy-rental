import { query } from '../api/config/database.js';

async function checkLoginType() {
  try {
    const result = await query(
      'SELECT email, login_type, role, status FROM users WHERE email = $1',
      ['admin@tronrental.com']
    );
    
    if (result.rows.length > 0) {
      console.log('用户信息:', result.rows[0]);
    } else {
      console.log('未找到用户');
    }
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    process.exit(0);
  }
}

checkLoginType();