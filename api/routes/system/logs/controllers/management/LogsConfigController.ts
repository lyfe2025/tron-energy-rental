/**
 * 日志配置控制器
 * 负责处理日志清理配置相关功能
 */
import type { Request, Response } from 'express';
import { query as dbQuery } from '../../../../../database/index.ts';
import type {
    CleanupConfig,
    RouteHandler
} from '../../types/logs.types.ts';

export class LogsConfigController {
  /**
   * 获取清理配置
   */
  static getCleanupConfig: RouteHandler = async (req: Request, res: Response) => {
    try {
      // 从系统配置表获取清理配置
      const configQuery = `
        SELECT key, value
        FROM system_configs
        WHERE key IN (
          'operation_logs_retention_days',
          'login_logs_retention_days', 
          'auto_cleanup_enabled',
          'cleanup_schedule'
        )
      `;
      
      const result = await dbQuery(configQuery);
      
      // 将结果转换为配置对象
      const configMap = result.rows.reduce((acc: any, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      // 设置默认值
      const config: CleanupConfig = {
        operation_logs_retention_days: parseInt(configMap.operation_logs_retention_days) || 180,
        login_logs_retention_days: parseInt(configMap.login_logs_retention_days) || 90,
        auto_cleanup_enabled: configMap.auto_cleanup_enabled === 'true' || false,
        cleanup_schedule: configMap.cleanup_schedule || '0 2 * * 0' // 每周日凌晨2点
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('获取清理配置失败:', error);
      
      // 返回默认配置
      const defaultConfig: CleanupConfig = {
        operation_logs_retention_days: 180,
        login_logs_retention_days: 90,
        auto_cleanup_enabled: false,
        cleanup_schedule: '0 2 * * 0'
      };

      res.json({
        success: true,
        data: defaultConfig,
        message: '使用默认配置（无法从数据库加载配置）'
      });
    }
  };

  /**
   * 更新清理配置
   */
  static updateCleanupConfig: RouteHandler = async (req: Request, res: Response) => {
    try {
      const {
        operation_logs_retention_days,
        login_logs_retention_days,
        auto_cleanup_enabled,
        cleanup_schedule
      } = req.body as CleanupConfig;

      // 验证参数
      if (operation_logs_retention_days && (operation_logs_retention_days < 7 || operation_logs_retention_days > 3650)) {
        res.status(400).json({
          success: false,
          error: '操作日志保留天数必须在7-3650之间'
        });
        return;
      }

      if (login_logs_retention_days && (login_logs_retention_days < 7 || login_logs_retention_days > 3650)) {
        res.status(400).json({
          success: false,
          error: '登录日志保留天数必须在7-3650之间'
        });
        return;
      }

      // 更新系统配置表
      const configs = [
        { key: 'operation_logs_retention_days', value: operation_logs_retention_days?.toString() },
        { key: 'login_logs_retention_days', value: login_logs_retention_days?.toString() },
        { key: 'auto_cleanup_enabled', value: auto_cleanup_enabled?.toString() },
        { key: 'cleanup_schedule', value: cleanup_schedule }
      ].filter(config => config.value !== undefined);

      for (const config of configs) {
        const upsertQuery = `
          INSERT INTO system_configs (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `;
        await dbQuery(upsertQuery, [config.key, config.value]);
      }

      const updatedConfig: CleanupConfig = {
        operation_logs_retention_days,
        login_logs_retention_days,
        auto_cleanup_enabled,
        cleanup_schedule
      };

      res.json({
        success: true,
        data: updatedConfig,
        message: '清理配置更新成功'
      });
    } catch (error: any) {
      console.error('更新清理配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新清理配置失败',
        details: error.message
      });
    }
  };
}
