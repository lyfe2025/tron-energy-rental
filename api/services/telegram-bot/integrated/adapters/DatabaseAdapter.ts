/**
 * 数据库适配器
 * 负责数据库操作的封装和抽象
 */
import { query } from '../../../../config/database.js';

export class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  private connectionPool: any;

  private constructor() {
    // 单例模式，确保只有一个数据库连接管理器
  }

  static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  /**
   * 根据Token获取机器人配置
   */
  async getBotConfigByToken(token: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT tb.*, tn.* 
         FROM telegram_bots tb
         LEFT JOIN tron_networks tn ON tb.network_id = tn.id
         WHERE tb.bot_token = $1 AND tb.is_active = true`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        bot: {
          id: row.id,
          name: row.name,
          bot_username: row.bot_username,
          bot_token: row.bot_token,
          description: row.description,
          short_description: row.short_description,
          is_active: row.is_active,
          work_mode: row.work_mode,
          webhook_url: row.webhook_url,
          webhook_secret: row.webhook_secret,
          max_connections: row.max_connections,
          settings: row.settings,
          welcome_message: row.welcome_message,
          help_message: row.help_message,
          keyboard_config: row.keyboard_config,
          price_config: row.price_config,
          network_id: row.network_id,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        network: row.network_id ? {
          id: row.network_id,
          name: row.name_1 || row.network_name, // 处理可能的字段名冲突
          api_url: row.api_url,
          api_key: row.api_key,
          is_testnet: row.is_testnet,
          is_active: row.is_active_1 || row.network_active,
          created_at: row.network_created_at,
          updated_at: row.network_updated_at
        } : null
      };
    } catch (error) {
      console.error('获取机器人配置失败:', error);
      throw new Error(`获取机器人配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 根据ID获取机器人配置
   */
  async getBotConfigById(botId: string): Promise<any | null> {
    try {
      const result = await query(
        `SELECT tb.*, tn.* 
         FROM telegram_bots tb
         LEFT JOIN tron_networks tn ON tb.network_id = tn.id
         WHERE tb.id = $1`,
        [botId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatBotConfigRow(result.rows[0]);
    } catch (error) {
      console.error('获取机器人配置失败:', error);
      throw new Error(`获取机器人配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取机器人命令配置
   */
  async getBotCommands(botId: string): Promise<any[]> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bot_commands WHERE bot_id = $1 ORDER BY id',
        [botId]
      );

      return result.rows;
    } catch (error) {
      console.error('获取机器人命令失败:', error);
      throw new Error(`获取机器人命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取机器人自定义命令
   */
  async getBotCustomCommands(botId: string): Promise<any[]> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bot_custom_commands WHERE bot_id = $1 ORDER BY id',
        [botId]
      );

      return result.rows;
    } catch (error) {
      console.error('获取机器人自定义命令失败:', error);
      throw new Error(`获取机器人自定义命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取机器人状态
   */
  async getBotStatus(botId: string): Promise<any | null> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bot_status WHERE bot_id = $1',
        [botId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('获取机器人状态失败:', error);
      throw new Error(`获取机器人状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人状态
   */
  async updateBotStatus(
    botId: string, 
    status: string,
    metadata?: any
  ): Promise<void> {
    try {
      await query(
        `UPDATE telegram_bots 
         SET health_status = $2, 
             last_health_check = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [botId, status]
      );
    } catch (error) {
      console.error('更新机器人状态失败:', error);
      throw new Error(`更新机器人状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录机器人日志
   */
  async logBotActivity(
    botId: string,
    logType: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO telegram_bot_logs 
         (bot_id, log_type, message, data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [botId, logType, message, data ? JSON.stringify(data) : null]
      );
    } catch (error) {
      console.error('记录机器人日志失败:', error);
      // 日志失败不应该中断主流程
    }
  }

  /**
   * 获取网络配置
   */
  async getNetworkConfig(networkId: number): Promise<any | null> {
    try {
      const result = await query(
        'SELECT * FROM tron_networks WHERE id = $1 AND is_active = true',
        [networkId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('获取网络配置失败:', error);
      throw new Error(`获取网络配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取所有活跃的机器人配置
   */
  async getAllActiveBots(): Promise<any[]> {
    try {
      const result = await query(
        `SELECT tb.*, tn.* 
         FROM telegram_bots tb
         LEFT JOIN tron_networks tn ON tb.network_id = tn.id
         WHERE tb.is_active = true
         ORDER BY tb.created_at DESC`
      );

      return result.rows.map(row => this.formatBotConfigRow(row));
    } catch (error) {
      console.error('获取所有活跃机器人失败:', error);
      throw new Error(`获取所有活跃机器人失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人最后活动时间
   */
  async updateLastActivity(botId: string): Promise<void> {
    try {
      await query(
        `UPDATE telegram_bot_status 
         SET last_activity = NOW(), updated_at = NOW()
         WHERE bot_id = $1`,
        [botId]
      );
    } catch (error) {
      console.error('更新最后活动时间失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 增加消息计数
   */
  async incrementMessageCount(botId: string): Promise<void> {
    try {
      await query(
        `UPDATE telegram_bot_status 
         SET message_count = message_count + 1, updated_at = NOW()
         WHERE bot_id = $1`,
        [botId]
      );
    } catch (error) {
      console.error('增加消息计数失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 增加错误计数
   */
  async incrementErrorCount(botId: string): Promise<void> {
    try {
      await query(
        `UPDATE telegram_bot_status 
         SET error_count = error_count + 1, updated_at = NOW()
         WHERE bot_id = $1`,
        [botId]
      );
    } catch (error) {
      console.error('增加错误计数失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取机器人工作模式配置
   */
  async getWorkModeConfig(botId: string): Promise<any | null> {
    try {
      const result = await query(
        'SELECT * FROM telegram_bot_work_modes WHERE bot_id = $1 AND is_active = true',
        [botId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('获取工作模式配置失败:', error);
      throw new Error(`获取工作模式配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查机器人是否存在且活跃
   */
  async isBotActive(botId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT is_active FROM telegram_bots WHERE id = $1',
        [botId]
      );

      return result.rows.length > 0 && result.rows[0].is_active;
    } catch (error) {
      console.error('检查机器人状态失败:', error);
      return false;
    }
  }

  /**
   * 获取机器人统计信息
   */
  async getBotStats(botId: string): Promise<any> {
    try {
      const statusResult = await query(
        'SELECT * FROM telegram_bot_status WHERE bot_id = $1',
        [botId]
      );

      const logsResult = await query(
        `SELECT COUNT(*) as total_logs,
                COUNT(CASE WHEN log_type = 'error' THEN 1 END) as error_logs,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_logs
         FROM telegram_bot_logs 
         WHERE bot_id = $1`,
        [botId]
      );

      return {
        status: statusResult.rows.length > 0 ? statusResult.rows[0] : null,
        logs: logsResult.rows.length > 0 ? logsResult.rows[0] : null
      };
    } catch (error) {
      console.error('获取机器人统计信息失败:', error);
      throw new Error(`获取机器人统计信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量获取机器人配置
   */
  async getBatchBotConfigs(botIds: string[]): Promise<Map<string, any>> {
    if (botIds.length === 0) {
      return new Map();
    }

    try {
      const placeholders = botIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await query(
        `SELECT tb.*, tn.* 
         FROM telegram_bots tb
         LEFT JOIN tron_networks tn ON tb.network_id = tn.id
         WHERE tb.id IN (${placeholders})`,
        botIds
      );

      const configMap = new Map();
      result.rows.forEach(row => {
        configMap.set(row.id.toString(), this.formatBotConfigRow(row));
      });

      return configMap;
    } catch (error) {
      console.error('批量获取机器人配置失败:', error);
      throw new Error(`批量获取机器人配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 格式化数据库行数据
   */
  private formatBotConfigRow(row: any): any {
    return {
      bot: {
        id: row.id,
        name: row.name,
        bot_username: row.bot_username,
        bot_token: row.bot_token,
        description: row.description,
        short_description: row.short_description,
        is_active: row.is_active,
        work_mode: row.work_mode,
        webhook_url: row.webhook_url,
        webhook_secret: row.webhook_secret,
        max_connections: row.max_connections,
        settings: row.settings,
        welcome_message: row.welcome_message,
        help_message: row.help_message,
        keyboard_config: row.keyboard_config,
        price_config: row.price_config,
        network_id: row.network_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      network: row.network_id ? {
        id: row.network_id,
        name: row.network_name || row.name_1,
        api_url: row.api_url,
        api_key: row.api_key,
        is_testnet: row.is_testnet,
        is_active: row.network_active || row.is_active_1,
        created_at: row.network_created_at,
        updated_at: row.network_updated_at
      } : null
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await query('SELECT 1');
      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency
      };
    } catch (error) {
      return {
        connected: false,
        latency: -1,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 清理过期的日志记录
   */
  async cleanupOldLogs(daysOld = 30): Promise<number> {
    try {
      const result = await query(
        'DELETE FROM telegram_bot_logs WHERE created_at < NOW() - INTERVAL $1 DAY',
        [daysOld]
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('清理过期日志失败:', error);
      throw new Error(`清理过期日志失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}
