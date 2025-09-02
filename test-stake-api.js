import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = 'http://localhost:3001';

// 生成测试token
const testPayload = {
  id: 'fb9d5e25-7a11-439e-997e-80d9c49087a3', // 使用实际存在的管理员ID
  userId: 1,
  username: 'debug_test',
  email: 'debug@test.com',
  role: 'admin',
  loginType: 'admin',
  permissions: ['energy:pool:stake'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
};

const token = jwt.sign(testPayload, JWT_SECRET);
console.log('Generated token:', token.substring(0, 50) + '...');

// 测试API端点
async function testStakeAPI() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 使用实际存在的能量池ID
    const poolId = '0c0ea0b0-1c53-4881-aae2-19928f1b1a97';
    
    // 测试质押概览
    console.log('\n1. Testing stake overview...');
    const overviewResponse = await fetch(`${BASE_URL}/api/energy-pool/stake/overview?poolId=${poolId}`, {
      headers
    });
    const overviewData = await overviewResponse.json();
    console.log('Overview response:', JSON.stringify(overviewData, null, 2));

    // 测试质押统计
    console.log('\n2. Testing stake statistics...');
    const statsResponse = await fetch(`${BASE_URL}/api/energy-pool/stake/statistics?poolId=${poolId}`, {
      headers
    });
    const statsData = await statsResponse.json();
    console.log('Statistics response:', JSON.stringify(statsData, null, 2));

    // 测试质押记录
    console.log('\n3. Testing stake records...');
    const recordsResponse = await fetch(`${BASE_URL}/api/energy-pool/stake/records?poolId=${poolId}&page=1&limit=10`, {
      headers
    });
    const recordsData = await recordsResponse.json();
    console.log('Records response:', JSON.stringify(recordsData, null, 2));

    // 测试账户资源
    console.log('\n4. Testing account resources...');
    const resourcesResponse = await fetch(`${BASE_URL}/api/energy-pool/stake/account-resources?poolId=${poolId}`, {
      headers
    });
    const resourcesData = await resourcesResponse.json();
    console.log('Resources response:', JSON.stringify(resourcesData, null, 2));

  } catch (error) {
    console.error('API test error:', error);
  }
}

testStakeAPI();