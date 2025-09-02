import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT_SECRET:', JWT_SECRET);
console.log('JWT_SECRET length:', JWT_SECRET?.length);

// 从curl获取的实际token
const actualToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJJZCI6Ijk4MGZmM2E2LTE2MWQtNDlkNi05MzczLTQ1NGQxZTNjZjRjNCIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdHJvbnJlbnRhbC5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJsb2dpblR5cGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbImFnZW50Omxpc3QiLCJib3Q6bGlzdCIsImRhc2hib2FyZDp2aWV3IiwiZW5lcmd5OnBvb2wiLCJtb25pdG9yaW5nOmNhY2hlIiwibW9uaXRvcmluZzpkYXRhYmFzZSIsIm1vbml0b3Jpbmc6b3ZlcnZpZXciLCJtb25pdG9yaW5nOnNlcnZpY2UiLCJtb25pdG9yaW5nOnRhc2tzIiwibW9uaXRvcmluZzp1c2VycyIsIm1vbml0b3Jpbmc6dmlldyIsIm9yZGVyOmxpc3QiLCJwcmljZTpjb25maWciLCJzdGF0aXN0aWNzOnZpZXciLCJzeXN0ZW06ZGVwdDpsaXN0Iiwic3lzdGVtOmxvZzpsb2dpbjpsaXN0Iiwic3lzdGVtOmxvZzpvcGVyYXRpb246bGlzdCIsInN5c3RlbTpsb2c6dmlldyIsInN5c3RlbTptZW51Omxpc3QiLCJzeXN0ZW06cG9zaXRpb246bGlzdCIsInN5c3RlbTpyb2xlOmxpc3QiLCJzeXN0ZW06c2V0dGluZ3M6bGlzdCIsInN5c3RlbTp1c2VyOmxpc3QiLCJzeXN0ZW06dmlldyIsInVzZXI6bGlzdCJdLCJkZXBhcnRtZW50X2lkIjpudWxsLCJwb3NpdGlvbl9pZCI6bnVsbCwiaWF0IjoxNzU2ODA4MzE4LCJleHAiOjE3NTY4OTQ3MTgsImF1ZCI6InRyb24tZW5lcmd5LXJlbnRhbC11c2VycyIsImlzcyI6InRyb24tZW5lcmd5LXJlbnRhbCJ9.W1CAPqXrlGlw_tEeFFMBP2jO1hPPUPM5ORLuLNaByKM';

console.log('\n=== 验证实际Token ===');
console.log('Token length:', actualToken.length);
console.log('Token前20字符:', actualToken.substring(0, 20) + '...');

try {
  const decoded = jwt.verify(actualToken, JWT_SECRET);
  console.log('✅ 实际Token验证成功:', {
    id: decoded.id,
    role: decoded.role,
    email: decoded.email,
    iat: decoded.iat,
    exp: decoded.exp
  });
} catch (error) {
  console.log('❌ 实际Token验证失败:', error.message);
  console.log('Error details:', error);
}

console.log('\n=== 测试不同的JWT_SECRET ===');
const alternativeSecrets = [
  'your-super-secret-jwt-key-change-this-in-production',
  process.env.JWT_SECRET,
  'tron-energy-rental-super-secret-jwt-key-2024-production-ready'
];

alternativeSecrets.forEach((secret, index) => {
  console.log(`\n测试密钥 ${index + 1}: ${secret?.substring(0, 20)}...`);
  try {
    const decoded = jwt.verify(actualToken, secret);
    console.log(`✅ 密钥 ${index + 1} 验证成功`);
  } catch (error) {
    console.log(`❌ 密钥 ${index + 1} 验证失败:`, error.message);
  }
});