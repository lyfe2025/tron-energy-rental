/**
 * 测试Webhook设置脚本
 * 验证webhook配置和消息接收功能
 */
import axios from 'axios';
import pg from 'pg';
const { Client } = pg;

async function testWebhookSetup() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/tron_energy_rental'
  });

  try {
    await client.connect();
    console.log('🔌 已连接到数据库');

    // 查询所有webhook模式的机器人
    const result = await client.query(`
      SELECT id, bot_name, bot_token, webhook_url, work_mode, is_active
      FROM telegram_bots 
      WHERE work_mode = 'webhook' AND is_active = true AND webhook_url IS NOT NULL
    `);

    console.log(`\n📊 找到 ${result.rows.length} 个活跃的Webhook机器人`);

    if (result.rows.length === 0) {
      console.log('❌ 没有找到活跃的Webhook机器人');
      return;
    }

    console.log('\n🔍 开始测试每个机器人的Webhook配置...\n');

    for (const bot of result.rows) {
      console.log(`\n🤖 测试机器人: ${bot.bot_name} (${bot.id})`);
      console.log(`📍 Webhook URL: ${bot.webhook_url}`);

      try {
        // 1. 测试Telegram API连接
        console.log('  1️⃣ 测试Telegram API连接...');
        const botInfoResponse = await axios.get(`https://api.telegram.org/bot${bot.bot_token}/getMe`, {
          timeout: 10000
        });

        if (botInfoResponse.data.ok) {
          console.log(`  ✅ API连接正常: @${botInfoResponse.data.result.username}`);
        } else {
          console.log('  ❌ API连接失败:', botInfoResponse.data.description);
          continue;
        }

        // 2. 检查当前Webhook状态
        console.log('  2️⃣ 检查当前Webhook状态...');
        const webhookInfoResponse = await axios.get(`https://api.telegram.org/bot${bot.bot_token}/getWebhookInfo`, {
          timeout: 10000
        });

        if (webhookInfoResponse.data.ok) {
          const webhookInfo = webhookInfoResponse.data.result;
          console.log(`  📊 当前Webhook信息:`);
          console.log(`    URL: ${webhookInfo.url || '未设置'}`);
          console.log(`    待处理消息: ${webhookInfo.pending_update_count || 0}`);
          console.log(`    最后错误: ${webhookInfo.last_error_message || '无'}`);
          
          // 检查URL是否匹配
          if (webhookInfo.url === bot.webhook_url) {
            console.log(`  ✅ Webhook URL已正确设置`);
          } else {
            console.log(`  ⚠️ Webhook URL不匹配，需要更新`);
            console.log(`    数据库中: ${bot.webhook_url}`);
            console.log(`    Telegram中: ${webhookInfo.url}`);
          }
        }

        // 3. 测试Webhook端点可达性
        console.log('  3️⃣ 测试Webhook端点可达性...');
        try {
          const testResponse = await axios.post(bot.webhook_url, {
            update_id: 999999,
            message: {
              message_id: 1,
              from: { id: 123456, is_bot: false, first_name: "TestUser" },
              chat: { id: 123456, type: "private" },
              date: Math.floor(Date.now() / 1000),
              text: "/test_webhook_setup"
            }
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });

          if (testResponse.status === 200) {
            console.log(`  ✅ Webhook端点可达，响应: ${testResponse.data?.ok ? 'OK' : testResponse.status}`);
          } else {
            console.log(`  ⚠️ Webhook端点响应异常: ${testResponse.status}`);
          }
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            console.log(`  ❌ Webhook端点无法连接 (连接被拒绝)`);
          } else if (error.code === 'ENOTFOUND') {
            console.log(`  ❌ Webhook域名无法解析`);
          } else {
            console.log(`  ❌ Webhook端点测试失败: ${error.message}`);
          }
        }

        // 4. 验证路由配置
        console.log('  4️⃣ 验证路由配置...');
        const expectedPath = `/api/telegram/webhook/${bot.id}`;
        if (bot.webhook_url.includes(expectedPath)) {
          console.log(`  ✅ 路由配置正确，包含机器人ID: ${expectedPath}`);
        } else {
          console.log(`  ❌ 路由配置可能有问题，缺少机器人ID路径`);
          console.log(`    期望包含: ${expectedPath}`);
          console.log(`    实际URL: ${bot.webhook_url}`);
        }

      } catch (error) {
        console.log(`  ❌ 测试机器人 ${bot.bot_name} 时发生错误:`, error.message);
      }

      console.log('  ' + '─'.repeat(50));
    }

    console.log('\n📋 测试总结:');
    console.log(`✅ 共测试了 ${result.rows.length} 个Webhook机器人`);
    console.log(`💡 请确保:`);
    console.log(`   • 服务器正在运行且可访问`);
    console.log(`   • SSL证书有效`);
    console.log(`   • 防火墙允许HTTPS流量`);
    console.log(`   • 每个机器人都有独立的URL路径`);

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await client.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebhookSetup().catch(console.error);
}

export { testWebhookSetup };
