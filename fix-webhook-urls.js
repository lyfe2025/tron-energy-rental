#!/usr/bin/env node

/**
 * 修复机器人 Webhook URL 脚本
 * 将数据库中的 webhook URL 同步到 Telegram API
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 机器人配置
const bots = [
  {
    username: 'nlzlceshi001bot',
    token: '8466864595:AAEtB7sQsxEoER-NNtTgAVn0xEfukdFGDjI',
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi001bot'
  },
  {
    username: 'nlzlceshi002bot', 
    token: '7380491683:AAFQyzxgzQee4RDW0l1Aj6P8IONATct_EZo',
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi002bot'
  },
  {
    username: 'nlzlceshi003bot',
    token: '8361125199:AAE2JkNO7TfixsD0Yhp56PDDfbDbPPlMaMQ', 
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi003bot'
  },
  {
    username: 'nlzlceshi006bot',
    token: '8124346221:AAEhUlsa5NY3K_zufWxnZynpvSEGaHRkhbE',
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi006bot'
  },
  {
    username: 'nlzlceshi007bot',
    token: '8014421868:AAFS080QBEKzFtyXrZN10rP1gWPWr0FvrXE',
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi007bot'
  },
  {
    username: 'nlzlceshi008bot',
    token: '8240649921:AAG0V8OaeJR4A9_SmJraJQvcsi9sDlu0rg8',
    webhookUrl: 'https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/nlzlceshi008bot'
  }
];

/**
 * 设置机器人 Webhook
 */
async function setWebhook(bot) {
  const url = `https://api.telegram.org/bot${bot.token}/setWebhook`;
  const data = JSON.stringify({
    url: bot.webhookUrl,
    allowed_updates: ['message', 'callback_query', 'inline_query'],
    drop_pending_updates: true
  });

  try {
    const command = `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${data}'`;
    const { stdout } = await execPromise(command);
    const result = JSON.parse(stdout);
    
    if (result.ok) {
      console.log(`✅ ${bot.username}: Webhook 设置成功`);
      return true;
    } else {
      console.log(`❌ ${bot.username}: Webhook 设置失败 - ${result.description}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ${bot.username}: 设置过程出错 - ${error.message}`);
    return false;
  }
}

/**
 * 获取机器人 Webhook 信息
 */
async function getWebhookInfo(bot) {
  try {
    const command = `curl -s "https://api.telegram.org/bot${bot.token}/getWebhookInfo"`;
    const { stdout } = await execPromise(command);
    const result = JSON.parse(stdout);
    
    if (result.ok) {
      return result.result;
    } else {
      console.log(`❌ ${bot.username}: 获取 Webhook 信息失败 - ${result.description}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 ${bot.username}: 获取信息过程出错 - ${error.message}`);
    return null;
  }
}

/**
 * 主修复流程
 */
async function main() {
  console.log('🚀 开始修复机器人 Webhook URL...\n');
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  for (const bot of bots) {
    console.log(`\n📋 处理机器人: ${bot.username}`);
    
    // 获取当前 webhook 信息
    console.log('🔍 检查当前 Webhook 状态...');
    const currentInfo = await getWebhookInfo(bot);
    
    if (currentInfo) {
      console.log(`   当前 URL: ${currentInfo.url || '未设置'}`);
      console.log(`   期望 URL: ${bot.webhookUrl}`);
      
      if (currentInfo.url === bot.webhookUrl) {
        console.log(`✅ ${bot.username}: Webhook URL 已正确`);
        results.success++;
        results.details.push(`${bot.username}: 已正确 ✅`);
        continue;
      }
    }
    
    // 设置正确的 webhook
    console.log('🔄 设置正确的 Webhook URL...');
    const success = await setWebhook(bot);
    
    if (success) {
      results.success++;
      results.details.push(`${bot.username}: 修复成功 ✅`);
      
      // 验证设置结果
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      const verifyInfo = await getWebhookInfo(bot);
      if (verifyInfo && verifyInfo.url === bot.webhookUrl) {
        console.log(`✅ ${bot.username}: 验证通过，Webhook URL 已正确设置`);
      } else {
        console.log(`⚠️ ${bot.username}: 设置成功但验证异常`);
      }
    } else {
      results.failed++;
      results.details.push(`${bot.username}: 修复失败 ❌`);
    }
  }

  // 显示总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 修复结果总结:');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${results.success} 个`);
  console.log(`❌ 失败: ${results.failed} 个`);
  console.log(`📝 总计: ${bots.length} 个`);
  console.log('\n📋 详细结果:');
  results.details.forEach(detail => console.log(`   ${detail}`));
  
  if (results.failed === 0) {
    console.log('\n🎉 所有机器人 Webhook URL 修复完成！');
  } else {
    console.log('\n⚠️ 部分机器人修复失败，请检查失败原因');
  }
}

// 运行脚本
main().catch(error => {
  console.error('💥 修复脚本执行失败:', error);
  process.exit(1);
});
