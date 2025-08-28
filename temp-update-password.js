/**
 * 临时更新管理员密码的脚本
 */
const fs = require('fs');
const path = require('path');

// 检查是否有bcrypt依赖
try {
  const bcrypt = require('bcrypt');
  const password = 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  
  console.log('生成的密码hash:', hash);
  console.log('密码:', password);
  
  // 构建SQL命令
  const sqlCommand = `UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@tronrental.com';`;
  console.log('SQL命令:');
  console.log(sqlCommand);
  
} catch (error) {
  console.log('bcrypt不可用，尝试使用已知的hash');
  
  // 使用已知有效的hash（密码为admin123的bcrypt hash）
  const knownHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
  const sqlCommand = `UPDATE users SET password_hash = '${knownHash}' WHERE email = 'admin@tronrental.com';`;
  
  console.log('使用已知hash，密码: admin123');
  console.log('SQL命令:');
  console.log(sqlCommand);
}
