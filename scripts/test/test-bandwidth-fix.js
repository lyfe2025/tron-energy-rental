/**
 * 测试带宽修复脚本
 * 验证修复后的带宽显示是否正常
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// 测试地址和网络ID（根据实际情况调整）
const TEST_ADDRESS = 'TUEZSdKsoDHQMeZwihtdoBiN46zP4B3CjQ'; // 测试地址
const TEST_NETWORK_ID = '30d89cda-8a6d-4825-968a-926d5c1f1b2e'; // 测试网络ID

async function testBandwidthFix() {
  console.log('🧪 [BandwidthTest] 开始测试带宽修复功能...\n');

  try {
    // 1. 测试API登录
    console.log('1. 测试登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@tronrental.com',
      password: 'admin123456'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败');
    }
    
    const token = loginResponse.data.data.access_token;
    console.log('✅ 登录成功\n');

    // 2. 测试TRON地址验证API - 这个API会返回实时的带宽数据
    console.log('2. 测试TRON地址验证（获取带宽数据）...');
    const validateResponse = await axios.post(
      `${API_BASE}/energy-pool/pool-operations/accounts/validate-address`,
      {
        address: TEST_ADDRESS,
        private_key: '', // 空私钥，只获取账户信息
        network_id: TEST_NETWORK_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📊 API响应状态:', validateResponse.data.success);
    
    if (validateResponse.data.success && validateResponse.data.data) {
      const data = validateResponse.data.data;
      
      console.log('📈 带宽数据详情:');
      console.log(`  - 理论总带宽: ${data.bandwidth.total.toLocaleString()}`);
      console.log(`  - 质押获得: ${(data.bandwidth.limit || 0).toLocaleString()}`);
      console.log(`  - 实际可用: ${data.bandwidth.available.toLocaleString()}`);
      console.log(`  - 总已使用: ${(data.bandwidth.used || 0).toLocaleString()}`);
      
      if (data.bandwidth.freeUsed !== undefined) {
        console.log(`  - 免费带宽已使用: ${data.bandwidth.freeUsed.toLocaleString()}`);
        console.log(`  - 质押带宽已使用: ${(data.bandwidth.stakedUsed || 0).toLocaleString()}`);
      }
      
      console.log(`  - 代理给他人: ${Math.floor(((data.bandwidth.delegatedOut || 0) / 1000000) * 1000).toLocaleString()}`);
      console.log(`  - 从他人获得: ${Math.floor(((data.bandwidth.delegatedIn || 0) / 1000000) * 1000).toLocaleString()}`);

      // 验证修复
      console.log('\n🔍 修复验证:');
      if ((data.bandwidth.used || 0) > 0) {
        console.log('✅ 成功！现在可以正确显示已使用带宽');
      } else {
        console.log('⚠️  警告: 已使用带宽仍为0，可能账户确实未使用带宽，或需要进一步调试');
      }
      
      if (data.bandwidth.freeUsed !== undefined) {
        console.log('✅ 成功！新增调试信息字段已生效');
      } else {
        console.log('❌ 调试信息字段未返回，可能需要检查后端代码');
      }

      console.log('\n📋 完整数据结构:');
      console.log(JSON.stringify(data.bandwidth, null, 2));

    } else {
      console.error('❌ API调用失败:', validateResponse.data.message);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:');
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  错误信息:', error.response.data?.message || error.response.data);
    } else {
      console.error('  错误详情:', error.message);
    }
  }
}

// 等待服务启动后再执行测试
console.log('⏳ 等待服务启动中...');
setTimeout(testBandwidthFix, 10000); // 10秒后执行测试
