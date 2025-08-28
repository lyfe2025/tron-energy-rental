/**
 * 代理商管理服务
 * 处理代理商相关的API调用
 */
import axios from 'axios';
import type {
  AgentQuery,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentListResponse,
  AgentDetailResponse,
  AgentPricingQuery,
  AgentPricingListResponse,
  BatchConfigRequest,
  BatchOperationResult,
  AgentLevelStats
} from '@/pages/Agents/types';

class AgentService {
  private baseURL = '/api/agents';
  // 注意：代理商价格配置相关的API已移除

  /**
   * 获取代理商列表
   */
  async getAgents(params: AgentQuery = {}): Promise<AgentListResponse> {
    const response = await axios.get(this.baseURL, { params });
    return response.data;
  }

  /**
   * 获取代理商详情
   */
  async getAgent(id: string): Promise<AgentDetailResponse> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * 创建代理商
   */
  async createAgent(data: CreateAgentRequest): Promise<AgentDetailResponse> {
    const response = await axios.post(this.baseURL, data);
    return response.data;
  }

  /**
   * 更新代理商
   */
  async updateAgent(id: string, data: UpdateAgentRequest): Promise<AgentDetailResponse> {
    const response = await axios.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  /**
   * 删除代理商
   */
  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * 批量更新代理商状态
   */
  async batchUpdateStatus(
    agentIds: string[], 
    status: 'pending' | 'active' | 'suspended' | 'rejected'
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.patch(`${this.baseURL}/batch-status`, {
      agent_ids: agentIds,
      status
    });
    return response.data;
  }

  /**
   * 批量删除代理商
   */
  async batchDelete(agentIds: string[]): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${this.baseURL}/batch`, {
      data: { agent_ids: agentIds }
    });
    return response.data;
  }

  // 注意：以下代理商价格配置相关的方法已移除，因为相关API已被删除
  // - getPricingConfigs
  // - getAgentPricingConfigs  
  // - createPricingConfig
  // - updatePricingConfig
  // - deletePricingConfig
  // - batchSetPricingConfigs
  // - getLevelStats
  // 如需重新实现，请根据新的架构设计相应的方法

  /**
   * 获取代理商统计数据
   */
  async getAgentStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      rejected: number;
      total_earnings: number;
      total_orders: number;
      total_customers: number;
    };
  }> {
    const response = await axios.get(`${this.baseURL}/stats`);
    return response.data;
  }

  /**
   * 导出代理商数据
   */
  async exportAgents(params: AgentQuery = {}): Promise<Blob> {
    const response = await axios.get(`${this.baseURL}/export`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
}

export const agentService = new AgentService();
export default agentService;