/**
 * 机器人管理API
 */
import type { Bot, UpdateBotData } from '../../../types/api';
import { apiClient } from '../core/apiClient';
import type { ApiResponse, QueryParams } from '../core/types';

export interface BotQueryParams extends QueryParams {
  status?: string
}

export interface CreateBotData {
  name: string
  username: string
  token: string
  description?: string
  webhook_url?: string
  settings?: unknown
  welcome_message?: string
  help_message?: string
  commands?: unknown[]
}



export interface BotListResponse {
  bots: Bot[]
  pagination: unknown
}

export interface BotDetailResponse {
  bot: Bot
  stats?: unknown
}

export interface BotOperationResponse {
  bot: Bot
}

export interface BotTestResponse {
  status: string
  message: string
}

export interface BotMessageResponse {
  message: string
}

export const botsAPI = {
  /**
   * 获取机器人列表
   */
  getBots: (params?: BotQueryParams) => 
    apiClient.get<ApiResponse<BotListResponse>>('/api/bots', { params }),
  
  /**
   * 获取机器人详情
   */
  getBot: (id: string) => 
    apiClient.get<ApiResponse<BotDetailResponse>>(`/api/bots/${id}`),
  
  /**
   * 创建机器人
   */
  createBot: (data: CreateBotData) => 
    apiClient.post<ApiResponse<BotOperationResponse>>('/api/bots', data),
  
  /**
   * 更新机器人
   */
  updateBot: (id: string, data: UpdateBotData) => 
    apiClient.put<ApiResponse<BotOperationResponse>>(`/api/bots/${id}`, data),
  
  /**
   * 更新机器人状态
   */
  updateBotStatus: (id: string, status: string) => 
    apiClient.patch<ApiResponse<BotOperationResponse>>(`/api/bots/${id}/status`, { status }),
  
  /**
   * 删除机器人
   */
  deleteBot: (id: string) => 
    apiClient.delete<ApiResponse<BotMessageResponse>>(`/api/bots/${id}`),
  
  /**
   * 测试机器人连接
   */
  testBot: (id: string) => 
    apiClient.post<ApiResponse<BotTestResponse>>(`/api/bots/${id}/test`),
  
  /**
   * 重置机器人
   */
  resetBot: (id: string) => 
    apiClient.post<ApiResponse<BotMessageResponse>>(`/api/bots/${id}/reset`),

  /**
   * 启动机器人
   */
  startBot: (id: string) => 
    apiClient.post<ApiResponse<BotMessageResponse>>(`/api/bots/${id}/start`),

  /**
   * 停止机器人
   */
  stopBot: (id: string) => 
    apiClient.post<ApiResponse<BotMessageResponse>>(`/api/bots/${id}/stop`),

  /**
   * 获取机器人日志
   */
  getBotLogs: (id: string, params?: { limit?: number; offset?: number }) => 
    apiClient.get<ApiResponse<{ logs: unknown[] }>>(`/api/bots/${id}/logs`, { params }),

  /**
   * 获取机器人网络配置
   */
  getBotNetwork: (id: string) => 
    apiClient.get<ApiResponse<{ network: unknown }>>(`/api/bots/${id}/network`),

  /**
   * 设置机器人网络配置
   */
  setBotNetwork: (id: string, networkId: string) => 
    apiClient.put<ApiResponse<{ network: unknown }>>(`/api/bots/${id}/network`, { network_id: networkId })
};

export default botsAPI;
