#!/usr/bin/env node
/**
 * 测试机器人健康检查功能
 * 使用方法: node test-health-check.js [bot_id]
 */

import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3001';

// 获取用于测试的访问令牌
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@tronrental.com',
        password: 'admin123456'
      })
    });

    const data = await response.json();
    if (data.success) {
      return data.data.token;
    } else {
      throw new Error('登录失败: ' + data.message);
    }
  } catch (error) {
    console.error('❌ 获取认证令牌失败:', error.message);
    process.exit(1);
  }
}

// 获取机器人列表
async function getBots(token) {
  try {
    const response = await fetch(`${API_BASE}/api/bots`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.success) {
      return data.data.bots || data.data || [];
    } else {
      throw new Error('获取机器人列表失败: ' + data.message);
    }
  } catch (error) {
    console.error('❌ 获取机器人列表失败:', error.message);
    return [];
  }
}

// 触发健康检查
async function triggerHealthCheck(token, botId) {
  try {
    console.log(`🔍 正在检查机器人 ${botId} 的健康状态...`);
    
    const response = await fetch(`${API_BASE}/api/bots/${botId}/health-check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 健康检查成功触发');
      console.log('📊 检查结果:', JSON.stringify(data.data, null, 2));
      return data.data;
    } else {
      throw new Error('健康检查失败: ' + data.message);
    }
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    return null;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试机器人健康检查功能...\n');

  // 获取认证令牌
  console.log('🔐 获取认证令牌...');
  const token = await getAuthToken();
  console.log('✅ 认证令牌获取成功\n');

  // 获取机器人ID
  let botId = process.argv[2];
  
  if (!botId) {
    console.log('📋 获取机器人列表...');
    const bots = await getBots(token);
    
    if (bots.length === 0) {
      console.log('⚠️  没有找到任何机器人，请先创建一个机器人');
      process.exit(1);
    }
    
    console.log('📝 可用机器人:');
    bots.forEach((bot, index) => {
      console.log(`  ${index + 1}. ${bot.name} (@${bot.username}) - ID: ${bot.id}`);
      console.log(`     状态: ${bot.is_active ? '启用' : '禁用'} | 健康状态: ${bot.health_status || '未知'}`);
    });
    
    // 使用第一个机器人进行测试
    botId = bots[0].id;
    console.log(`\n🎯 使用第一个机器人进行测试: ${bots[0].name} (${botId})\n`);
  }

  // 触发健康检查
  const result = await triggerHealthCheck(token, botId);
  
  if (result) {
    console.log('\n🎉 健康检查测试完成！');
    console.log('💡 提示: 现在可以在前端界面中看到"立即检查"按钮，点击即可触发健康检查');
  } else {
    console.log('\n💥 健康检查测试失败');
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});
