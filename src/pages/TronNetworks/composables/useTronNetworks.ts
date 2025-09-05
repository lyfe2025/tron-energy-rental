import { networkApi } from '@/api/network'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

interface TronNetwork {
  id: string
  name: string
  chain_id?: string
  type: 'mainnet' | 'testnet' | 'private'
  rpc_url: string
  is_active: boolean
  health_status: 'unknown' | 'healthy' | 'unhealthy'
  timeout_ms: number
  priority: number
  retry_count: number
  rate_limit: number
  description?: string
  created_at: string
  updated_at: string
  // 前端扩展字段
  connection_status?: 'connected' | 'connecting' | 'disconnected'
  latency?: number
  last_check_at?: string
  updating?: boolean
}

interface NetworkStats {
  total: number
  online: number
  connecting: number
  offline: number
}

export function useTronNetworks() {
  // 响应式数据
  const loading = ref(false)
  const testingAll = ref(false)
  const networks = ref<TronNetwork[]>([])
  const selectedNetworks = ref<TronNetwork[]>([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  
  // 搜索表单
  const searchForm = ref({
    keyword: '',
    status: '',
    type: ''
  })

  // 统计数据
  const stats = computed<NetworkStats>(() => {
    const total = networks.value.length
    const online = networks.value.filter(n => n.health_status === 'healthy').length
    const connecting = networks.value.filter(n => n.health_status === 'unknown').length
    const offline = networks.value.filter(n => n.health_status === 'unhealthy').length
    
    return { total, online, connecting, offline }
  })

  // 计算属性
  const filteredNetworks = computed(() => {
    let result = [...networks.value]
    
    // 关键词搜索
    if (searchForm.value.keyword) {
      const keyword = searchForm.value.keyword.toLowerCase()
      result = result.filter(network => 
        network.name.toLowerCase().includes(keyword) ||
        String(network.chain_id || '').includes(keyword) ||
        network.rpc_url.toLowerCase().includes(keyword)
      )
    }
    
    // 状态筛选
    if (searchForm.value.status) {
      const statusMap = {
        'connected': 'healthy',
        'connecting': 'unknown', 
        'disconnected': 'unhealthy'
      }
      const healthStatus = statusMap[searchForm.value.status as keyof typeof statusMap]
      if (healthStatus) {
        result = result.filter(network => network.health_status === healthStatus)
      }
    }
    
    // 类型筛选
    if (searchForm.value.type) {
      result = result.filter(network => network.type === searchForm.value.type)
    }
    
    return result
  })

  // 数据获取方法
  const fetchNetworks = async () => {
    try {
      console.log('🔍 开始获取TRON网络列表...')
      loading.value = true
      const response = await networkApi.getNetworks({ page: currentPage.value, limit: pageSize.value })
      console.log('📡 API响应:', response)
      
      // 处理API响应 - 现在request工具已经统一处理了数据结构
      if (response.success && response.data) {
        const data = response.data
        
        if (data.networks && Array.isArray(data.networks)) {
          // 标准格式: data.networks
          networks.value = data.networks
          total.value = data.pagination?.total || data.networks.length
          console.log('✅ 成功获取网络数据, 网络数量:', data.networks.length)
        } else if (Array.isArray(data)) {
          // data直接是数组
          networks.value = data
          total.value = data.length
          console.log('✅ 成功获取网络数据（数组格式）, 网络数量:', data.length)
        } else {
          console.warn('⚠️ 数据格式异常:', data)
          networks.value = []
          total.value = 0
        }
      } else {
        console.warn('⚠️ API响应失败:', response)
        networks.value = []
        total.value = 0
        if (response.error) {
          ElMessage.error(response.error)
        }
      }
      console.log('🎯 最终设置的networks:', networks.value)
    } catch (error) {
      console.error('❌ 获取网络列表失败:', error)
      ElMessage.error('获取网络列表失败')
      networks.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const refreshData = async () => {
    await fetchNetworks()
  }

  const testAllConnections = async () => {
    try {
      testingAll.value = true
      
      // 设置所有活跃网络为连接中状态
      for (const network of networks.value) {
        if (network.is_active) {
          network.connection_status = 'connecting'
        }
      }
      
      // 调用API测试所有网络连接
      const response = await networkApi.testAllNetworks()
      
      // 更新网络状态
      if (response.data && response.data.results) {
        response.data.results.forEach((result: any) => {
          const network = networks.value.find(n => n.id === result.networkId)
          if (network) {
            network.connection_status = result.success ? 'connected' : 'disconnected'
            network.health_status = result.success ? 'healthy' : 'unhealthy'
            network.latency = result.latency
            network.last_check_at = new Date().toISOString()
          }
        })
      }
      
      ElMessage.success('网络连接测试完成')
    } catch (error) {
      console.error('测试网络连接失败:', error)
      ElMessage.error('测试网络连接失败')
      
      // 出错时重新获取网络列表
      await fetchNetworks()
    } finally {
      testingAll.value = false
    }
  }

  const handleSearch = () => {
    currentPage.value = 1
  }

  const resetSearch = () => {
    searchForm.value = {
      keyword: '',
      status: '',
      type: ''
    }
    handleSearch()
  }

  const handleTest = async (network: TronNetwork) => {
    try {
      network.connection_status = 'connecting'
      console.log('🔍 开始测试网络连接:', network.id)
      const response = await networkApi.testNetwork(network.id)
      console.log('📡 网络测试响应:', response)
      
      // 更新网络状态 - 根据后端API返回的数据结构
      if (response && response.success && response.data) {
        // 后端返回的数据结构：{ network_id, network_name, status, response_time_ms, block_height, test_time }
        const testData = response.data
        
        if (testData.status === 'healthy') {
          network.connection_status = 'connected'
          network.health_status = 'healthy'
          network.latency = testData.response_time_ms || 0
          ElMessage.success(`网络 "${network.name}" 连接测试成功 (${testData.response_time_ms}ms)`)
        } else {
          network.connection_status = 'disconnected'
          network.health_status = 'unhealthy'
          ElMessage.warning(`网络 "${network.name}" 连接测试失败`)
        }
      } else {
        network.connection_status = 'disconnected'
        network.health_status = 'unhealthy'
        ElMessage.error(`网络 "${network.name}" 连接测试返回异常`)
      }
      network.last_check_at = new Date().toISOString()
      
    } catch (error) {
      console.error('网络连接测试失败:', error)
      network.connection_status = 'disconnected'
      network.health_status = 'unhealthy'
      ElMessage.error(`网络 "${network.name}" 连接测试失败`)
    }
  }

  const handleToggleStatus = async (network: TronNetwork) => {
    try {
      network.updating = true
      await networkApi.toggleNetworkStatus(network.id)
      
      ElMessage.success(`网络已${network.is_active ? '启用' : '禁用'}`)
    } catch (error) {
      console.error('更新状态失败:', error)
      network.is_active = !network.is_active // 回滚状态
      ElMessage.error('更新状态失败')
    } finally {
      network.updating = false
    }
  }

  const handleSelectionChange = (selection: TronNetwork[]) => {
    selectedNetworks.value = selection
  }

  const handleBatchEnable = async () => {
    if (selectedNetworks.value.length === 0) {
      ElMessage.warning('请先选择要启用的网络')
      return
    }

    try {
      const ids = selectedNetworks.value.map(n => n.id)
      console.log('批量启用网络 IDs:', ids)
      
      // 调用API批量启用
      await networkApi.batchUpdateStatus(ids, true)
      
      // 更新本地数据
      selectedNetworks.value.forEach(network => {
        network.is_active = true
      })
      
      // 更新主列表中的数据
      networks.value.forEach(network => {
        if (ids.includes(network.id)) {
          network.is_active = true
        }
      })
      
      // 清空选择
      selectedNetworks.value = []
      
      ElMessage.success(`已启用 ${ids.length} 个网络`)
    } catch (error) {
      console.error('批量启用失败:', error)
      ElMessage.error(`批量启用失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleBatchDisable = async () => {
    if (selectedNetworks.value.length === 0) {
      ElMessage.warning('请先选择要禁用的网络')
      return
    }

    try {
      const ids = selectedNetworks.value.map(n => n.id)
      console.log('批量禁用网络 IDs:', ids)
      
      // 调用API批量禁用
      await networkApi.batchUpdateStatus(ids, false)
      
      // 更新本地数据
      selectedNetworks.value.forEach(network => {
        network.is_active = false
      })
      
      // 更新主列表中的数据
      networks.value.forEach(network => {
        if (ids.includes(network.id)) {
          network.is_active = false
        }
      })
      
      // 清空选择
      selectedNetworks.value = []
      
      ElMessage.success(`已禁用 ${ids.length} 个网络`)
    } catch (error) {
      console.error('批量禁用失败:', error)
      ElMessage.error(`批量禁用失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleDelete = async (network: TronNetwork) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除网络 "${network.name}" 吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      await networkApi.deleteNetwork(network.id)
      
      // 重新获取网络列表
      await fetchNetworks()
      ElMessage.success('删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      }
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('复制失败')
    }
  }

  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    fetchNetworks()
  }

  const handleCurrentChange = (page: number) => {
    currentPage.value = page
    fetchNetworks()
  }

  // 生命周期
  onMounted(() => {
    fetchNetworks()
  })

  return {
    // 状态
    loading,
    testingAll,
    networks,
    selectedNetworks,
    currentPage,
    pageSize,
    total,
    searchForm,
    
    // 计算属性
    stats,
    filteredNetworks,
    
    // 方法
    fetchNetworks,
    refreshData,
    testAllConnections,
    handleSearch,
    resetSearch,
    handleTest,
    handleToggleStatus,
    handleSelectionChange,
    handleBatchEnable,
    handleBatchDisable,
    handleDelete,
    copyToClipboard,
    handleSizeChange,
    handleCurrentChange
  }
}

