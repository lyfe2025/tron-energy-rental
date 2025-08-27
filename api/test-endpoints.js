/**
 * 简化的API端点测试脚本
 * 测试所有价格管理API端点的可访问性和基本响应
 */

const API_BASE_URL = 'http://localhost:3001/api';

// HTTP请求辅助函数
async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data: result,
      endpoint: endpoint,
      method: method
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
      endpoint: endpoint,
      method: method
    };
  }
}

// 测试端点列表
const endpoints = [
  // 价格模板API
  { method: 'GET', path: '/price-templates', name: '获取价格模板列表' },
  { method: 'POST', path: '/price-templates', name: '创建价格模板', data: { template_name: 'test' } },
  
  // 价格配置API
  { method: 'GET', path: '/price-configs', name: '获取价格配置列表' },
  { method: 'POST', path: '/price-configs', name: '创建价格配置', data: { package_id: 1, price: 100 } },
  
  // 机器人定价API
  { method: 'GET', path: '/robot-pricing', name: '获取机器人价格配置列表' },
  { method: 'POST', path: '/robot-pricing/batch', name: '批量设置机器人价格', data: { configs: [] } },
  
  // 代理商定价API
  { method: 'GET', path: '/agent-pricing', name: '获取代理商价格配置列表' },
  { method: 'GET', path: '/agent-pricing/level-stats', name: '获取代理商等级统计' },
  
  // 价格历史记录API
  { method: 'GET', path: '/price-history', name: '获取价格历史记录列表' },
  { method: 'GET', path: '/price-history/stats', name: '获取价格统计' },
  { method: 'GET', path: '/price-history/trends', name: '获取价格趋势' },
  
  // 价格搜索API
  { method: 'GET', path: '/price-search', name: '综合价格搜索' },
  { method: 'GET', path: '/price-search/filters', name: '获取筛选器选项' },
  { method: 'GET', path: '/price-search/compare', name: '价格比较分析' },
  { method: 'GET', path: '/price-search/trends', name: '价格趋势分析' }
];

// 测试结果统计
const results = {
  total: 0,
  accessible: 0,
  notFound: 0,
  serverError: 0,
  authRequired: 0,
  validationError: 0,
  details: []
};

// 运行端点测试
async function testEndpoints() {
  console.log('🚀 开始测试价格管理API端点可访问性\n');
  console.log('=' .repeat(60));
  
  for (const endpoint of endpoints) {
    results.total++;
    
    console.log(`\n🔍 测试: ${endpoint.method} ${endpoint.path}`);
    console.log(`   描述: ${endpoint.name}`);
    
    const response = await makeRequest(endpoint.method, endpoint.path, endpoint.data);
    
    let status = '';
    let icon = '';
    
    if (response.status === 0) {
      status = '连接失败';
      icon = '🔴';
      results.serverError++;
    } else if (response.status === 404) {
      status = '端点不存在';
      icon = '❌';
      results.notFound++;
    } else if (response.status === 401 || response.status === 403) {
      status = '需要认证';
      icon = '🔒';
      results.authRequired++;
    } else if (response.status === 400 || response.status === 422) {
      status = '参数验证错误';
      icon = '⚠️';
      results.validationError++;
    } else if (response.status >= 200 && response.status < 300) {
      status = '可访问';
      icon = '✅';
      results.accessible++;
    } else if (response.status >= 500) {
      status = '服务器错误';
      icon = '🔴';
      results.serverError++;
    } else {
      status = `未知状态 (${response.status})`;
      icon = '❓';
    }
    
    console.log(`   结果: ${icon} ${status} (HTTP ${response.status})`);
    
    if (response.data && response.data.message) {
      console.log(`   消息: ${response.data.message}`);
    }
    
    results.details.push({
      endpoint: `${endpoint.method} ${endpoint.path}`,
      name: endpoint.name,
      status: response.status,
      statusText: status,
      message: response.data?.message || ''
    });
  }
  
  // 输出测试汇总
  console.log('\n' + '=' .repeat(60));
  console.log('📊 端点测试汇总:');
  console.log(`📈 总端点数: ${results.total}`);
  console.log(`✅ 可访问: ${results.accessible}`);
  console.log(`🔒 需要认证: ${results.authRequired}`);
  console.log(`⚠️  参数验证错误: ${results.validationError}`);
  console.log(`❌ 端点不存在: ${results.notFound}`);
  console.log(`🔴 服务器错误: ${results.serverError}`);
  
  const healthyEndpoints = results.accessible + results.authRequired + results.validationError;
  const healthPercentage = ((healthyEndpoints / results.total) * 100).toFixed(1);
  
  console.log(`\n🏥 端点健康度: ${healthPercentage}% (${healthyEndpoints}/${results.total})`);
  
  // 详细结果表格
  console.log('\n📋 详细测试结果:');
  console.log('-'.repeat(80));
  console.log('| 端点 | 状态 | 描述 |');
  console.log('-'.repeat(80));
  
  results.details.forEach((detail, index) => {
    const endpoint = detail.endpoint.padEnd(25);
    const status = `HTTP ${detail.status}`.padEnd(10);
    const statusText = detail.statusText.padEnd(15);
    console.log(`| ${endpoint} | ${status} | ${statusText} |`);
  });
  
  console.log('-'.repeat(80));
  
  // 评估结果
  if (results.notFound > 0) {
    console.log('\n⚠️  发现不存在的端点，请检查路由配置');
  }
  
  if (results.serverError > 0) {
    console.log('\n🔴 发现服务器错误，请检查API实现');
  }
  
  if (healthyEndpoints === results.total) {
    console.log('\n🎉 所有API端点都正常响应！');
  } else {
    console.log('\n💡 提示: 认证错误和参数验证错误是正常的，说明API端点存在且能正确处理请求');
  }
  
  console.log('\n✨ 价格管理API端点测试完成！');
}

// 运行测试
if (typeof window === 'undefined') {
  testEndpoints().catch(console.error);
} else {
  console.log('请在Node.js环境中运行此测试脚本');
}

// 导出测试函数
export { testEndpoints, results };