/**
 * 测试前端设置保存功能
 * 验证各个设置组件的保存按钮是否正常工作
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

async function testFrontendSave() {
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
    
    // 2. 测试获取所有设置配置
    console.log('\n🔍 测试获取所有设置配置...');
    
    const categories = ['system', 'security', 'notification', 'pricing', 'cache', 'logging', 'api', 'features'];
    const allConfigs = [];
    
    for (const category of categories) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/system-configs?category=${category}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.data?.configs) {
          allConfigs.push(...response.data.data.configs);
          console.log(`✅ 获取 ${category} 配置成功，共 ${response.data.data.configs.length} 项`);
        }
      } catch (error) {
        console.log(`❌ 获取 ${category} 配置失败:`, error.message);
      }
    }
    
    console.log(`\n📊 总共获取到 ${allConfigs.length} 项配置`);
    
    // 3. 测试批量更新配置（使用正确的配置键）
    console.log('\n💾 测试批量更新配置...');
    
    // 选择一些确实存在的配置项进行测试
    const testConfigs = allConfigs.slice(0, 3).map(config => ({
      config_key: config.config_key,
      config_value: config.config_value === 'true' ? 'false' : 
                   config.config_value === 'false' ? 'true' : 
                   config.config_value === '30' ? '45' : 
                   config.config_value === '0.1' ? '0.12' : config.config_value
    }));
    
    console.log('测试配置项:', testConfigs);
    
    const updateResponse = await axios.put(`${API_BASE_URL}/api/system-configs/batch/update`, {
      configs: testConfigs,
      change_reason: '测试前端设置保存功能'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (updateResponse.data.success) {
      console.log('✅ 批量更新配置成功');
      console.log('   更新结果:', updateResponse.data.data);
    } else {
      console.log('❌ 批量更新配置失败:', updateResponse.data.message);
    }
    
    // 4. 验证更新后的配置
    console.log('\n🔍 验证更新后的配置...');
    for (const testConfig of testConfigs) {
      try {
        const verifyResponse = await axios.get(`${API_BASE_URL}/api/system-configs?category=${testConfig.config_key.split('.')[0]}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (verifyResponse.data.success) {
          const updatedConfig = verifyResponse.data.data.configs.find(c => c.config_key === testConfig.config_key);
          if (updatedConfig) {
            console.log(`✅ ${testConfig.config_key}: ${updatedConfig.config_value}`);
          }
        }
      } catch (error) {
        console.log(`❌ 验证 ${testConfig.config_key} 失败:`, error.message);
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
testFrontendSave();
