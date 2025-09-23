/**
 * 系统配置业务逻辑服务 - 主协调器
 * 
 * 提供系统配置相关的核心业务逻辑
 * 协调各个子服务，实现完整的业务流程
 * 重构后作为各个专业服务的统一入口
 */

import { query } from '../../../config/database.ts';
import type {
  BatchOperationResult,
  BatchUpdateRequest,
  ConfigCategoryStats,
  CreateSystemConfigRequest,
  PaginatedConfigHistory,
  PaginatedSystemConfigs,
  ResetConfigRequest,
  SystemConfig,
  SystemConfigQuery,
  UpdateSystemConfigRequest
} from '../types/systemConfigs.types.ts';

// 导入各个专业服务
import { ConfigCacheService } from './cache/ConfigCacheService.ts';
import { ConfigBatchService } from './crud/ConfigBatchService.ts';
import { ConfigCRUDService } from './crud/ConfigCRUDService.ts';
import { ConfigHistoryService } from './crud/ConfigHistoryService.ts';
import { SystemConfigsRepository } from './systemConfigsRepository.ts';
import { ConfigValidationService } from './validation/ConfigValidationService.ts';

export class SystemConfigsService {
  // 子服务实例
  private crudService: ConfigCRUDService;
  private batchService: ConfigBatchService;
  private historyService: ConfigHistoryService;
  private validationService: ConfigValidationService;
  private cacheService: ConfigCacheService;
  private repository: SystemConfigsRepository;

  constructor() {
    // 初始化所有子服务
    this.crudService = new ConfigCRUDService();
    this.batchService = new ConfigBatchService();
    this.historyService = new ConfigHistoryService();
    this.validationService = new ConfigValidationService();
    this.cacheService = new ConfigCacheService();
    this.repository = new SystemConfigsRepository();
  }

  /**
   * 获取系统配置列表
   */
  async getSystemConfigs(params: SystemConfigQuery, userRole?: string): Promise<PaginatedSystemConfigs> {
    return await this.crudService.getSystemConfigs(params, userRole);
  }

  /**
   * 获取单个配置
   */
  async getConfigByKey(configKey: string, userRole?: string): Promise<SystemConfig> {
    return await this.crudService.getConfigByKey(configKey, userRole);
  }

  /**
   * 创建配置
   */
  async createConfig(configData: CreateSystemConfigRequest, userId: string): Promise<SystemConfig> {
    return await this.crudService.createConfig(configData, userId);
  }

  /**
   * 更新配置（带事务处理）
   */
  async updateConfig(
    configKey: string, 
    updateData: UpdateSystemConfigRequest, 
    userId: string
  ): Promise<SystemConfig> {
    // 获取预处理的数据
    const updateInfo = await this.crudService.updateConfig(configKey, updateData, userId) as any;
    const { currentConfig, configKey: key, userId: uid } = updateInfo;

    // 使用事务更新配置
    const client = await query('BEGIN');
    try {
      // 记录历史（如果配置值发生变化）
      if (updateData.config_value !== undefined && updateData.config_value !== currentConfig.config_value) {
        await this.historyService.recordConfigHistory(
          currentConfig.id,
          currentConfig.config_value,
          updateData.config_value,
          updateData.change_reason || '配置更新',
          uid
        );
      }

      // 更新配置
      const updatedConfig = await this.repository.updateConfig(key, updateData, uid);

      await query('COMMIT');
      
      // 清除系统配置缓存
      await this.cacheService.safeClearSystemCache();
      
      return updatedConfig;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    batchData: BatchUpdateRequest, 
    userId: string,
    userRole?: string
  ): Promise<BatchOperationResult> {
    const result = await this.batchService.batchUpdateConfigs(batchData, userId, userRole);
    
    // 批量更新成功后清除缓存
    if (result.updated.length > 0) {
      await this.cacheService.safeClearSystemCache();
    }
    
    return result;
  }

  /**
   * 删除配置（带事务处理）
   */
  async deleteConfig(configKey: string, userId: string, changeReason?: string): Promise<void> {
    // 获取预处理的数据
    const deleteInfo = await this.crudService.deleteConfig(configKey, userId, changeReason);
    const { currentConfig, configKey: key, userId: uid, changeReason: reason } = deleteInfo;

    const client = await query('BEGIN');
    try {
      // 记录删除历史
      await this.historyService.recordConfigHistory(
        currentConfig.id,
        currentConfig.config_value,
        '',
        reason,
        uid
      );

      // 删除配置
      await this.repository.deleteConfig(key);

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 重置配置为默认值（带事务处理）
   */
  async resetConfigToDefault(
    configKey: string, 
    userId: string, 
    resetData: ResetConfigRequest
  ): Promise<SystemConfig> {
    // 获取预处理的数据
    const resetInfo = await this.crudService.resetConfigToDefault(configKey, userId, resetData);
    const { currentConfig, configKey: key, userId: uid, resetData: data } = resetInfo;

    const client = await query('BEGIN');
    try {
      // 记录重置历史
      await this.historyService.recordConfigHistory(
        currentConfig.id,
        currentConfig.config_value,
        currentConfig.default_value,
        data.change_reason || '重置为默认值',
        uid
      );

      // 重置配置
      const resetConfig = await this.repository.resetConfigToDefault(key, uid);

      await query('COMMIT');
      return resetConfig;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 获取配置历史记录
   */
  async getConfigHistory(configKey: string, page = 1, limit = 20): Promise<PaginatedConfigHistory> {
    return await this.historyService.getConfigHistory(configKey, page, limit);
  }

  /**
   * 获取配置分类列表
   */
  async getConfigCategories(userRole?: string): Promise<ConfigCategoryStats[]> {
    return await this.crudService.getConfigCategories(userRole);
  }

  /**
   * 统计配置信息
   */
  async getConfigStats(userRole?: string): Promise<{
    total: number;
    public_count: number;
    editable_count: number;
    categories: ConfigCategoryStats[];
  }> {
    return await this.crudService.getConfigStats(userRole);
  }

  /**
   * 验证配置值格式（对外提供的工具方法）
   */
  validateConfigValue(value: any, type: string) {
    return this.validationService.validateConfigValue(value, type);
  }

  /**
   * 检查配置访问权限（对外提供的工具方法）
   */
  async checkConfigAccess(configKey: string, userRole?: string) {
    return await this.validationService.checkConfigAccess(configKey, userRole);
  }
}