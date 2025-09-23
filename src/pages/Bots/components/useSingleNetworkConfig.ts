/**
 * 机器人单网络配置管理业务逻辑
 * 职责：管理机器人的单网络配置，符合数据库的单网络约束
 */
import { useToast } from '@/composables/useToast'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessageBox } from 'element-plus'
import { ref } from 'vue'

export interface BotInfo {
  id: string
  name: string
  username: string
  is_active: boolean
  description?: string
  health_status?: string
  last_health_check?: string
}

export interface NetworkInfo {
  network_id: string
  network_name: string
  network_type: string
  rpc_url: string
  network_is_active: boolean
  is_active: boolean
  is_primary: boolean
  priority: number
  config?: Record<string, any>
  api_settings?: Record<string, any>
  contract_addresses?: Record<string, any>
  gas_settings?: Record<string, any>
  monitoring_settings?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface AvailableNetwork {
  id: string
  name: string
  network_type: string
  rpc_url: string
  chain_id?: number
  is_active: boolean
  description?: string
}

export function useSingleNetworkConfig(botId: string) {
  const { success, error, warning } = useToast()

  // 状态管理
  const loading = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  
  const botInfo = ref<BotInfo>({
    id: '',
    name: '',
    username: '',
    is_active: false
  })
  
  const currentNetwork = ref<NetworkInfo | null>(null)
  const availableNetworks = ref<AvailableNetwork[]>([])

  // 获取机器人信息
  const fetchBotInfo = async () => {
    try {
      const response = await botsAPI.getBot(botId)
      if (response.data?.success && response.data.data?.bot) {
        const bot = response.data.data.bot
        botInfo.value = {
          id: bot.id || botId,
          name: bot.name || '',
          username: bot.username || '',
          is_active: bot.status === 'active',
          description: bot.description,
          health_status: (bot as any).health_status,
          last_health_check: (bot as any).last_health_check
        }
      }
    } catch (error) {
      console.error('获取机器人信息失败:', error)
      error('获取机器人信息失败')
      throw error
    }
  }

  // 获取机器人当前网络配置
  const fetchCurrentNetwork = async () => {
    try {
      const response = await botsAPI.getBotNetwork(botId)
      if (response.data?.success) {
        currentNetwork.value = (response.data.data?.network as NetworkInfo) || null
      } else {
        currentNetwork.value = null
      }
    } catch (error) {
      console.error('获取网络配置失败:', error)
      // 网络配置不存在时不显示错误，这是正常情况
      currentNetwork.value = null
    }
  }

  // 获取可用网络列表
  const fetchAvailableNetworks = async () => {
    try {
      // TODO: 调用网络API获取可用网络列表
      // 临时使用模拟数据，实际应该调用 networksAPI.getNetworks()
      availableNetworks.value = [
        {
          id: '1',
          name: 'TRON主网',
          network_type: 'mainnet',
          rpc_url: 'https://api.trongrid.io',
          chain_id: 728126428,
          is_active: true,
          description: 'TRON主网络'
        },
        {
          id: '2',
          name: 'TRON测试网(Shasta)',
          network_type: 'testnet',
          rpc_url: 'https://api.shasta.trongrid.io',
          chain_id: 2494104990,
          is_active: true,
          description: 'TRON Shasta测试网络'
        },
        {
          id: '3',
          name: 'TRON测试网(Nile)',
          network_type: 'testnet',
          rpc_url: 'https://nile.trongrid.io',
          chain_id: 3448148188,
          is_active: true,
          description: 'TRON Nile测试网络'
        }
      ]
    } catch (error) {
      console.error('获取可用网络失败:', error)
      error('获取可用网络失败')
    }
  }

  // 刷新所有数据
  const refreshData = async () => {
    loading.value = true
    try {
      await Promise.all([
        fetchBotInfo(),
        fetchCurrentNetwork(),
        fetchAvailableNetworks()
      ])
    } finally {
      loading.value = false
    }
  }

  // 设置机器人网络配置（单网络模式）
  const setNetworkConfig = async (
    networkId: string,
    config?: {
      config?: Record<string, any>
      api_settings?: Record<string, any>
      contract_addresses?: Record<string, any>
      gas_settings?: Record<string, any>
      monitoring_settings?: Record<string, any>
    }
  ) => {
    if (saving.value) return
    
    try {
      saving.value = true
      
      const requestData = {
        network_id: networkId,
        ...config
      }
      
      const response = await botsAPI.setBotNetwork(botId, requestData)
      
      if (response.data?.success) {
        await fetchCurrentNetwork() // 重新获取最新配置
        success('网络配置设置成功')
      } else {
        throw new Error(response.data?.message || '设置网络配置失败')
      }
    } catch (error: any) {
      console.error('设置网络配置失败:', error)
      error(error.message || '设置网络配置失败')
      throw error
    } finally {
      saving.value = false
    }
  }

  // 移除网络配置
  const removeNetworkConfig = async () => {
    if (!currentNetwork.value) {
      warning('当前没有配置网络')
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要移除当前网络配置 "${currentNetwork.value.network_name}" 吗？`,
        '确认移除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      // 由于单网络约束，我们通过删除API来移除配置
      await botsAPI.deleteBotNetwork(botId, currentNetwork.value.network_id)
      
      currentNetwork.value = null
      success('网络配置移除成功')
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('移除网络配置失败:', error)
        error('移除网络配置失败')
        throw error
      }
    }
  }

  // 测试网络连接
  const testNetworkConnection = async () => {
    if (!currentNetwork.value || testing.value) return
    
    try {
      testing.value = true
      
      // 调用健康检查API
      await botsAPI.performHealthCheck(botId)
      
      success('网络连接测试成功')
      
      // 重新获取机器人信息以更新健康状态
      await fetchBotInfo()
    } catch (error: any) {
      console.error('网络连接测试失败:', error)
      error('网络连接测试失败')
      throw error
    } finally {
      testing.value = false
    }
  }

  // 快速设置网络（仅设置网络ID，使用默认配置）
  const quickSetNetwork = async (networkId: string) => {
    await setNetworkConfig(networkId)
  }

  // 高级设置网络（包含详细配置）
  const advancedSetNetwork = async (
    networkId: string,
    advancedConfig: {
      config?: Record<string, any>
      api_settings?: Record<string, any>
      contract_addresses?: Record<string, any>
      gas_settings?: Record<string, any>
      monitoring_settings?: Record<string, any>
    }
  ) => {
    await setNetworkConfig(networkId, advancedConfig)
  }

  // 获取网络显示名称
  const getNetworkDisplayName = (network: NetworkInfo | AvailableNetwork): string => {
    if ('network_name' in network) {
      return network.network_name
    }
    return network.name
  }

  // 检查网络是否可用
  const isNetworkAvailable = (networkId: string): boolean => {
    return availableNetworks.value.some(network => 
      network.id === networkId && network.is_active
    )
  }

  return {
    // 状态
    loading,
    saving,
    testing,
    botInfo,
    currentNetwork,
    availableNetworks,

    // 计算属性帮助函数
    getNetworkDisplayName,
    isNetworkAvailable,

    // 方法
    refreshData,
    setNetworkConfig,
    removeNetworkConfig,
    testNetworkConnection,
    quickSetNetwork,
    advancedSetNetwork
  }
}
