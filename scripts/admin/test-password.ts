import bcrypt from 'bcryptjs';
import { query } from '../../api/config/database.js';

async function testPassword() {
  try {
    const result = await query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['admin@tronrental.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('用户邮箱:', user.email);
      console.log('密码哈希:', user.password_hash);
      
      // 测试密码比较
      const testPassword = 'admin123456';
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log('密码验证结果:', isValid);
      
      // 生成新的哈希值进行对比
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('新生成的哈希:', newHash);
      
      const isNewValid = await bcrypt.compare(testPassword, newHash);
      console.log('新哈希验证结果:', isNewValid);
    } else {
      console.log('未找到用户');
    }
  } catch (error) {
    console.error('测试错误:', error);
  } finally {
    process.exit(0);
  }
}

testPassword();