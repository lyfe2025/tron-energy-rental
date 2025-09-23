/**
 * 资源消耗配置业务逻辑服务
 * 
 * 专门处理资源消耗配置相关的业务逻辑
 * 提供能量、带宽等资源消耗配置的专业化管理
 * 基于现有系统配置服务架构，提供资源消耗特定的业务方法
 */

import type {
  BatchOperationResult,
  BatchUpdateRequest,
  PaginatedConfigHistory,
  PaginatedSystemConfigs,
  SystemConfig,
  SystemConfigQuery,
  UpdateSystemConfigRequest
} from '../types/systemConfigs.types.ts';
import { SystemConfigsService } from './systemConfigsService.ts';

/**
 * 资源消耗配置类型定义
 */
export interface ResourceThresholds {
  warning: SystemConfig;
  critical: SystemConfig;
}

export interface MonitoringConfigs {
  interval: SystemConfig;
  retention: SystemConfig;
}

export interface AutoOptimizationConfigs {
  enabled: SystemConfig;
  strategy: SystemConfig;
}

export interface NotificationConfigs {
  enabled: SystemConfig;
  channels: SystemConfig;
}

export interface PredictionConfigs {
  enabled: SystemConfig;
  horizon: SystemConfig;
}

export interface ReportConfigs {
  enabled: SystemConfig;
  frequency: SystemConfig;
}

export interface CacheConfigs {
  enabled: SystemConfig;
  ttl: SystemConfig;
}

export interface ResourceConsumptionConfigGroup {
  energyThresholds: ResourceThresholds;
  bandwidthThresholds: ResourceThresholds;
  monitoring: MonitoringConfigs;
  autoOptimization: AutoOptimizationConfigs;
  notifications: NotificationConfigs;
  prediction: PredictionConfigs;
  reports: ReportConfigs;
  cache: CacheConfigs;
}

export class ResourceConsumptionService {
  private systemConfigsService: SystemConfigsService;
  private readonly CATEGORY = 'resource_consumption';

  // 资源消耗配置键常量
  private readonly CONFIG_KEYS = {
    ENERGY_WARNING: 'resource_consumption.energy_threshold.warning',
    ENERGY_CRITICAL: 'resource_consumption.energy_threshold.critical',
    BANDWIDTH_WARNING: 'resource_consumption.bandwidth_threshold.warning',
    BANDWIDTH_CRITICAL: 'resource_consumption.bandwidth_threshold.critical',
    MONITORING_INTERVAL: 'resource_consumption.monitoring_interval',
    HISTORY_RETENTION: 'resource_consumption.history_retention_days',
    AUTO_OPT_ENABLED: 'resource_consumption.auto_optimization.enabled',
    AUTO_OPT_STRATEGY: 'resource_consumption.auto_optimization.strategy',
    NOTIFICATIONS_ENABLED: 'resource_consumption.notifications.enabled',
    NOTIFICATIONS_CHANNELS: 'resource_consumption.notifications.channels',
    PREDICTION_ENABLED: 'resource_consumption.prediction.enabled',
    PREDICTION_HORIZON: 'resource_consumption.prediction.horizon_hours',
    REPORTS_ENABLED: 'resource_consumption.reports.enabled',
    REPORTS_FREQUENCY: 'resource_consumption.reports.frequency',
    CACHE_ENABLED: 'resource_consumption.cache.enabled',
    CACHE_TTL: 'resource_consumption.cache.ttl_seconds'
  };

  constructor() {
    this.systemConfigsService = new SystemConfigsService();
  }

  /**
   * 获取所有资源消耗配置
   */
  async getAllResourceConsumptionConfigs(userRole?: string): Promise<PaginatedSystemConfigs> {
    const queryParams: SystemConfigQuery = {
      page: 1,
      limit: 50,
      category: this.CATEGORY,
      is_public: true
    };

    return await this.systemConfigsService.getSystemConfigs(queryParams, userRole);
  }

  /**
   * 获取分组的资源消耗配置
   */
  async getGroupedResourceConfigs(userRole?: string): Promise<ResourceConsumptionConfigGroup> {
    try {
      // 并行获取所有配置
      const [
        energyWarning,
        energyCritical,
        bandwidthWarning,
        bandwidthCritical,
        monitoringInterval,
        historyRetention,
        autoOptEnabled,
        autoOptStrategy,
        notificationsEnabled,
        notificationsChannels,
        predictionEnabled,
        predictionHorizon,
        reportsEnabled,
        reportsFrequency,
        cacheEnabled,
        cacheTtl
      ] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.ENERGY_WARNING, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.ENERGY_CRITICAL, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.BANDWIDTH_WARNING, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.BANDWIDTH_CRITICAL, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.MONITORING_INTERVAL, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.HISTORY_RETENTION, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.AUTO_OPT_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.AUTO_OPT_STRATEGY, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.NOTIFICATIONS_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.NOTIFICATIONS_CHANNELS, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.PREDICTION_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.PREDICTION_HORIZON, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.REPORTS_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.REPORTS_FREQUENCY, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.CACHE_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.CACHE_TTL, userRole)
      ]);

      return {
        energyThresholds: {
          warning: energyWarning,
          critical: energyCritical
        },
        bandwidthThresholds: {
          warning: bandwidthWarning,
          critical: bandwidthCritical
        },
        monitoring: {
          interval: monitoringInterval,
          retention: historyRetention
        },
        autoOptimization: {
          enabled: autoOptEnabled,
          strategy: autoOptStrategy
        },
        notifications: {
          enabled: notificationsEnabled,
          channels: notificationsChannels
        },
        prediction: {
          enabled: predictionEnabled,
          horizon: predictionHorizon
        },
        reports: {
          enabled: reportsEnabled,
          frequency: reportsFrequency
        },
        cache: {
          enabled: cacheEnabled,
          ttl: cacheTtl
        }
      };
    } catch (error) {
      console.error('获取分组资源消耗配置失败:', error);
      throw new Error(`获取资源消耗配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取能量消耗阈值配置
   */
  async getEnergyThresholds(userRole?: string): Promise<ResourceThresholds> {
    try {
      const [warning, critical] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.ENERGY_WARNING, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.ENERGY_CRITICAL, userRole)
      ]);

      return { warning, critical };
    } catch (error) {
      console.error('获取能量阈值配置失败:', error);
      throw new Error(`获取能量阈值配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取带宽消耗阈值配置
   */
  async getBandwidthThresholds(userRole?: string): Promise<ResourceThresholds> {
    try {
      const [warning, critical] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.BANDWIDTH_WARNING, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.BANDWIDTH_CRITICAL, userRole)
      ]);

      return { warning, critical };
    } catch (error) {
      console.error('获取带宽阈值配置失败:', error);
      throw new Error(`获取带宽阈值配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取监控配置
   */
  async getMonitoringConfigs(userRole?: string): Promise<MonitoringConfigs> {
    try {
      const [interval, retention] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.MONITORING_INTERVAL, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.HISTORY_RETENTION, userRole)
      ]);

      return { interval, retention };
    } catch (error) {
      console.error('获取监控配置失败:', error);
      throw new Error(`获取监控配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取自动优化配置
   */
  async getAutoOptimizationConfigs(userRole?: string): Promise<AutoOptimizationConfigs> {
    try {
      const [enabled, strategy] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.AUTO_OPT_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.AUTO_OPT_STRATEGY, userRole)
      ]);

      return { enabled, strategy };
    } catch (error) {
      console.error('获取自动优化配置失败:', error);
      throw new Error(`获取自动优化配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取通知配置
   */
  async getNotificationConfigs(userRole?: string): Promise<NotificationConfigs> {
    try {
      const [enabled, channels] = await Promise.all([
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.NOTIFICATIONS_ENABLED, userRole),
        this.systemConfigsService.getConfigByKey(this.CONFIG_KEYS.NOTIFICATIONS_CHANNELS, userRole)
      ]);

      return { enabled, channels };
    } catch (error) {
      console.error('获取通知配置失败:', error);
      throw new Error(`获取通知配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新单个资源消耗配置
   */
  async updateResourceConfig(
    configKey: string,
    updateData: UpdateSystemConfigRequest,
    userId: string
  ): Promise<SystemConfig> {
    // 验证配置键是否属于资源消耗分类
    if (!this.isResourceConsumptionConfig(configKey)) {
      throw new Error('无效的资源消耗配置键');
    }

    // 验证配置值的合理性
    this.validateResourceConfigValue(configKey, updateData.config_value);

    return await this.systemConfigsService.updateConfig(configKey, updateData, userId);
  }

  /**
   * 批量更新资源消耗配置
   */
  async batchUpdateResourceConfigs(
    batchData: BatchUpdateRequest,
    userId: string,
    userRole?: string
  ): Promise<BatchOperationResult> {
    // 验证所有配置键都属于资源消耗分类
    const invalidKeys = batchData.configs?.filter(
      config => !this.isResourceConsumptionConfig(config.config_key)
    );

    if (invalidKeys && invalidKeys.length > 0) {
      throw new Error(`包含无效的资源消耗配置键: ${invalidKeys.map(k => k.config_key).join(', ')}`);
    }

    // 验证所有配置值的合理性
    if (batchData.configs) {
      for (const config of batchData.configs) {
        this.validateResourceConfigValue(config.config_key, config.config_value);
      }
    }

    return await this.systemConfigsService.batchUpdateConfigs(batchData, userId, userRole);
  }

  /**
   * 重置资源消耗配置为默认值
   */
  async resetResourceConfig(
    configKey: string,
    userId: string,
    changeReason?: string
  ): Promise<SystemConfig> {
    // 验证配置键是否属于资源消耗分类
    if (!this.isResourceConsumptionConfig(configKey)) {
      throw new Error('无效的资源消耗配置键');
    }

    return await this.systemConfigsService.resetConfigToDefault(
      configKey,
      userId,
      { change_reason: changeReason || '重置为默认值' }
    );
  }

  /**
   * 获取资源消耗配置的历史记录
   */
  async getResourceConfigHistory(
    configKey: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedConfigHistory> {
    // 验证配置键是否属于资源消耗分类
    if (!this.isResourceConsumptionConfig(configKey)) {
      throw new Error('无效的资源消耗配置键');
    }

    return await this.systemConfigsService.getConfigHistory(configKey, page, limit);
  }

  /**
   * 验证阈值配置的合理性
   */
  async validateThresholdConfigs(userRole?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const [energyThresholds, bandwidthThresholds] = await Promise.all([
        this.getEnergyThresholds(userRole),
        this.getBandwidthThresholds(userRole)
      ]);

      // 验证能量阈值
      const energyWarning = Number(energyThresholds.warning.config_value);
      const energyCritical = Number(energyThresholds.critical.config_value);

      if (energyWarning >= energyCritical) {
        errors.push('能量警告阈值不能大于或等于严重阈值');
      }

      if (energyWarning < 50) {
        warnings.push('能量警告阈值过低，可能导致频繁告警');
      }

      // 验证带宽阈值
      const bandwidthWarning = Number(bandwidthThresholds.warning.config_value);
      const bandwidthCritical = Number(bandwidthThresholds.critical.config_value);

      if (bandwidthWarning >= bandwidthCritical) {
        errors.push('带宽警告阈值不能大于或等于严重阈值');
      }

      if (bandwidthWarning < 50) {
        warnings.push('带宽警告阈值过低，可能导致频繁告警');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('验证阈值配置失败:', error);
      return {
        isValid: false,
        errors: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`],
        warnings: []
      };
    }
  }

  /**
   * 检查配置键是否属于资源消耗分类
   */
  private isResourceConsumptionConfig(configKey: string): boolean {
    return configKey.startsWith('resource_consumption.');
  }

  /**
   * 验证资源消耗配置值的合理性
   */
  private validateResourceConfigValue(configKey: string, value: any): void {
    if (value === undefined || value === null) {
      return; // 允许空值，由系统配置服务处理
    }

    // 阈值配置验证（1-100的整数）
    if (configKey.includes('threshold')) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 100) {
        throw new Error(`阈值配置必须是1-100之间的整数: ${configKey}`);
      }
    }

    // 时间间隔配置验证（60-3600秒）
    if (configKey.includes('interval') || configKey.includes('ttl_seconds')) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 60 || numValue > 3600) {
        throw new Error(`时间间隔配置必须是60-3600秒之间的整数: ${configKey}`);
      }
    }

    // 保留天数配置验证（1-365天）
    if (configKey.includes('retention_days')) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 365) {
        throw new Error(`保留天数配置必须是1-365天之间的整数: ${configKey}`);
      }
    }

    // 预测时间范围验证（1-168小时）
    if (configKey.includes('horizon_hours')) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 168) {
        throw new Error(`预测时间范围必须是1-168小时之间的整数: ${configKey}`);
      }
    }

    // 布尔值配置验证
    if (configKey.includes('enabled')) {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        throw new Error(`启用状态配置必须是布尔值: ${configKey}`);
      }
    }

    // 策略配置验证
    if (configKey.includes('strategy')) {
      const validStrategies = ['conservative', 'balanced', 'aggressive'];
      if (!validStrategies.includes(value)) {
        throw new Error(`优化策略必须是以下值之一: ${validStrategies.join(', ')}`);
      }
    }

    // 频率配置验证
    if (configKey.includes('frequency')) {
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      if (!validFrequencies.includes(value)) {
        throw new Error(`报告频率必须是以下值之一: ${validFrequencies.join(', ')}`);
      }
    }
  }
}