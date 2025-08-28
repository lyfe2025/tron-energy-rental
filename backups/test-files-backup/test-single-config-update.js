/**
 * 测试单个配置更新功能
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testSingleConfigUpdate() {
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
    
    // 更新会话超时时间
    const updateResponse = await axios.put(`${API_BASE_URL}/api/system-configs/security.session_timeout`, {
      config_value: '45',
      change_reason: '测试单个配置更新'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (updateResponse.data.success) {
      console.log('✅ 单个配置更新成功');
      console.log('   更新结果:', updateResponse.data.data);
    } else {
      console.log('❌ 单个配置更新失败:', updateResponse.data.message);
    }
    
    // 3. 验证更新后的配置
    console.log('\n🔍 验证更新后的配置...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/system-configs/security.session_timeout`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (verifyResponse.data.success) {
      console.log(`✅ 验证成功: security.session_timeout = ${verifyResponse.data.data.config_value}`);
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
testSingleConfigUpdate();
