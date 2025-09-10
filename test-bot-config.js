/**
 * 测试机器人配置加载
 */
import { configService } from './api/services/config/ConfigService.ts';

async function testBotConfigs() {
  try {
    console.log('🔍 测试获取活跃机器人配置...');
    
    const activeBots = await configService.getActiveBotConfigs();
    
    console.log(`📋 找到 ${activeBots.length} 个活跃机器人配置:`);
    
    activeBots.forEach((bot, index) => {
      console.log(`\n机器人 ${index + 1}:`);
      console.log(`  ID: ${bot.id}`);
      console.log(`  名称: ${bot.botName}`);
      console.log(`  Token: ${bot.botToken ? `${bot.botToken.substring(0, 10)}...` : '未设置'}`);
      console.log(`  工作模式: ${bot.workMode}`);
      console.log(`  是否激活: ${bot.isActive}`);
      console.log(`  网络配置: ${bot.networks ? bot.networks.length : 0} 个`);
    });
    
    if (activeBots.length === 0) {
      console.warn('⚠️ 未找到任何活跃的机器人配置！');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testBotConfigs().then(() => {
  console.log('\n✅ 测试完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试异常:', error);
  process.exit(1);
});
