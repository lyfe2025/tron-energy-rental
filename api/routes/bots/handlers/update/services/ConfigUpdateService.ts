/**
 * 配置更新服务
 * 负责更新机器人配置到数据库
 */
import { query } from '../../../../../config/database.ts';
import { buildUpdateFields } from '../../../middleware.ts';
import type { Bot, UpdateBotData } from '../../../types.ts';

export class ConfigUpdateService {
  /**
   * 处理webhook URL的自动补全
   */
  static async processWebhookUrl(botId: string, webhookUrl: string): Promise<string> {
    if (!webhookUrl) return webhookUrl;

    // 获取机器人用户名
    const botResult = await query('SELECT bot_username FROM telegram_bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      console.warn(`机器人 ${botId} 不存在，无法处理webhook URL`);
      return webhookUrl;
    }

    const botUsername = botResult.rows[0].bot_username;
    if (!botUsername) {
      console.warn(`机器人 ${botId} 没有用户名，无法自动添加到webhook URL`);
      return webhookUrl;
    }

    // 移除末尾斜杠
    const cleanUrl = webhookUrl.replace(/\/+$/, '');
    
    // 检查是否已经包含机器人用户名
    if (cleanUrl.endsWith(`/${botUsername}`)) {
      return webhookUrl;
    }

    // 检查是否是标准的webhook路径（应该添加机器人用户名）
    const isStandardWebhookPath = cleanUrl.endsWith('/api/telegram/webhook') || 
                                  cleanUrl.match(/\/api\/telegram\/webhook$/);
    
    if (isStandardWebhookPath) {
      // 这是标准的webhook路径，应该添加机器人用户名
      const finalUrl = `${cleanUrl}/${botUsername}`;
      console.log(`✅ 自动添加机器人用户名到webhook URL: ${finalUrl}`);
      return finalUrl;
    }

    // 检查是否包含其他可能的机器人标识符（但排除webhook这样的标准路径）
    const lastSegmentMatch = cleanUrl.match(/\/([a-zA-Z0-9_]+)$/);
    if (lastSegmentMatch) {
      const lastSegment = lastSegmentMatch[1];
      // 如果最后一段是webhook或其他标准路径组件，则应该添加机器人用户名
      if (lastSegment === 'webhook' || lastSegment === 'telegram' || lastSegment === 'api') {
        const finalUrl = `${cleanUrl}/${botUsername}`;
        console.log(`✅ 自动添加机器人用户名到webhook URL: ${finalUrl}`);
        return finalUrl;
      } else {
        // 最后一段可能是其他机器人的用户名，保持原样
        console.log(`⚠️ Webhook URL 可能包含其他机器人标识符，保持原样: ${webhookUrl}`);
        return webhookUrl;
      }
    }

    // 其他情况，直接添加机器人用户名
    const finalUrl = `${cleanUrl}/${botUsername}`;
    console.log(`✅ 自动添加机器人用户名到webhook URL: ${finalUrl}`);
    return finalUrl;
  }

  /**
   * 更新机器人基本信息
   */
  static async updateBotBasicInfo(botId: string, updateData: UpdateBotData): Promise<Bot> {
    try {
      // 预处理 webhook_url
      if (updateData.webhook_url !== undefined) {
        updateData.webhook_url = await ConfigUpdateService.processWebhookUrl(botId, updateData.webhook_url);
      }

      // 构建更新字段
      const { updateFields: fields, updateValues: values } = buildUpdateFields(updateData);
      
      if (fields.length === 0) {
        // 如果没有更新字段，返回当前数据
        const result = await query('SELECT * FROM telegram_bots WHERE id = $1', [botId]);
        return result.rows[0];
      }

      // 添加 updated_at 字段
      fields.push('updated_at = NOW()');
      values.push(botId);

      const updateQuery = `
        UPDATE telegram_bots 
        SET ${fields.join(', ')} 
        WHERE id = $${values.length} 
        RETURNING *
      `;

      console.log('执行更新查询:', updateQuery);
      console.log('更新参数:', values);

      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('更新失败，机器人可能不存在');
      }

      const updatedBot = result.rows[0];
      console.log(`✅ 机器人基本信息更新成功，ID: ${updatedBot.id}`);
      
      return updatedBot;
    } catch (error) {
      console.error('更新机器人基本信息失败:', error);
      throw new Error(`更新机器人基本信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人命令配置
   */
  static async updateBotCommands(botId: string, commands: any[]): Promise<void> {
    try {
      console.log(`🔄 更新机器人菜单命令: ${botId}, 命令数量: ${commands?.length || 0}`);
      
      // 直接更新 telegram_bots 表的 menu_commands 字段
      await query(
        'UPDATE telegram_bots SET menu_commands = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(commands || []), botId]
      );

      console.log(`✅ 机器人菜单命令更新成功，共 ${commands?.length || 0} 个命令`);
    } catch (error) {
      console.error('更新机器人菜单命令失败:', error);
      throw new Error(`更新机器人菜单命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人自定义命令
   */
  static async updateCustomCommands(botId: string, customCommands: any[]): Promise<void> {
    try {
      console.log(`🔄 更新机器人自定义命令: ${botId}, 命令数量: ${customCommands?.length || 0}`);
      
      // 直接更新 telegram_bots 表的 custom_commands 字段
      await query(
        'UPDATE telegram_bots SET custom_commands = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(customCommands || []), botId]
      );

      console.log(`✅ 自定义命令更新成功，共 ${customCommands?.length || 0} 个命令`);
    } catch (error) {
      console.error('更新自定义命令失败:', error);
      throw new Error(`更新自定义命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人状态
   */
  static async updateBotStatus(
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

      console.log(`✅ 机器人状态更新成功: ${status}`);
    } catch (error) {
      console.error('更新机器人状态失败:', error);
      throw new Error(`更新机器人状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新工作模式配置
   */
  static async updateWorkModeConfig(
    botId: string,
    workMode: string,
    config: any
  ): Promise<void> {
    try {
      await query(
        `UPDATE telegram_bot_work_modes 
         SET mode = $1, config = $2, updated_at = NOW()
         WHERE bot_id = $3`,
        [workMode, JSON.stringify(config), botId]
      );

      console.log(`✅ 工作模式配置更新成功: ${workMode}`);
    } catch (error) {
      console.error('更新工作模式配置失败:', error);
      throw new Error(`更新工作模式配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录更新日志
   */
  static async logUpdate(
    botId: string,
    updateData: UpdateBotData,
    syncResult: any,
    userId?: string
  ): Promise<void> {
    try {
      const logData = {
        bot_id: botId,
        action: 'update',
        updated_fields: Object.keys(updateData),
        sync_result: syncResult,
        user_id: userId || null,
        timestamp: new Date().toISOString()
      };

      await query(
        `INSERT INTO bot_logs (
          bot_id,
          level,
          message,
          action,
          context,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          botId,
          'info',
          `机器人信息更新: ${Object.keys(updateData).join(', ')}`,
          'update',
          JSON.stringify(logData)
        ]
      );

      console.log(`✅ 更新日志记录成功`);
    } catch (error) {
      console.error('记录更新日志失败:', error);
      // 日志失败不应该影响更新流程
    }
  }

  /**
   * 批量更新配置
   */
  static async batchUpdateConfigs(
    botId: string,
    configs: {
      keyboardConfig?: any;
      priceConfig?: any;
      menuCommands?: any[];
      customCommands?: any[];
      workModeConfig?: any;
    }
  ): Promise<void> {
    try {
      // 开始事务
      await query('BEGIN');

      // 更新键盘配置
      if (configs.keyboardConfig !== undefined) {
        await query(
          'UPDATE telegram_bots SET keyboard_config = $1 WHERE id = $2',
          [JSON.stringify(configs.keyboardConfig), botId]
        );
      }

      // 价格配置暂不支持（数据库中没有 price_config 字段）
      // if (configs.priceConfig !== undefined) {
      //   await query(
      //     'UPDATE telegram_bots SET price_config = $1 WHERE id = $2',
      //     [JSON.stringify(configs.priceConfig), botId]
      //   );
      // }

      // 更新菜单命令
      if (configs.menuCommands !== undefined) {
        await this.updateBotCommands(botId, configs.menuCommands);
      }

      // 更新自定义命令
      if (configs.customCommands !== undefined) {
        await this.updateCustomCommands(botId, configs.customCommands);
      }

      // 更新工作模式配置
      if (configs.workModeConfig !== undefined) {
        await this.updateWorkModeConfig(
          botId,
          configs.workModeConfig.mode,
          configs.workModeConfig.config
        );
      }

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 批量配置更新成功`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('批量更新配置失败:', error);
      throw new Error(`批量更新配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 备份当前配置
   */
  static async backupCurrentConfig(botId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          keyboard_config,
          work_mode,
          webhook_url,
          webhook_secret,
          max_connections,
          bot_name as name,
          description,
          short_description,
          welcome_message,
          help_message,
          custom_commands,
          menu_button_enabled,
          menu_button_text,
          menu_type,
          web_app_url,
          menu_commands,
          network_id,
          is_active
         FROM telegram_bots 
         WHERE id = $1`,
        [botId]
      );

      if (result.rows.length === 0) {
        throw new Error('机器人不存在');
      }

      const backup = result.rows[0];

      // 保存备份到日志表
      await query(
        `INSERT INTO bot_logs (
          bot_id,
          level,
          message,
          action,
          context,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          botId,
          'info',
          '配置备份',
          'backup',
          JSON.stringify({
            backup_time: new Date().toISOString(),
            config: backup
          })
        ]
      );

      console.log(`✅ 配置备份成功`);
      return backup;
    } catch (error) {
      console.error('备份配置失败:', error);
      throw new Error(`备份配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 恢复配置
   */
  static async restoreConfig(botId: string, backupData: any): Promise<void> {
    try {
      // 开始事务
      await query('BEGIN');

      // 恢复主要配置
      await query(
        `UPDATE telegram_bots 
         SET 
           keyboard_config = $1,
           work_mode = $2,
           webhook_url = $3,
           webhook_secret = $4,
           max_connections = $5,
           bot_name = $6,
           description = $7,
           short_description = $8,
           welcome_message = $9,
           help_message = $10,
           custom_commands = $11,
           menu_button_enabled = $12,
           menu_button_text = $13,
           menu_type = $14,
           web_app_url = $15,
           menu_commands = $16,
           network_id = $17,
           is_active = $18,
           updated_at = NOW()
         WHERE id = $19`,
        [
          JSON.stringify(backupData.keyboard_config),
          backupData.work_mode,
          backupData.webhook_url,
          backupData.webhook_secret,
          backupData.max_connections,
          backupData.name,
          backupData.description,
          backupData.short_description,
          backupData.welcome_message,
          backupData.help_message,
          JSON.stringify(backupData.custom_commands),
          backupData.menu_button_enabled,
          backupData.menu_button_text,
          backupData.menu_type,
          backupData.web_app_url,
          JSON.stringify(backupData.menu_commands),
          backupData.network_id,
          backupData.is_active,
          botId
        ]
      );

      // 记录恢复日志
      await query(
        `INSERT INTO bot_logs (
          bot_id,
          level,
          message,
          action,
          context,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          botId,
          'info',
          '配置恢复',
          'restore',
          JSON.stringify({
            restore_time: new Date().toISOString(),
            restored_config: backupData
          })
        ]
      );

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 配置恢复成功`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('恢复配置失败:', error);
      throw new Error(`恢复配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取更新历史
   */
  static async getUpdateHistory(botId: string, limit = 10): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          action as log_type,
          message,
          context as log_data,
          created_at
         FROM bot_logs 
         WHERE bot_id = $1 AND action IN ('update', 'backup', 'restore')
         ORDER BY created_at DESC 
         LIMIT $2`,
        [botId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('获取更新历史失败:', error);
      throw new Error(`获取更新历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证更新结果
   */
  static async verifyUpdateResult(botId: string, expectedData: UpdateBotData): Promise<{
    success: boolean;
    mismatches: string[];
  }> {
    try {
      const result = await query('SELECT * FROM telegram_bots WHERE id = $1', [botId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          mismatches: ['机器人不存在']
        };
      }

      const bot = result.rows[0];
      const mismatches: string[] = [];

      // 检查更新的字段是否正确
      Object.keys(expectedData).forEach(key => {
        const expectedValue = expectedData[key as keyof UpdateBotData];
        const actualValue = bot[key];

        if (key === 'keyboard_config' || key === 'custom_commands' || key === 'menu_commands') {
          // JSON字段需要特殊处理
          const expectedJson = JSON.stringify(expectedValue);
          const actualJson = JSON.stringify(actualValue);
          if (expectedJson !== actualJson) {
            mismatches.push(`${key}: 期望 ${expectedJson}, 实际 ${actualJson}`);
          }
        } else if (expectedValue !== actualValue) {
          mismatches.push(`${key}: 期望 ${expectedValue}, 实际 ${actualValue}`);
        }
      });

      return {
        success: mismatches.length === 0,
        mismatches
      };
    } catch (error) {
      console.error('验证更新结果失败:', error);
      return {
        success: false,
        mismatches: ['验证过程中发生错误']
      };
    }
  }
}
