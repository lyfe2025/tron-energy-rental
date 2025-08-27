/**
 * 机器人价格配置业务逻辑服务
 */
import { query } from '../../../config/database.js';
import PriceCalculator from '../../../utils/price-calculator.js';
import type {
    BatchConfigRequest,
    BatchOperationResult,
    CopyConfigRequest,
    CopyConfigResult,
    CreateRobotPricingRequest,
    RobotPricingQuery,
    RobotPricingWithDetails,
    UpdateRobotPricingRequest
} from '../types/robotPricing.types.js';
import { RobotPricingRepository } from './robotPricingRepository.js';

export class RobotPricingService {
  private repository: RobotPricingRepository;

  constructor() {
    this.repository = new RobotPricingRepository();
  }

  /**
   * 获取机器人价格配置列表（带价格计算）
   */
  async getConfigsList(queryParams: RobotPricingQuery) {
    const { configs, total } = await this.repository.findMany(queryParams);
    
    // 计算实际价格
    const configsWithPrices = await this.calculatePricesForConfigs(configs);
    
    return {
      configs: configsWithPrices,
      pagination: {
        page: Number(queryParams.page || 1),
        limit: Number(queryParams.limit || 20),
        total,
        pages: Math.ceil(total / Number(queryParams.limit || 20))
      }
    };
  }

  /**
   * 获取特定机器人的价格配置
   */
  async getBotConfigs(botId: string, packageId?: string) {
    // 验证机器人存在
    const bot = await this.getBotById(botId);
    if (!bot) {
      throw new Error('机器人不存在');
    }

    // 获取机器人的价格配置
    const configs = await this.repository.findByBotId(botId, packageId);
    
    // 获取默认配置（如果没有特定配置或未指定包ID）
    let defaultConfigs = [];
    if (configs.length === 0 || !packageId) {
      defaultConfigs = await this.repository.findDefaultConfigs();
    }

    // 计算价格
    const configsWithPrices = await this.calculatePricesForConfigs(configs, botId);

    return {
      bot: {
        id: bot.id,
        bot_name: bot.bot_name,
        bot_type: bot.bot_type,
        status: bot.status
      },
      configs: configsWithPrices,
      defaultConfigs: defaultConfigs,
      hasCustomPricing: configs.length > 0
    };
  }

  /**
   * 创建机器人价格配置
   */
  async createConfig(data: CreateRobotPricingRequest, userId: string) {
    // 记录旧价格（用于历史记录）
    let oldPrice = 0;
    try {
      const defaultPrice = await PriceCalculator.calculatePrice(data.package_id, 1, null, null);
      oldPrice = defaultPrice.finalPrice;
    } catch (error) {
      console.warn('无法获取默认价格:', error);
    }

    // 创建配置
    const newConfig = await this.repository.create(data, userId);

    // 计算新价格
    const newPrice = await PriceCalculator.calculatePrice(data.package_id, 1, data.bot_id, null);

    // 记录价格历史
    if (oldPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'bot',
        data.bot_id,
        oldPrice,
        newPrice.finalPrice,
        `创建机器人价格配置 - 配置ID: ${newConfig.id}`,
        userId
      );
    }

    return {
      config: newConfig,
      calculated_price: newPrice.finalPrice,
      price_breakdown: newPrice
    };
  }

  /**
   * 更新机器人价格配置
   */
  async updateConfig(id: string, data: UpdateRobotPricingRequest, userId: string) {
    const existingConfig = await this.repository.findById(id);
    if (!existingConfig) {
      throw new Error('机器人价格配置不存在');
    }

    // 计算旧价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );

    // 更新配置
    const updatedConfig = await this.repository.update(id, data);

    // 计算新价格
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );

    // 记录价格历史（如果价格有变化）
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'bot',
        existingConfig.bot_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `更新机器人价格配置 - 配置ID: ${id}`,
        userId
      );
    }

    return {
      config: updatedConfig,
      calculated_price: newPrice.finalPrice,
      price_breakdown: newPrice
    };
  }

  /**
   * 删除机器人价格配置
   */
  async deleteConfig(id: string, userId: string) {
    const existingConfig = await this.repository.findById(id);
    if (!existingConfig) {
      throw new Error('机器人价格配置不存在');
    }

    // 计算删除前的价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );

    // 删除配置
    await this.repository.delete(id);

    // 计算删除后的价格（回到默认价格）
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null, // 无机器人，使用默认价格
      null
    );

    // 记录价格历史
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'bot',
        existingConfig.bot_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `删除机器人价格配置 - 配置ID: ${id}`,
        userId
      );
    }
  }

  /**
   * 批量设置机器人价格配置
   */
  async batchSetConfigs(data: BatchConfigRequest, userId: string): Promise<BatchOperationResult> {
    const { configs } = data;
    
    const results = [];
    const errors = [];
    
    // 开始事务
    await query('BEGIN');
    
    try {
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        
        try {
          // 验证必填字段
          if (!config.bot_id || !config.package_id) {
            errors.push({
              index: i,
              error: '缺少必填字段：bot_id, package_id'
            });
            continue;
          }

          const result = await this.repository.batchUpsert(
            config.bot_id, 
            config.package_id, 
            config, 
            userId
          );
          
          results.push({
            index: i,
            action: result.action,
            config: result.config
          });
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      // 提交事务
      await query('COMMIT');
      
      return {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };

    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 复制机器人价格配置
   */
  async copyConfig(sourceId: string, copyRequest: CopyConfigRequest, userId: string): Promise<CopyConfigResult> {
    const { target_bot_ids, target_package_ids } = copyRequest;
    
    const results = [];
    const errors = [];
    
    // 获取源配置
    const sourceConfig = await this.repository.findById(sourceId);
    if (!sourceConfig) {
      throw new Error('源机器人价格配置不存在');
    }
    
    // 开始事务
    await query('BEGIN');
    
    try {
      for (const targetBotId of target_bot_ids) {
        // 如果指定了目标能量包，使用指定的；否则使用源配置的能量包
        const packageIds = target_package_ids && target_package_ids.length > 0 
          ? target_package_ids 
          : [sourceConfig.package_id];
        
        for (const packageId of packageIds) {
          try {
            // 检查是否已存在
            const exists = await this.repository.existsByBotAndPackage(targetBotId, packageId);
            
            if (exists) {
              errors.push({
                bot_id: targetBotId,
                package_id: packageId,
                error: '配置已存在'
              });
              continue;
            }
            
            // 创建新配置
            const newConfig = await this.repository.copyConfig(sourceId, targetBotId, packageId, userId);
            
            results.push({
              bot_id: targetBotId,
              package_id: packageId,
              config: newConfig
            });
            
          } catch (error) {
            errors.push({
              bot_id: targetBotId,
              package_id: packageId,
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }
      }
      
      // 提交事务
      await query('COMMIT');
      
      return {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };

    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 为配置列表计算价格（优化版本 - 解决N+1查询问题）
   */
  private async calculatePricesForConfigs(
    configs: RobotPricingWithDetails[], 
    botId?: string
  ): Promise<RobotPricingWithDetails[]> {
    if (configs.length === 0) {
      return configs;
    }

    try {
      // 准备批量计算输入
      const batchInputs = configs.map(config => ({
        packageId: config.package_id,
        quantity: 1,
        botId: botId || config.bot_id,
        agentId: null,
        type: 'energy' as const,
        amount: 1000 // 默认能量数量
      }));

      // 批量计算价格
      const calculatedPrices = await PriceCalculator.batchCalculate(batchInputs, {
        validateInput: false, // 批量计算时跳过输入验证以提高性能
        includeHistory: false // 批量计算时不保存历史记录
      });

      // 将计算结果映射回配置
      return configs.map((config, index) => {
        const calculatedPrice = calculatedPrices[index];
        
        if (calculatedPrice && calculatedPrice.finalPrice !== undefined) {
          return {
            ...config,
            calculated_price: calculatedPrice.finalPrice,
            discount_applied: calculatedPrice.discount > 0,
            price_breakdown: calculatedPrice
          };
        } else {
          // 如果批量计算失败，使用原价格
          console.warn(`批量计算价格失败 - 配置ID: ${config.id}`);
          return {
            ...config,
            calculated_price: config.price || 0,
            discount_applied: false,
            price_breakdown: null
          };
        }
      });
    } catch (error) {
      console.error('批量价格计算失败，回退到单个计算:', error);
      
      // 如果批量计算失败，回退到原来的单个计算方式
      return Promise.all(
        configs.map(async (config) => {
          try {
            const calculatedPrice = await PriceCalculator.calculatePrice(
              config.package_id,
              1,
              botId || config.bot_id,
              null
            );

            return {
              ...config,
              calculated_price: calculatedPrice.finalPrice,
              discount_applied: calculatedPrice.discount > 0,
              price_breakdown: calculatedPrice
            };
          } catch (error) {
            console.error(`计算价格失败 - 配置ID: ${config.id}`, error);
            return {
              ...config,
              calculated_price: config.price || 0,
              discount_applied: false,
              price_breakdown: null
            };
          }
        })
      );
    }
  }

  /**
   * 获取机器人信息
   */
  private async getBotById(botId: string): Promise<any> {
    const result = await query('SELECT * FROM bots WHERE id = $1', [botId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 记录价格历史
   */
  private async recordPriceHistory(
    entityType: string,
    entityId: string,
    oldPrice: number,
    newPrice: number,
    reason: string,
    userId: string
  ): Promise<void> {
    try {
      await PriceCalculator.recordPriceHistory(entityType, entityId, oldPrice, newPrice, reason, userId);
    } catch (error) {
      console.error('记录价格历史失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }
}
