/**
 * 机器人更新主控制器
 * 负责机器人基础信息更新和健康检查
 */
import type { Request, Response } from 'express';
import { configService } from '../../../../../services/config/ConfigService.ts';
import { multiBotManager } from '../../../../../services/telegram-bot.ts';
import type { UpdateBotData } from '../../../types.ts';
import { ConfigUpdateService } from '../services/ConfigUpdateService.ts';
import { UpdateUtils } from '../utils/updateUtils.ts';
import { UpdateValidators } from '../validators/updateValidators.ts';

export class BotUpdateController {
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

        // 8. 数据库保存成功 - 不再自动同步到Telegram API
        console.log('💾 数据库更新成功，不会自动同步到Telegram API');
        console.log('ℹ️ 如需同步到Telegram，请使用手动同步功能');

        // 8.1 动态管理机器人实例（如果活跃状态发生变化）
        if (updateData.is_active !== undefined) {
          try {
            console.log('🔄 检测到活跃状态变更，开始动态管理机器人实例...');
            
            // 等待MultiBotManager初始化完成
            await multiBotManager.waitForInitialization();
            
            if (updatedBot.is_active) {
              // 激活机器人：添加到运行实例
              console.log('➕ 激活机器人，添加到运行实例...');
              
              const botConfig = await configService.getTelegramBotById(id);
              if (botConfig) {
                const addResult = await multiBotManager.addBot(botConfig);
                if (addResult) {
                  console.log('✅ 机器人已动态添加到运行实例:', updatedBot.name, `(@${updatedBot.bot_username})`);
                } else {
                  console.warn('⚠️ 机器人添加到运行实例失败，可能已存在');
                }
              } else {
                console.warn('⚠️ 无法获取机器人配置，跳过动态添加');
              }
            } else {
              // 停用机器人：从运行实例移除
              console.log('➖ 停用机器人，从运行实例移除...');
              
              const removeResult = await multiBotManager.removeBot(id);
              if (removeResult) {
                console.log('✅ 机器人已动态从运行实例移除:', updatedBot.name, `(@${updatedBot.bot_username})`);
              } else {
                console.warn('⚠️ 机器人从运行实例移除失败，可能不存在');
              }
            }
          } catch (error) {
            console.error('动态管理机器人实例失败:', error);
            // 不影响更新流程，只是记录错误
          }
        }
        
        // 记录需要同步的变更类型（用于提醒用户）
        const syncableChanges = [];
        comparison.changes.forEach(change => {
          switch (change.field) {
            case 'name':
            case 'description':
            case 'short_description':
            case 'menu_commands':
            case 'work_mode':
            case 'webhook_url':
            case 'webhook_secret':
            case 'menu_button_enabled':
            case 'menu_button_text':
            case 'menu_type':
            case 'web_app_url':
              syncableChanges.push(change.field);
              break;
          }
        });
        
        // 设置同步提醒信息
        syncResult = {
          success: null, // 表示未进行同步
          skipped: true,
          syncableChanges: syncableChanges,
          message: '数据库保存成功，如需同步到Telegram请使用手动同步功能',
          summary: '数据库更新成功，未同步到Telegram'
        };

        // 9. 更新机器人状态
        await ConfigUpdateService.updateBotStatus(id, 'updated', {
          last_update: new Date().toISOString(),
          changes_count: comparison.changes.length,
          sync_success: syncResult?.success || false
        });

        // 10. 记录更新日志
        await ConfigUpdateService.logUpdate(id, updateData, syncResult, req.user?.id);

        // 11. 通知配置变更
        try {
          const { configService } = await import('../../../../../services/config/ConfigService.ts');
          configService.emit('cache:refreshed', {
            type: 'telegram_bots',
            botId: id,
            action: 'update',
            changes: comparison.changes
          });
          console.log('📢 已发送配置变更通知');
        } catch (notifyError) {
          console.warn('⚠️ 发送配置变更通知失败:', notifyError);
        }

        // 12. 生成响应
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
