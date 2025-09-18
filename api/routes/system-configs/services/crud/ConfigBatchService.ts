/**
 * 系统配置批量操作服务
 * 
 * 负责系统配置的批量操作，包括批量更新等功能
 * 支持事务处理和详细的操作日志
 */

import { getClient } from '../../../../config/database.js';
import { SystemConfigsValidation } from '../../controllers/systemConfigsValidation.js';
import type {
    BatchOperationResult,
    BatchUpdateRequest
} from '../../types/systemConfigs.types.js';
import { SystemConfigsRepository } from '../systemConfigsRepository.js';

export class ConfigBatchService {
  private repository: SystemConfigsRepository;

  constructor() {
    this.repository = new SystemConfigsRepository();
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    batchData: BatchUpdateRequest, 
    userId: string,
    userRole?: string
  ): Promise<BatchOperationResult> {
    console.log('🚀 [批量更新服务] 开始批量更新配置');
    console.log('📊 [批量更新服务] 输入参数:', {
      userId,
      userRole,
      configsCount: batchData.configs?.length || 0,
      changeReason: batchData.change_reason
    });
    
    // 验证批量更新请求
    console.log('📝 [批量更新服务] 验证批量更新请求...');
    const validation = SystemConfigsValidation.validateBatchUpdateRequest(batchData);
    if (!validation.valid) {
      console.error('❌ [批量更新服务] 请求验证失败:', validation.errors);
      throw new Error(validation.errors.join(', '));
    }
    console.log('✅ [批量更新服务] 请求验证通过');

    const results = [];
    const errors = [];

    console.log('🔄 [批量更新服务] 获取数据库连接...');
    const client = await getClient();
    try {
      console.log('💾 [批量更新服务] 开始数据库事务');
      await client.query('BEGIN');
      
      console.log(`🔁 [批量更新服务] 开始处理 ${batchData.configs.length} 个配置项`);
      for (const config of batchData.configs) {
        try {
          console.log(`🔍 [批量更新服务] 处理配置: ${config.config_key} = ${config.config_value}`);
          
          // 检查配置是否存在且可编辑
          const editableCheck = await SystemConfigsValidation.checkConfigEditable(config.config_key);
          console.log(`📊 [批量更新服务] ${config.config_key} 可编辑检查结果:`, editableCheck);
          
          if (!editableCheck.exists) {
            console.log(`❌ [批量更新服务] 配置不存在: ${config.config_key}`);
            errors.push({ config_key: config.config_key, error: '配置不存在' });
            continue;
          }

          if (!editableCheck.editable) {
            console.log(`❌ [批量更新服务] 配置不可编辑: ${config.config_key}`);
            errors.push({ config_key: config.config_key, error: '该配置不允许编辑' });
            continue;
          }

          // 获取当前配置信息
          console.log(`📎 [批量更新服务] 获取当前配置信息: ${config.config_key}`);
          const currentConfig = await this.repository.getConfigByKey(config.config_key, userRole);
          if (!currentConfig) {
            console.log(`❌ [批量更新服务] 未能获取配置: ${config.config_key}`);
            errors.push({ config_key: config.config_key, error: '配置不存在' });
            continue;
          }
          console.log(`📎 [批量更新服务] 当前配置:`, {
            key: currentConfig.config_key,
            currentValue: currentConfig.config_value,
            newValue: config.config_value,
            type: currentConfig.config_type
          });

          // 验证配置值格式
          console.log(`📝 [批量更新服务] 验证配置值格式: ${config.config_key}`);
          const validationResult = SystemConfigsValidation.validateConfigValue(
            config.config_value, 
            currentConfig.config_type
          );
          if (!validationResult.valid) {
            console.log(`❌ [批量更新服务] 配置值验证失败: ${config.config_key}`, validationResult.error);
            errors.push({ 
              config_key: config.config_key, 
              error: `配置值格式错误: ${validationResult.error}` 
            });
            continue;
          }
          console.log(`✅ [批量更新服务] 配置值验证通过: ${config.config_key}`);

          // 记录历史（如果值发生变化）
          if (config.config_value !== currentConfig.config_value) {
            console.log(`📜 [批量更新服务] 记录配置历史: ${config.config_key}`);
            await this.repository.recordConfigHistory(
              currentConfig.id,
              currentConfig.config_value,
              config.config_value,
              batchData.change_reason || '批量更新',
              userId
            );
            console.log(`✅ [批量更新服务] 历史记录完成: ${config.config_key}`);
          } else {
            console.log(`🔄 [批量更新服务] 配置值未变化，跳过历史记录: ${config.config_key}`);
          }

          // 更新配置
          console.log(`🔄 [批量更新服务] 更新配置: ${config.config_key}`);
          const updatedConfig = await this.repository.updateConfig(
            config.config_key,
            { config_value: config.config_value },
            userId
          );
          console.log(`✅ [批量更新服务] 配置更新成功: ${config.config_key}`);

          results.push(updatedConfig);
        } catch (error) {
          console.error(`💥 [批量更新服务] 处理配置 ${config.config_key} 时发生错误:`, error);
          errors.push({ 
            config_key: config.config_key, 
            error: error instanceof Error ? error.message : '未知错误' 
          });
        }
      }

      console.log('💾 [批量更新服务] 提交数据库事务');
      await client.query('COMMIT');
      client.release();
      
      const finalResult = {
        updated: results,
        errors: errors
      };
      
      console.log('✅ [批量更新服务] 批量更新完成，结果统计:', {
        successCount: results.length,
        errorCount: errors.length,
        totalProcessed: batchData.configs.length
      });
      
      return finalResult;
    } catch (error) {
      console.error('💥 [批量更新服务] 发生错误，回滚事务:', error);
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  }
}
