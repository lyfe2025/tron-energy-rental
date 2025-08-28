/**
 * 测试数据库查询
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testDbQuery() {
  try {
    console.log('🔐 正在登录...');
    
    // 1. 登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@tronrental.com',
      password: 'admin123456'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    // 2. 测试查询特定的配置项
    console.log('\n🔍 测试查询特定配置项...');
    
    const testKeys = [
      'system.auto_backup',
      'system.backup_retention_days', 
      'system.cache_expire_time',
      'security.session_timeout',
      'notification.email_enabled'
    ];
    
    for (const key of testKeys) {
      try {
        console.log(`\n查询配置: ${key}`);
        
        // 使用分类查询
        const category = key.split('.')[0];
        const response = await axios.get(`${API_BASE_URL}/api/system-configs?category=${category}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const config = response.data.data.configs.find(c => c.config_key === key);
          if (config) {
            console.log(`✅ 找到配置: ${key} = ${config.config_value} (${config.config_type})`);
          } else {
            console.log(`❌ 未找到配置: ${key}`);
          }
        }
      } catch (error) {
        console.log(`❌ 查询 ${key} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testDbQuery();
