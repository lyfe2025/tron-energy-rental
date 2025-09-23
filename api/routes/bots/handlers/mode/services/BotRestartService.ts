/**
 * 机器人重启服务
 * 处理机器人模式切换后的重启和状态管理
 */
import { query } from '../../../../../config/database.ts';

export interface RestartResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * 机器人重启服务类
 */
export class BotRestartService {
  /**
   * 更新机器人工作模式到数据库
   * @param botId 机器人ID
   * @param workMode 工作模式
   * @param webhookUrl Webhook URL
   * @param webhookSecret Webhook密钥
   * @param maxConnections 最大连接数
   */
  static async updateBotWorkMode(
    botId: string,
    workMode: string,
    webhookUrl?: string,
    webhookSecret?: string,
    maxConnections?: number
  ): Promise<RestartResult> {
    try {
      const updateResult = await query(
        `UPDATE telegram_bots 
         SET work_mode = $1, webhook_url = $2, webhook_secret = $3, 
             max_connections = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING 
           id, bot_name as name, bot_username as username,
           CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
           work_mode, webhook_url, webhook_secret, max_connections`,
        [workMode, webhookUrl || null, webhookSecret || null, 
         maxConnections || 40, botId]
      );
      
      if (updateResult.rows.length === 0) {
        return {
          success: false,
          message: '更新机器人配置失败'
        };
      }
      
      const updatedBot = updateResult.rows[0];
      
      return {
        success: true,
        message: `机器人已切换到${workMode === 'webhook' ? 'Webhook' : 'Polling'}模式`,
        data: {
          bot: updatedBot
        }
      };
      
    } catch (error) {
      console.error('更新机器人工作模式错误:', error);
      return {
        success: false,
        message: '数据库更新失败'
      };
    }
  }

  /**
   * 标记机器人需要重启
   * @param botId 机器人ID
   * @param reason 重启原因
   */
  static async markBotForRestart(botId: string, reason: string): Promise<RestartResult> {
    try {
      await query(
        'UPDATE telegram_bots SET needs_restart = true, restart_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [reason, botId]
      );
      
      return {
        success: true,
        message: '机器人已标记为需要重启'
      };
      
    } catch (error) {
      console.error('标记机器人重启错误:', error);
      return {
        success: false,
        message: '标记重启失败'
      };
    }
  }

  /**
   * 检查机器人是否正在运行
   * @param botId 机器人ID
   */
  static async checkBotRunningStatus(botId: string): Promise<RestartResult> {
    try {
      const botResult = await query(
        'SELECT id, is_active, work_mode, last_heartbeat FROM telegram_bots WHERE id = $1',
        [botId]
      );
      
      if (botResult.rows.length === 0) {
        return {
          success: false,
          message: '机器人不存在'
        };
      }
      
      const bot = botResult.rows[0];
      const now = new Date();
      const lastHeartbeat = bot.last_heartbeat ? new Date(bot.last_heartbeat) : null;
      
      // 如果最后心跳超过5分钟，认为机器人离线
      const isOnline = lastHeartbeat && 
        (now.getTime() - lastHeartbeat.getTime()) < 5 * 60 * 1000;
      
      return {
        success: true,
        message: '机器人状态检查完成',
        data: {
          is_active: bot.is_active,
          is_online: isOnline,
          work_mode: bot.work_mode,
          last_heartbeat: lastHeartbeat
        }
      };
      
    } catch (error) {
      console.error('检查机器人状态错误:', error);
      return {
        success: false,
        message: '状态检查失败'
      };
    }
  }

  /**
   * 等待机器人重启完成
   * @param botId 机器人ID
   * @param timeout 超时时间（毫秒）
   * @param checkInterval 检查间隔（毫秒）
   */
  static async waitForBotRestart(
    botId: string,
    timeout: number = 30000,
    checkInterval: number = 2000
  ): Promise<RestartResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const statusResult = await this.checkBotRunningStatus(botId);
      
      if (statusResult.success && statusResult.data?.is_online) {
        return {
          success: true,
          message: '机器人重启完成',
          data: statusResult.data
        };
      }
      
      // 等待检查间隔
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return {
      success: false,
      message: '等待机器人重启超时'
    };
  }

  /**
   * 触发机器人软重启（不重启进程，只重新加载配置）
   * @param botId 机器人ID
   */
  static async triggerSoftRestart(botId: string): Promise<RestartResult> {
    try {
      // 设置重启标志
      await query(
        'UPDATE telegram_bots SET config_updated = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [botId]
      );
      
      // 这里可以添加发送信号或通知机器人进程重新加载配置的逻辑
      // 例如：通过Redis发布消息、调用内部API等
      
      return {
        success: true,
        message: '软重启信号已发送'
      };
      
    } catch (error) {
      console.error('触发软重启错误:', error);
      return {
        success: false,
        message: '软重启触发失败'
      };
    }
  }

  /**
   * 清理重启标志
   * @param botId 机器人ID
   */
  static async clearRestartFlags(botId: string): Promise<RestartResult> {
    try {
      await query(
        `UPDATE telegram_bots 
         SET needs_restart = false, restart_reason = null, config_updated = false, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [botId]
      );
      
      return {
        success: true,
        message: '重启标志已清理'
      };
      
    } catch (error) {
      console.error('清理重启标志错误:', error);
      return {
        success: false,
        message: '清理重启标志失败'
      };
    }
  }

  /**
   * 获取所有需要重启的机器人
   */
  static async getBotsNeedingRestart(): Promise<RestartResult> {
    try {
      const result = await query(
        'SELECT id, bot_name, restart_reason FROM telegram_bots WHERE needs_restart = true'
      );
      
      return {
        success: true,
        message: '获取需要重启的机器人列表成功',
        data: {
          bots: result.rows
        }
      };
      
    } catch (error) {
      console.error('获取需要重启的机器人错误:', error);
      return {
        success: false,
        message: '获取机器人列表失败'
      };
    }
  }

  /**
   * 执行完整的模式切换流程
   * @param botId 机器人ID
   * @param workMode 工作模式
   * @param webhookUrl Webhook URL
   * @param webhookSecret Webhook密钥
   * @param maxConnections 最大连接数
   */
  static async executeModeSwitchFlow(
    botId: string,
    workMode: string,
    webhookUrl?: string,
    webhookSecret?: string,
    maxConnections?: number
  ): Promise<RestartResult> {
    try {
      // 1. 更新数据库配置
      const updateResult = await this.updateBotWorkMode(
        botId, workMode, webhookUrl, webhookSecret, maxConnections
      );
      
      if (!updateResult.success) {
        return updateResult;
      }
      
      // 2. 标记机器人需要重启
      await this.markBotForRestart(botId, `切换到${workMode}模式`);
      
      // 3. 触发软重启
      await this.triggerSoftRestart(botId);
      
      return {
        success: true,
        message: `机器人模式切换完成，已切换到${workMode === 'webhook' ? 'Webhook' : 'Polling'}模式`,
        data: updateResult.data
      };
      
    } catch (error) {
      console.error('执行模式切换流程错误:', error);
      return {
        success: false,
        message: '模式切换流程执行失败'
      };
    }
  }
}
