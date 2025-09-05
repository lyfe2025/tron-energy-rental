import { botsAPI } from '@/services/api/bots/botsAPI'
import { apiClient } from '@/services/api/core/apiClient'
import { toast } from 'sonner'
import { computed, ref } from 'vue'

// 类型定义
interface BotNetwork {
  id: string
  name: string
  chain_id: string
}

interface CurrentNetwork {
  id: string
  name: string
  type: string
  chain_id: string
  status: string
  rpc_url: string
  is_primary: boolean
  created_at?: string
  updated_at?: string
}

interface BotConfig {
  id: string
  name: string
  username: string
  token: string
  is_active: boolean
  networks?: BotNetwork[]
  current_network?: CurrentNetwork | null
  template?: string
  created_at: string
  updated_at: string
  updating?: boolean
  showMenu?: boolean
  total_users?: number
  total_orders?: number
}

interface Network {
  id: string
  name: string
  chain_id: string
}

interface SearchForm {
  keyword: string
  status: string
  network: string
  template: string
}

/**
 * 机器人管理 composable
 */
export function useBotManagement() {
  // 响应式数据
  const loading = ref(false)
  const bots = ref<BotConfig[]>([])
  const networks = ref<Network[]>([])
  const selectedBots = ref<string[]>([])
  const currentPage = ref(1)
  const pageSize = ref(12)
  const total = ref(0)

  // 搜索表单
  const searchForm = ref<SearchForm>({
    keyword: '',
    status: '',
    network: '',
    template: ''
  })

  // 计算属性
  const filteredBots = computed(() => {
    let result = [...bots.value]
    
    // 关键词搜索
    if (searchForm.value.keyword) {
      const keyword = searchForm.value.keyword.toLowerCase()
      result = result.filter(bot => 
        bot.name.toLowerCase().includes(keyword) ||
        bot.username.toLowerCase().includes(keyword) ||
        bot.token.toLowerCase().includes(keyword)
      )
    }
    
    // 状态筛选
    if (searchForm.value.status) {
      result = result.filter(bot => {
        if (searchForm.value.status === 'active') return bot.is_active
        if (searchForm.value.status === 'inactive') return !bot.is_active
        return true
      })
    }
    
    // 网络筛选
    if (searchForm.value.network) {
      result = result.filter(bot => 
        bot.networks?.some(network => network.id === searchForm.value.network)
      )
    }
    
    // 模板筛选
    if (searchForm.value.template) {
      result = result.filter(bot => 
        (bot.template || 'custom') === searchForm.value.template
      )
    }
    
    // 固定排序：按创建时间降序（最新的在前）
    return result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA // 降序排列，最新的在前
    })
  })

  // 获取机器人列表
  const fetchBots = async () => {
    try {
      loading.value = true
      console.log('开始加载机器人配置列表...')
      
      const response = await botsAPI.getBots({
        page: currentPage.value,
        limit: pageSize.value,
        search: searchForm.value.keyword || undefined
      })
      
      console.log('API响应:', response)
      console.log('响应数据:', response.data)
      
      if (response.data?.success && response.data?.data) {
        // 转换API数据格式为配置页面所需格式
        const apiData = response.data.data.bots || []
        const botsWithoutNetwork = apiData.map((bot: any) => ({
          id: bot.id,
          name: bot.name || '',
          username: bot.username || '',
          token: bot.token || '',
          is_active: bot.status === 'active',
          template: bot.type || 'custom',
          networks: [], // 临时设置为空数组
          current_network: null, // 初始化为null
          created_at: bot.created_at || '',
          updated_at: bot.updated_at || '',
          total_users: 0, // 初始化为0，后续通过统计API获取
          total_orders: 0 // 初始化为0，后续通过统计API获取
        }))
        
        // 为每个机器人获取网络配置和统计数据
        const botsWithNetworkAndStats = await Promise.all(
          botsWithoutNetwork.map(async (bot: any) => {
            try {
              console.log(`🔍 [BotList] 获取机器人 ${bot.name} (${bot.id}) 的配置和统计...`)
              
              // 并行获取网络配置和统计数据
              const [networkResponse, statsResponse] = await Promise.allSettled([
                botsAPI.getBotNetwork(bot.id),
                // 使用apiClient调用统计API（自动处理认证）
                apiClient.get(`/api/bots/${bot.id}/statistics`).then(res => res.data).catch(err => {
                  console.warn(`获取机器人 ${bot.name} 统计失败:`, err)
                  return { success: false, data: null }
                })
              ])
              
              // 处理网络配置
              if (networkResponse.status === 'fulfilled' && 
                  networkResponse.value?.data?.success && 
                  networkResponse.value.data.data?.network) {
                const networkData = networkResponse.value.data.data.network as any
                console.log(`🔍 [BotList] 机器人 ${bot.name} 网络数据:`, networkData)
                
                bot.current_network = {
                  id: networkData.network_id || networkData.id,
                  name: networkData.network_name || networkData.name || '',
                  type: networkData.network_type || networkData.type || 'mainnet',
                  chain_id: networkData.chain_id || '',
                  status: networkData.is_active ? 'active' : 'inactive',
                  rpc_url: networkData.rpc_url || '',
                  is_primary: networkData.is_primary || false,
                  created_at: networkData.created_at,
                  updated_at: networkData.updated_at
                }
                console.log(`✅ [BotList] 机器人 ${bot.name} 网络配置已设置:`, bot.current_network)
              } else {
                console.log(`⚠️ [BotList] 机器人 ${bot.name} 未配置网络`)
                bot.current_network = null
              }
              
              // 处理统计数据
              if (statsResponse.status === 'fulfilled' && 
                  statsResponse.value?.success && 
                  statsResponse.value.data?.statistics) {
                const statsData = statsResponse.value.data.statistics
                bot.total_users = statsData.total_users || 0
                bot.total_orders = statsData.total_orders || 0
                console.log(`✅ [BotList] 机器人 ${bot.name} 统计数据:`, {
                  total_users: bot.total_users,
                  total_orders: bot.total_orders
                })
              } else {
                console.log(`⚠️ [BotList] 机器人 ${bot.name} 统计数据获取失败，使用默认值`)
              }
              
            } catch (error) {
              console.warn(`❌ [BotList] 获取机器人 ${bot.id} 配置失败:`, error)
              // 网络配置不存在时保持current_network为null，这是正常情况
              bot.current_network = null
            }
            return bot
          })
        )
        
        bots.value = botsWithNetworkAndStats
        
        const paginationData = response.data.data.pagination as any
        total.value = paginationData?.total || bots.value.length
      } else {
        bots.value = []
        total.value = 0
      }
      
      console.log('数据加载完成，机器人数量:', bots.value.length)
    } catch (error) {
      console.error('获取机器人列表失败:', error)
      toast.error('获取机器人列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取网络列表
  const fetchNetworks = async () => {
    try {
      // TODO: 调用API获取网络列表
      // const response = await networkAPI.getNetworks()
      
      // 临时使用模拟数据，后续需要替换为真实API
      networks.value = [
        { id: '1', name: 'TRON主网', chain_id: '728126428' },
        { id: '2', name: 'TRON测试网', chain_id: '2494104990' }
      ]
    } catch (error) {
      console.error('获取网络列表失败:', error)
      toast.error('获取网络列表失败')
    }
  }

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([fetchBots(), fetchNetworks()])
    toast.success('数据已刷新')
  }

  // 搜索处理
  const handleSearch = () => {
    currentPage.value = 1
  }

  // 重置搜索
  const resetSearch = () => {
    searchForm.value = {
      keyword: '',
      status: '',
      network: '',
      template: ''
    }
    handleSearch()
  }

  // 切换状态
  const handleToggleStatus = async (bot: BotConfig) => {
    try {
      bot.updating = true
      const newStatus = bot.is_active ? 'inactive' : 'active' // 修复：切换到相反状态
      
      // 调用API切换状态
      await botsAPI.updateBotStatus(bot.id, newStatus)
      
      // 修复：更新本地状态
      bot.is_active = newStatus === 'active'
      
      toast.success(`机器人已${newStatus === 'active' ? '启用' : '禁用'}`)
    } catch (error) {
      console.error('更新状态失败:', error)
      toast.error('更新状态失败')
    } finally {
      bot.updating = false
    }
  }

  // 下拉菜单命令处理
  const handleDropdownCommand = async (command: string, bot: BotConfig) => {
    switch (command) {
      case 'view':
        // TODO: 查看详情
        toast.info('查看详情功能开发中')
        break
      case 'copy':
        // TODO: 复制配置
        toast.info('复制配置功能开发中')
        break
      case 'logs':
        // TODO: 查看日志
        toast.info('查看日志功能开发中')
        break
      case 'delete':
        await handleDelete(bot)
        break
    }
  }

  // 删除机器人
  const handleDelete = async (bot: BotConfig) => {
    try {
      const confirmed = window.confirm(`确定要删除机器人 "${bot.name}" 吗？此操作不可恢复。`)
      
      if (!confirmed) {
        return
      }
      
      // 调用API删除
      await botsAPI.deleteBot(bot.id)
      
      bots.value = bots.value.filter(b => b.id !== bot.id)
      total.value -= 1
      toast.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  // 分页处理
  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
    fetchBots()
  }

  const handleCurrentChange = (page: number) => {
    currentPage.value = page
    fetchBots()
  }

  // 批量选择相关方法
  const handleSelectBot = (botId: string, checked: boolean) => {
    if (checked) {
      selectedBots.value.push(botId)
    } else {
      selectedBots.value = selectedBots.value.filter(id => id !== botId)
    }
  }

  const clearSelection = () => {
    selectedBots.value = []
  }

  // 批量操作
  const handleBatchEnable = async () => {
    if (selectedBots.value.length === 0) {
      toast.warning('请先选择要启用的机器人')
      return
    }
    
    try {
      // 调用API批量启用
      const promises = selectedBots.value.map(botId => 
        botsAPI.updateBotStatus(botId, 'active')
      )
      await Promise.all(promises)
      
      // 更新本地状态
      selectedBots.value.forEach(botId => {
        const bot = bots.value.find(b => b.id === botId)
        if (bot) bot.is_active = true
      })
      
      toast.success(`已启用 ${selectedBots.value.length} 个机器人`)
      clearSelection()
    } catch (error) {
      console.error('批量启用失败:', error)
      toast.error('批量启用失败')
    }
  }

  const handleBatchDisable = async () => {
    if (selectedBots.value.length === 0) {
      toast.warning('请先选择要禁用的机器人')
      return
    }
    
    try {
      // 调用API批量禁用
      const promises = selectedBots.value.map(botId => 
        botsAPI.updateBotStatus(botId, 'inactive')
      )
      await Promise.all(promises)
      
      // 更新本地状态
      selectedBots.value.forEach(botId => {
        const bot = bots.value.find(b => b.id === botId)
        if (bot) bot.is_active = false
      })
      
      toast.success(`已禁用 ${selectedBots.value.length} 个机器人`)
      clearSelection()
    } catch (error) {
      console.error('批量禁用失败:', error)
      toast.error('批量禁用失败')
    }
  }

  // 导出数据
  const exportData = () => {
    try {
      const exportData = {
        version: '1.0',
        export_time: new Date().toISOString(),
        bots: bots.value.map(bot => ({
          name: bot.name,
          username: bot.username,
          template: bot.template,
          networks: bot.networks,
          is_active: bot.is_active
        }))
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bot-config-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('配置导出成功')
    } catch (error) {
      console.error('导出配置失败:', error)
      toast.error('导出配置失败')
    }
  }

  return {
    // 状态
    loading,
    bots,
    networks,
    selectedBots,
    currentPage,
    pageSize,
    total,
    searchForm,
    
    // 计算属性
    filteredBots,
    
    // 方法
    fetchBots,
    fetchNetworks,
    refreshData,
    handleSearch,
    resetSearch,
    handleToggleStatus,
    handleDropdownCommand,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectBot,
    clearSelection,
    handleBatchEnable,
    handleBatchDisable,
    exportData
  }
}

