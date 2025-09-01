import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';

// 读取环境变量
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', JWT_SECRET ? 'Found' : 'Not found');

// 生成一个测试token
const testPayload = {
  id: 1,
  email: 'admin@tronrental.com',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时后过期
};

if (JWT_SECRET) {
  try {
    const token = jwt.sign(testPayload, JWT_SECRET);
    console.log('Generated test token:', token);
    
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verification successful:', decoded);
    
    // 测试API调用
    const curlCommand = `curl -s -X GET http://localhost:3001/api/monitoring/overview -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`;
    
    console.log('\nTesting API call...');
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('API call error:', error);
        return;
      }
      if (stderr) {
        console.error('API call stderr:', stderr);
        return;
      }
      console.log('API response:', stdout);
    });
    
  } catch (error) {
    console.error('Token generation/verification failed:', error);
  }
} else {
  console.error('JWT_SECRET not found in environment variables');
}