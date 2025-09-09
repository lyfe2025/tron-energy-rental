/**
 * 迁移现有机器人的Webhook URL格式
 * 将现有的URL转换为 基础URL + 机器人ID 的格式
 */
import pg from 'pg';
const { Client } = pg;

export async function migrateWebhookUrls() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/tron_energy_rental'
  });

  try {
    await client.connect();
    console.log('🔌 已连接到数据库');

    // 查询所有webhook模式的机器人
    const result = await client.query(`
      SELECT id, bot_name, webhook_url, work_mode 
      FROM telegram_bots 
      WHERE work_mode = 'webhook' AND webhook_url IS NOT NULL
    `);

    console.log(`📊 找到 ${result.rows.length} 个使用Webhook模式的机器人`);

    if (result.rows.length === 0) {
      console.log('✅ 没有需要迁移的机器人');
      return;
    }

    console.log('\n🔍 当前机器人Webhook URL状态:');
    result.rows.forEach((bot, index) => {
      console.log(`${index + 1}. ${bot.bot_name} (${bot.id})`);
      console.log(`   当前URL: ${bot.webhook_url}`);
      
      // 检查是否已经使用了新格式（末尾有机器人ID）
      const urlEndsWithBotId = bot.webhook_url.endsWith(`/${bot.id}`);
      console.log(`   格式状态: ${urlEndsWithBotId ? '✅ 已是新格式' : '❌ 需要迁移'}`);
      console.log('');
    });

    // 询问是否继续迁移
    const { createInterface } = await import('readline');
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('是否要迁移所有机器人到新的URL格式？(y/N): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ 迁移已取消');
      return;
    }

    console.log('\n🚀 开始迁移...');

    // 迁移每个机器人
    for (const bot of result.rows) {
      try {
        const currentUrl = bot.webhook_url;
        
        // 检查是否已经使用了新格式
        if (currentUrl.endsWith(`/${bot.id}`)) {
          console.log(`⏭️ ${bot.bot_name} 已使用新格式，跳过`);
          continue;
        }

        // 生成新的URL格式
        const baseUrl = currentUrl.replace(/\/+$/, ''); // 移除末尾斜杠
        const newUrl = `${baseUrl}/${bot.id}`;

        // 更新数据库
        await client.query(
          'UPDATE telegram_bots SET webhook_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newUrl, bot.id]
        );

        console.log(`✅ ${bot.bot_name}:`);
        console.log(`   旧URL: ${currentUrl}`);
        console.log(`   新URL: ${newUrl}`);
        console.log('');

      } catch (error) {
        console.error(`❌ 迁移 ${bot.bot_name} 失败:`, error.message);
      }
    }

    console.log('🎉 迁移完成！');
    
    // 显示迁移后的状态
    const updatedResult = await client.query(`
      SELECT id, bot_name, webhook_url 
      FROM telegram_bots 
      WHERE work_mode = 'webhook' AND webhook_url IS NOT NULL
    `);

    console.log('\n📊 迁移后的状态:');
    updatedResult.rows.forEach((bot, index) => {
      const urlEndsWithBotId = bot.webhook_url.endsWith(`/${bot.id}`);
      console.log(`${index + 1}. ${bot.bot_name}`);
      console.log(`   URL: ${bot.webhook_url}`);
      console.log(`   状态: ${urlEndsWithBotId ? '✅ 新格式' : '⚠️ 仍是旧格式'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateWebhookUrls().catch(console.error);
}
