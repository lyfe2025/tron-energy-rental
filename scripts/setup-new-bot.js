#!/usr/bin/env node

/**
 * 新机器人设置脚本
 * 用于设置新创建的Telegram机器人，包含速率限制重试机制
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * 带重试机制的setWebhook
 */
async function setWebhookWithRetry(botToken, webhookUrl, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔧 第 ${attempt} 次尝试设置 Webhook...`);
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Webhook 设置成功！');
        return { success: true, message: 'Webhook设置成功' };
      }
      
      // 检查是否是速率限制错误
      if (data.error_code === 429 || data.description?.includes('Too Many Requests')) {
        const retryAfter = data.parameters?.retry_after || 60;
        console.log(`⚠️  触发速率限制，需要等待 ${retryAfter} 秒后重试...`);
        
        if (attempt < maxRetries) {
          console.log(`⏳ 等待 ${retryAfter} 秒...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          return {
            success: false,
            message: `达到最大重试次数（${maxRetries}），仍然被速率限制。请稍后手动重试。`
          };
        }
      } else {
        return {
          success: false,
          message: `设置Webhook失败: ${data.description || '未知错误'}`
        };
      }
    } catch (error) {
      console.error(`❌ 第 ${attempt} 次尝试失败:`, error.message);
      
      if (attempt < maxRetries) {
        console.log('⏳ 等待 10 秒后重试...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        return {
          success: false,
          message: `网络错误，达到最大重试次数: ${error.message}`
        };
      }
    }
  }
}

/**
 * 获取机器人信息
 */
async function getBotInfo(botToken) {
  try {
    console.log('🔍 获取机器人信息...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ 机器人信息获取成功');
      console.log(`   ID: ${data.result.id}`);
      console.log(`   用户名: @${data.result.username}`);
      console.log(`   名称: ${data.result.first_name}`);
      
      return {
        success: true,
        data: data.result
      };
    } else {
      return {
        success: false,
        message: `获取机器人信息失败: ${data.description}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `网络错误: ${error.message}`
    };
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🤖 Telegram 机器人设置工具');
    console.log('===================================\n');
    
    // 获取机器人Token
    let botToken = process.argv[2];
    if (!botToken) {
      botToken = await question('请输入机器人Token: ');
    }
    
    if (!botToken || !botToken.includes(':')) {
      console.log('❌ 无效的机器人Token格式');
      process.exit(1);
    }
    
    // 验证Token并获取机器人信息
    const botInfoResult = await getBotInfo(botToken);
    if (!botInfoResult.success) {
      console.log(`❌ ${botInfoResult.message}`);
      process.exit(1);
    }
    
    const botInfo = botInfoResult.data;
    
    // 询问是否要设置Webhook
    const setupWebhook = await question('\n是否要设置Webhook? (y/n): ');
    
    if (setupWebhook.toLowerCase() === 'y' || setupWebhook.toLowerCase() === 'yes') {
      // 获取Webhook URL
      let webhookUrl = await question('请输入Webhook基础URL (例如: https://yourdomain.com/api/telegram/webhook): ');
      
      if (!webhookUrl) {
        console.log('❌ Webhook URL不能为空');
        process.exit(1);
      }
      
      // 自动添加机器人用户名到URL
      if (!webhookUrl.endsWith('/')) {
        webhookUrl += '/';
      }
      webhookUrl += botInfo.username;
      
      console.log(`\n📍 最终Webhook URL: ${webhookUrl}`);
      
      const confirm = await question('确认设置这个Webhook URL? (y/n): ');
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        // 设置Webhook（带重试机制）
        const result = await setWebhookWithRetry(botToken, webhookUrl);
        
        if (result.success) {
          console.log('\n🎉 机器人Webhook设置完成！');
          console.log(`\n📋 机器人信息摘要:`);
          console.log(`   机器人: @${botInfo.username}`);
          console.log(`   Webhook: ${webhookUrl}`);
          console.log(`\n💡 下一步:`);
          console.log(`   1. 在管理界面中添加这个机器人`);
          console.log(`   2. 配置相关的网络和功能设置`);
          console.log(`   3. 测试机器人功能`);
        } else {
          console.log(`\n❌ ${result.message}`);
          console.log('\n🔧 手动解决方案:');
          console.log('   1. 等待几分钟后再次运行此脚本');
          console.log('   2. 或者在管理界面中手动应用Webhook设置');
          console.log('   3. 检查网络连接和域名配置');
        }
      } else {
        console.log('❌ 已取消Webhook设置');
      }
    } else {
      console.log('ℹ️  跳过Webhook设置，机器人将使用默认配置');
    }
    
    // 生成配置信息
    const configInfo = {
      bot_token: botToken,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
      bot_id: botInfo.id,
      created_at: new Date().toISOString(),
      webhook_url: (setupWebhook.toLowerCase() === 'y' || setupWebhook.toLowerCase() === 'yes') ? 
        `https://ed1cfac836d2.ngrok-free.app/api/telegram/webhook/${botInfo.username}` : null
    };
    
    // 保存到文件
    const configPath = path.join(process.cwd(), `bot-config-${botInfo.username}.json`);
    fs.writeFileSync(configPath, JSON.stringify(configInfo, null, 2));
    console.log(`\n💾 配置信息已保存到: ${configPath}`);
    
  } catch (error) {
    console.error('❌ 脚本执行错误:', error);
  } finally {
    rl.close();
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
    getBotInfo, setWebhookWithRetry
};

