/**
 * 系统配置验证控制器
 * 
 * 提供系统配置相关的请求验证功能
 * 包括参数验证、数据格式验证和业务规则验证
 */

import { query } from '../../../config/database.js';
import type {
    BatchUpdateRequest,
    ConfigType,
    ConfigValidationResult,
    CreateSystemConfigRequest,
    UpdateSystemConfigRequest
} from '../types/systemConfigs.types.js';

export class SystemConfigsValidation {
  /**
   * 验证创建配置请求
   */
  static validateCreateRequest(data: CreateSystemConfigRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!data.config_key || data.config_key.trim() === '') {
      errors.push('配置键不能为空');
    }

    if (data.config_value === undefined || data.config_value === null) {
      errors.push('配置值不能为空');
    }

    // 验证配置键格式
    if (data.config_key && !/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(data.config_key)) {
      errors.push('配置键格式不正确，必须以字母开头，只能包含字母、数字、下划线、点和连字符');
    }

    // 验证配置类型
    if (data.config_type) {
      const validTypes: ConfigType[] = ['string', 'number', 'boolean', 'json', 'array'];
      if (!validTypes.includes(data.config_type)) {
        errors.push('无效的配置类型');
      }
    }

    // 验证配置值格式
    if (data.config_value !== undefined && data.config_type) {
      const validationResult = this.validateConfigValue(data.config_value, data.config_type);
      if (!validationResult.valid) {
        errors.push(`配置值格式错误: ${validationResult.error}`);
      }
    }

    // 验证分类名称
    if (data.category && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(data.category)) {
      errors.push('分类名称格式不正确，必须以字母开头，只能包含字母、数字、下划线和连字符');
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      errors.push('描述不能超过500个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证更新配置请求
   */
  static validateUpdateRequest(data: UpdateSystemConfigRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证配置类型
    if (data.config_type) {
      const validTypes: ConfigType[] = ['string', 'number', 'boolean', 'json', 'array'];
      if (!validTypes.includes(data.config_type)) {
        errors.push('无效的配置类型');
      }
    }

    // 验证分类名称
    if (data.category && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(data.category)) {
      errors.push('分类名称格式不正确，必须以字母开头，只能包含字母、数字、下划线和连字符');
    }

    // 验证描述长度
    if (data.description && data.description.length > 500) {
      errors.push('描述不能超过500个字符');
    }

    // 验证变更原因长度
    if (data.change_reason && data.change_reason.length > 200) {
      errors.push('变更原因不能超过200个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证批量更新请求
   */
  static validateBatchUpdateRequest(data: BatchUpdateRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.configs || !Array.isArray(data.configs)) {
      errors.push('配置列表必须是数组');
      return { valid: false, errors };
    }

    if (data.configs.length === 0) {
      errors.push('配置列表不能为空');
      return { valid: false, errors };
    }

    if (data.configs.length > 100) {
      errors.push('批量更新不能超过100个配置');
    }

    // 验证每个配置项
    data.configs.forEach((config, index) => {
      if (!config.config_key || config.config_key.trim() === '') {
        errors.push(`第${index + 1}个配置的配置键不能为空`);
      }

      if (config.config_value === undefined || config.config_value === null) {
        errors.push(`第${index + 1}个配置的配置值不能为空`);
      }
    });

    // 检查重复的配置键
    const configKeys = data.configs.map(c => c.config_key);
    const duplicateKeys = configKeys.filter((key, index) => configKeys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      errors.push(`发现重复的配置键: ${duplicateKeys.join(', ')}`);
    }

    // 验证变更原因长度
    if (data.change_reason && data.change_reason.length > 200) {
      errors.push('变更原因不能超过200个字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(page?: any, limit?: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (page !== undefined) {
      const pageNum = Number(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('页码必须是大于0的整数');
      }
    }

    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('每页数量必须是1-100之间的整数');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证配置键格式
   */
  static validateConfigKey(configKey: string): { valid: boolean; error?: string } {
    if (!configKey || configKey.trim() === '') {
      return { valid: false, error: '配置键不能为空' };
    }

    if (configKey.length > 100) {
      return { valid: false, error: '配置键不能超过100个字符' };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(configKey)) {
      return { valid: false, error: '配置键格式不正确，必须以字母开头，只能包含字母、数字、下划线、点和连字符' };
    }

    return { valid: true };
  }

  /**
   * 验证配置值格式
   */
  static validateConfigValue(value: any, type: ConfigType): ConfigValidationResult {
    try {
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            return { valid: false, error: '值必须是字符串类型' };
          }
          if (value.length > 5000) {
            return { valid: false, error: '字符串值不能超过5000个字符' };
          }
          break;
        
        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            return { valid: false, error: '值必须是有效的数字' };
          }
          if (!isFinite(num)) {
            return { valid: false, error: '数字值不能是无穷大或NaN' };
          }
          break;
        
        case 'boolean':
          if (typeof value === 'string') {
            if (!['true', 'false'].includes(value.toLowerCase())) {
              return { valid: false, error: '布尔值必须是 true 或 false' };
            }
          } else if (typeof value !== 'boolean') {
            return { valid: false, error: '值必须是布尔类型' };
          }
          break;
        
        case 'json':
          if (typeof value === 'string') {
            try {
              JSON.parse(value); // 验证是否为有效JSON
            } catch {
              return { valid: false, error: '值必须是有效的JSON格式' };
            }
          } else if (typeof value !== 'object' || value === null) {
            return { valid: false, error: '值必须是有效的JSON对象' };
          }
          break;
        
        case 'array':
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) {
                return { valid: false, error: '值必须是数组格式' };
              }
            } catch {
              return { valid: false, error: '值必须是有效的JSON数组格式' };
            }
          } else if (!Array.isArray(value)) {
            return { valid: false, error: '值必须是数组类型' };
          }
          break;
        
        default:
          return { valid: false, error: '不支持的配置类型' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: '值格式验证失败' };
    }
  }

  /**
   * 检查配置是否存在
   */
  static async checkConfigExists(configKey: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT id FROM system_configs WHERE config_key = $1',
        [configKey]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('检查配置是否存在失败:', error);
      return false;
    }
  }

  /**
   * 检查配置是否可编辑
   */
  static async checkConfigEditable(configKey: string): Promise<{ exists: boolean; editable: boolean; config?: any }> {
    try {
      const result = await query(
        'SELECT id, is_editable, config_key FROM system_configs WHERE config_key = $1',
        [configKey]
      );

      if (result.rows.length === 0) {
        return { exists: false, editable: false };
      }

      const config = result.rows[0];
      return {
        exists: true,
        editable: config.is_editable,
        config
      };
    } catch (error) {
      console.error('检查配置是否可编辑失败:', error);
      return { exists: false, editable: false };
    }
  }

  /**
   * 验证用户是否有权限访问配置
   */
  static async checkConfigAccess(configKey: string, userRole?: string): Promise<{ canAccess: boolean; config?: any }> {
    try {
      let sqlQuery = `
        SELECT id, config_key, is_public, is_editable
        FROM system_configs 
        WHERE config_key = $1
      `;

      const result = await query(sqlQuery, [configKey]);

      if (result.rows.length === 0) {
        return { canAccess: false };
      }

      const config = result.rows[0];

      // 管理员可以访问所有配置
      if (userRole === 'admin') {
        return { canAccess: true, config };
      }

      // 非管理员只能访问公开配置
      return {
        canAccess: config.is_public,
        config
      };
    } catch (error) {
      console.error('检查配置访问权限失败:', error);
      return { canAccess: false };
    }
  }

  /**
   * 验证搜索关键词
   */
  static validateSearchQuery(search?: string): { valid: boolean; error?: string } {
    if (search && search.length > 100) {
      return { valid: false, error: '搜索关键词不能超过100个字符' };
    }

    if (search && search.trim().length < 2) {
      return { valid: false, error: '搜索关键词至少需要2个字符' };
    }

    return { valid: true };
  }

  /**
   * 验证分类名称
   */
  static validateCategory(category?: string): { valid: boolean; error?: string } {
    if (category && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(category)) {
      return { valid: false, error: '分类名称格式不正确，必须以字母开头，只能包含字母、数字、下划线和连字符' };
    }

    if (category && category.length > 50) {
      return { valid: false, error: '分类名称不能超过50个字符' };
    }

    return { valid: true };
  }
}
