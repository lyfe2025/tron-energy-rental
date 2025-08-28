import type {
    Agent,
    AgentDetailResponse,
    AgentListResponse,
    AgentQuery,
    CreateAgentRequest,
    UpdateAgentRequest
} from '@/pages/Agents/types'
import { apiClient } from '@/services/api'

// 代理商管理 API
export const agentApi = {
  // 获取代理商列表
  async getAgents(params?: AgentQuery): Promise<AgentListResponse> {
    const response = await apiClient.get('/api/agents', { params })
    return response.data
  },

  // 获取代理商详情
  async getAgent(id: string): Promise<AgentDetailResponse> {
    const response = await apiClient.get(`/api/agents/${id}`)
    return response.data
  },

  // 创建代理商
  async createAgent(data: CreateAgentRequest): Promise<{ success: boolean; message: string; data: Agent }> {
    const response = await apiClient.post('/api/agents', data)
    return response.data
  },

  // 更新代理商
  async updateAgent(id: string, data: UpdateAgentRequest): Promise<{ success: boolean; message: string; data: Agent }> {
    const response = await apiClient.put(`/api/agents/${id}`, data)
    return response.data
  },

  // 删除代理商
  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/api/agents/${id}`)
    return response.data
  },

  // 批量删除代理商
  async batchDeleteAgents(ids: string[]): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/agents/batch-delete', { ids })
    return response.data
  },

  // 更新代理商状态
  async updateAgentStatus(id: string, status: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch(`/api/agents/${id}/status`, { status })
    return response.data
  },

  // 批量更新代理商状态
  async batchUpdateAgentStatus(ids: string[], status: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/api/agents/batch-status', { ids, status })
    return response.data
  },

  // 获取可用的机器人列表（用于代理商关联）
  async getAvailableBots(): Promise<{ success: boolean; data: Array<{ id: string; name: string; username: string; status: string }> }> {
    const response = await apiClient.get('/api/bots/available')
    return response.data
  }
}