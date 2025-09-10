/**
 * 配置更新服务
 * 负责更新机器人配置到数据库
 */
import { query } from '../../../../../config/database.js';
import { buildUpdateFields } from '../../../middleware.js';
import type { Bot, UpdateBotData } from '../../../types.js';

export class ConfigUpdateService {
  /**
   * 更新机器人基本信息
   */
  static async updateBotBasicInfo(botId: string, updateData: UpdateBotData): Promise<Bot> {
    try {
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
      // 开始事务
      await query('BEGIN');

      // 删除现有命令
      await query('DELETE FROM telegram_bot_commands WHERE bot_id = $1', [botId]);

      // 插入新命令
      if (commands && commands.length > 0) {
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

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 机器人命令更新成功，共 ${commands?.length || 0} 个命令`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      console.error('更新机器人命令失败:', error);
      throw new Error(`更新机器人命令失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新机器人自定义命令
   */
  static async updateCustomCommands(botId: string, customCommands: any[]): Promise<void> {
    try {
      // 开始事务
      await query('BEGIN');

      // 删除现有自定义命令
      await query('DELETE FROM telegram_bot_custom_commands WHERE bot_id = $1', [botId]);

      // 插入新的自定义命令
      if (customCommands && customCommands.length > 0) {
        const values = customCommands.map((_, index) => 
          `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
        ).join(', ');

        const params = [botId];
        customCommands.forEach(cmd => {
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

      // 提交事务
      await query('COMMIT');
      console.log(`✅ 自定义命令更新成功，共 ${customCommands?.length || 0} 个命令`);
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
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
      const updateData: any = {
        status,
        last_activity: new Date(),
        updated_at: new Date()
      };

      if (metadata) {
        updateData.metadata = JSON.stringify(metadata);
      }

      await query(
        `UPDATE telegram_bot_status 
         SET status = $1, last_activity = $2, metadata = $3, updated_at = $4
         WHERE bot_id = $5`,
        [status, updateData.last_activity, updateData.metadata || null, updateData.updated_at, botId]
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
        `INSERT INTO telegram_bot_logs (
          bot_id,
          log_type,
          message,
          data,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          botId,
          'update',
          `机器人信息更新: ${Object.keys(updateData).join(', ')}`,
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

      // 更新价格配置
      if (configs.priceConfig !== undefined) {
        await query(
          'UPDATE telegram_bots SET price_config = $1 WHERE id = $2',
          [JSON.stringify(configs.priceConfig), botId]
        );
      }

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
          price_config,
          work_mode,
          webhook_url,
          settings,
          name,
          description,
          short_description
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
        `INSERT INTO telegram_bot_logs (
          bot_id,
          log_type,
          message,
          data,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          botId,
          'backup',
          '配置备份',
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
           price_config = $2,
           work_mode = $3,
           webhook_url = $4,
           settings = $5,
           name = $6,
           description = $7,
           short_description = $8,
           updated_at = NOW()
         WHERE id = $9`,
        [
          JSON.stringify(backupData.keyboard_config),
          JSON.stringify(backupData.price_config),
          backupData.work_mode,
          backupData.webhook_url,
          JSON.stringify(backupData.settings),
          backupData.name,
          backupData.description,
          backupData.short_description,
          botId
        ]
      );

      // 记录恢复日志
      await query(
        `INSERT INTO telegram_bot_logs (
          bot_id,
          log_type,
          message,
          data,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          botId,
          'restore',
          '配置恢复',
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
          log_type,
          message,
          data,
          created_at
         FROM telegram_bot_logs 
         WHERE bot_id = $1 AND log_type IN ('update', 'backup', 'restore')
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

        if (key === 'keyboard_config' || key === 'price_config' || key === 'settings') {
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
