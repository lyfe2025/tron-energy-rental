/**
 * 资源消耗配置类型定义
 * 
 * 定义了资源消耗配置相关的所有TypeScript接口和类型
 * 扩展系统配置基础类型，提供资源消耗特定的数据结构
 */

import type {
  SystemConfig,
  ConfigType,
  ApiResponse,
  BatchOperationResult,
  PaginatedSystemConfigs,
  PaginatedConfigHistory
} from './systemConfigs.types.ts';

// 资源类型枚举
export type ResourceType = 'energy' | 'bandwidth';

// 阈值类型枚举
export type ThresholdType = 'warning' | 'critical';

// 优化策略枚举
export type OptimizationStrategy = 'conservative' | 'balanced' | 'aggressive';

// 报告频率枚举
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

// 通知渠道枚举
export type NotificationChannel = 'email' | 'sms' | 'webhook' | 'dashboard';

// 资源阈值配置接口
export interface ResourceThreshold {
  warning: SystemConfig;
  critical: SystemConfig;
}

// 监控配置接口
export interface MonitoringConfig {
  interval: SystemConfig;
  retention: SystemConfig;
}

// 自动优化配置接口
export interface AutoOptimizationConfig {
  enabled: SystemConfig;
  strategy: SystemConfig;
}

// 通知配置接口
export interface NotificationConfig {
  enabled: SystemConfig;
  channels: SystemConfig;
}

// 预测配置接口
export interface PredictionConfig {
  enabled: SystemConfig;
  horizon: SystemConfig;
}

// 报告配置接口
export interface ReportConfig {
  enabled: SystemConfig;
  frequency: SystemConfig;
}

// 缓存配置接口
export interface CacheConfig {
  enabled: SystemConfig;
  ttl: SystemConfig;
}

// 资源消耗配置组接口
export interface ResourceConsumptionConfigGroup {
  energyThresholds: ResourceThreshold;
  bandwidthThresholds: ResourceThreshold;
  monitoring: MonitoringConfig;
  autoOptimization: AutoOptimizationConfig;
  notifications: NotificationConfig;
  prediction: PredictionConfig;
  reports: ReportConfig;
  cache: CacheConfig;
}

// 资源消耗配置键常量
export const RESOURCE_CONFIG_KEYS = {
  // 能量阈值
  ENERGY_WARNING: 'resource_consumption.energy_threshold.warning',
  ENERGY_CRITICAL: 'resource_consumption.energy_threshold.critical',
  
  // 带宽阈值
  BANDWIDTH_WARNING: 'resource_consumption.bandwidth_threshold.warning',
  BANDWIDTH_CRITICAL: 'resource_consumption.bandwidth_threshold.critical',
  
  // 监控配置
  MONITORING_INTERVAL: 'resource_consumption.monitoring_interval',
  HISTORY_RETENTION: 'resource_consumption.history_retention_days',
  
  // 自动优化
  AUTO_OPT_ENABLED: 'resource_consumption.auto_optimization.enabled',
  AUTO_OPT_STRATEGY: 'resource_consumption.auto_optimization.strategy',
  
  // 通知配置
  NOTIFICATIONS_ENABLED: 'resource_consumption.notifications.enabled',
  NOTIFICATIONS_CHANNELS: 'resource_consumption.notifications.channels',
  
  // 预测配置
  PREDICTION_ENABLED: 'resource_consumption.prediction.enabled',
  PREDICTION_HORIZON: 'resource_consumption.prediction.horizon_hours',
  
  // 报告配置
  REPORTS_ENABLED: 'resource_consumption.reports.enabled',
  REPORTS_FREQUENCY: 'resource_consumption.reports.frequency',
  
  // 缓存配置
  CACHE_ENABLED: 'resource_consumption.cache.enabled',
  CACHE_TTL: 'resource_consumption.cache.ttl_seconds'
} as const;

// 资源消耗配置创建请求接口
export interface CreateResourceConfigRequest {
  config_key: keyof typeof RESOURCE_CONFIG_KEYS | string;
  config_value: string;
  config_type?: ConfigType;
  description?: string;
  validation_rules?: ResourceConfigValidationRules;
  default_value?: string;
}

// 资源消耗配置更新请求接口
export interface UpdateResourceConfigRequest {
  config_value?: string;
  config_type?: ConfigType;
  description?: string;
  validation_rules?: ResourceConfigValidationRules;
  default_value?: string;
  change_reason?: string;
}

// 资源消耗配置验证规则接口
export interface ResourceConfigValidationRules {
  min?: number;
  max?: number;
  required?: boolean;
  type?: 'number' | 'boolean' | 'string' | 'enum';
  enum_values?: string[];
  pattern?: string;
}

// 阈值配置更新请求接口
export interface ThresholdUpdateRequest {
  resourceType: ResourceType;
  thresholdType: ThresholdType;
  value: number;
  change_reason?: string;
}

// 批量阈值更新请求接口
export interface BatchThresholdUpdateRequest {
  thresholds: {
    energy?: {
      warning?: number;
      critical?: number;
    };
    bandwidth?: {
      warning?: number;
      critical?: number;
    };
  };
  change_reason?: string;
}

// 监控配置更新请求接口
export interface MonitoringConfigUpdateRequest {
  interval?: number;
  retention_days?: number;
  change_reason?: string;
}

// 自动优化配置更新请求接口
export interface AutoOptimizationUpdateRequest {
  enabled?: boolean;
  strategy?: OptimizationStrategy;
  change_reason?: string;
}

// 通知配置更新请求接口
export interface NotificationConfigUpdateRequest {
  enabled?: boolean;
  channels?: NotificationChannel[];
  change_reason?: string;
}

// 预测配置更新请求接口
export interface PredictionConfigUpdateRequest {
  enabled?: boolean;
  horizon_hours?: number;
  change_reason?: string;
}

// 报告配置更新请求接口
export interface ReportConfigUpdateRequest {
  enabled?: boolean;
  frequency?: ReportFrequency;
  change_reason?: string;
}

// 缓存配置更新请求接口
export interface CacheConfigUpdateRequest {
  enabled?: boolean;
  ttl_seconds?: number;
  change_reason?: string;
}

// 资源消耗配置验证结果接口
export interface ResourceConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedConfigs?: {
    [key: string]: {
      value: any;
      isValid: boolean;
      error?: string;
    };
  };
}

// 阈值验证结果接口
export interface ThresholdValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  energyThresholds?: {
    warning: number;
    critical: number;
    isValid: boolean;
  };
  bandwidthThresholds?: {
    warning: number;
    critical: number;
    isValid: boolean;
  };
}

// 资源消耗统计接口
export interface ResourceConsumptionStats {
  totalConfigs: number;
  enabledFeatures: {
    autoOptimization: boolean;
    notifications: boolean;
    prediction: boolean;
    reports: boolean;
    cache: boolean;
  };
  thresholdStatus: {
    energy: {
      warning: number;
      critical: number;
      isConfigured: boolean;
    };
    bandwidth: {
      warning: number;
      critical: number;
      isConfigured: boolean;
    };
  };
  lastUpdated: Date;
}

// 资源消耗配置导出接口
export interface ResourceConfigExport {
  version: string;
  exportDate: Date;
  configs: SystemConfig[];
  metadata: {
    totalConfigs: number;
    categories: string[];
    exportedBy?: string;
  };
}

// 资源消耗配置导入接口
export interface ResourceConfigImport {
  configs: CreateResourceConfigRequest[];
  overwriteExisting?: boolean;
  validateOnly?: boolean;
  importReason?: string;
}

// 资源消耗配置导入结果接口
export interface ResourceConfigImportResult {
  success: boolean;
  imported: SystemConfig[];
  skipped: {
    config_key: string;
    reason: string;
  }[];
  errors: {
    config_key: string;
    error: string;
  }[];
  summary: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
}

// API响应类型定义
export type ResourceConfigResponse = ApiResponse<SystemConfig>;
export type ResourceConfigListResponse = ApiResponse<PaginatedSystemConfigs>;
export type ResourceConfigGroupResponse = ApiResponse<ResourceConsumptionConfigGroup>;
export type ResourceThresholdResponse = ApiResponse<ResourceThreshold>;
export type MonitoringConfigResponse = ApiResponse<MonitoringConfig>;
export type AutoOptimizationConfigResponse = ApiResponse<AutoOptimizationConfig>;
export type NotificationConfigResponse = ApiResponse<NotificationConfig>;
export type PredictionConfigResponse = ApiResponse<PredictionConfig>;
export type ReportConfigResponse = ApiResponse<ReportConfig>;
export type CacheConfigResponse = ApiResponse<CacheConfig>;
export type ResourceConfigValidationResponse = ApiResponse<ResourceConfigValidationResult>;
export type ThresholdValidationResponse = ApiResponse<ThresholdValidationResult>;
export type ResourceConfigStatsResponse = ApiResponse<ResourceConsumptionStats>;
export type ResourceConfigHistoryResponse = ApiResponse<PaginatedConfigHistory>;
export type BatchResourceConfigResponse = ApiResponse<BatchOperationResult>;
export type ResourceConfigExportResponse = ApiResponse<ResourceConfigExport>;
export type ResourceConfigImportResponse = ApiResponse<ResourceConfigImportResult>;

// 前端组件属性接口
export interface ResourceConsumptionFormProps {
  initialValues?: Partial<ResourceConsumptionConfigGroup>;
  onSubmit: (values: ResourceConsumptionConfigGroup) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  showAdvanced?: boolean;
}

export interface ThresholdConfigProps {
  resourceType: ResourceType;
  thresholds: ResourceThreshold;
  onChange: (thresholds: ResourceThreshold) => void;
  disabled?: boolean;
  showValidation?: boolean;
}

export interface MonitoringConfigProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
  disabled?: boolean;
}

export interface AutoOptimizationConfigProps {
  config: AutoOptimizationConfig;
  onChange: (config: AutoOptimizationConfig) => void;
  disabled?: boolean;
}

// 表单验证错误接口
export interface ResourceConfigFormErrors {
  [key: string]: string | undefined;
  energy_warning?: string;
  energy_critical?: string;
  bandwidth_warning?: string;
  bandwidth_critical?: string;
  monitoring_interval?: string;
  history_retention?: string;
  prediction_horizon?: string;
  cache_ttl?: string;
}

// 表单状态接口
export interface ResourceConfigFormState {
  values: Partial<ResourceConsumptionConfigGroup>;
  errors: ResourceConfigFormErrors;
  touched: { [key: string]: boolean };
  isSubmitting: boolean;
  isValid: boolean;
}