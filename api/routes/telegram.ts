import { Router } from 'express';
import { multiBotManager, telegramBotService } from '../services/telegram-bot.js';

const router: Router = Router();

/**
 * 多机器人 Webhook 路由
 * 支持特定机器人的 Webhook 处理 - 使用 bot_username 而不是 ID
 */
router.post('/webhook/:botUsername', async (req, res) => {
  try {
    const { botUsername } = req.params;
    const update = req.body;
    
    console.log('🔄 Received multi-bot webhook update:', { 
      botUsername,
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasCallback: !!update.callback_query
    });
    
    // 先快速响应Telegram，避免超时
    res.status(200).json({ ok: true });
    
    // 异步处理消息，避免阻塞响应
    setImmediate(async () => {
      try {
        // 等待多机器人管理器初始化
        await multiBotManager.waitForInitialization();
        
        // 根据 bot_username 获取机器人实例
        const botInstance = multiBotManager.getBotInstanceByUsername(botUsername);
        
        if (!botInstance) {
          console.warn(`⚠️ 未找到机器人实例: ${botUsername}`);
          return;
        }
        
        if (botInstance.status !== 'running') {
          console.warn(`⚠️ 机器人未运行: ${botInstance.name} (状态: ${botInstance.status})`);
          return;
        }
        
        // 使用指定机器人处理消息
        await botInstance.service.processWebhookUpdate(update);
        
        console.log(`✅ Webhook消息已处理: 机器人 ${botInstance.name} (@${botUsername})`);
        
      } catch (processingError) {
        console.error(`❌ 机器人 ${botUsername} Webhook消息处理失败:`, processingError);
        
        // 记录处理失败日志到多机器人管理器
        if (multiBotManager) {
          const botInstance = multiBotManager.getBotInstanceByUsername(botUsername);
          if (botInstance) {
            await botInstance.service.logBotActivity(
              'error', 
              'webhook_processing_failed', 
              `Webhook消息处理失败: ${processingError.message}`,
              { error: processingError.stack, update, botUsername }
            );
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Multi-bot Telegram webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 通用 Webhook（向后兼容）
 * 自动路由到第一个可用的机器人
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('🔄 Received legacy webhook update:', { 
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasCallback: !!update.callback_query
    });
    
    // 先快速响应Telegram，避免超时
    res.status(200).json({ ok: true });
    
    // 异步处理消息，避免阻塞响应
    setImmediate(async () => {
      try {
        // 等待多机器人管理器初始化
        await multiBotManager.waitForInitialization();
        
        // 获取第一个运行中的机器人
        const runningBots = multiBotManager.getRunningBots();
        
        if (runningBots.length === 0) {
          console.warn('⚠️ 没有运行中的机器人，跳过webhook消息处理');
          return;
        }
        
        // 使用第一个机器人处理（向后兼容）
        const firstBot = runningBots[0];
        await firstBot.service.processWebhookUpdate(update);
        
        console.log(`✅ Legacy webhook消息已处理: 机器人 ${firstBot.name}`);
        
      } catch (processingError) {
        console.error('❌ Legacy webhook消息处理失败:', processingError);
        
        // 记录处理失败日志
        if (telegramBotService) {
          await telegramBotService.logBotActivity(
            'error', 
            'webhook_processing_failed', 
            `Legacy webhook消息处理失败: ${processingError.message}`,
            { error: processingError.stack, update }
          );
        }
      }
    });
    
  } catch (error) {
    console.error('Legacy Telegram webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * 设置Webhook
 * 用于配置Telegram Bot的webhook URL
 */
router.post('/set-webhook', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    
    const success = await telegramBotService.setWebhook(url);
    
    if (success) {
      res.json({ success: true, message: 'Webhook set successfully' });
    } else {
      res.status(500).json({ error: 'Failed to set webhook' });
    }
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取Webhook信息
 */
router.get('/webhook-info', async (req, res) => {
  try {
    const info = await telegramBotService.getWebhookInfo();
    res.json(info);
  } catch (error) {
    console.error('Get webhook info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 删除Webhook
 */
router.delete('/webhook', async (req, res) => {
  try {
    const success = await telegramBotService.deleteWebhook();
    
    if (success) {
      res.json({ success: true, message: 'Webhook deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;