/**
 * 删除服务
 * 负责机器人的删除操作和相关清理工作
 */
import { query } from '../../../../../config/database.js';

export class DeleteService {
  /**
   * 软删除机器人（标记为删除状态）
   */
  static async softDeleteBot(botId: string, reason?: string): Promise<void> {
    try {
      // 开始事务
      await query('BEGIN');

      // 更新机器人状态为删除
      await query(
        `UPDATE telegram_bots 
         SET 
           is_active = false,
           deleted_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [botId]
      );

      // 更新机器人状态记录
      await query(
        `UPDATE telegram_bot_status 
         SET 
           status = 'deleted',
           updated_at = NOW()
         WHERE bot_id = $1`,
        [botId]
      );

      // 记录删除日志
      await query(
        `INSERT INTO bot_logs (
          bot_id,
          level,
          action,
          message,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          botId,
          'info',
          'soft_delete',
          '机器人软删除',
          JSON.stringify({
            reason: reason || '未提供原因',
            deleted_at: new Date().toISOString(),
            operation: 'soft_delete'
          })
        ]
      );

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 机器人软删除成功，ID: ${botId}`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('软删除机器人失败:', error);
      throw new Error(`软删除机器人失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 硬删除机器人（彻底删除所有相关数据）
   */
  static async hardDeleteBot(botId: string, force = false): Promise<void> {
    try {
      // 检查机器人是否存在
      const botResult = await query('SELECT * FROM telegram_bots WHERE id = $1', [botId]);
      if (botResult.rows.length === 0) {
        throw new Error('机器人不存在');
      }

      const bot = botResult.rows[0];

      // 如果机器人还处于活跃状态且没有强制删除标志，抛出错误
      if (bot.is_active && !force) {
        throw new Error('不能删除活跃状态的机器人，请先停用或使用强制删除');
      }

      console.log(`🗑️ 开始硬删除机器人 ${botId}...`);

      // 开始事务
      await query('BEGIN');

      // 按依赖关系顺序删除相关数据
      
      // 1. 删除日志记录
      await query('DELETE FROM bot_logs WHERE bot_id = $1', [botId]);
      console.log('✅ 已删除机器人日志');

      // 2. 删除状态记录
      await query('DELETE FROM telegram_bot_status WHERE bot_id = $1', [botId]);
      console.log('✅ 已删除机器人状态');

      // 3. 删除工作模式配置
      await query('DELETE FROM telegram_bot_work_modes WHERE bot_id = $1', [botId]);
      console.log('✅ 已删除工作模式配置');

      // 4. 删除自定义命令
      await query('DELETE FROM telegram_bot_custom_commands WHERE bot_id = $1', [botId]);
      console.log('✅ 已删除自定义命令');

      // 5. 删除菜单命令
      await query('DELETE FROM telegram_bot_commands WHERE bot_id = $1', [botId]);
      console.log('✅ 已删除菜单命令');

      // 6. 删除用户会话（如果存在）
      try {
        await query('DELETE FROM user_sessions WHERE bot_id = $1', [botId]);
        console.log('✅ 已删除用户会话');
      } catch (error) {
        // 表可能不存在，忽略错误
        console.log('⚠️ 用户会话表不存在，跳过');
      }

      // 7. 删除订单关联（如果存在）
      try {
        await query('UPDATE orders SET bot_id = NULL WHERE bot_id = $1', [botId]);
        console.log('✅ 已清理订单关联');
      } catch (error) {
        // 表可能不存在，忽略错误
        console.log('⚠️ 订单表不存在，跳过');
      }

      // 8. 最后删除机器人主记录
      await query('DELETE FROM telegram_bots WHERE id = $1', [botId]);
      console.log('✅ 已删除机器人主记录');

      // 提交事务
      await query('COMMIT');
      console.log(`🎉 机器人硬删除完成，ID: ${botId}`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('硬删除机器人失败:', error);
      throw new Error(`硬删除机器人失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理Telegram API设置
   */
  static async cleanupTelegramAPI(token: string): Promise<{
    webhookDeleted: boolean;
    commandsCleared: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let webhookDeleted = false;
    let commandsCleared = false;

    try {
      // 删除Webhook
      try {
        const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drop_pending_updates: true })
        });
        
        const webhookResult = await webhookResponse.json();
        if (webhookResult.ok) {
          webhookDeleted = true;
          console.log('✅ Webhook删除成功');
        } else {
          errors.push(`删除Webhook失败: ${webhookResult.description}`);
        }
      } catch (error) {
        errors.push(`删除Webhook时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }

      // 清空命令列表
      try {
        const commandsResponse = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commands: [] })
        });
        
        const commandsResult = await commandsResponse.json();
        if (commandsResult.ok) {
          commandsCleared = true;
          console.log('✅ 命令列表清空成功');
        } else {
          errors.push(`清空命令列表失败: ${commandsResult.description}`);
        }
      } catch (error) {
        errors.push(`清空命令列表时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }

    } catch (error) {
      errors.push(`Telegram API清理时出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return {
      webhookDeleted,
      commandsCleared,
      errors
    };
  }

  /**
   * 完整删除机器人（包括API清理）
   */
  static async completeDeleteBot(
    botId: string,
    options: {
      cleanupAPI?: boolean;
      hardDelete?: boolean;
      force?: boolean;
      reason?: string;
    } = {}
  ): Promise<{
    success: boolean;
    apiCleanup?: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    let apiCleanup: any = null;

    try {
      // 获取机器人信息
      const botResult = await query('SELECT * FROM telegram_bots WHERE id = $1', [botId]);
      if (botResult.rows.length === 0) {
        throw new Error('机器人不存在');
      }

      const bot = botResult.rows[0];
      console.log(`🚀 开始完整删除机器人: ${bot.name} (${bot.bot_username})`);

      // 清理Telegram API设置
      if (options.cleanupAPI && bot.bot_token) {
        try {
          apiCleanup = await this.cleanupTelegramAPI(bot.bot_token);
          if (apiCleanup.errors.length > 0) {
            errors.push(...apiCleanup.errors);
          }
        } catch (error) {
          errors.push(`API清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      // 执行删除操作
      if (options.hardDelete) {
        await this.hardDeleteBot(botId, options.force);
      } else {
        await this.softDeleteBot(botId, options.reason);
      }

      console.log(`🎉 机器人删除完成: ${bot.name}`);

      return {
        success: true,
        apiCleanup,
        errors
      };
    } catch (error) {
      console.error('完整删除机器人失败:', error);
      errors.push(error instanceof Error ? error.message : '未知错误');
      
      return {
        success: false,
        apiCleanup,
        errors
      };
    }
  }

  /**
   * 批量删除机器人
   */
  static async batchDeleteBots(
    botIds: string[],
    options: {
      cleanupAPI?: boolean;
      hardDelete?: boolean;
      force?: boolean;
      reason?: string;
    } = {}
  ): Promise<{
    success: boolean;
    results: Record<string, any>;
    totalErrors: string[];
  }> {
    const results: Record<string, any> = {};
    const totalErrors: string[] = [];

    console.log(`🚀 开始批量删除 ${botIds.length} 个机器人...`);

    for (const botId of botIds) {
      try {
        const result = await this.completeDeleteBot(botId, options);
        results[botId] = result;
        
        if (!result.success) {
          totalErrors.push(...result.errors.map(error => `机器人 ${botId}: ${error}`));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        results[botId] = {
          success: false,
          errors: [errorMessage]
        };
        totalErrors.push(`机器人 ${botId}: ${errorMessage}`);
      }

      // 批量操作间的延迟
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const success = successCount === botIds.length;

    console.log(`📊 批量删除完成: ${successCount}/${botIds.length} 成功`);

    return {
      success,
      results,
      totalErrors
    };
  }

  /**
   * 恢复软删除的机器人
   */
  static async restoreBot(botId: string): Promise<void> {
    try {
      // 检查机器人是否存在且为软删除状态
      const botResult = await query(
        'SELECT * FROM telegram_bots WHERE id = $1 AND deleted_at IS NOT NULL',
        [botId]
      );

      if (botResult.rows.length === 0) {
        throw new Error('机器人不存在或未被软删除');
      }

      // 开始事务
      await query('BEGIN');

      // 恢复机器人状态
      await query(
        `UPDATE telegram_bots 
         SET 
           is_active = true,
           deleted_at = NULL,
           updated_at = NOW()
         WHERE id = $1`,
        [botId]
      );

      // 更新机器人状态记录
      await query(
        `UPDATE telegram_bot_status 
         SET 
           status = 'active',
           updated_at = NOW()
         WHERE bot_id = $1`,
        [botId]
      );

      // 记录恢复日志
      await query(
        `INSERT INTO bot_logs (
          bot_id,
          level,
          action,
          message,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          botId,
          'info',
          'restore',
          '机器人恢复',
          JSON.stringify({
            restored_at: new Date().toISOString(),
            operation: 'restore_from_soft_delete'
          })
        ]
      );

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 机器人恢复成功，ID: ${botId}`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('恢复机器人失败:', error);
      throw new Error(`恢复机器人失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取删除历史
   */
  static async getDeleteHistory(limit = 50): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          bl.bot_id,
          tb.bot_name as bot_name,
          tb.bot_username,
          bl.action as log_type,
          bl.message,
          bl.metadata as data,
          bl.created_at
         FROM bot_logs bl
         LEFT JOIN telegram_bots tb ON bl.bot_id = tb.id
         WHERE bl.action IN ('soft_delete', 'hard_delete', 'restore')
         ORDER BY bl.created_at DESC 
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('获取删除历史失败:', error);
      throw new Error(`获取删除历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理过期的软删除机器人
   */
  static async cleanupExpiredSoftDeletes(daysOld = 30): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // 查找过期的软删除机器人
      const expiredBots = await query(
        `SELECT id, name, bot_username 
         FROM telegram_bots 
         WHERE deleted_at IS NOT NULL 
         AND deleted_at < NOW() - INTERVAL '${daysOld} days'`,
        []
      );

      console.log(`发现 ${expiredBots.rows.length} 个过期的软删除机器人`);

      for (const bot of expiredBots.rows) {
        try {
          await this.hardDeleteBot(bot.id, true);
          cleaned++;
          console.log(`✅ 清理过期机器人: ${bot.name} (${bot.bot_username})`);
        } catch (error) {
          const errorMessage = `清理机器人 ${bot.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      console.log(`🎉 清理完成: ${cleaned}/${expiredBots.rows.length} 成功`);

      return { cleaned, errors };
    } catch (error) {
      console.error('清理过期软删除失败:', error);
      return {
        cleaned,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }
}
