/**
 * 测试简单的配置更新
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testSimpleUpdate() {
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
    
    // 2. 测试更新单个配置
    console.log('\n💾 测试更新单个配置...');
    
    // 先获取当前配置
    const getResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=security&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (getResponse.data.success) {
      const sessionTimeout = getResponse.data.data.configs.find(c => c.config_key === 'security.session_timeout');
      if (sessionTimeout) {
        console.log(`当前配置: security.session_timeout = ${sessionTimeout.config_value}`);
        
        // 尝试更新配置
        const newValue = sessionTimeout.config_value === '30' ? '45' : '30';
        console.log(`尝试更新为: ${newValue}`);
        
        // 使用批量更新API
        const updateResponse = await axios.put(`${API_BASE_URL}/api/system-configs/batch/update`, {
          configs: [{
            config_key: 'security.session_timeout',
            config_value: newValue
          }],
          change_reason: '测试单个配置更新'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (updateResponse.data.success) {
          console.log('✅ 更新成功');
          console.log('更新结果:', updateResponse.data.data);
        } else {
          console.log('❌ 更新失败:', updateResponse.data.message);
        }
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
testSimpleUpdate();
