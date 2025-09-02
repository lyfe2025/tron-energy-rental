import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// 加载环境变量
dotenv.config();

console.log('=== JWT 调试信息 ===');
console.log('JWT_SECRET from env:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('JWT_SECRET first 30 chars:', process.env.JWT_SECRET?.substring(0, 30));

// 模拟登录返回的token
const actualToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODMzNjQ4LCJleHAiOjE3NTY5MjAwNDgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.pmLQdDL8b4s9zesgbatOPI2b9Iso3nWfLD9tUOsMLWs';

console.log('\n=== Token 验证测试 ===');
console.log('Token length:', actualToken.length);
console.log('Token first 50 chars:', actualToken.substring(0, 50));

try {
  // 尝试用当前环境变量中的密钥验证token
  const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
  console.log('✅ Token验证成功!');
  console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('❌ Token验证失败:', error.message);
  
  // 尝试用默认密钥验证
  const defaultSecret = 'your-super-secret-jwt-key-change-this-in-production';
  console.log('\n=== 尝试用默认密钥验证 ===');
  console.log('Default secret:', defaultSecret);
  
  try {
    const decoded = jwt.verify(actualToken, defaultSecret);
    console.log('✅ 用默认密钥验证成功!');
    console.log('这说明token是用默认密钥生成的，而不是环境变量中的密钥');
  } catch (error2) {
    console.log('❌ 用默认密钥也验证失败:', error2.message);
  }
}

// 生成一个新的token用于测试
console.log('\n=== 生成新Token测试 ===');
const testPayload = {
  id: '980ff3a6-161d-49d6-9373-454d1e3cf4c4',
  userId: '980ff3a6-161d-49d6-9373-454d1e3cf4c4',
  username: 'superadmin',
  email: 'admin@tronrental.com',
  role: 'super_admin',
  loginType: 'admin'
};

const newToken = jwt.sign(testPayload, process.env.JWT_SECRET, {
  expiresIn: '24h',
  issuer: 'tron-energy-rental',
  audience: 'tron-energy-rental-users'
});

console.log('新生成的token:', newToken.substring(0, 50) + '...');

// 验证新生成的token
try {
  const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
  console.log('✅ 新token验证成功!');
} catch (error) {
  console.log('❌ 新token验证失败:', error.message);
}