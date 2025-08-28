import { api } from '@/utils/api'
import { toast } from 'sonner'
import { computed, onMounted, reactive } from 'vue'
import type {
  PriceHistory,
  PriceTemplate,
  PricingMode,
  PricingStrategy
} from '../types/pricing.types'

export function usePricing() {
  // 状态管理
  const state = reactive({
    strategies: [] as PricingStrategy[],
    pricingModes: [] as PricingMode[],
    templates: [] as PriceTemplate[],
    priceHistory: [] as PriceHistory[],
    isLoading: false,
    isSaving: false
  })

  // 筛选和分页状态
  const filters = reactive({
    strategies: {
      type: 'all' as 'all' | 'energy_flash' | 'transaction_package',
      status: 'all' as 'all' | 'active' | 'inactive',
      searchQuery: '',
      page: 1,
      limit: 10
    },
    templates: {
      type: 'all' as 'all' | 'energy_flash' | 'transaction_package',
      searchQuery: '',
      page: 1,
      limit: 10
    },
    history: {
      dateRange: null as { start: string; end: string } | null,
      page: 1,
      limit: 20
    }
  })

  // 计算属性
  const strategies = computed(() => state.strategies)
  const pricingModes = computed(() => state.pricingModes)
  const templates = computed(() => state.templates)
  const priceHistory = computed(() => state.priceHistory)
  const isLoading = computed(() => state.isLoading)

  // API 调用方法
  const loadStrategies = async () => {
    try {
      state.isLoading = true
      const params = {
        page: filters.strategies.page,
        limit: filters.strategies.limit,
        type: filters.strategies.type !== 'all' ? filters.strategies.type : undefined,
        is_active: filters.strategies.status !== 'all' ? filters.strategies.status === 'active' : undefined,
        search: filters.strategies.searchQuery || undefined
      }
      const response = await api.get('/api/pricing-strategies', { params })
      const data = response.data.data
      state.strategies = Array.isArray(data?.strategies) ? data.strategies : []
    } catch (error) {
      console.error('Failed to load strategies:', error)
      toast.error('加载价格策略失败')
    } finally {
      state.isLoading = false
    }
  }

  const loadPricingModes = async () => {
    try {
      const response = await api.get('/api/pricing-modes')
      const data = response.data.data
      state.pricingModes = Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Failed to load pricing modes:', error)
      toast.error('加载定价模式失败')
    }
  }

  const loadTemplates = async () => {
    try {
      state.isLoading = true
      const params = {
        page: filters.templates.page,
        limit: filters.templates.limit,
        type: filters.templates.type !== 'all' ? filters.templates.type : undefined,
        search: filters.templates.searchQuery || undefined
      }
      const response = await api.get('/api/price-templates', { params })
      const data = response.data.data
      state.templates = Array.isArray(data?.templates) ? data.templates : []
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('加载价格模板失败')
    } finally {
      state.isLoading = false
    }
  }

  const loadPriceHistory = async () => {
    try {
      state.isLoading = true
      const params = {
        page: filters.history.page,
        limit: filters.history.limit,
        start_date: filters.history.dateRange?.start,
        end_date: filters.history.dateRange?.end
      }
      const response = await api.get('/api/pricing-history', { params })
      const data = response.data.data
      state.priceHistory = Array.isArray(data?.history) ? data.history : []
    } catch (error) {
      console.error('Failed to load price history:', error)
      toast.error('加载价格历史失败')
    } finally {
      state.isLoading = false
    }
  }

  const refreshData = async () => {
    await Promise.all([
      loadStrategies(),
      loadPricingModes(),
      loadTemplates(),
      loadPriceHistory()
    ])
  }

  // 策略管理方法
  const showEditStrategy = (strategy: PricingStrategy) => {
    console.log('编辑策略:', strategy)
    // 这里可以打开编辑模态框
  }

  const showViewStrategy = (strategy: PricingStrategy) => {
    console.log('查看策略:', strategy)
    // 这里可以打开查看模态框
  }

  const deleteStrategy = async (strategyId: string) => {
    try {
      await api.delete(`/pricing-strategies/${strategyId}`)
      toast.success('删除策略成功')
      await loadStrategies()
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      toast.error('删除策略失败')
    }
  }

  const toggleStrategyStatus = async (strategyId: string) => {
    try {
      // 确保 strategies 是数组
      if (!Array.isArray(state.strategies)) {
        console.error('state.strategies is not an array:', state.strategies)
        toast.error('策略数据异常，请刷新页面重试')
        return
      }
      
      const strategy = state.strategies.find(s => s.id === strategyId)
      if (!strategy) return
      
      await api.put(`/pricing-strategies/${strategyId}`, {
        ...strategy,
        status: strategy.status === 'active' ? 'inactive' : 'active'
      })
      toast.success('更新策略状态成功')
      await loadStrategies()
    } catch (error) {
      console.error('Failed to toggle strategy status:', error)
      toast.error('更新策略状态失败')
    }
  }

  const duplicateStrategy = async (strategy: PricingStrategy) => {
    try {
      await api.post('/pricing-strategies', {
        ...strategy,
        name: `${strategy.name} (副本)`,
        is_active: false
      })
      toast.success('复制策略成功')
      await loadStrategies()
    } catch (error) {
      console.error('Failed to duplicate strategy:', error)
      toast.error('复制策略失败')
    }
  }

  // 模式管理方法
  const updatePricingMode = async (modeId: string, config: any) => {
    try {
      await api.put(`/pricing-modes/${modeId}`, { config })
      toast.success('更新定价模式成功')
      await loadPricingModes()
    } catch (error) {
      console.error('Failed to update pricing mode:', error)
      toast.error('更新定价模式失败')
    }
  }

  // 模板管理方法
  const showEditTemplate = (template: PriceTemplate) => {
    console.log('编辑模板:', template)
    // 这里可以打开编辑模态框
  }

  const showViewTemplate = (template: PriceTemplate) => {
    console.log('查看模板:', template)
    // 这里可以打开查看模态框
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      await api.delete(`/price-templates/${templateId}`)
      toast.success('删除模板成功')
      await loadTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error('删除模板失败')
    }
  }

  const toggleTemplateStatus = async (templateId: string) => {
    try {
      // 确保 templates 是数组
      if (!Array.isArray(state.templates)) {
        console.error('state.templates is not an array:', state.templates)
        toast.error('模板数据异常，请刷新页面重试')
        return
      }
      
      const template = state.templates.find(t => t.id === templateId)
      if (!template) return
      
      await api.put(`/price-templates/${templateId}`, {
        ...template,
        status: template.status === 'active' ? 'inactive' : 'active'
      })
      toast.success('更新模板状态成功')
      await loadTemplates()
    } catch (error) {
      console.error('Failed to toggle template status:', error)
      toast.error('更新模板状态失败')
    }
  }

  const duplicateTemplate = async (template: PriceTemplate) => {
    try {
      await api.post('/price-templates', {
        name: `${template.name} (副本)`,
        description: template.description,
        is_default: false
      })
      toast.success('复制模板成功')
      await loadTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      toast.error('复制模板失败')
    }
  }

  // 历史管理方法
  const loadPriceHistoryByFilters = async (filters: any) => {
    try {
      state.isLoading = true
      const params = new URLSearchParams()
      
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)
      if (filters.type) params.append('type', filters.type)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      
      const response = await api.get(`/price-history?${params.toString()}`)
      const data = response.data.data
      state.priceHistory = Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Failed to load price history:', error)
      toast.error('加载价格历史失败')
    } finally {
      state.isLoading = false
    }
  }

  // 格式化函数
  const formatCurrency = (amount: number, currency = 'TRX') => {
    return `${amount.toLocaleString()} ${currency}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  // 生命周期
  onMounted(() => {
    refreshData()
  })

  return {
    // 状态
    strategies: computed(() => state.strategies),
    pricingModes: computed(() => state.pricingModes),
    templates: computed(() => state.templates),
    priceHistory: computed(() => state.priceHistory),
    isLoading: computed(() => state.isLoading),
    
    // 方法
    loadStrategies,
    loadPricingModes,
    loadTemplates,
    loadPriceHistory,
    loadPriceHistoryByFilters,
    refreshData,
    
    // 策略管理
    showEditStrategy,
    showViewStrategy,
    deleteStrategy,
    toggleStrategyStatus,
    duplicateStrategy,
    
    // 模式管理
    updatePricingMode,
    
    // 模板管理
    showEditTemplate,
    showViewTemplate,
    deleteTemplate,
    toggleTemplateStatus,
    duplicateTemplate,
    
    // 格式化函数
    formatCurrency,
    formatDate,
    formatNumber
  }
}
