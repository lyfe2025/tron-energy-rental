/**
 * 代理商价格配置业务逻辑服务
 */
import { query } from '../../../config/database.js';
import PriceCalculator from '../../../utils/price-calculator.js';
import type {
    AgentPricingQuery,
    AgentPricingWithDetails,
    BatchConfigRequest,
    BatchOperationResult,
    CreateAgentPricingRequest,
    UpdateAgentPricingRequest
} from '../types/agentPricing.types.js';
import { AgentPricingRepository } from './agentPricingRepository.js';

export class AgentPricingService {
  private repository: AgentPricingRepository;

  constructor() {
    this.repository = new AgentPricingRepository();
  }

  /**
   * 获取代理商价格配置列表（带价格计算）
   */
  async getConfigsList(queryParams: AgentPricingQuery) {
    const { configs, total } = await this.repository.findMany(queryParams);
    
    // 计算实际价格和佣金
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
   * 获取特定代理商的价格配置
   */
  async getAgentConfigs(agentId: string, packageId?: string) {
    // 验证代理商存在
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error('代理商不存在');
    }

    // 获取代理商的价格配置
    const configs = await this.repository.findByAgentId(agentId, packageId);
    
    // 获取默认配置（如果没有特定配置或未指定包ID）
    let defaultConfigs = [];
    if (configs.length === 0 || !packageId) {
      defaultConfigs = await this.repository.findDefaultConfigs();
    }

    // 计算价格
    const configsWithPrices = await this.calculatePricesForConfigs(configs, agentId);
    const defaultConfigsWithPrices = await this.calculatePricesForConfigs(defaultConfigs, null, agent);

    return {
      agent: {
        id: agent.id,
        agent_name: agent.agent_name,
        level: agent.level,
        commission_rate: agent.commission_rate,
        status: agent.status
      },
      configs: configsWithPrices,
      defaultConfigs: defaultConfigsWithPrices,
      hasCustomPricing: configs.length > 0
    };
  }

  /**
   * 创建代理商价格配置
   */
  async createConfig(data: CreateAgentPricingRequest, userId: string) {
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
    const newPrice = await PriceCalculator.calculatePrice(data.package_id, 1, null, data.agent_id);

    // 记录价格历史
    if (oldPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'agent',
        data.agent_id,
        oldPrice,
        newPrice.finalPrice,
        `创建代理商价格配置 - 配置ID: ${newConfig.id}`,
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
   * 更新代理商价格配置
   */
  async updateConfig(id: string, data: UpdateAgentPricingRequest, userId: string) {
    const existingConfig = await this.repository.findById(id);
    if (!existingConfig) {
      throw new Error('代理商价格配置不存在');
    }

    // 计算旧价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      existingConfig.agent_id
    );

    // 更新配置
    const updatedConfig = await this.repository.update(id, data);

    // 计算新价格
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      existingConfig.agent_id
    );

    // 记录价格历史（如果价格有变化）
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'agent',
        existingConfig.agent_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `更新代理商价格配置 - 配置ID: ${id}`,
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
   * 删除代理商价格配置
   */
  async deleteConfig(id: string, userId: string) {
    const existingConfig = await this.repository.findById(id);
    if (!existingConfig) {
      throw new Error('代理商价格配置不存在');
    }

    // 计算删除前的价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      existingConfig.agent_id
    );

    // 删除配置
    await this.repository.delete(id);

    // 计算删除后的价格（回到默认价格）
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      null // 无代理商，使用默认价格
    );

    // 记录价格历史
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await this.recordPriceHistory(
        'agent',
        existingConfig.agent_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `删除代理商价格配置 - 配置ID: ${id}`,
        userId
      );
    }
  }

  /**
   * 获取代理商等级价格配置
   */
  async getLevelConfigs(packageId?: string) {
    const levels = await this.repository.getLevelStats(packageId);
    
    // 获取每个等级的示例代理商
    const levelsWithExamples = await Promise.all(
      levels.map(async (levelData) => {
        const examples = await this.repository.getLevelExamples(levelData.level, packageId);
        return {
          ...levelData,
          examples
        };
      })
    );

    return {
      levels: levelsWithExamples,
      package_filter: packageId || null
    };
  }

  /**
   * 批量设置代理商价格配置
   */
  async batchSetConfigs(data: BatchConfigRequest, userId: string): Promise<BatchOperationResult> {
    const { configs, apply_to_level } = data;
    
    const results = [];
    const errors = [];
    
    // 开始事务
    await query('BEGIN');
    
    try {
      // 如果指定了等级，获取该等级的所有代理商
      let targetAgents = [];
      if (apply_to_level) {
        const agentsResult = await query(
          'SELECT id FROM agents WHERE level = $1 AND status = $2',
          [apply_to_level, 'active']
        );
        targetAgents = agentsResult.rows.map(row => row.id);
      }

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        
        try {
          // 验证必填字段
          if (!config.package_id) {
            errors.push({
              index: i,
              error: '缺少必填字段：package_id'
            });
            continue;
          }

          // 确定目标代理商列表
          const agentsToProcess = config.agent_id ? [config.agent_id] : targetAgents;
          
          if (agentsToProcess.length === 0) {
            errors.push({
              index: i,
              error: '没有指定代理商ID且未设置等级过滤'
            });
            continue;
          }

          // 为每个代理商创建或更新配置
          for (const currentAgentId of agentsToProcess) {
            const result = await this.repository.batchUpsert(
              currentAgentId, 
              config.package_id, 
              config, 
              userId
            );
            
            results.push({
              index: i,
              agent_id: currentAgentId,
              action: result.action,
              config: result.config
            });
          }
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
        errors,
        applied_to_level: apply_to_level || undefined
      };

    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * 获取代理商等级价格配置统计
   */
  async getLevelStats(): Promise<any> {
    // 获取各等级代理商的价格配置统计
    const levelStatsResult = await query(`
      SELECT 
        a.level,
        COUNT(DISTINCT a.id) as agent_count,
        COUNT(pc.id) as config_count,
        AVG(pc.price) as avg_price,
        MIN(pc.price) as min_price,
        MAX(pc.price) as max_price,
        AVG(pc.discount_percentage) as avg_discount,
        AVG(a.commission_rate) as avg_commission_rate
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id AND pc.status = 'active'
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC
    `);

    // 获取总体统计
    const overallStatsResult = await query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_agents,
        COUNT(pc.id) as total_configs,
        AVG(pc.price) as overall_avg_price,
        SUM(CASE WHEN pc.discount_percentage > 0 THEN 1 ELSE 0 END) as configs_with_discount
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id AND pc.status = 'active'
      WHERE a.status = 'active'
    `);

    // 获取最近价格变更统计
    const recentChangesResult = await query(`
      SELECT 
        a.level,
        COUNT(ph.id) as recent_changes
      FROM agents a
      LEFT JOIN price_history ph ON a.id = ph.entity_id 
        AND ph.entity_type = 'agent' 
        AND ph.changed_at >= NOW() - INTERVAL '30 days'
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC
    `);

    const levelStats = levelStatsResult.rows.map(level => {
      const recentChange = recentChangesResult.rows.find(rc => rc.level === level.level);
      return {
        ...level,
        recent_changes: parseInt(recentChange?.recent_changes || '0')
      };
    });

    return {
      levelStats,
      overall: overallStatsResult.rows[0]
    };
  }

  /**
   * 为配置列表计算价格（优化版本 - 解决N+1查询问题）
   */
  private async calculatePricesForConfigs(
    configs: AgentPricingWithDetails[], 
    agentId?: string, 
    agent?: any
  ): Promise<AgentPricingWithDetails[]> {
    if (configs.length === 0) {
      return configs;
    }

    try {
      // 准备批量计算输入
      const batchInputs = configs.map(config => ({
        packageId: config.package_id,
        quantity: 1,
        botId: null,
        agentId: agentId || config.agent_id,
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
          // 计算代理商佣金
          const commissionRate = agent?.commission_rate || config.commission_rate || 0;
          const commission = calculatedPrice.finalPrice * (commissionRate / 100);
          const agentPrice = calculatedPrice.finalPrice - commission;

          return {
            ...config,
            calculated_price: calculatedPrice.finalPrice,
            agent_price: agentPrice,
            commission_amount: commission,
            discount_applied: calculatedPrice.discount > 0,
            price_breakdown: calculatedPrice
          };
        } else {
          // 如果批量计算失败，使用原价格
          console.warn(`批量计算价格失败 - 配置ID: ${config.id}`);
          return {
            ...config,
            calculated_price: config.price || 0,
            agent_price: config.price || 0,
            commission_amount: 0,
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
              null,
              agentId || config.agent_id
            );

            // 计算代理商佣金
            const commissionRate = agent?.commission_rate || config.commission_rate || 0;
            const commission = calculatedPrice.finalPrice * (commissionRate / 100);
            const agentPrice = calculatedPrice.finalPrice - commission;

            return {
              ...config,
              calculated_price: calculatedPrice.finalPrice,
              agent_price: agentPrice,
              commission_amount: commission,
              discount_applied: calculatedPrice.discount > 0,
              price_breakdown: calculatedPrice
            };
          } catch (error) {
            console.error(`计算价格失败 - 配置ID: ${config.id}`, error);
            return {
              ...config,
              calculated_price: config.price || 0,
              agent_price: config.price || 0,
              commission_amount: 0,
              discount_applied: false,
              price_breakdown: null
            };
          }
        })
      );
    }
  }

  /**
   * 获取代理商信息
   */
  private async getAgentById(agentId: string): Promise<any> {
    const result = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
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
      await PriceCalculator.savePriceHistory(oldPrice, newPrice, entityType, entityId, reason, userId);
    } catch (error) {
      console.error('记录价格历史失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }
}
