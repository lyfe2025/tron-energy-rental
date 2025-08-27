import { query } from '../api/config/database.js';
import bcrypt from 'bcryptjs';

async function updateAdminPassword() {
  try {
    const email = 'admin@tronrental.com';
    const newPassword = 'admin123456';
    
    // 生成新的密码哈希
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('正在更新管理员密码...');
    console.log('邮箱:', email);
    console.log('新密码:', newPassword);
    console.log('新哈希:', passwordHash);
    
    // 更新数据库中的密码
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [passwordHash, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ 密码更新成功!');
      
      // 验证更新后的密码
      const verifyResult = await query(
        'SELECT password_hash FROM users WHERE email = $1',
        [email]
      );
      
      const isValid = await bcrypt.compare(newPassword, verifyResult.rows[0].password_hash);
      console.log('✅ 密码验证结果:', isValid);
    } else {
      console.log('❌ 未找到用户或更新失败');
    }
  } catch (error) {
    console.error('❌ 更新密码错误:', error);
  } finally {
    process.exit(0);
  }
}

updateAdminPassword();