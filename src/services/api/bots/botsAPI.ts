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
  network_id?: string
  work_mode?: 'polling' | 'webhook'
  webhook_url?: string
  webhook_secret?: string
  max_connections?: number
  settings?: unknown
  welcome_message?: string
  help_message?: string
  custom_commands?: Array<{
    command: string
    response_message: string
    is_enabled: boolean
  }>
  menu_button_enabled?: boolean
  menu_button_text?: string
  menu_type?: 'commands' | 'web_app'
  web_app_url?: string
  menu_commands?: Array<{
    command: string
    description: string
  }>
  keyboard_config?: unknown
  is_active?: boolean
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
  syncStatus?: {
    nameSync?: boolean | null
    descriptionSync?: boolean | null
    commandsSync?: boolean | null
    shortDescriptionSync?: boolean | null
    menuButtonSync?: boolean | null
    keyboardSync?: boolean | null
    nameSyncError?: string | null
    descriptionSyncError?: string | null
    commandsSyncError?: string | null
    shortDescriptionSyncError?: string | null
    menuButtonSyncError?: string | null
    keyboardSyncError?: string | null
  }
  syncLogs?: string[]
  sync_result?: {
    success: boolean
    results: Record<string, boolean>
    errors: string[]
    summary: string
  }
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
   * 根据ID获取机器人详情（别名方法）
   */
  getBotById: (id: string) => 
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
   * 获取机器人当前网络配置（单网络模式）
   */
  getBotNetwork: (id: string) => 
    apiClient.get<ApiResponse<{ network: unknown }>>(`/api/bots/${id}/network`),

  /**
   * 设置机器人网络配置（单网络模式）
   */
  setBotNetwork: (id: string, data: { 
    network_id: string; 
    config?: unknown; 
    api_settings?: unknown; 
    contract_addresses?: unknown; 
    gas_settings?: unknown; 
    monitoring_settings?: unknown; 
  }) => 
    apiClient.put<ApiResponse<{ network: unknown }>>(`/api/bots/${id}/network`, data),

  /**
   * 获取机器人网络配置列表（多网络模式 - 保持向后兼容）
   */
  getBotNetworks: (id: string) => 
    apiClient.get<ApiResponse<{ bot_id: string; networks: unknown[] }>>(`/api/bots/${id}/networks`),

  /**
   * 为机器人添加网络配置（多网络模式）
   */
  addBotNetwork: (id: string, data: {
    network_id: string;
    is_primary?: boolean;
    priority?: number;
    config?: unknown;
    api_settings?: unknown;
    contract_addresses?: unknown;
    gas_settings?: unknown;
    monitoring_settings?: unknown;
  }) => 
    apiClient.post<ApiResponse<{ config: unknown }>>(`/api/bots/${id}/networks`, data),

  /**
   * 更新机器人网络配置
   */
  updateBotNetwork: (id: string, networkId: string, data: unknown) => 
    apiClient.put<ApiResponse<{ config: unknown }>>(`/api/bots/${id}/networks/${networkId}`, data),

  /**
   * 删除机器人网络配置
   */
  deleteBotNetwork: (id: string, networkId: string) => 
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/bots/${id}/networks/${networkId}`),

  /**
   * 设置主要网络
   */
  setPrimaryNetwork: (id: string, networkId: string) => 
    apiClient.patch<ApiResponse<{ message: string }>>(`/api/bots/${id}/networks/${networkId}/primary`),

  /**
   * 获取机器人扩展配置
   */
  getBotExtendedConfig: (id: string) => 
    apiClient.get<ApiResponse<unknown>>(`/api/bots/${id}/extended-config`),

  /**
   * 更新机器人扩展配置
   */
  updateBotExtendedConfig: (id: string, data: unknown) => 
    apiClient.put<ApiResponse<{ bot: unknown }>>(`/api/bots/${id}/extended-config`, data),

  /**
   * 机器人健康检查
   */
  performHealthCheck: (id: string) => 
    apiClient.post<ApiResponse<unknown>>(`/api/bots/${id}/health-check`),

  /**
   * 获取机器人配置历史
   */
  getBotConfigHistory: (id: string, params?: { page?: number; limit?: number }) => 
    apiClient.get<ApiResponse<{ history: unknown[]; pagination: unknown }>>(`/api/bots/${id}/config-history`, { params })
};

export default botsAPI;
