/**
 * 系统配置基础CRUD服务
 * 
 * 负责系统配置的基础增删改查操作
 * 包括获取、创建、更新、删除等基本功能
 */

import { query } from '../../../../config/database.ts';
import { SystemConfigsValidation } from '../../controllers/systemConfigsValidation.ts';
import type {
    ConfigCategoryStats,
    CreateSystemConfigRequest,
    PaginatedSystemConfigs,
    ResetConfigRequest,
    SystemConfig,
    SystemConfigQuery,
    UpdateSystemConfigRequest
} from '../../types/systemConfigs.types.ts';
import { SystemConfigsRepository } from '../systemConfigsRepository.ts';

export class ConfigCRUDService {
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
  async createConfig(configData: CreateSystemConfigRequest, userId: string): Promise<SystemConfig> {
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
    userId: string
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

    return {
      currentConfig,
      updateData,
      configKey,
      userId
    } as any; // 返回需要的数据给调用者处理事务
  }

  /**
   * 删除配置
   */
  async deleteConfig(configKey: string, userId: string, changeReason?: string): Promise<{
    currentConfig: SystemConfig;
    configKey: string;
    userId: string;
    changeReason: string;
  }> {
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

    return {
      currentConfig,
      configKey,
      userId,
      changeReason: changeReason || '配置删除'
    };
  }

  /**
   * 重置配置为默认值
   */
  async resetConfigToDefault(
    configKey: string, 
    userId: string, 
    resetData: ResetConfigRequest
  ): Promise<{
    currentConfig: SystemConfig;
    configKey: string;
    userId: string;
    resetData: ResetConfigRequest;
  }> {
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

    return {
      currentConfig,
      configKey,
      userId,
      resetData
    };
  }

  /**
   * 获取配置分类列表
   */
  async getConfigCategories(userRole?: string): Promise<ConfigCategoryStats[]> {
    return await this.repository.getConfigCategories(userRole);
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
    if (userRole !== 'admin' && userRole !== 'super_admin') {
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
