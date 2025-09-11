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
    description: string;
    shortDescription: string;
  }): Promise<Bot> {
    try {
      // 获取网络配置信息
      const networkId = data.network_id || '07e9d3d0-8431-41b0-b96b-ab94d5d55a63';
      const networkResult = await query('SELECT * FROM tron_networks WHERE id = $1', [networkId]);
      
      if (networkResult.rows.length === 0) {
        throw new Error(`网络配置不存在: ${networkId}`);
      }
      
      const networkConfig = networkResult.rows[0];
      
      // 构建网络配置数组
      const networkConfigurations = [{
        id: networkConfig.id,
        network_id: networkConfig.id,
        network_name: networkConfig.name,
        network_type: networkConfig.network_type,
        rpc_url: networkConfig.rpc_url,
        is_active: networkConfig.is_active,
        is_primary: true, // 默认网络设为主网络
        priority: 1,
        config: networkConfig.config || {},
        api_settings: {
          api_key: networkConfig.api_key,
          timeout: networkConfig.timeout_ms || 30000,
          retry_count: networkConfig.retry_count || 3
        },
        contract_addresses: (networkConfig.config && networkConfig.config.contract_addresses) || {},
        gas_settings: (networkConfig.config && networkConfig.config.gas_settings) || {},
        monitoring_settings: {
          enabled: true,
          check_interval: 60000
        },
        sync_status: 'success',
        error_count: 0
      }];

      // 定义默认消息
      const defaultWelcomeMessage = `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，{first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助`;

      const defaultHelpMessage = `📖 TRON能量租赁机器人使用指南

🤖 基础命令：
• /start - 启动机器人
• /menu - 显示主菜单
• /help - 显示帮助信息
• /balance - 查询账户余额
• /orders - 查看订单历史

🔋 能量租赁流程：
1️⃣ 选择能量套餐
2️⃣ 输入接收地址
3️⃣ 确认订单信息
4️⃣ 完成支付
5️⃣ 等待能量到账

💡 注意事项：
• 请确保TRON地址正确
• 支付后请耐心等待确认
• 能量有效期为24小时

🆘 如需帮助，请联系客服`;

      const result = await query(
        `INSERT INTO telegram_bots (
          bot_name, 
          bot_username, 
          bot_token, 
          description,
          short_description,
          welcome_message,
          help_message,
          is_active, 
          work_mode, 
          webhook_url,
          webhook_secret,
          keyboard_config,
          network_id,
          network_configurations,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()) 
        RETURNING *`,
        [
          data.name,
          data.username,
          data.token,
          config.description,
          config.shortDescription,
          data.welcome_message || defaultWelcomeMessage,
          data.help_message || defaultHelpMessage,
          true, // is_active
          data.work_mode || 'polling',
          data.webhook_url || null,
          data.webhook_secret || null,
          JSON.stringify(config.keyboardConfig),
          networkId,
          JSON.stringify(networkConfigurations)
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('创建机器人记录失败');
      }

      const bot = result.rows[0];
      console.log(`机器人记录创建成功，ID: ${bot.id}，已设置网络配置: ${networkConfig.name}`);
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
      // 直接更新 telegram_bots 表中的 menu_commands 字段
      await query(
        'UPDATE telegram_bots SET menu_commands = $1 WHERE id = $2',
        [JSON.stringify(commands), botId]
      );

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
      // 直接更新 telegram_bots 表中的 custom_commands 字段
      await query(
        'UPDATE telegram_bots SET custom_commands = $1 WHERE id = $2',
        [JSON.stringify(commands), botId]
      );

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
      // 更新 telegram_bots 表中的工作模式相关字段
      await query(
        `UPDATE telegram_bots SET 
          work_mode = $1,
          webhook_url = $2,
          max_connections = $3,
          updated_at = NOW()
        WHERE id = $4`,
        [
          workMode,
          webhookUrl || null,
          workMode === 'webhook' ? 40 : null,
          botId
        ]
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
          network_id: data.network_id || '07e9d3d0-8431-41b0-b96b-ab94d5d55a63',
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
      if (!bot.bot_name) missingData.push('机器人名称');
      if (!bot.bot_username) missingData.push('机器人用户名');
      if (!bot.bot_token) missingData.push('机器人Token');
      if (!bot.keyboard_config) missingData.push('键盘配置');
      // 价格配置现在从 price_configs 表动态获取，不再验证此字段

      // 检查状态记录
      const statusResult = await query('SELECT * FROM telegram_bot_status WHERE bot_id = $1', [botId]);
      if (statusResult.rows.length === 0) {
        missingData.push('机器人状态记录');
      }

      // 检查工作模式配置 - 检查主表中的 work_mode 字段
      if (!botResult.rows[0].work_mode) {
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

      // 删除相关记录（只删除存在的表）
      await query('DELETE FROM bot_logs WHERE bot_id = $1', [botId]);
      await query('DELETE FROM telegram_bot_status WHERE bot_id = $1', [botId]);
      // telegram_bot_work_modes, telegram_bot_custom_commands, telegram_bot_commands 表不存在
      // 相关数据存储在 telegram_bots 表的 JSONB 字段中，删除主记录时会一并删除
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
