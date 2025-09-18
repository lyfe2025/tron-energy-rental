/**
 * 系统配置验证服务
 * 
 * 负责系统配置的验证逻辑，提供对外验证接口
 * 封装SystemConfigsValidation的验证功能
 */

import { SystemConfigsValidation } from '../../controllers/systemConfigsValidation.js';

export class ConfigValidationService {
  /**
   * 验证配置值格式（对外提供的工具方法）
   */
  validateConfigValue(value: any, type: string) {
    return SystemConfigsValidation.validateConfigValue(value, type as any);
  }

  /**
   * 检查配置访问权限（对外提供的工具方法）
   */
  async checkConfigAccess(configKey: string, userRole?: string) {
    return await SystemConfigsValidation.checkConfigAccess(configKey, userRole);
  }

  /**
   * 验证配置键格式
   */
  validateConfigKey(configKey: string) {
    return SystemConfigsValidation.validateConfigKey(configKey);
  }

  /**
   * 验证分页参数
   */
  validatePaginationParams(page?: number, limit?: number) {
    return SystemConfigsValidation.validatePaginationParams(page, limit);
  }

  /**
   * 验证搜索查询
   */
  validateSearchQuery(search: string) {
    return SystemConfigsValidation.validateSearchQuery(search);
  }

  /**
   * 验证分类
   */
  validateCategory(category: string) {
    return SystemConfigsValidation.validateCategory(category);
  }

  /**
   * 验证创建请求
   */
  validateCreateRequest(configData: any) {
    return SystemConfigsValidation.validateCreateRequest(configData);
  }

  /**
   * 验证更新请求
   */
  validateUpdateRequest(updateData: any) {
    return SystemConfigsValidation.validateUpdateRequest(updateData);
  }

  /**
   * 验证批量更新请求
   */
  validateBatchUpdateRequest(batchData: any) {
    return SystemConfigsValidation.validateBatchUpdateRequest(batchData);
  }

  /**
   * 检查配置是否存在
   */
  async checkConfigExists(configKey: string) {
    return await SystemConfigsValidation.checkConfigExists(configKey);
  }

  /**
   * 检查配置是否可编辑
   */
  async checkConfigEditable(configKey: string) {
    return await SystemConfigsValidation.checkConfigEditable(configKey);
  }
}
