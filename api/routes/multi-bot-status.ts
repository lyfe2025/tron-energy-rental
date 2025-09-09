/**
 * 多机器人状态管理API
 * 提供多机器人管理器的状态查询和控制接口
 */
import { Router, type Request, type Response } from 'express';
import { multiBotManager } from '../services/telegram-bot.js';

const router = Router();

/**
 * 获取多机器人管理器状态
 * GET /api/multi-bot/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = multiBotManager.getManagerStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取多机器人状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
});

/**
 * 获取所有机器人实例详情
 * GET /api/multi-bot/instances
 */
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const instances = multiBotManager.getAllBotInstances();
    
    const detailedInstances = instances.map(instance => ({
      id: instance.id,
      name: instance.name,
      status: instance.status,
      workMode: instance.config.workMode,
      lastActivity: instance.lastActivity.toISOString(),
      errorCount: instance.errorCount,
      config: {
        botName: instance.config.botName,
        botUsername: instance.config.botUsername,
        workMode: instance.config.workMode,
        isActive: instance.config.isActive,
        webhookUrl: instance.config.webhookUrl,
        maxConnections: instance.config.maxConnections
      }
    }));
    
    res.json({
      success: true,
      data: detailedInstances
    });
  } catch (error) {
    console.error('获取机器人实例详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取实例详情失败',
      error: error.message
    });
  }
});

/**
 * 重启指定机器人
 * POST /api/multi-bot/restart/:botId
 */
router.post('/restart/:botId', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    
    const success = await multiBotManager.restartBot(botId);
    
    if (success) {
      res.json({
        success: true,
        message: `机器人 ${botId} 重启成功`
      });
    } else {
      res.status(400).json({
        success: false,
        message: `机器人 ${botId} 重启失败`
      });
    }
  } catch (error) {
    console.error('重启机器人失败:', error);
    res.status(500).json({
      success: false,
      message: '重启机器人失败',
      error: error.message
    });
  }
});

/**
 * 与数据库同步机器人配置
 * POST /api/multi-bot/sync
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    await multiBotManager.syncWithDatabase();
    
    res.json({
      success: true,
      message: '同步成功'
    });
  } catch (error) {
    console.error('同步失败:', error);
    res.status(500).json({
      success: false,
      message: '同步失败',
      error: error.message
    });
  }
});

/**
 * 获取指定机器人的状态
 * GET /api/multi-bot/:botId/status
 */
router.get('/:botId/status', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const botInstance = multiBotManager.getBotInstance(botId);
    
    if (!botInstance) {
      res.status(404).json({
        success: false,
        message: `机器人 ${botId} 不存在`
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: botInstance.id,
        name: botInstance.name,
        status: botInstance.status,
        lastActivity: botInstance.lastActivity.toISOString(),
        errorCount: botInstance.errorCount,
        workMode: botInstance.config.workMode,
        isActive: botInstance.config.isActive
      }
    });
  } catch (error) {
    console.error('获取机器人状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取机器人状态失败',
      error: error.message
    });
  }
});

/**
 * 测试机器人连接
 * POST /api/multi-bot/:botId/test
 */
router.post('/:botId/test', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const botInstance = multiBotManager.getBotInstance(botId);
    
    if (!botInstance) {
      res.status(404).json({
        success: false,
        message: `机器人 ${botId} 不存在`
      });
      return;
    }
    
    if (botInstance.status !== 'running') {
      res.status(400).json({
        success: false,
        message: `机器人未运行，当前状态: ${botInstance.status}`
      });
      return;
    }
    
    // 测试机器人连接
    const botInfo = await botInstance.service.getBotInfo();
    
    res.json({
      success: true,
      message: '机器人连接正常',
      data: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: (botInfo as any).can_join_groups || false,
        can_read_all_group_messages: (botInfo as any).can_read_all_group_messages || false,
        supports_inline_queries: (botInfo as any).supports_inline_queries || false
      }
    });
  } catch (error) {
    console.error('测试机器人连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试机器人连接失败',
      error: error.message
    });
  }
});

/**
 * 手动初始化多机器人管理器
 * POST /api/multi-bot/initialize
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    await multiBotManager.initialize();
    
    const status = multiBotManager.getManagerStatus();
    
    res.json({
      success: true,
      message: '多机器人管理器初始化成功',
      data: status
    });
  } catch (error) {
    console.error('初始化多机器人管理器失败:', error);
    res.status(500).json({
      success: false,
      message: '初始化失败',
      error: error.message
    });
  }
});

export default router;
