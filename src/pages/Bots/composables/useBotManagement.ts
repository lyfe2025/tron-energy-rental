import { botsAPI } from '@/services/api'
import type { Bot } from '@/types/api'
import { Activity, AlertTriangle, Bot as BotIcon, Zap } from 'lucide-vue-next'
import { toast } from 'sonner'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { BotFilters, BotForm, BotModalMode, BotPagination, BotStatCard } from '../types/bot.types'

export function useBotManagement() {
  // 响应式数据
  const isLoading = ref(false)
  const isSaving = ref(false)
  const bots = ref<any[]>([])
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
    username: '',
    token: '',
    description: '',
    webhook_url: '',
    settings: {},
    welcome_message: '',
    help_message: '',
    commands: [],
    address: '',
    private_key: '',
    type: 'energy',
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
        bot.username.toLowerCase().includes(filters.value.searchQuery.toLowerCase())
      
      const matchesStatus = !filters.value.statusFilter || bot.status === filters.value.statusFilter
      
      return matchesSearch && matchesStatus
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
  
  const formatToken = (token: string) => {
    if (!token) return '-'
    return `${token.slice(0, 8)}...${token.slice(-4)}`
  }
  
  const formatUsername = (username: string) => {
    return username.startsWith('@') ? username : `@${username}`
  }
  
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '活跃',
      inactive: '非活跃',
      maintenance: '维护中',
      error: '异常'
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

  const formatType = (type: string) => {
    const typeMap: Record<string, string> = {
      energy: '能量',
      bandwidth: '带宽',
      mixed: '混合'
    }
    return typeMap[type] || type
  }
  
  // 数据加载
  const loadBots = async () => {
    try {
      isLoading.value = true
      console.log('开始加载机器人列表...')
      
      const response = await botsAPI.getBots({
        page: pagination.value.currentPage,
        limit: pagination.value.pageSize,
        status: filters.value.statusFilter || undefined,
        search: filters.value.searchQuery || undefined
      })
      
      console.log('API响应:', response)
      console.log('响应数据:', response.data)
      
      if (response.data?.success && response.data?.data) {
        bots.value = response.data.data.bots || []
        console.log('设置机器人数据:', bots.value)
        
        const paginationData = response.data.data.pagination as any
        pagination.value.totalPages = paginationData?.totalPages || Math.ceil((paginationData?.total || 0) / pagination.value.pageSize)
      } else {
        bots.value = []
        pagination.value.totalPages = 0
      }
      updateStats()
      
      console.log('数据加载完成，机器人数量:', bots.value.length)
    } catch (error) {
      console.error('加载机器人列表失败:', error)
      toast.error('加载机器人列表失败')
    } finally {
      isLoading.value = false
    }
  }
  
  const updateStats = () => {
    const total = bots.value.length
    const active = bots.value.filter(bot => bot.status === 'active').length
    const inactive = bots.value.filter(bot => bot.status === 'inactive').length
    const maintenance = bots.value.filter(bot => bot.status === 'maintenance').length
    const error = bots.value.filter(bot => bot.status === 'error').length
    
    botStats.value[0].value = total
    botStats.value[1].value = active
    botStats.value[2].value = inactive
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
      username: bot.username,
      token: bot.token || '',
      description: bot.description || '',
      webhook_url: bot.webhook_url || '',
      settings: bot.settings || {},
      welcome_message: bot.welcome_message || '',
      help_message: bot.help_message || '',
      commands: bot.commands ? [...(bot.commands as any[])] : []
    }
    showBotModal.value = true
  }
  
  const createBot = () => {
    selectedBot.value = null
    modalMode.value = 'create'
    botForm.value = {
      name: '',
      username: '',
      token: '',
      description: '',
      webhook_url: '',
      settings: {},
      welcome_message: '欢迎使用TRON能量租赁机器人！\n\n请选择您需要的服务：',
      help_message: '发送 /start 查看主菜单\n发送 /help 获取帮助信息',
      commands: [
        { command: 'start', description: '开始使用机器人', enabled: true },
        { command: 'energy_rent', description: '能量闪租', enabled: true },
        { command: 'package_deal', description: '笔数套餐', enabled: true },
        { command: 'apply_agent', description: '申请代理', enabled: true },
        { command: 'help', description: '获取帮助信息', enabled: true }
      ]
    }
    showBotModal.value = true
  }
  
  const saveBot = async () => {
    try {
      isSaving.value = true
      
      if (modalMode.value === 'create') {
        await botsAPI.createBot(botForm.value)
        toast.success('机器人创建成功')
      } else if (modalMode.value === 'edit' && selectedBot.value) {
        await botsAPI.updateBot(selectedBot.value.id, botForm.value)
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
      await botsAPI.updateBotStatus(bot.id, newStatus)
      toast.success(`机器人已${newStatus === 'active' ? '启用' : '停用'}`)
      await loadBots()
    } catch (error) {
      console.error('切换机器人状态失败:', error)
      toast.error('操作失败')
    }
  }
  
  const testConnection = async (bot: Bot) => {
    try {
      await botsAPI.testBot(bot.id)
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
      await botsAPI.resetBot(bot.id)
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
      const promises = selectedBots.value.map(botId => 
        botsAPI.updateBotStatus(botId, 'active')
      )
      await Promise.all(promises)
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
      const promises = selectedBots.value.map(botId => 
        botsAPI.updateBotStatus(botId, 'inactive')
      )
      await Promise.all(promises)
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
      const promises = selectedBots.value.map(botId => 
        botsAPI.testBot(botId)
      )
      await Promise.all(promises)
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
    formatToken,
    formatUsername,
    formatAddress: (address: string) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-',
    formatStatus,
    getStatusText,
    getStatusColor,
    getTypeColor,
    formatType,
    
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