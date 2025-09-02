import { stakeAPI } from '@/services/api'
import { reactive, ref } from 'vue'
import type {
    AccountInfo,
    AccountResources,
    DelegateRecord,
    DelegateRecordQueryParams,
    StakeOverview,
    StakePagination,
    StakeRecord,
    StakeRecordQueryParams,
    StakeStatistics,
    UnfreezeRecord,
    UnfreezeRecordQueryParams
} from '../types/stake.types'

export function useStakeData() {
  // 响应式状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const overview = ref<StakeOverview | null>(null)
  const statistics = ref<StakeStatistics | null>(null)
  const stakeRecords = ref<StakeRecord[]>([])
  const delegateRecords = ref<DelegateRecord[]>([])
  const unfreezeRecords = ref<UnfreezeRecord[]>([])
  const accountResources = ref<AccountResources | null>(null)
  const accountInfo = ref<AccountInfo | null>(null)
  
  // 分页状态
  const pagination = reactive<StakePagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // 通用错误处理函数
  const handleError = (err: any, operation: string, poolId?: string) => {
    let errorMessage = `${operation}失败`
    let errorDetails = ''
    
    if (err.response) {
      // HTTP错误响应
      const status = err.response.status
      const data = err.response.data
      
      if (status === 401) {
        errorMessage = '认证失败'
        errorDetails = '请重新登录后再试'
      } else if (status === 404) {
        errorMessage = '能量池不存在'
        errorDetails = data?.details || '请检查能量池配置是否正确'
      } else if (status === 400) {
        errorMessage = data?.error || 'TRON网络调用失败'
        errorDetails = data?.details || '可能是TRON网络配置问题或账户权限不足'
      } else if (status >= 500) {
        errorMessage = '服务器内部错误'
        errorDetails = '这是服务器问题，请稍后重试或联系管理员'
      } else {
        errorMessage = data?.error || `HTTP错误 ${status}`
        errorDetails = data?.details || ''
      }
    } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
      errorMessage = '网络连接失败'
      errorDetails = '请检查网络连接或服务器是否正常运行'
    } else {
      errorMessage = err.message || '未知错误'
      errorDetails = '请检查网络连接和服务器状态'
    }
    
    error.value = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
    console.error(`${operation}失败:`, {
      error: err,
      message: errorMessage,
      details: errorDetails,
      poolId
    })
  }

  // 获取质押概览
  const loadOverview = async (poolId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.getOverview(poolId)
      if (response.data.success && response.data.data) {
        overview.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取质押概览失败')
      }
    } catch (err: any) {
      handleError(err, '获取质押概览', poolId)
    } finally {
      loading.value = false
    }
  }

  // 获取质押统计信息
  const loadStatistics = async (poolId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.getStatistics(poolId)
      if (response.data.success && response.data.data) {
        statistics.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取质押统计失败')
      }
    } catch (err: any) {
      handleError(err, '获取质押统计', poolId)
    } finally {
      loading.value = false
    }
  }

  // 获取质押记录
  const loadStakeRecords = async (params: StakeRecordQueryParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.getStakeRecords(params)
      if (response.data.success && response.data.data) {
        stakeRecords.value = response.data.data.records
        Object.assign(pagination, response.data.data.pagination)
      } else {
        throw new Error(response.data.message || '获取质押记录失败')
      }
    } catch (err: any) {
      handleError(err, '获取质押记录', params.poolId)
    } finally {
      loading.value = false
    }
  }

  // 获取委托记录
  const loadDelegateRecords = async (params: DelegateRecordQueryParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.getDelegateRecords(params)
      if (response.data.success && response.data.data) {
        // API返回的是StakeRecord[]，需要转换为DelegateRecord[]
        delegateRecords.value = response.data.data.records as any
        Object.assign(pagination, response.data.data.pagination)
      } else {
        throw new Error(response.data.message || '获取委托记录失败')
      }
    } catch (err: any) {
      handleError(err, '获取委托记录', params.poolId)
    } finally {
      loading.value = false
    }
  }

  // 获取解质押记录
  const loadUnfreezeRecords = async (params: UnfreezeRecordQueryParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.getUnfreezeRecords(params)
      if (response.data.success && response.data.data) {
        // 转换API返回的字段名和状态值到我们的类型
        const records = response.data.data.records.map(record => ({
          ...record,
          expireTime: record.withdrawableTime, // withdrawableTime -> expireTime
          status: record.status === 'unfreezing' ? 'pending' :
                  record.status === 'withdrawable' ? 'available' : 
                  record.status // 'withdrawn' 保持不变
        }))
        unfreezeRecords.value = records as any
        Object.assign(pagination, response.data.data.pagination)
      } else {
        throw new Error(response.data.message || '获取解质押记录失败')
      }
    } catch (err: any) {
      handleError(err, '获取解质押记录', params.poolId)
    } finally {
      loading.value = false
    }
  }

  // 获取账户资源信息
  const loadAccountResources = async (address: string) => {
    try {
      loading.value = true
      error.value = null
      // TODO: API方法暂时不可用，使用模拟数据或等待API实现
      console.warn('getAccountResources API method not implemented yet')
      accountResources.value = {
        address,
        balance: 0,
        energy: { total: 0, used: 0, available: 0 },
        bandwidth: { total: 0, used: 0, available: 0 },
        frozen: { energy: 0, bandwidth: 0 },
        delegated: { energy: 0, bandwidth: 0 }
      }
    } catch (err: any) {
      handleError(err, '获取账户资源')
    } finally {
      loading.value = false
    }
  }

  // 获取账户信息
  const loadAccountInfo = async (address: string) => {
    try {
      loading.value = true
      error.value = null
      // TODO: API方法暂时不可用，使用模拟数据或等待API实现
      console.warn('getAccountInfo API method not implemented yet')
      accountInfo.value = {
        address,
        balance: 0,
        createTime: Date.now(),
        latestOperationTime: Date.now(),
        allowance: 0,
        activePermissions: []
      }
    } catch (err: any) {
      handleError(err, '获取账户信息')
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    loading,
    error,
    overview,
    statistics,
    stakeRecords,
    delegateRecords,
    unfreezeRecords,
    accountResources,
    accountInfo,
    pagination,
    
    // 方法
    loadOverview,
    loadStatistics,
    loadStakeRecords,
    loadDelegateRecords,
    loadUnfreezeRecords,
    loadAccountResources,
    loadAccountInfo
  }
}
