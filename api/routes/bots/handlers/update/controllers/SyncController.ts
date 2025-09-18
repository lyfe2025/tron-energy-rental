/**
 * 机器人同步控制器
 * 负责与Telegram API的同步操作和连接性检查
 */
import type { Request, Response } from 'express';
import { SynchronizationService } from '../services/SynchronizationService.js';
import { UpdateUtils } from '../utils/updateUtils.js';
import { UpdateValidators } from '../validators/updateValidators.js';

export class SyncController {
  /**
   * 同步机器人到Telegram API
   */
  static async syncBotToTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { force_sync = false } = req.body;

      // 验证机器人是否存在
      const botExists = await UpdateValidators.validateBotExists(id);
      if (!botExists.exists) {
        res.status(404).json(UpdateUtils.createErrorResponse('机器人不存在'));
        return;
      }

      const bot = botExists.bot!;

      if (!bot.bot_token) {
        res.status(400).json(UpdateUtils.createErrorResponse('机器人Token不存在'));
        return;
      }

      console.log(`\n🔄 同步机器人到Telegram API: ${bot.name}`);

      // 构建同步配置
      const syncConfig = {
        name: bot.name,
        description: bot.description,
        shortDescription: bot.short_description,
        commands: [], // 从数据库获取命令
        workMode: bot.work_mode,
        webhookUrl: bot.webhook_url,
        webhookSecret: bot.webhook_secret
      };

      // 获取命令 - 跳过这个步骤，因为我们在稍后的步骤中会处理命令
      // 注释掉有问题的代码，避免不必要的空数组更新
      /*
      try {
        const commandsResult = await ConfigUpdateService.updateBotCommands(id, []);
        // 这里应该获取而不是更新，但为了保持一致性暂时这样处理
      } catch (error) {
        console.warn('获取命令失败，使用默认命令');
      }
      */

      // 执行同步
      const syncResult = await SynchronizationService.stepByStepSync(
        bot.bot_token,
        syncConfig
      );

      // 验证同步结果
      const verification = await SynchronizationService.verifySyncResult(bot.bot_token);

      res.json({
        success: syncResult.success,
        message: '同步完成',
        data: {
          sync_result: syncResult,
          verification: verification
        }
      });

    } catch (error) {
      console.error('同步机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '同步机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 检查Telegram API连接性
   */
  static async checkTelegramApiConnectivity(req: Request, res: Response): Promise<void> {
    try {
      console.log('\n🔍 收到Telegram API连接检测请求');

      const result = await SynchronizationService.checkTelegramApiAccessibility();

      if (result.accessible) {
        console.log(`✅ Telegram API连接正常，延迟: ${result.latency}ms`);
        res.json({
          success: true,
          message: 'Telegram API连接正常',
          data: {
            accessible: true,
            latency: result.latency,
            status: result.latency && result.latency < 1000 ? 'excellent' : 
                   result.latency && result.latency < 3000 ? 'good' : 'slow',
            suggestions: result.suggestions
          }
        });
      } else {
        console.log('❌ Telegram API连接失败:', result.error);
        res.json({
          success: false,
          message: 'Telegram API连接失败',
          data: {
            accessible: false,
            error: result.error,
            suggestions: result.suggestions
          }
        });
      }

    } catch (error) {
      console.error('检测Telegram API连接失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '检测Telegram API连接失败',
        [errorMessage]
      ));
    }
  }
}
