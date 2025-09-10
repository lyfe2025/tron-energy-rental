/**
 * 初始化服务
 * 负责机器人创建过程中的数据库操作和初始化流程
 */
import { query } from '../../../../../config/database.js';
import type { Bot, CreateBotData } from '../../../types.js';

export class InitializationService {
  /**
   * 创建机器人记录到数据库
   */
  static async createBotRecord(data: CreateBotData, config: {
    keyboardConfig: object;
    priceConfig: object;
    description: string;
    shortDescription: string;
  }): Promise<Bot> {
    try {
      const result = await query(
        `INSERT INTO telegram_bots (
          name, 
          bot_username, 
          bot_token, 
          description,
          short_description,
          is_active, 
          work_mode, 
          webhook_url,
          webhook_secret,
          keyboard_config,
          price_config,
          network_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) 
        RETURNING *`,
        [
          data.name,
          data.username,
          data.token,
          config.description,
          config.shortDescription,
          true, // is_active
          data.work_mode || 'polling',
          data.webhook_url || null,
          data.webhook_secret || null,
          JSON.stringify(config.keyboardConfig),
          JSON.stringify(config.priceConfig),
          data.network_id || 1
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('创建机器人记录失败');
      }

      const bot = result.rows[0];
      console.log(`机器人记录创建成功，ID: ${bot.id}`);
      return bot;
    } catch (error) {
      console.error('创建机器人记录失败:', error);
      throw new Error(`创建机器人记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 保存菜单命令配置
   */
  static async saveMenuCommands(botId: string | number, commands: any[]): Promise<void> {
    try {
      // 删除现有命令
      await query('DELETE FROM telegram_bot_commands WHERE bot_id = $1', [botId]);

      // 插入新命令
      if (commands.length > 0) {
        const values = commands.map((cmd, index) => 
          `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`
        ).join(', ');

        const params = [botId];
        commands.forEach(cmd => {
          params.push(cmd.command, cmd.description, cmd.scope || 'default');
        });

        await query(
          `INSERT INTO telegram_bot_commands (bot_id, command, description, scope) VALUES ${values}`,
          params
        );
      }

      console.log(`机器人 ${botId} 菜单命令保存成功，共 ${commands.length} 个命令`);
    } catch (error) {
      console.error('保存菜单命令失败:', error);
      throw new Error(`保存菜单命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 保存自定义命令配置
   */
  static async saveCustomCommands(botId: string | number, commands: any[]): Promise<void> {
    try {
      // 删除现有自定义命令
      await query('DELETE FROM telegram_bot_custom_commands WHERE bot_id = $1', [botId]);

      // 插入新的自定义命令
      if (commands.length > 0) {
        const values = commands.map((_, index) => 
          `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
        ).join(', ');

        const params = [botId];
        commands.forEach(cmd => {
          params.push(
            cmd.command,
            cmd.response_message,
            cmd.response_type || 'text',
            cmd.keyboard_config ? JSON.stringify(cmd.keyboard_config) : null
          );
        });

        await query(
          `INSERT INTO telegram_bot_custom_commands (bot_id, command, response_message, response_type, keyboard_config) 
           VALUES ${values}`,
          params
        );
      }

      console.log(`机器人 ${botId} 自定义命令保存成功，共 ${commands.length} 个命令`);
    } catch (error) {
      console.error('保存自定义命令失败:', error);
      throw new Error(`保存自定义命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 初始化机器人状态记录
   */
  static async initializeBotStatus(botId: string | number): Promise<void> {
    try {
      await query(
        `INSERT INTO telegram_bot_status (
          bot_id,
          status,
          last_activity,
          message_count,
          error_count,
          uptime_seconds,
          created_at,
          updated_at
        ) VALUES ($1, $2, NOW(), 0, 0, 0, NOW(), NOW())
        ON CONFLICT (bot_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [botId, 'initialized']
      );

      console.log(`机器人 ${botId} 状态记录初始化成功`);
    } catch (error) {
      console.error('初始化机器人状态失败:', error);
      throw new Error(`初始化机器人状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建机器人工作模式配置
   */
  static async createWorkModeConfig(botId: string | number, workMode: string, webhookUrl?: string): Promise<void> {
    try {
      const configData = {
        mode: workMode,
        webhook_url: webhookUrl || null,
        polling_interval: workMode === 'polling' ? 2000 : null,
        webhook_max_connections: workMode === 'webhook' ? 40 : null,
        allowed_updates: ['message', 'callback_query', 'inline_query']
      };

      await query(
        `INSERT INTO telegram_bot_work_modes (
          bot_id,
          mode,
          config,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, true, NOW(), NOW())
        ON CONFLICT (bot_id) 
        DO UPDATE SET 
          mode = EXCLUDED.mode,
          config = EXCLUDED.config,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [botId, workMode, JSON.stringify(configData)]
      );

      console.log(`机器人 ${botId} 工作模式配置创建成功: ${workMode}`);
    } catch (error) {
      console.error('创建工作模式配置失败:', error);
      throw new Error(`创建工作模式配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录机器人创建日志
   */
  static async logBotCreation(botId: string | number, data: CreateBotData, networkSetupResult: any): Promise<void> {
    try {
      const logData = {
        bot_id: botId,
        action: 'create',
        details: {
          name: data.name,
          username: data.username,
          work_mode: data.work_mode || 'polling',
          network_id: data.network_id || 1,
          network_setup_result: networkSetupResult,
          timestamp: new Date().toISOString()
        }
      };

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
          'creation',
          `机器人创建: ${data.name} (@${data.username})`,
          JSON.stringify(logData)
        ]
      );

      console.log(`机器人 ${botId} 创建日志记录成功`);
    } catch (error) {
      console.error('记录机器人创建日志失败:', error);
      // 日志失败不应该影响创建流程，只记录错误
    }
  }

  /**
   * 验证机器人数据完整性
   */
  static async verifyBotData(botId: string | number): Promise<{
    isValid: boolean;
    missingData: string[];
  }> {
    const missingData: string[] = [];

    try {
      // 检查主要机器人记录
      const botResult = await query('SELECT * FROM telegram_bots WHERE id = $1', [botId]);
      if (botResult.rows.length === 0) {
        missingData.push('机器人主记录');
        return { isValid: false, missingData };
      }

      const bot = botResult.rows[0];

      // 检查必要字段
      if (!bot.name) missingData.push('机器人名称');
      if (!bot.bot_username) missingData.push('机器人用户名');
      if (!bot.bot_token) missingData.push('机器人Token');
      if (!bot.keyboard_config) missingData.push('键盘配置');
      if (!bot.price_config) missingData.push('价格配置');

      // 检查状态记录
      const statusResult = await query('SELECT * FROM telegram_bot_status WHERE bot_id = $1', [botId]);
      if (statusResult.rows.length === 0) {
        missingData.push('机器人状态记录');
      }

      // 检查工作模式配置
      const workModeResult = await query('SELECT * FROM telegram_bot_work_modes WHERE bot_id = $1', [botId]);
      if (workModeResult.rows.length === 0) {
        missingData.push('工作模式配置');
      }

      return {
        isValid: missingData.length === 0,
        missingData
      };
    } catch (error) {
      console.error('验证机器人数据失败:', error);
      return {
        isValid: false,
        missingData: ['数据验证失败']
      };
    }
  }

  /**
   * 回滚机器人创建（删除所有相关记录）
   */
  static async rollbackBotCreation(botId: string | number): Promise<void> {
    try {
      console.log(`开始回滚机器人 ${botId} 的创建...`);

      // 删除相关记录（按依赖顺序）
      await query('DELETE FROM bot_logs WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bot_status WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bot_work_modes WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bot_custom_commands WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bot_commands WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bots WHERE id = $1', [botId]);

      console.log(`机器人 ${botId} 回滚完成`);
    } catch (error) {
      console.error('回滚机器人创建失败:', error);
      throw new Error(`回滚机器人创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 完整的机器人初始化流程
   */
  static async initializeBot(
    data: CreateBotData,
    config: {
      keyboardConfig: object;
      priceConfig: object;
      menuCommands: any[];
      customCommands: any[];
      description: string;
      shortDescription: string;
    },
    networkSetupResult: any
  ): Promise<Bot> {
    let botId: string | null = null;

    try {
      // 1. 创建机器人主记录
      const bot = await this.createBotRecord(data, config);
      botId = bot.id;

      // 2. 保存菜单命令
      await this.saveMenuCommands(bot.id, config.menuCommands);

      // 3. 保存自定义命令
      await this.saveCustomCommands(bot.id, config.customCommands);

      // 4. 初始化机器人状态
      await this.initializeBotStatus(bot.id);

      // 5. 创建工作模式配置
      await this.createWorkModeConfig(bot.id, data.work_mode || 'polling', data.webhook_url);

      // 6. 记录创建日志
      await this.logBotCreation(bot.id, data, networkSetupResult);

      // 7. 验证数据完整性
      const verification = await this.verifyBotData(bot.id);
      if (!verification.isValid) {
        throw new Error(`数据完整性验证失败: ${verification.missingData.join(', ')}`);
      }

      console.log(`机器人 ${bot.id} 初始化完成`);
      return bot;
    } catch (error) {
      console.error('机器人初始化失败:', error);
      
      // 发生错误时回滚
      if (botId) {
        try {
          await this.rollbackBotCreation(botId);
        } catch (rollbackError) {
          console.error('回滚失败:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * 检查机器人名称和用户名的可用性
   */
  static async checkAvailability(name: string, username: string): Promise<{
    nameAvailable: boolean;
    usernameAvailable: boolean;
    conflicts: string[];
  }> {
    const conflicts: string[] = [];

    try {
      // 检查名称是否重复
      const nameResult = await query(
        'SELECT id FROM telegram_bots WHERE name = $1',
        [name]
      );
      const nameAvailable = nameResult.rows.length === 0;
      if (!nameAvailable) {
        conflicts.push(`名称 "${name}" 已被使用`);
      }

      // 检查用户名是否重复
      const usernameResult = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1',
        [username]
      );
      const usernameAvailable = usernameResult.rows.length === 0;
      if (!usernameAvailable) {
        conflicts.push(`用户名 "@${username}" 已被使用`);
      }

      return {
        nameAvailable,
        usernameAvailable,
        conflicts
      };
    } catch (error) {
      console.error('检查可用性失败:', error);
      throw new Error('检查名称和用户名可用性失败');
    }
  }
}
