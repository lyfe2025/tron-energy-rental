/**
 * 代理商服务门面类（安全分离后的主入口）
 * 保持原有API接口不变，内部调用分离后的专门服务
 * 确保向后兼容性，外部调用无需修改
 */

// 导出类型定义，保持向后兼容
export interface Agent {
  id: string;
  user_id: string;
  agent_code: string;
  commission_rate: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: Date;
  updated_at: Date;
  // 关联的用户信息
  user?: {
    id: string;
    username?: string;
    email?: string;
    phone?: string;
    telegram_id?: number;
  };
  // 统计信息
  stats?: {
    total_users: number;
    active_users: number;
    total_commission: number;
  };
}

export interface AgentSearchParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface AgentCreateData {
  user_id: string;
  agent_code: string;
  commission_rate: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface AgentUpdateData {
  agent_code?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

// 导入分离后的服务
import { AgentCRUDService } from './AgentCRUDService.js';
import { AgentCodeService } from './AgentCodeService.js';
import { AgentStatsService } from './AgentStatsService.js';

/**
 * 代理商服务门面类
 * 提供统一的接口，内部调用分离后的专门服务
 */
export class AgentService {
  // =================== CRUD 操作 ===================
  
  /**
   * 获取代理商列表
   */
  static async getAgents(params: AgentSearchParams) {
    return await AgentCRUDService.getAgents(params);
  }

  /**
   * 根据ID获取代理商详情
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    return await AgentCRUDService.getAgentById(id);
  }

  /**
   * 根据用户ID获取代理商
   */
  static async getAgentByUserId(userId: string): Promise<Agent | null> {
    return await AgentCRUDService.getAgentByUserId(userId);
  }

  /**
   * 创建代理商
   */
  static async createAgent(data: AgentCreateData): Promise<Agent> {
    return await AgentCRUDService.createAgent(data);
  }

  /**
   * 更新代理商信息
   */
  static async updateAgent(id: string, data: AgentUpdateData): Promise<Agent | null> {
    return await AgentCRUDService.updateAgent(id, data);
  }

  /**
   * 更新代理商状态
   */
  static async updateAgentStatus(id: string, status: string): Promise<Agent | null> {
    return await AgentCRUDService.updateAgentStatus(id, status);
  }

  /**
   * 删除代理商
   */
  static async deleteAgent(id: string): Promise<boolean> {
    return await AgentCRUDService.deleteAgent(id);
  }

  // =================== 代码管理 ===================

  /**
   * 检查代理商代码是否存在
   */
  static async checkAgentCodeExists(agentCode: string, excludeId?: string): Promise<boolean> {
    return await AgentCodeService.checkAgentCodeExists(agentCode, excludeId);
  }

  /**
   * 生成代理商代码
   */
  static async generateAgentCode(): Promise<string> {
    return await AgentCodeService.generateAgentCode();
  }

  /**
   * 根据用户名生成个性化代理商代码
   */
  static async generatePersonalizedAgentCode(username: string): Promise<string> {
    return await AgentCodeService.generatePersonalizedAgentCode(username);
  }

  /**
   * 批量生成代理商代码
   */
  static async generateBatchAgentCodes(count: number): Promise<string[]> {
    return await AgentCodeService.generateBatchAgentCodes(count);
  }

  /**
   * 验证代理商代码格式
   */
  static validateAgentCodeFormat(agentCode: string) {
    return AgentCodeService.validateAgentCodeFormat(agentCode);
  }

  /**
   * 检查代理商代码是否为系统保留
   */
  static isReservedAgentCode(agentCode: string): boolean {
    return AgentCodeService.isReservedAgentCode(agentCode);
  }

  /**
   * 获取代理商代码建议
   */
  static async suggestAgentCodes(baseName: string, count: number = 5): Promise<string[]> {
    return await AgentCodeService.suggestAgentCodes(baseName, count);
  }

  // =================== 统计功能 ===================

  /**
   * 获取代理商统计数据
   */
  static async getAgentStats() {
    return await AgentStatsService.getAgentStats();
  }

  /**
   * 获取代理商绩效统计
   */
  static async getAgentPerformanceStats(agentId?: string) {
    return await AgentStatsService.getAgentPerformanceStats(agentId);
  }

  /**
   * 获取代理商增长趋势
   */
  static async getAgentGrowthStats(days: number = 30) {
    return await AgentStatsService.getAgentGrowthStats(days);
  }

  /**
   * 获取代理商佣金分布统计
   */
  static async getCommissionDistributionStats() {
    return await AgentStatsService.getCommissionDistributionStats();
  }

  /**
   * 获取特定代理商的详细统计
   */
  static async getAgentDetailedStats(agentId: string) {
    return await AgentStatsService.getAgentDetailedStats(agentId);
  }

  /**
   * 获取代理商代码使用统计
   */
  static async getAgentCodeStats() {
    return await AgentCodeService.getAgentCodeStats();
  }

  // =================== 扩展功能（兼容性方法） ===================

  /**
   * 获取代理商等级列表（为兼容现有路由）
   */
  static async getAgentLevels() {
    // 基于佣金率范围定义等级
    const levels = [
      { id: 1, name: '初级代理商', min_commission: 0, max_commission: 5 },
      { id: 2, name: '中级代理商', min_commission: 5, max_commission: 10 },
      { id: 3, name: '高级代理商', min_commission: 10, max_commission: 20 },
      { id: 4, name: '金牌代理商', min_commission: 20, max_commission: 100 }
    ];
    
    return levels;
  }

  /**
   * 获取推荐佣金率范围
   */
  static getRecommendedCommissionRates() {
    return {
      new_agent: { min: 3, max: 5, recommended: 5 },
      experienced_agent: { min: 8, max: 15, recommended: 10 },
      vip_agent: { min: 15, max: 30, recommended: 20 }
    };
  }

  /**
   * 验证代理商创建数据
   */
  static async validateAgentData(data: AgentCreateData): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 验证用户ID
    if (!data.user_id) {
      errors.push('用户ID不能为空');
    }

    // 验证代理商代码
    const codeValidation = this.validateAgentCodeFormat(data.agent_code);
    if (!codeValidation.valid) {
      errors.push(codeValidation.message!);
    }

    // 检查代码是否已存在
    if (codeValidation.valid) {
      const codeExists = await this.checkAgentCodeExists(data.agent_code);
      if (codeExists) {
        errors.push('代理商代码已存在');
      }
    }

    // 验证佣金率
    if (data.commission_rate < 0 || data.commission_rate > 100) {
      errors.push('佣金率必须在0-100之间');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 获取统计数据（为兼容现有路由）
   * @deprecated 请使用 getAgentStats() 方法
   */
  static async getStats() {
    return await this.getAgentStats();
  }
}