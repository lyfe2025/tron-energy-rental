import { Router } from 'express';
import { telegramBotService } from '../services/telegram-bot';

const router: Router = Router();

/**
 * Telegram Bot Webhook
 * 接收Telegram发送的更新消息
 */
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // 处理消息更新
    if (update.message) {
      // 消息处理已在bot内部通过polling处理
      console.log('Received message update via webhook');
    }
    
    // 处理回调查询
    if (update.callback_query) {
      // 回调查询处理已在bot内部通过polling处理
      console.log('Received callback query update via webhook');
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
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