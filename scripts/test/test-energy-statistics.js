#!/usr/bin/env node

/**
 * 测试能量池统计修复效果
 * 这个脚本将调用API并验证总能量与可用能量的计算是否正确
 */

// 使用Node.js 18+内置的fetch API

const API_BASE = 'http://localhost:3001/api';

async function testEnergyStatistics() {
  try {
    console.log('🧪 开始测试能量池统计功能...\n');
    
    // 1. 获取统计信息
    console.log('📊 获取能量池统计信息...');
    const statsResponse = await fetch(`${API_BASE}/energy-pool/statistics`);
    const statsData = await statsResponse.json();
    
    if (!statsData.success) {
      console.error('❌ 统计信息获取失败:', statsData.message);
      return;
    }
    
    const stats = statsData.data;
    console.log('📊 统计信息获取成功:');
    console.log(`   总账户数: ${stats.totalAccounts}`);
    console.log(`   活跃账户数: ${stats.activeAccounts}`);
    console.log(`   总能量: ${stats.totalEnergy.toLocaleString()}`);
    console.log(`   可用能量: ${stats.availableEnergy.toLocaleString()}`);
    console.log(`   总带宽: ${stats.totalBandwidth.toLocaleString()}`);
    console.log(`   可用带宽: ${stats.availableBandwidth.toLocaleString()}`);
    
    // 额外的统计信息
    if (stats.totalEnergyFromStaking !== undefined) {
      console.log(`   质押获得的能量: ${stats.totalEnergyFromStaking.toLocaleString()}`);
      console.log(`   对外代理的能量: ${stats.totalDelegatedEnergyOut.toLocaleString()}`);
    }
    
    // 2. 验证逻辑
    console.log('\n🔍 验证统计逻辑:');
    
    // 验证总能量与可用能量的差异
    const energyDifference = stats.totalEnergy - stats.availableEnergy;
    console.log(`   总能量与可用能量差额: ${energyDifference.toLocaleString()}`);
    
    if (stats.totalEnergy === stats.availableEnergy) {
      console.log('❌ 问题仍然存在: 总能量与可用能量完全相同!');
      console.log('   这意味着没有考虑代理给他人的能量或已使用的能量');
    } else {
      console.log('✅ 修复成功: 总能量与可用能量不同，说明正确计算了代理和使用情况');
      
      // 计算利用率
      const utilizationRate = ((stats.totalEnergy - stats.availableEnergy) / stats.totalEnergy * 100).toFixed(2);
      console.log(`   能量利用率: ${utilizationRate}%`);
    }
    
    // 验证带宽
    const bandwidthDifference = stats.totalBandwidth - stats.availableBandwidth;
    console.log(`   总带宽与可用带宽差额: ${bandwidthDifference.toLocaleString()}`);
    
    if (stats.totalBandwidth === stats.availableBandwidth) {
      console.log('❌ 带宽问题仍然存在: 总带宽与可用带宽完全相同!');
    } else {
      console.log('✅ 带宽修复成功: 总带宽与可用带宽不同');
      
      // 计算带宽利用率
      const bandwidthUtilizationRate = ((stats.totalBandwidth - stats.availableBandwidth) / stats.totalBandwidth * 100).toFixed(2);
      console.log(`   带宽利用率: ${bandwidthUtilizationRate}%`);
    }
    
    // 3. 获取账户列表验证
    console.log('\n📋 获取账户列表验证...');
    const accountsResponse = await fetch(`${API_BASE}/energy-pool/accounts`);
    const accountsData = await accountsResponse.json();
    
    if (accountsData.success && accountsData.data && accountsData.data.length > 0) {
      console.log(`   账户数量: ${accountsData.data.length}`);
      
      // 展示第一个账户的详细信息作为示例
      const firstAccount = accountsData.data[0];
      console.log(`   示例账户 (${firstAccount.name}):`);
      console.log(`     总能量: ${firstAccount.total_energy.toLocaleString()}`);
      console.log(`     可用能量: ${firstAccount.available_energy.toLocaleString()}`);
      console.log(`     总带宽: ${firstAccount.total_bandwidth.toLocaleString()}`);
      console.log(`     可用带宽: ${firstAccount.available_bandwidth.toLocaleString()}`);
      
      if (firstAccount.total_energy === firstAccount.available_energy) {
        console.log('     ⚠️  该账户的总能量与可用能量相同');
      } else {
        console.log('     ✅ 该账户的能量计算正常');
      }
    }
    
    console.log('\n✅ 测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testEnergyStatistics();
