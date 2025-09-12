#!/usr/bin/env node

/**
 * 调试机器人实例脚本
 * 用于检查机器人实例的状态和配置
 */

import pkg from 'pg';
const { Pool } = pkg;

// 数据库配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tron_energy_rental',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function checkBotDatabase() {
  console.log('🔍 检查数据库中的机器人配置...');
  
  try {
    const result = await query(
      'SELECT id, bot_name, bot_username, bot_token, is_active, work_mode, webhook_url FROM telegram_bots ORDER BY created_at DESC'
    );
    
    console.log(`\n📋 数据库中共有 ${result.rows.length} 个机器人:\n`);
    
    result.rows.forEach((bot, index) => {
      console.log(`${index + 1}. ${bot.bot_name} (@${bot.bot_username})`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Token: ${bot.bot_token?.substring(0, 20)}...`);
      console.log(`   状态: ${bot.is_active ? '✅ 活跃' : '❌ 未激活'}`);
      console.log(`   工作模式: ${bot.work_mode}`);
      console.log(`   Webhook URL: ${bot.webhook_url || '未设置'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 检查数据库失败:', error);
  }
}


async function checkSpecificBot(botUsername) {
  console.log(`🔍 检查特定机器人: @${botUsername}`);
  
  try {
    const result = await query(
      'SELECT * FROM telegram_bots WHERE bot_username = $1',
      [botUsername]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ 数据库中未找到机器人 @${botUsername}`);
      return;
    }
    
    const bot = result.rows[0];
    console.log('\n📋 机器人详细信息:');
    console.log(`   名称: ${bot.bot_name}`);
    console.log(`   用户名: @${bot.bot_username}`);
    console.log(`   ID: ${bot.id}`);
    console.log(`   Token: ${bot.bot_token}`);
    console.log(`   活跃状态: ${bot.is_active ? '✅ 是' : '❌ 否'}`);
    console.log(`   工作模式: ${bot.work_mode}`);
    console.log(`   Webhook URL: ${bot.webhook_url || '未设置'}`);
    console.log(`   创建时间: ${bot.created_at}`);
    console.log(`   更新时间: ${bot.updated_at}`);
    
    // 检查网络配置
    const networkResult = await query(
      'SELECT network_id FROM bot_network_configs WHERE bot_id = $1',
      [bot.id]
    );
    
    console.log(`   网络配置: ${networkResult.rows.length} 个`);
    
  } catch (error) {
    console.error(`❌ 检查机器人 @${botUsername} 失败:`, error);
  }
}

async function activateBot(botUsername) {
  console.log(`🔧 激活机器人: @${botUsername}`);
  
  try {
    const result = await query(
      'UPDATE telegram_bots SET is_active = true, updated_at = NOW() WHERE bot_username = $1 RETURNING *',
      [botUsername]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ 未找到机器人 @${botUsername}`);
      return;
    }
    
    console.log(`✅ 机器人 @${botUsername} 已激活`);
    
  } catch (error) {
    console.error(`❌ 激活机器人 @${botUsername} 失败:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const botUsername = args[1];
  
  console.log('🤖 机器人实例调试工具');
  console.log('========================\n');
  
  if (command === 'check' && botUsername) {
    await checkSpecificBot(botUsername);
  } else if (command === 'activate' && botUsername) {
    await activateBot(botUsername);
  } else if (command === 'list') {
    await checkBotDatabase();
  } else {
    console.log('使用方法:');
    console.log('  node scripts/debug-bot-instances.js list                    # 列出所有机器人');
    console.log('  node scripts/debug-bot-instances.js check ffftr02_bot      # 检查特定机器人');
    console.log('  node scripts/debug-bot-instances.js activate ffftr02_bot   # 激活特定机器人');
    
    // 默认显示列表
    await checkBotDatabase();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
