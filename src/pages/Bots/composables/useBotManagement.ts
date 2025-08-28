import { ref, computed, onMounted, onUnmounted } from 'vue'
import { toast } from 'sonner'
import { botApi } from '@/api/bots'
import type { Bot, BotForm, BotStats, BotStatCard, BotFilters, BotPagination, BotModalMode } from '../types/bot.types'
import { Activity, Bot as BotIcon, Zap, AlertTriangle } from 'lucide-vue-next'

export function useBotManagement() {
  // 响应式数据
  const isLoading = ref(false)
  const isSaving = ref(false)
  const bots = ref<Bot[]>([])
  const selectedBots = ref<string[]>([])
  const showBotMenu = ref<string | null>(null)
  const showBotModal = ref(false)
  const modalMode = ref<BotModalMode>('view')
  const selectedBot = ref<Bot | null>(null)
  
  // 筛选和分页
  const filters = ref<BotFilters>({
    searchQuery: '',
    statusFilter: '',
    typeFilter: ''
  })
  
  const pagination = ref<BotPagination>({
    currentPage: 1,
    pageSize: 10,
    totalPages: 0
  })
  
  // 表单数据
  const botForm = ref<BotForm>({
    name: '',
    address: '',
    private_key: '',
    type: 'energy',
    description: '',
    min_order_amount: 0,
    max_order_amount: 0,
    is_active: true
  })
  
  // 统计数据
  const botStats = ref<BotStatCard[]>([
    {
      label: '总机器人',
      value: 0,
      icon: BotIcon,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: null,
      changeColor: 'text-gray-500'
    },
    {
      label: '在线机器人',
      value: 0,
      icon: Activity,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: null,
      changeColor: 'text-green-600'
    },
    {
      label: '活跃机器人',
      value: 0,
      icon: Zap,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      change: null,
      changeColor: 'text-yellow-600'
    },
    {
      label: '异常机器人',
      value: 0,
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      change: null,
      changeColor: 'text-red-600'
    }
  ])
  
  // 计算属性
  const filteredBots = computed(() => {
    return bots.value.filter(bot => {
      const matchesSearch = !filters.value.searchQuery || 
        bot.name.toLowerCase().includes(filters.value.searchQuery.toLowerCase()) ||
        bot.address.toLowerCase().includes(filters.value.searchQuery.toLowerCase())
      
      const matchesStatus = !filters.value.statusFilter || bot.status === filters.value.statusFilter
      const matchesType = !filters.value.typeFilter || bot.type === filters.value.typeFilter
      
      return matchesSearch && matchesStatus && matchesType
    })
  })
  
  const paginatedBots = computed(() => {
    const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    return filteredBots.value.slice(start, end)
  })
  
  // 格式化函数
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount)
  }
  
  const formatAddress = (address: string) => {
    if (!address) return '-'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  const formatType = (type: string) => {
    const typeMap: Record<string, string> = {
      energy: '能量',
      bandwidth: '带宽',
      mixed: '混合'
    }
    return typeMap[type] || type
  }
  
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      online: '在线',
      offline: '离线',
      error: '异常',
      maintenance: '维护中',
      active: '活跃',
      inactive: '非活跃'
    }
    return statusMap[status] || status
  }
  
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      online: 'text-green-600 bg-green-50',
      offline: 'text-gray-600 bg-gray-50',
      error: 'text-red-600 bg-red-50',
      maintenance: 'text-yellow-600 bg-yellow-50',
      active: 'text-green-600 bg-green-50',
      inactive: 'text-gray-600 bg-gray-50'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50'
  }
  
  const formatStatus = (status: string) => {
    return getStatusText(status)
  }
  
  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      energy: 'text-blue-600 bg-blue-50',
      bandwidth: 'text-purple-600 bg-purple-50',
      mixed: 'text-green-600 bg-green-50'
    }
    return colorMap[type] || 'text-gray-600 bg-gray-50'
  }
  
  // 数据加载
  const loadBots = async () => {
    try {
      isLoading.value = true
      const response = await botApi.getBots()
      bots.value = response.data
      updateStats()
      updatePagination()
    } catch (error) {
      console.error('加载机器人列表失败:', error)
      toast.error('加载机器人列表失败')
    } finally {
      isLoading.value = false
    }
  }
  
  const updateStats = () => {
    const total = bots.value.length
    const online = bots.value.filter(bot => bot.status === 'online' || bot.status === 'active').length
    const active = bots.value.filter(bot => bot.status === 'active').length
    const error = bots.value.filter(bot => bot.status === 'error').length
    
    botStats.value[0].value = total
    botStats.value[1].value = online
    botStats.value[2].value = active
    botStats.value[3].value = error
  }
  
  const updatePagination = () => {
    pagination.value.totalPages = Math.ceil(filteredBots.value.length / pagination.value.pageSize)
  }
  
  const refreshData = async () => {
    await loadBots()
    toast.success('数据已刷新')
  }
  
  // 机器人操作
  const viewBot = (bot: Bot) => {
    selectedBot.value = bot
    modalMode.value = 'view'
    showBotModal.value = true
  }
  
  const editBot = (bot: Bot) => {
    selectedBot.value = bot
    modalMode.value = 'edit'
    botForm.value = {
      name: bot.name,
      address: bot.address,
      private_key: bot.private_key || '',
      type: bot.type,
      description: bot.description || '',
      min_order_amount: bot.min_order_amount || 0,
      max_order_amount: bot.max_order_amount || 0,
      is_active: bot.status === 'active'
    }
    showBotModal.value = true
  }
  
  const createBot = () => {
    selectedBot.value = null
    modalMode.value = 'create'
    botForm.value = {
      name: '',
      address: '',
      private_key: '',
      type: 'energy',
      description: '',
      min_order_amount: 0,
      max_order_amount: 0,
      is_active: true
    }
    showBotModal.value = true
  }
  
  const saveBot = async () => {
    try {
      isSaving.value = true
      
      if (modalMode.value === 'create') {
        await botApi.createBot(botForm.value)
        toast.success('机器人创建成功')
      } else if (modalMode.value === 'edit' && selectedBot.value) {
        await botApi.updateBot(selectedBot.value.id, botForm.value)
        toast.success('机器人更新成功')
      }
      
      showBotModal.value = false
      await loadBots()
    } catch (error) {
      console.error('保存机器人失败:', error)
      toast.error('保存机器人失败')
    } finally {
      isSaving.value = false
    }
  }
  
  const toggleBotStatus = async (bot: Bot) => {
    try {
      const newStatus = bot.status === 'active' ? 'inactive' : 'active'
      await botApi.updateBotStatus(bot.id, newStatus)
      toast.success(`机器人已${newStatus === 'active' ? '启用' : '停用'}`)
      await loadBots()
    } catch (error) {
      console.error('切换机器人状态失败:', error)
      toast.error('操作失败')
    }
  }
  
  const testConnection = async (bot: Bot) => {
    try {
      await botApi.testBotConnection(bot.id)
      toast.success('连接测试成功')
    } catch (error) {
      console.error('连接测试失败:', error)
      toast.error('连接测试失败')
    }
  }
  
  const rechargeBalance = async (bot: Bot) => {
    // 这里应该打开充值对话框
    toast.info('充值功能开发中')
  }
  
  const viewLogs = async (bot: Bot) => {
    // 这里应该打开日志查看页面
    toast.info('日志查看功能开发中')
  }
  
  const resetBot = async (bot: Bot) => {
    try {
      await botApi.resetBot(bot.id)
      toast.success('机器人重置成功')
      await loadBots()
    } catch (error) {
      console.error('重置机器人失败:', error)
      toast.error('重置失败')
    }
  }
  
  // 批量操作
  const batchStart = async () => {
    try {
      await botApi.batchUpdateStatus(selectedBots.value, 'active')
      toast.success(`已启动 ${selectedBots.value.length} 个机器人`)
      selectedBots.value = []
      await loadBots()
    } catch (error) {
      console.error('批量启动失败:', error)
      toast.error('批量启动失败')
    }
  }
  
  const batchStop = async () => {
    try {
      await botApi.batchUpdateStatus(selectedBots.value, 'inactive')
      toast.success(`已停止 ${selectedBots.value.length} 个机器人`)
      selectedBots.value = []
      await loadBots()
    } catch (error) {
      console.error('批量停止失败:', error)
      toast.error('批量停止失败')
    }
  }
  
  const batchTest = async () => {
    try {
      await botApi.batchTestConnection(selectedBots.value)
      toast.success(`已测试 ${selectedBots.value.length} 个机器人连接`)
    } catch (error) {
      console.error('批量测试失败:', error)
      toast.error('批量测试失败')
    }
  }
  
  const clearSelection = () => {
    selectedBots.value = []
  }
  
  // 导出数据
  const exportData = () => {
    const csvContent = [
      ['名称', '地址', '类型', '状态', '余额', '今日订单', '最后活动'].join(','),
      ...bots.value.map(bot => [
        bot.name,
        bot.address,
        formatType(bot.type),
        getStatusText(bot.status),
        bot.balance,
        bot.today_orders || 0,
        formatDateTime(bot.last_activity)
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `机器人列表_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('数据导出成功')
  }
  
  // 事件处理
  const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.bot-menu')) {
      showBotMenu.value = null
    }
  }
  
  // 生命周期
  onMounted(() => {
    loadBots()
    document.addEventListener('click', handleClickOutside)
  })
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
  
  return {
    // 响应式数据
    isLoading,
    isSaving,
    bots,
    selectedBots,
    showBotMenu,
    showBotModal,
    modalMode,
    selectedBot,
    filters,
    pagination,
    botForm,
    botStats,
    
    // 计算属性
    filteredBots,
    paginatedBots,
    
    // 格式化函数
    formatDateTime,
    formatDate,
    formatCurrency,
    formatAddress,
    formatType,
    formatStatus,
    getStatusText,
    getStatusColor,
    getTypeColor,
    
    // 数据操作
    loadBots,
    refreshData,
    
    // 机器人操作
    viewBot,
    editBot,
    createBot,
    saveBot,
    toggleBotStatus,
    testConnection,
    rechargeBalance,
    viewLogs,
    resetBot,
    
    // 批量操作
    batchStart,
    batchStop,
    batchTest,
    clearSelection,
    
    // 其他功能
    exportData
  }
}