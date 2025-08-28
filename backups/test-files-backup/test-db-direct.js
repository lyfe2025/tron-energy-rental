/**
 * 直接测试数据库查询
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testDbDirect() {
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
    
    // 2. 测试直接查询配置
    console.log('\n🔍 测试直接查询配置...');
    
    // 使用系统配置API直接查询
    const response = await axios.get(`${API_BASE_URL}/api/system-configs?category=security&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log(`✅ 获取安全配置成功，共 ${response.data.data.configs.length} 项`);
      
      // 查找特定的配置项
      const sessionTimeout = response.data.data.configs.find(c => c.config_key === 'security.session_timeout');
      if (sessionTimeout) {
        console.log(`✅ 找到配置: security.session_timeout = ${sessionTimeout.config_value}`);
        console.log(`配置详情:`, {
          id: sessionTimeout.id,
          config_key: sessionTimeout.config_key,
          config_value: sessionTimeout.config_value,
          config_type: sessionTimeout.config_type,
          is_editable: sessionTimeout.is_editable
        });
      } else {
        console.log('❌ 未找到 security.session_timeout 配置');
      }
      
      // 显示所有配置项
      console.log('\n所有安全配置:');
      response.data.data.configs.forEach(config => {
        console.log(`  - ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });
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
testDbDirect();
