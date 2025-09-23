/**
 * 系统配置历史管理服务
 * 
 * 负责系统配置的历史记录管理，包括获取历史记录等功能
 * 提供配置变更的完整历史追踪
 */

import { SystemConfigsValidation } from '../../controllers/systemConfigsValidation.ts';
import type {
    PaginatedConfigHistory
} from '../../types/systemConfigs.types.ts';
import { SystemConfigsRepository } from '../systemConfigsRepository.ts';

export class ConfigHistoryService {
  private repository: SystemConfigsRepository;

  constructor() {
    this.repository = new SystemConfigsRepository();
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
   * 记录配置历史（通过repository）
   */
  async recordConfigHistory(
    configId: number,
    oldValue: string,
    newValue: string,
    changeReason: string,
    userId: string
  ): Promise<void> {
    return await this.repository.recordConfigHistory(configId, oldValue, newValue, changeReason, userId);
  }
}
