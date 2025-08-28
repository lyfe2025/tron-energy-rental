/**
 * 测试系统设置保存功能
 * 验证各个设置模块的保存是否正常工作
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testSettingsSave() {
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
    
    // 2. 测试获取安全设置
    console.log('\n🔒 测试获取安全设置...');
    const securityResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=security&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (securityResponse.data.success) {
      console.log(`✅ 获取安全设置成功，共 ${securityResponse.data.data.configs.length} 项配置`);
      securityResponse.data.data.configs.forEach(config => {
        console.log(`   - ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });
    } else {
      console.log('❌ 获取安全设置失败:', securityResponse.data.message);
    }
    
    // 3. 测试获取通知设置
    console.log('\n🔔 测试获取通知设置...');
    const notificationResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=notification&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (notificationResponse.data.success) {
      console.log(`✅ 获取通知设置成功，共 ${notificationResponse.data.data.configs.length} 项配置`);
      notificationResponse.data.data.configs.forEach(config => {
        console.log(`   - ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });
    } else {
      console.log('❌ 获取通知设置失败:', notificationResponse.data.message);
    }
    
    // 4. 测试获取定价设置
    console.log('\n💰 测试获取定价设置...');
    const pricingResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=pricing&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (pricingResponse.data.success) {
      console.log(`✅ 获取定价设置成功，共 ${pricingResponse.data.data.configs.length} 项配置`);
      pricingResponse.data.data.configs.forEach(config => {
        console.log(`   - ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });
    } else {
      console.log('❌ 获取定价设置失败:', pricingResponse.data.message);
    }
    
    // 5. 测试获取高级设置
    console.log('\n⚙️ 测试获取高级设置...');
    const featuresResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=features&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (featuresResponse.data.success) {
      console.log(`✅ 获取功能设置成功，共 ${featuresResponse.data.data.configs.length} 项配置`);
      featuresResponse.data.data.configs.forEach(config => {
        console.log(`   - ${config.config_key}: ${config.config_value} (${config.config_type})`);
      });
    } else {
      console.log('❌ 获取功能设置失败:', featuresResponse.data.message);
    }
    
    // 6. 测试批量更新配置
    console.log('\n💾 测试批量更新配置...');
    const testConfigs = [
      {
        config_key: 'security.session_timeout',
        config_value: '45'
      },
      {
        config_key: 'notification.email_enabled',
        config_value: 'false'
      },
      {
        config_key: 'pricing.energy_base_price',
        config_value: '0.12'
      }
    ];
    
    const updateResponse = await axios.put(`${API_BASE_URL}/api/system-configs/batch/update`, {
      configs: testConfigs,
      change_reason: '测试设置保存功能'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (updateResponse.data.success) {
      console.log('✅ 批量更新配置成功');
      console.log('   更新结果:', updateResponse.data.data);
    } else {
      console.log('❌ 批量更新配置失败:', updateResponse.data.message);
    }
    
    // 7. 验证更新后的配置
    console.log('\n🔍 验证更新后的配置...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=security&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (verifyResponse.data.success) {
      const sessionTimeout = verifyResponse.data.data.configs.find(c => c.config_key === 'security.session_timeout');
      if (sessionTimeout) {
        console.log(`✅ 验证成功: security.session_timeout = ${sessionTimeout.config_value}`);
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
testSettingsSave();
