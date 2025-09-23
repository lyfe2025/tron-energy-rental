// 测试数据库API Key服务
import { getTronGridApiKey, getTronGridHeaders } from './api/utils/database-api-key.ts';

async function testApiKeyService() {
  console.log('🔍 测试数据库API Key服务...\n');
  
  try {
    // 测试1: 获取默认API Key
    console.log('1️⃣ 测试获取默认API Key:');
    const defaultApiKey = await getTronGridApiKey();
    console.log(`   结果: ${defaultApiKey ? `✅ ${defaultApiKey.substring(0, 8)}...` : '❌ 未获取到API Key'}\n`);

    // 测试2: 根据RPC URL获取API Key
    console.log('2️⃣ 测试根据RPC URL获取API Key:');
    const mainnetApiKey = await getTronGridApiKey('https://api.trongrid.io');
    console.log(`   主网: ${mainnetApiKey ? `✅ ${mainnetApiKey.substring(0, 8)}...` : '❌ 未获取到API Key'}`);
    
    const shastaApiKey = await getTronGridApiKey('https://api.shasta.trongrid.io');
    console.log(`   Shasta: ${shastaApiKey ? `✅ ${shastaApiKey.substring(0, 8)}...` : '❌ 未获取到API Key'}\n`);

    // 测试3: 获取TronGrid请求头
    console.log('3️⃣ 测试获取TronGrid请求头:');
    const headers = await getTronGridHeaders('https://api.trongrid.io');
    console.log(`   请求头:`, {
      'Content-Type': headers['Content-Type'],
      'TRON-PRO-API-KEY': headers['TRON-PRO-API-KEY'] ? `${headers['TRON-PRO-API-KEY'].substring(0, 8)}...` : '未设置'
    });

    // 测试4: 实际API调用
    console.log('\n4️⃣ 测试实际TronGrid API调用:');
    const response = await fetch('https://api.trongrid.io/v1/accounts/TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy', {
      headers
    });
    
    console.log(`   状态码: ${response.status} ${response.statusText}`);
    if (response.status === 200) {
      console.log('   ✅ API调用成功，API Key工作正常！');
    } else if (response.status === 429) {
      console.log('   ⚠️  仍然遇到429错误，可能需要进一步调试');
    } else if (response.status === 401) {
      console.log('   ❌ 401错误，API Key无效');
    } else {
      console.log(`   ⚠️  其他错误: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 运行测试
testApiKeyService().then(() => {
  console.log('\n🏁 测试完成');
  process.exit(0);
});
