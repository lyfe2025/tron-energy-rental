// 直接测试TronGrid API，验证API Key效果
async function testTronGridDirectly() {
  console.log('🔍 直接测试TronGrid API，对比有无API Key的效果...\n');
  
  const testAddress = 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy';
  const apiUrl = `https://api.trongrid.io/v1/accounts/${testAddress}`;
  
  // 测试1: 无API Key
  console.log('1️⃣ 测试无API Key的情况:');
  try {
    const start1 = Date.now();
    const response1 = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const time1 = Date.now() - start1;
    console.log(`   状态码: ${response1.status} ${response1.statusText}`);
    console.log(`   响应时间: ${time1}ms`);
    
    if (response1.headers.get('x-ratelimit-remaining')) {
      console.log(`   剩余请求数: ${response1.headers.get('x-ratelimit-remaining')}`);
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
  }
  
  console.log('');
  
  // 测试2: 有API Key（从数据库获取的）
  console.log('2️⃣ 测试有API Key的情况:');
  try {
    const start2 = Date.now();
    const response2 = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'TRON-PRO-API-KEY': 'aee91239-7b3d-417a-b964-d805cf2a830d'  // 你数据库中的API Key
      }
    });
    const time2 = Date.now() - start2;
    console.log(`   状态码: ${response2.status} ${response2.statusText}`);
    console.log(`   响应时间: ${time2}ms`);
    
    if (response2.headers.get('x-ratelimit-remaining')) {
      console.log(`   剩余请求数: ${response2.headers.get('x-ratelimit-remaining')}`);
    }
    if (response2.headers.get('x-ratelimit-limit')) {
      console.log(`   速率限制: ${response2.headers.get('x-ratelimit-limit')}`);
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
  }
  
  console.log('\n3️⃣ 快速连续请求测试（检查429错误）:');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i <= 5; i++) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'TRON-PRO-API-KEY': 'aee91239-7b3d-417a-b964-d805cf2a830d'
        }
      });
      
      if (response.status === 200) {
        successCount++;
        console.log(`   请求${i}: ✅ 成功 (${response.status})`);
      } else if (response.status === 429) {
        errorCount++;
        console.log(`   请求${i}: ❌ 429错误 - 速率限制`);
      } else {
        console.log(`   请求${i}: ⚠️  其他状态 (${response.status})`);
      }
    } catch (error) {
      errorCount++;
      console.log(`   请求${i}: ❌ 网络错误 - ${error.message}`);
    }
    
    // 短暂延迟避免过度限制
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 结果统计:`);
  console.log(`   ✅ 成功: ${successCount}/5`);
  console.log(`   ❌ 失败: ${errorCount}/5`);
  
  if (successCount === 5) {
    console.log(`   🎉 完美！API Key工作正常，没有遇到速率限制`);
  } else if (errorCount > 0) {
    console.log(`   ⚠️  遇到了一些错误，可能仍需要优化`);
  }
}

// 运行测试
testTronGridDirectly().then(() => {
  console.log('\n🏁 直接API测试完成');
});
