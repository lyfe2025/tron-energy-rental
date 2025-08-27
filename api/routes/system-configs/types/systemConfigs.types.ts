/**
 * 系统配置模块类型定义
 * 
 * 定义了系统配置相关的所有TypeScript接口和类型
 * 包括配置信息、查询参数、请求体和响应格式
 */

// 系统配置基础接口
export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: ConfigType;
  category: string;
  description?: string;
  is_public: boolean;
  is_editable: boolean;
  validation_rules?: string | null;
  default_value?: string | null;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

// 配置类型枚举
export type ConfigType = 'string' | 'number' | 'boolean' | 'json' | 'array';

// 配置查询参数接口
export interface SystemConfigQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  is_public?: boolean;
  is_editable?: boolean;
}

// 创建配置请求接口
export interface CreateSystemConfigRequest {
  config_key: string;
  config_value: string;
  config_type?: ConfigType;
  category?: string;
  description?: string;
  is_public?: boolean;
  is_editable?: boolean;
  validation_rules?: Record<string, any>;
  default_value?: string;
}

// 更新配置请求接口
export interface UpdateSystemConfigRequest {
  config_value?: string;
  config_type?: ConfigType;
  category?: string;
  description?: string;
  is_public?: boolean;
  is_editable?: boolean;
  validation_rules?: Record<string, any>;
  default_value?: string;
  change_reason?: string;
}

// 批量更新配置请求接口
export interface BatchUpdateRequest {
  configs: BatchConfigItem[];
  change_reason?: string;
}

export interface BatchConfigItem {
  config_key: string;
  config_value: string;
}

// 批量操作结果接口
export interface BatchOperationResult {
  updated: SystemConfig[];
  errors: BatchError[];
}

export interface BatchError {
  config_key: string;
  error: string;
}

// 配置历史记录接口
export interface SystemConfigHistory {
  id: number;
  config_id: number;
  old_value: string | null;
  new_value: string | null;
  change_reason?: string;
  created_at: Date;
  changed_by?: number;
  changed_by_username?: string;
}

// 配置分类统计接口
export interface ConfigCategoryStats {
  category: string;
  config_count: number;
  public_count: number;
}

// 配置验证结果接口
export interface ConfigValidationResult {
  valid: boolean;
  error?: string;
}

// 分页查询结果接口
export interface PaginatedSystemConfigs {
  configs: SystemConfig[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// 历史记录分页查询结果接口
export interface PaginatedConfigHistory {
  history: SystemConfigHistory[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// 数据库查询构建参数接口
export interface QueryBuilderParams {
  whereConditions: string[];
  queryParams: any[];
  paramIndex: number;
}

// 重置配置请求接口
export interface ResetConfigRequest {
  change_reason?: string;
}

// 删除配置请求接口
export interface DeleteConfigRequest {
  change_reason?: string;
}

// 配置权限检查结果接口
export interface ConfigPermissionCheck {
  canAccess: boolean;
  canModify: boolean;
  isEditable: boolean;
}

// API响应包装接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// 配置详情扩展接口（包含历史记录等）
export interface SystemConfigWithDetails extends SystemConfig {
  recent_changes?: SystemConfigHistory[];
  usage_count?: number;
}
