import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function debugAuth() {
  try {
    // 1. 生成测试token
    const testPayload = {
      id: '1',
      userId: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      loginType: 'admin',
      permissions: ['energy:pool:stake']
    };
    
    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('Generated token:', token.substring(0, 50) + '...');
    
    // 2. 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully:', decoded.id, decoded.username);
    
    // 3. 测试API调用
    console.log('\nTesting API endpoints...');
    
    const endpoints = [
      '/api/energy-pool/stake/overview?poolId=1',
      '/api/energy-pool/stake/statistics?poolId=1',
      '/api/energy-pool/stake/records?poolId=1',
      '/api/energy-pool/stake/account-resources/TRX9Yg2uuS13Yy1mxmyTn5kMcELLMNapvN'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\nTesting: ${endpoint}`);
        const response = await fetch(`http://localhost:3001${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));
        
      } catch (error) {
        console.error(`Error testing ${endpoint}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugAuth();