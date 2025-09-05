import type { NetworkCreateRequest, NetworkStats, NetworkTestResult, NetworkUpdateRequest, TronNetwork } from '@/types/network';
import request from '@/utils/request';

// API响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const networkApi = {
  // 获取网络列表
  async getNetworks(params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) {
    const response = await request({
      url: '/tron-networks',
      method: 'get',
      params
    })
    return response
   },

  // 获取单个网络详情
  async getNetwork(id: string): Promise<ApiResponse<TronNetwork>> {
    const response = await request({
      url: `/tron-networks/${id}`,
      method: 'get'
    })
    console.log('🔍 networkApi.getNetwork 响应:', response)
    // 如果后端返回的结构是 { success: true, data: { network: {...} } }
    if (response.data && response.data.network) {
      return { success: true, data: response.data.network }
    }
    // 如果后端直接返回网络数据
    return { success: true, data: response.data || response }
  },

  // 创建网络
  async createNetwork(data: NetworkCreateRequest): Promise<ApiResponse<TronNetwork>> {
    console.log('🚀 networkApi.createNetwork 发送数据:', data)
    const response = await request({
      url: '/tron-networks',
      method: 'post',
      data
    })
    console.log('📡 networkApi.createNetwork 响应:', response)
    // 如果后端返回的结构是 { success: true, data: { network: {...} } }
    if (response.data && response.data.network) {
      return { success: true, data: response.data.network }
    }
    return { success: true, data: response.data || response }
  },

  // 更新网络
  async updateNetwork(id: string, data: NetworkUpdateRequest): Promise<ApiResponse<TronNetwork>> {
    console.log('🚀 networkApi.updateNetwork 发送数据:', data)
    const response = await request({
      url: `/tron-networks/${id}`,
      method: 'put',
      data
    })
    console.log('📡 networkApi.updateNetwork 响应:', response)
    // 如果后端返回的结构是 { success: true, data: { network: {...} } }
    if (response.data && response.data.network) {
      return { success: true, data: response.data.network }
    }
    return { success: true, data: response.data || response }
  },

  // 删除网络
  async deleteNetwork(id: string): Promise<{ message: string }> {
    const response = await request({
      url: `/tron-networks/${id}`,
      method: 'delete'
    })
    return { message: response.message || 'Network deleted successfully' }
  },

  // 测试网络连接
  async testNetwork(id: string): Promise<ApiResponse<NetworkTestResult>> {
    const response = await request({
      url: `/tron-networks/${id}/test`,  // 修正路径：使用 /test 而不是 /test-connection
      method: 'post'
    })
    console.log('🔍 networkApi.testNetwork 响应:', response)
    return { success: true, data: response.data }
  },

  // 测试连接（兼容旧方法名）
  async testConnection(idOrData: string | number | any): Promise<ApiResponse<NetworkTestResult>> {
    if (typeof idOrData === 'object') {
      // 新建模式下测试RPC地址
      const response = await request({
        url: '/tron-networks/test-rpc',
        method: 'post',
        data: idOrData
      })
      return { success: true, data: response.data }
    } else {
      // 编辑模式下测试现有网络
      return this.testNetwork(String(idOrData))
    }
  },

  // 获取网络统计信息
  async getNetworkStats(id: string): Promise<{ data: NetworkStats }> {
    const response = await request({
      url: `/tron-networks/${id}/stats`,
      method: 'get'
    })
    return { data: response.data }
  },

  // 切换网络状态
  async toggleNetworkStatus(id: string): Promise<{ data: TronNetwork }> {
    const response = await request({
      url: `/tron-networks/${id}/toggle`,
      method: 'patch'
    })
    return { data: response.data }
  },

  // 获取网络下的能量池
  async getNetworkEnergyPools(id: string): Promise<{ data: any[] }> {
    const response = await request({
      url: `/tron-networks/${id}/energy-pools`,
      method: 'get'
    })
    return { data: response.data || [] }
  },

  // 批量关联账户到网络
  batchAssociateAccounts(data: { networkId: string; accountIds: string[] }): Promise<any> {
    return request({
      url: '/tron-networks/batch-associate',
      method: 'post',
      data
    })
  },

  // 测试所有网络连接
  async testAllNetworks(): Promise<{ data: any }> {
    const response = await request({
      url: '/tron-networks/test-all',
      method: 'post'
    })
    return { data: response.data }
  },

  // 获取网络链参数
  async getChainParameters(id: string): Promise<{ data: any }> {
    const response = await request({
      url: `/tron-networks/${id}/chain-parameters`,
      method: 'get'
    })
    return { data: response.data }
  },

  // 获取网络节点信息
  async getNodeInfo(id: string): Promise<{ data: any }> {
    const response = await request({
      url: `/tron-networks/${id}/node-info`,
      method: 'get'
    })
    return { data: response.data }
  },

  // 获取网络区块信息
  async getBlockInfo(id: string): Promise<{ data: any }> {
    const response = await request({
      url: `/tron-networks/${id}/block-info`,
      method: 'get'
    })
    return { data: response.data }
  },

  // 批量更新网络状态
  async batchUpdateStatus(networkIds: string[], isActive: boolean): Promise<ApiResponse<{ updated_count: number; networks: TronNetwork[] }>> {
    console.log('🚀 networkApi.batchUpdateStatus 发送数据:', { network_ids: networkIds, is_active: isActive })
    const response = await request({
      url: '/tron-networks/batch/status',
      method: 'put',
      data: {
        network_ids: networkIds,
        is_active: isActive
      }
    })
    console.log('📡 networkApi.batchUpdateStatus 响应:', response)
    return { success: true, data: response.data }
  },

  // 批量更新网络（通用方法，向后兼容）
  async batchUpdate(networkIds: string[], updates: Partial<TronNetwork>): Promise<ApiResponse<{ updated_count: number; networks: TronNetwork[] }>> {
    // 如果更新数据包含is_active字段，调用专门的批量状态更新API
    if ('is_active' in updates && typeof updates.is_active === 'boolean') {
      return this.batchUpdateStatus(networkIds, updates.is_active)
    }
    
    // 对于其他类型的批量更新，可以在这里实现
    // 目前先抛出错误，提示使用具体的方法
    throw new Error('Batch update only supports status updates currently. Use batchUpdateStatus for status updates.')
  },

  // 获取网络日志
  async getNetworkLogs(params?: {
    network_id?: string;
    level?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ logs: any[]; pagination: any }>> {
    const response = await request({
      url: '/network-logs',
      method: 'get',
      params
    })
    console.log('🔍 networkApi.getNetworkLogs 响应:', response)
    return { success: true, data: response.data }
  },

  // 获取指定网络的日志
  async getNetworkLogsByNetworkId(networkId: string, params?: {
    level?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ logs: any[]; pagination: any }>> {
    const response = await request({
      url: `/network-logs/network/${networkId}`,
      method: 'get',
      params
    })
    console.log('🔍 networkApi.getNetworkLogsByNetworkId 响应:', response)
    return { success: true, data: response.data }
  },

  // 创建网络日志
  async createNetworkLog(logData: {
    network_id?: string;
    network_name?: string;
    action: string;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    details?: string;
    error_info?: string;
    request_params?: any;
    response_data?: any;
    execution_time?: number;
  }): Promise<ApiResponse<any>> {
    const response = await request({
      url: '/network-logs',
      method: 'post',
      data: logData
    })
    console.log('🔍 networkApi.createNetworkLog 响应:', response)
    return { success: true, data: response.data }
  }
}