/**
 * 系统配置业务逻辑服务
 * 
 * 提供系统配置相关的核心业务逻辑
 * 协调数据访问层和验证层，实现完整的业务流程
 */

import { query } from '../../../config/database.js';
import { SystemConfigsValidation } from '../controllers/systemConfigsValidation.js';
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
} from '../types/systemConfigs.types.js';
import { SystemConfigsRepository } from './systemConfigsRepository.js';

export class SystemConfigsService {
  private repository: SystemConfigsRepository;

  constructor() {
    this.repository = new SystemConfigsRepository();
  }

  /**
   * 获取系统配置列表
   */
  async getSystemConfigs(params: SystemConfigQuery, userRole?: string): Promise<PaginatedSystemConfigs> {
    // 验证查询参数
    const paginationValidation = SystemConfigsValidation.validatePaginationParams(params.page, params.limit);
    if (!paginationValidation.valid) {
      throw new Error(paginationValidation.errors.join(', '));
    }

    if (params.search) {
      const searchValidation = SystemConfigsValidation.validateSearchQuery(params.search);
      if (!searchValidation.valid) {
        throw new Error(searchValidation.error);
      }
    }

    if (params.category) {
      const categoryValidation = SystemConfigsValidation.validateCategory(params.category);
      if (!categoryValidation.valid) {
        throw new Error(categoryValidation.error);
      }
    }

    return await this.repository.getSystemConfigs(params, userRole);
  }

  /**
   * 获取单个配置
   */
  async getConfigByKey(configKey: string, userRole?: string): Promise<SystemConfig> {
    // 验证配置键格式
    const keyValidation = SystemConfigsValidation.validateConfigKey(configKey);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // 检查访问权限
    const accessCheck = await SystemConfigsValidation.checkConfigAccess(configKey, userRole);
    if (!accessCheck.canAccess) {
      throw new Error('配置不存在或无权访问');
    }

    const config = await this.repository.getConfigByKey(configKey, userRole);
    if (!config) {
      throw new Error('配置不存在或无权访问');
    }

    return config;
  }

  /**
   * 创建配置
   */
  async createConfig(configData: CreateSystemConfigRequest, userId: number): Promise<SystemConfig> {
    // 验证请求数据
    const validation = SystemConfigsValidation.validateCreateRequest(configData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // 检查配置键是否已存在
    const exists = await SystemConfigsValidation.checkConfigExists(configData.config_key);
    if (exists) {
      throw new Error('配置键已存在');
    }

    return await this.repository.createConfig(configData, userId);
  }

  /**
   * 更新配置
   */
  async updateConfig(
    configKey: string, 
    updateData: UpdateSystemConfigRequest, 
    userId: number
  ): Promise<SystemConfig> {
    // 验证配置键格式
    const keyValidation = SystemConfigsValidation.validateConfigKey(configKey);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // 验证更新数据
    const validation = SystemConfigsValidation.validateUpdateRequest(updateData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // 检查配置是否存在且可编辑
    const editableCheck = await SystemConfigsValidation.checkConfigEditable(configKey);
    if (!editableCheck.exists) {
      throw new Error('配置不存在');
    }

    if (!editableCheck.editable) {
      throw new Error('该配置不允许编辑');
    }

    // 获取当前配置信息（用于历史记录）
    const currentConfig = await this.repository.getConfigByKey(configKey);
    if (!currentConfig) {
      throw new Error('配置不存在');
    }

    // 验证配置值格式（如果提供了新值）
    if (updateData.config_value !== undefined) {
      const typeToValidate = updateData.config_type || currentConfig.config_type;
      const validationResult = SystemConfigsValidation.validateConfigValue(updateData.config_value, typeToValidate);
      if (!validationResult.valid) {
        throw new Error(`配置值格式错误: ${validationResult.error}`);
      }
    }

    // 检查是否有实际更新
    if (Object.keys(updateData).filter(key => key !== 'change_reason' && updateData[key as keyof UpdateSystemConfigRequest] !== undefined).length === 0) {
      throw new Error('没有提供要更新的字段');
    }

    // 使用事务更新配置
    const client = await query('BEGIN');
    try {
      // 记录历史（如果配置值发生变化）
      if (updateData.config_value !== undefined && updateData.config_value !== currentConfig.config_value) {
        await this.repository.recordConfigHistory(
          currentConfig.id,
          currentConfig.config_value,
          updateData.config_value,
          updateData.change_reason || '配置更新',
          userId
        );
      }

      // 更新配置
      const updatedConfig = await this.repository.updateConfig(configKey, updateData, userId);

      await query('COMMIT');
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
    userId: string
  ): Promise<BatchOperationResult> {
    // 验证批量更新请求
    const validation = SystemConfigsValidation.validateBatchUpdateRequest(batchData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const results = [];
    const errors = [];

    const client = await query('BEGIN');
    try {
      for (const config of batchData.configs) {
        try {
          // 检查配置是否存在且可编辑
          const editableCheck = await SystemConfigsValidation.checkConfigEditable(config.config_key);
          if (!editableCheck.exists) {
            errors.push({ config_key: config.config_key, error: '配置不存在' });
            continue;
          }

          if (!editableCheck.editable) {
            errors.push({ config_key: config.config_key, error: '该配置不允许编辑' });
            continue;
          }

          // 获取当前配置信息
          const currentConfig = await this.repository.getConfigByKey(config.config_key);
          if (!currentConfig) {
            errors.push({ config_key: config.config_key, error: '配置不存在' });
            continue;
          }

          // 验证配置值格式
          const validationResult = SystemConfigsValidation.validateConfigValue(
            config.config_value, 
            currentConfig.config_type
          );
          if (!validationResult.valid) {
            errors.push({ 
              config_key: config.config_key, 
              error: `配置值格式错误: ${validationResult.error}` 
            });
            continue;
          }

          // 记录历史（如果值发生变化）
          if (config.config_value !== currentConfig.config_value) {
            await this.repository.recordConfigHistory(
              currentConfig.id,
              currentConfig.config_value,
              config.config_value,
              batchData.change_reason || '批量更新',
              userId
            );
          }

          // 更新配置
          const updatedConfig = await this.repository.updateConfig(
            config.config_key,
            { config_value: config.config_value },
            userId
          );

          results.push(updatedConfig);
        } catch (error) {
          errors.push({ 
            config_key: config.config_key, 
            error: error instanceof Error ? error.message : '未知错误' 
          });
        }
      }

      await query('COMMIT');

      return {
        updated: results,
        errors: errors
      };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 删除配置
   */
  async deleteConfig(configKey: string, userId: number, changeReason?: string): Promise<void> {
    // 验证配置键格式
    const keyValidation = SystemConfigsValidation.validateConfigKey(configKey);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // 检查配置是否存在且可编辑
    const editableCheck = await SystemConfigsValidation.checkConfigEditable(configKey);
    if (!editableCheck.exists) {
      throw new Error('配置不存在');
    }

    if (!editableCheck.editable) {
      throw new Error('该配置不允许删除');
    }

    // 获取当前配置信息
    const currentConfig = await this.repository.getConfigByKey(configKey);
    if (!currentConfig) {
      throw new Error('配置不存在');
    }

    const client = await query('BEGIN');
    try {
      // 记录删除历史
      await this.repository.recordConfigHistory(
        currentConfig.id,
        currentConfig.config_value,
        '',
        changeReason || '配置删除',
        userId
      );

      // 删除配置
      await this.repository.deleteConfig(configKey);

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 重置配置为默认值
   */
  async resetConfigToDefault(
    configKey: string, 
    userId: number, 
    resetData: ResetConfigRequest
  ): Promise<SystemConfig> {
    // 验证配置键格式
    const keyValidation = SystemConfigsValidation.validateConfigKey(configKey);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // 检查配置是否存在且可编辑
    const editableCheck = await SystemConfigsValidation.checkConfigEditable(configKey);
    if (!editableCheck.exists) {
      throw new Error('配置不存在');
    }

    if (!editableCheck.editable) {
      throw new Error('该配置不允许重置');
    }

    // 获取当前配置信息
    const currentConfig = await this.repository.getConfigByKey(configKey);
    if (!currentConfig) {
      throw new Error('配置不存在');
    }

    // 检查是否有默认值
    if (!currentConfig.default_value) {
      throw new Error('该配置没有默认值');
    }

    const client = await query('BEGIN');
    try {
      // 记录重置历史
      await this.repository.recordConfigHistory(
        currentConfig.id,
        currentConfig.config_value,
        currentConfig.default_value,
        resetData.change_reason || '重置为默认值',
        userId
      );

      // 重置配置
      const resetConfig = await this.repository.resetConfigToDefault(configKey, userId);

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
    // 验证配置键格式
    const keyValidation = SystemConfigsValidation.validateConfigKey(configKey);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // 验证分页参数
    const paginationValidation = SystemConfigsValidation.validatePaginationParams(page, limit);
    if (!paginationValidation.valid) {
      throw new Error(paginationValidation.errors.join(', '));
    }

    return await this.repository.getConfigHistory(configKey, page, limit);
  }

  /**
   * 获取配置分类列表
   */
  async getConfigCategories(userRole?: string): Promise<ConfigCategoryStats[]> {
    return await this.repository.getConfigCategories(userRole);
  }

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
   * 统计配置信息
   */
  async getConfigStats(userRole?: string): Promise<{
    total: number;
    public_count: number;
    editable_count: number;
    categories: ConfigCategoryStats[];
  }> {
    const categories = await this.getConfigCategories(userRole);
    
    const total = categories.reduce((sum, cat) => sum + cat.config_count, 0);
    const publicCount = categories.reduce((sum, cat) => sum + cat.public_count, 0);

    // 获取可编辑配置数量
    let editableQuery = 'SELECT COUNT(*) FROM system_configs WHERE is_editable = true';
    if (userRole !== 'admin') {
      editableQuery += ' AND is_public = true';
    }
    
    const editableResult = await query(editableQuery);
    const editableCount = parseInt(editableResult.rows[0].count);

    return {
      total,
      public_count: publicCount,
      editable_count: editableCount,
      categories
    };
  }
}
