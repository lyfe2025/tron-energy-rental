/**
 * 质押管理API
 */
import { apiClient } from '../core/apiClient';
import type { ApiResponse } from '../core/types';

export interface StakeOverview {
  totalStaked: number
  totalDelegated: number
  totalUnfreezing: number
  availableToWithdraw: number
  stakingRewards: number
  delegationRewards: number
}

export interface StakeStatistics {
  totalStakedTrx: number
  totalDelegatedEnergy: number
  totalDelegatedBandwidth: number
  pendingUnfreezes: number
  availableToWithdraw: number
  estimatedDailyRewards: number
}

export interface AccountResources {
  energy: {
    used: number
    limit: number
    total: number
    available: number
    delegatedOut: number
    delegatedIn: number
  }
  bandwidth: {
    used: number
    limit: number
    total: number
    available: number
    delegatedOut: number
    delegatedIn: number
    freeUsed: number
    stakedUsed: number
  }
  delegation: {
    energyOut: number
    energyIn: number
    bandwidthOut: number
    bandwidthIn: number
  }
}

export interface StakeOperationData {
  networkId: string           // 网络ID (tron_networks表)
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  accountAddress?: string
}

export interface DelegateOperationData extends StakeOperationData {
  toAddress: string
}

export interface StakeOperationResult {
  txid: string
  message: string
}

export interface WithdrawResult extends StakeOperationResult {
  amount: number
}

export interface StakeRecord {
  id: string
  poolAccountId: string       // 能量池账户ID (energy_pools表)
  txid: string
  operationType: 'freeze' | 'unfreeze'
  amount: number
  resourceType: 'ENERGY' | 'BANDWIDTH'
  lockPeriod?: number
  unfreezeTime?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

export interface StakeRecordsResponse extends Array<StakeRecord> {}

export interface PaginatedApiResponse<T> {
  success: boolean
  data: T
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

export const stakeAPI = {
  /**
   * 获取质押概览
   */
  getOverview: (poolAccountId: string, networkId?: string) => 
    apiClient.get<ApiResponse<StakeOverview>>(`/api/energy-pool/stake/overview?poolId=${poolAccountId}${networkId ? `&networkId=${networkId}` : ''}`),

  /**
   * 获取质押统计信息
   */
  getStatistics: (poolAccountId: string, networkId?: string) => 
    apiClient.get<ApiResponse<StakeStatistics>>(`/api/energy-pool/stake/statistics?poolId=${poolAccountId}${networkId ? `&networkId=${networkId}` : ''}`),

  /**
   * 获取账户资源信息（能量和带宽）
   */
  getAccountResources: (address: string, networkId?: string) => 
    apiClient.get<ApiResponse<AccountResources>>(`/api/energy-pool/stake/account-resources/${encodeURIComponent(address)}${networkId ? `?networkId=${networkId}` : ''}`),

  /**
   * 质押TRX
   */
  freezeTrx: (data: StakeOperationData) => {
    // 验证必需参数
    if (!data.accountAddress) {
      throw new Error('账户地址不能为空')
    }
    
    // 验证TRON地址格式（应该以T开头，长度34位）
    if (!data.accountAddress.startsWith('T') || data.accountAddress.length !== 34) {
      throw new Error(`无效的TRON地址格式: ${data.accountAddress}`)
    }
    
    // 验证金额
    if (!data.amount || data.amount <= 0) {
      throw new Error('质押金额必须大于0')
    }
    
    // 根据TRON官方文档，frozen_balance需要以SUN为单位 (1 TRX = 1,000,000 SUN)
    const frozenBalanceInSun = Math.floor(data.amount * 1000000)
    
    // 转换参数格式以匹配后端期望
    const requestData = {
      ownerAddress: data.accountAddress,
      frozenBalance: frozenBalanceInSun, // 转换为SUN单位
      resource: data.resourceType,
      networkId: data.networkId,           // 网络ID (tron_networks表)
      accountId: data.poolAccountId        // 能量池账户ID (energy_pools表)
    }
    
    // 调试信息
    console.log('🔍 [StakeAPI] 质押请求参数:', {
      原始数据: data,
      转换后数据: requestData,
      地址有效性: !!data.accountAddress,
      地址长度: data.accountAddress?.length,
      地址值: data.accountAddress,
      TRX金额: data.amount,
      SUN金额: frozenBalanceInSun
    })
    
    return apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/freeze', requestData)
  },

  /**
   * 解质押TRX
   */
  unfreezeTrx: (data: Omit<StakeOperationData, 'lockPeriod'>) => {
    // 验证必需参数
    if (!data.accountAddress) {
      throw new Error('账户地址不能为空')
    }
    
    // 验证TRON地址格式
    if (!data.accountAddress.startsWith('T') || data.accountAddress.length !== 34) {
      throw new Error(`无效的TRON地址格式: ${data.accountAddress}`)
    }
    
    // 验证金额
    if (!data.amount || data.amount <= 0) {
      throw new Error('解质押金额必须大于0')
    }
    
    // 根据TRON官方文档，unfreeze_balance需要以SUN为单位
    const unfreezeBalanceInSun = Math.floor(data.amount * 1000000)
    
    // 转换参数格式以匹配后端期望
    const requestData = {
      ownerAddress: data.accountAddress,
      unfreezeBalance: unfreezeBalanceInSun, // 转换为SUN单位
      resource: data.resourceType,
      networkId: data.networkId,           // 网络ID (tron_networks表)
      accountId: data.poolAccountId        // 能量池账户ID (energy_pools表)
    }
    
    console.log('🔍 [StakeAPI] 解质押请求参数:', {
      原始数据: data,
      转换后数据: requestData,
      TRX金额: data.amount,
      SUN金额: unfreezeBalanceInSun
    })
    
    return apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/unfreeze', requestData)
  },

  /**
   * 代理资源
   */
  delegateResource: (data: DelegateOperationData) => {
    // 验证必需参数
    if (!data.accountAddress) {
      throw new Error('代理方账户地址不能为空')
    }
    
    if (!data.toAddress) {
      throw new Error('接收方地址不能为空')
    }
    
    // 验证TRON地址格式
    if (!data.accountAddress.startsWith('T') || data.accountAddress.length !== 34) {
      throw new Error(`无效的代理方TRON地址格式: ${data.accountAddress}`)
    }
    
    if (!data.toAddress.startsWith('T') || data.toAddress.length !== 34) {
      throw new Error(`无效的接收方TRON地址格式: ${data.toAddress}`)
    }
    
    // 验证金额
    if (!data.amount || data.amount <= 0) {
      throw new Error('代理数量必须大于0')
    }
    
    // 🔧 正确转换：ENERGY/BANDWIDTH数量 → TRX数量 → SUN单位
    let balanceInSun: number;
    
    if (data.resourceType === 'ENERGY') {
      // ENERGY转换：根据系统固定比例 76.2 ENERGY per TRX
      const energyPerTrx = 76.2;
      const requiredTrx = data.amount / energyPerTrx; // ENERGY → TRX
      balanceInSun = Math.floor(requiredTrx * 1000000); // TRX → SUN
    } else {
      // BANDWIDTH转换：根据系统固定比例 1000 BANDWIDTH per TRX  
      const bandwidthPerTrx = 1000;
      const requiredTrx = data.amount / bandwidthPerTrx; // BANDWIDTH → TRX
      balanceInSun = Math.floor(requiredTrx * 1000000); // TRX → SUN
    }
    
    console.log('🔍 [stakeAPI] 资源代理转换详情:', {
      '用户输入': data.amount,
      '资源类型': data.resourceType,
      '换算比例': data.resourceType === 'ENERGY' ? '76.2 ENERGY/TRX' : '1000 BANDWIDTH/TRX',
      '需要质押TRX': data.resourceType === 'ENERGY' ? (data.amount / 76.2) : (data.amount / 1000),
      '转换为SUN': balanceInSun,
      '说明': '用户输入资源数量 → 计算所需TRX → 转换为SUN传递给TRON API'
    });
    
    // 转换参数格式以匹配后端期望
    const requestData: any = {
      ownerAddress: data.accountAddress,
      receiverAddress: data.toAddress,
      balance: balanceInSun,               // 🔧 修正：使用正确转换的SUN数量
      resource: data.resourceType,
      lock: data.lockPeriod ? true : false,
      networkId: data.networkId,           // 网络ID (tron_networks表)
      accountId: data.poolAccountId        // 能量池账户ID (energy_pools表)
    }
    
    // 只有在启用锁定期时才传递 lockPeriod 参数
    if (data.lockPeriod && data.lockPeriod > 0) {
      requestData.lockPeriod = data.lockPeriod
    }
    // 如果是永久代理，不传递 lockPeriod 参数，让后端使用默认值
    
    // 调试信息
    console.log('🔍 [StakeAPI] 代理资源请求参数:', {
      原始数据: data,
      转换后数据: requestData,
      代理方地址: data.accountAddress,
      接收方地址: data.toAddress,
      TRX金额: data.amount,
      SUN金额: balanceInSun,
      是否锁定: requestData.lock,
      锁定期限: requestData.lockPeriod
    })
    
    return apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/delegate', requestData)
  },

  /**
   * 取消代理资源
   */
  undelegateResource: (data: Omit<DelegateOperationData, 'lockPeriod'>) => {
    // 验证必需参数
    if (!data.accountAddress) {
      throw new Error('代理方账户地址不能为空')
    }
    
    if (!data.toAddress) {
      throw new Error('接收方地址不能为空')
    }
    
    // 验证TRON地址格式
    if (!data.accountAddress.startsWith('T') || data.accountAddress.length !== 34) {
      throw new Error(`无效的代理方TRON地址格式: ${data.accountAddress}`)
    }
    
    if (!data.toAddress.startsWith('T') || data.toAddress.length !== 34) {
      throw new Error(`无效的接收方TRON地址格式: ${data.toAddress}`)
    }
    
    // 验证金额
    if (!data.amount || data.amount <= 0) {
      throw new Error('取消代理数量必须大于0')
    }
    
    // 根据TRON官方文档，取消代理资源的balance需要以SUN为单位
    const balanceInSun = Math.floor(data.amount * 1000000)
    
    // 转换参数格式以匹配后端期望
    const requestData = {
      ownerAddress: data.accountAddress,
      receiverAddress: data.toAddress,
      balance: balanceInSun,              // 转换为SUN单位
      resource: data.resourceType,
      networkId: data.networkId,           // 网络ID (tron_networks表)
      accountId: data.poolAccountId        // 能量池账户ID (energy_pools表)
    }
    
    // 调试信息
    console.log('🔍 [StakeAPI] 取消代理资源请求参数:', {
      原始数据: data,
      转换后数据: requestData,
      代理方地址: data.accountAddress,
      接收方地址: data.toAddress,
      TRX金额: data.amount,
      SUN金额: balanceInSun
    })
    
    return apiClient.post<ApiResponse<StakeOperationResult>>('/api/energy-pool/stake/undelegate', requestData)
  },

  /**
   * 提取已解质押资金
   */
  withdrawUnfrozen: (data: { poolId: string }) => 
    apiClient.post<ApiResponse<WithdrawResult>>('/api/energy-pool/stake/withdraw', data),

  /**
   * 获取质押记录
   */
  getStakeRecords: (params: {
    poolAccountId: string
    networkId?: string
    page?: number
    limit?: number
    operationType?: 'freeze' | 'unfreeze'
    resourceType?: 'ENERGY' | 'BANDWIDTH'
    startDate?: string
    endDate?: string
  }) => {
    // 转换为后端期望的参数格式
    const queryParams = {
      ...params,
      poolId: params.poolAccountId // 后端仍使用 poolId 作为能量池账户ID
    }
    delete (queryParams as any).poolAccountId // 删除前端的参数名
    return apiClient.get<PaginatedApiResponse<StakeRecordsResponse>>('/api/energy-pool/stake/records', { params: queryParams })
  },

  /**
   * 获取代理记录
   */
  getDelegateRecords: (params: {
    poolAccountId: string       // 能量池账户ID (energy_pools表)
    networkId?: string          // 网络ID (tron_networks表)
    page?: number
    limit?: number
    operationType?: 'delegate' | 'undelegate'
    resourceType?: 'ENERGY' | 'BANDWIDTH'
    startDate?: string
    endDate?: string
  }) => {
    // 转换为后端期望的参数格式
    const queryParams = {
      ...params,
      poolId: params.poolAccountId // 后端仍使用 poolId 作为能量池账户ID
    }
    delete (queryParams as any).poolAccountId // 删除前端的参数名
    return apiClient.get<PaginatedApiResponse<StakeRecordsResponse>>('/api/energy-pool/stake/delegates', { params: queryParams })
  },

  /**
   * 获取解冻记录
   */
  getUnfreezeRecords: (params: {
    poolAccountId: string       // 能量池账户ID (energy_pools表)
    networkId?: string          // 网络ID (tron_networks表)
    page?: number
    limit?: number
    status?: 'pending' | 'available' | 'withdrawn'
    resourceType?: 'ENERGY' | 'BANDWIDTH'
    startDate?: string
    endDate?: string
  }) => {
    // 转换为后端期望的参数格式
    const queryParams = {
      ...params,
      poolId: params.poolAccountId // 后端仍使用 poolId 作为能量池账户ID
    }
    delete (queryParams as any).poolAccountId // 删除前端的参数名
    return apiClient.get<PaginatedApiResponse<Array<{
      id: string
      poolId: string
      txid: string
      amount: number
      resource_type: 'ENERGY' | 'BANDWIDTH'
      unfreeze_time: string
      withdrawable_time: string
      status: 'unfreezing' | 'withdrawable' | 'withdrawn'
      created_at: string
      canWithdraw?: boolean
      daysUntilWithdrawable?: number
    }>>>('/api/energy-pool/stake/unfreezes', { params: queryParams })
  },
};

export default stakeAPI;
