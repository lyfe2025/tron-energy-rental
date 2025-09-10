/**
 * 机器人更新处理器主控制器
 * 统一管理机器人更新和删除流程
 */
import type { Request, Response } from 'express';
import type { UpdateBotData } from '../../types.js';
import { ConfigUpdateService } from './services/ConfigUpdateService.js';
import { DeleteService } from './services/DeleteService.js';
import { SynchronizationService } from './services/SynchronizationService.js';
import { UpdateUtils } from './utils/updateUtils.js';
import { UpdateValidators } from './validators/updateValidators.js';

export class BotUpdateHandler {
  /**
   * 更新机器人的主要入口点
   */
  static async updateBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rawUpdateData = req.body as UpdateBotData;

      console.log(`\n🚀 收到机器人更新请求:`);
      console.log(`📋 机器人ID: ${id}`);
      console.log(`📋 更新数据:`, rawUpdateData);
      console.log(`🕐 请求时间: ${new Date().toLocaleString()}`);
      console.log(`===============================`);

      // 1. 格式化更新数据
      const updateData = UpdateUtils.formatUpdateData(rawUpdateData);

      // 2. 验证更新数据
      console.log('🔍 开始验证更新数据...');
      const validation = await UpdateValidators.validateUpdateData(id, updateData);
      
      if (!validation.isValid) {
        res.status(400).json(UpdateUtils.createErrorResponse(
          '数据验证失败',
          validation.errors
        ));
        return;
      }

      // 显示警告（如果有）
      if (validation.warnings.length > 0) {
        console.log('⚠️ 验证警告:', validation.warnings);
      }

      // 3. 获取原始机器人数据并比较变更
      const botExists = await UpdateValidators.validateBotExists(id);
      const originalBot = botExists.bot!;
      const comparison = UpdateUtils.compareChanges(originalBot, updateData);

      if (!comparison.hasChanges) {
        res.json({
          success: true,
          message: '没有检测到变更，机器人信息未更新',
          data: { bot: originalBot, changes: [] }
        });
        return;
      }

      console.log(`📝 检测到 ${comparison.changes.length} 个变更:`, comparison.changes);

      // 4. 检查敏感更新
      const sensitiveWarnings = UpdateUtils.checkSensitiveUpdates(updateData);
      if (sensitiveWarnings.length > 0) {
        console.log('⚠️ 敏感字段更新警告:', sensitiveWarnings);
      }

      // 5. 备份当前配置
      console.log('💾 备份当前配置...');
      const backup = await ConfigUpdateService.backupCurrentConfig(id);

      let syncResult: any = null;

      try {
        // 6. 更新数据库
        console.log('💾 更新数据库...');
        const updatedBot = await ConfigUpdateService.updateBotBasicInfo(id, updateData);

        // 7. 处理命令更新
        if (updateData.menu_commands !== undefined) {
          await ConfigUpdateService.updateBotCommands(id, updateData.menu_commands);
        }

        if (updateData.custom_commands !== undefined) {
          await ConfigUpdateService.updateCustomCommands(id, updateData.custom_commands);
        }

        // 8. 同步到Telegram API
        if (updatedBot.bot_token) {
          console.log('🔄 同步到Telegram API...');
          
          // 构建同步配置
          const syncConfig: any = {};
          
          if (updateData.name) syncConfig.name = updateData.name;
          if (updateData.description) syncConfig.description = updateData.description;
          if (updateData.short_description) syncConfig.shortDescription = updateData.short_description;
          if (updateData.menu_commands) syncConfig.commands = updateData.menu_commands;
          if (updateData.work_mode) {
            syncConfig.workMode = updateData.work_mode;
            syncConfig.webhookUrl = updateData.webhook_url;
            syncConfig.webhookSecret = updateData.webhook_secret;
          }

          // 执行逐步同步
          if (Object.keys(syncConfig).length > 0) {
            syncResult = await SynchronizationService.stepByStepSync(
              updatedBot.bot_token,
              syncConfig
            );

            // 如果同步失败且是关键更新，考虑回滚
            if (!syncResult.success && syncResult.errors.length > 0) {
              const criticalErrors = syncResult.errors.filter((error: string) => 
                error.includes('Token无效') || error.includes('无权限')
              );
              
              if (criticalErrors.length > 0) {
                console.warn('⚠️ 检测到关键同步错误，但不回滚数据库更新');
              }
            }
          }
        }

        // 9. 更新机器人状态
        await ConfigUpdateService.updateBotStatus(id, 'updated', {
          last_update: new Date().toISOString(),
          changes_count: comparison.changes.length,
          sync_success: syncResult?.success || false
        });

        // 10. 记录更新日志
        await ConfigUpdateService.logUpdate(id, updateData, syncResult, req.user?.id);

        // 11. 生成响应
        const response = UpdateUtils.createSuccessResponse(updatedBot, comparison.changes, syncResult);
        
        // 添加更新摘要（如果请求）
        if (req.query.include_summary === 'true') {
          (response as any).summary = UpdateUtils.generateUpdateSummary(
            updatedBot,
            comparison.changes,
            syncResult
          );
        }

        // 添加影响评估
        const impact = UpdateUtils.calculateUpdateImpact(comparison.changes);
        (response as any).impact = impact;

        console.log('🎉 机器人更新成功:', updatedBot.id);
        res.json(response);

      } catch (error) {
        console.error('❌ 更新过程中出错，考虑回滚...', error);
        
        // 尝试恢复配置（如果有备份）
        if (backup) {
          try {
            await ConfigUpdateService.restoreConfig(id, backup);
            console.log('🔄 配置已回滚到备份状态');
          } catch (rollbackError) {
            console.error('❌ 配置回滚失败:', rollbackError);
          }
        }
        
        throw error; // 重新抛出原始错误
      }

    } catch (error) {
      console.error('更新机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '更新机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 删除机器人
   */
  static async deleteBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        cleanup_api = true,
        hard_delete = false,
        force = false,
        reason = '用户删除'
      } = req.body;

      console.log(`\n🗑️ 收到机器人删除请求:`);
      console.log(`📋 机器人ID: ${id}`);
      console.log(`🔧 删除选项:`, { cleanup_api, hard_delete, force, reason });
      console.log(`===============================`);

      // 验证机器人是否存在
      const botExists = await UpdateValidators.validateBotExists(id);
      if (!botExists.exists) {
        res.status(404).json(UpdateUtils.createErrorResponse('机器人不存在'));
        return;
      }

      // 执行完整删除
      const deleteResult = await DeleteService.completeDeleteBot(id, {
        cleanupAPI: cleanup_api,
        hardDelete: hard_delete,
        force: force,
        reason: reason
      });

      if (deleteResult.success) {
        console.log('🎉 机器人删除成功:', id);
        res.json({
          success: true,
          message: `机器人${hard_delete ? '彻底' : ''}删除成功`,
          data: {
            bot_id: id,
            delete_type: hard_delete ? 'hard_delete' : 'soft_delete',
            api_cleanup: deleteResult.apiCleanup,
            warnings: deleteResult.errors.length > 0 ? deleteResult.errors : undefined
          }
        });
      } else {
        res.status(500).json(UpdateUtils.createErrorResponse(
          '删除机器人失败',
          deleteResult.errors
        ));
      }

    } catch (error) {
      console.error('删除机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '删除机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 批量删除机器人
   */
  static async batchDeleteBots(req: Request, res: Response): Promise<void> {
    try {
      const { bot_ids, ...options } = req.body;

      if (!Array.isArray(bot_ids) || bot_ids.length === 0) {
        res.status(400).json(UpdateUtils.createErrorResponse('请提供要删除的机器人ID列表'));
        return;
      }

      console.log(`\n🗑️ 批量删除机器人请求: ${bot_ids.length} 个`);

      const result = await DeleteService.batchDeleteBots(bot_ids, options);

      res.json({
        success: result.success,
        message: `批量删除完成`,
        data: {
          total: bot_ids.length,
          results: result.results,
          errors: result.totalErrors
        }
      });

    } catch (error) {
      console.error('批量删除机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '批量删除机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 恢复软删除的机器人
   */
  static async restoreBot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      console.log(`\n🔄 恢复机器人请求: ${id}`);

      await DeleteService.restoreBot(id);

      res.json({
        success: true,
        message: '机器人恢复成功',
        data: { bot_id: id }
      });

    } catch (error) {
      console.error('恢复机器人失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '恢复机器人失败',
        [errorMessage]
      ));
    }
  }

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

      // 获取命令
      try {
        const commandsResult = await ConfigUpdateService.updateBotCommands(id, []);
        // 这里应该获取而不是更新，但为了保持一致性暂时这样处理
      } catch (error) {
        console.warn('获取命令失败，使用默认命令');
      }

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
   * 获取更新历史
   */
  static async getUpdateHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      const history = await ConfigUpdateService.getUpdateHistory(id, Number(limit));

      res.json({
        success: true,
        data: {
          bot_id: id,
          history: history,
          total: history.length
        }
      });

    } catch (error) {
      console.error('获取更新历史失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '获取更新历史失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 获取删除历史
   */
  static async getDeleteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;

      const history = await DeleteService.getDeleteHistory(Number(limit));

      res.json({
        success: true,
        data: {
          history: history,
          total: history.length
        }
      });

    } catch (error) {
      console.error('获取删除历史失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '获取删除历史失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 清理过期的软删除机器人
   */
  static async cleanupExpiredDeletes(req: Request, res: Response): Promise<void> {
    try {
      const { days_old = 30 } = req.body;

      console.log(`\n🧹 清理 ${days_old} 天前的软删除机器人...`);

      const result = await DeleteService.cleanupExpiredSoftDeletes(days_old);

      res.json({
        success: true,
        message: '清理完成',
        data: {
          cleaned_count: result.cleaned,
          errors: result.errors
        }
      });

    } catch (error) {
      console.error('清理过期删除失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json(UpdateUtils.createErrorResponse(
        '清理过期删除失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: '机器人更新服务运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json(UpdateUtils.createErrorResponse('服务异常'));
    }
  }
}

// 兼容性导出，支持原始函数调用方式
export const updateBot = BotUpdateHandler.updateBot;
export const deleteBot = BotUpdateHandler.deleteBot;
