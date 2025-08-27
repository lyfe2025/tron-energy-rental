import { Activity, DollarSign, FileText, TrendingUp } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import type {
    PriceCalculation,
    PriceCalculatorInput,
    PriceTemplate,
    PricingFilters,
    PricingState,
    TemplateForm
} from '../types/pricing.types'

export function usePricing() {
  // 状态管理
  const state = reactive<PricingState>({
    templates: [],
    priceHistory: [],
    stats: {
      totalTemplates: 0,
      activeTemplates: 0,
      averagePrice: 0,
      priceChangeToday: 0
    },
    filters: {
      type: 'all',
      status: 'all',
      searchQuery: '',
      sortBy: 'updated',
      sortOrder: 'desc'
    },
    isLoading: false,
    isSaving: false,
    showTemplateModal: false,
    selectedTemplate: null,
    modalMode: 'create'
  })

  // 表单数据
  const templateForm = ref<TemplateForm>({
    name: '',
    description: '',
    type: 'energy',
    basePrice: 0,
    currency: 'TRX',
    rules: []
  })

  // 计算属性
  const priceStats = computed(() => [
    {
      label: '模板总数',
      value: state.stats.totalTemplates.toString(),
      icon: FileText,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '活跃模板',
      value: state.stats.activeTemplates.toString(),
      icon: Activity,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '平均价格',
      value: `${state.stats.averagePrice.toFixed(3)} TRX`,
      icon: DollarSign,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: '今日变化',
      value: `${state.stats.priceChangeToday > 0 ? '+' : ''}${state.stats.priceChangeToday.toFixed(1)}%`,
      change: state.stats.priceChangeToday > 0 ? '上涨' : '下跌',
      changeColor: state.stats.priceChangeToday > 0 ? 'text-green-600' : 'text-red-600',
      icon: TrendingUp,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ])

  const filteredTemplates = computed(() => {
    let templates = state.templates

    // 类型筛选
    if (state.filters.type !== 'all') {
      templates = templates.filter(t => t.type === state.filters.type)
    }

    // 状态筛选
    if (state.filters.status !== 'all') {
      templates = templates.filter(t => t.status === state.filters.status)
    }

    // 搜索筛选
    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase()
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      )
    }

    // 排序
    templates.sort((a, b) => {
      const { sortBy, sortOrder } = state.filters
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.basePrice - b.basePrice
          break
        case 'usage':
          comparison = a.usageCount - b.usageCount
          break
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return templates
  })

  // 方法
  const loadTemplates = async () => {
    state.isLoading = true
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 生成模拟数据
      state.templates = generateMockTemplates()
      state.priceHistory = generateMockHistory()
      updateStats()
      
      console.log('Templates loaded successfully')
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      state.isLoading = false
    }
  }

  const generateMockTemplates = (): PriceTemplate[] => {
    return [
      {
        id: '1',
        name: '标准能量包',
        description: '适用于日常能量租赁的标准定价模板',
        type: 'energy',
        basePrice: 0.1,
        currency: 'TRX',
        rules: [
          {
            id: 'r1',
            type: 'volume',
            condition: { operator: 'gte', value: 1000, unit: 'energy' },
            action: { type: 'multiply', value: 0.95 },
            description: '大于1000能量享受5%折扣',
            enabled: true
          }
        ],
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        usageCount: 1245
      },
      {
        id: '2',
        name: '高级带宽包',
        description: '适用于高频交易的带宽租赁模板',
        type: 'bandwidth',
        basePrice: 0.05,
        currency: 'TRX',
        rules: [],
        status: 'active',
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-14T15:20:00Z',
        usageCount: 892
      },
      {
        id: '3',
        name: '紧急处理模板',
        description: '用于紧急订单的加急定价模板',
        type: 'mixed',
        basePrice: 0.15,
        currency: 'TRX',
        rules: [
          {
            id: 'r2',
            type: 'emergency',
            condition: { operator: 'eq', value: 1 },
            action: { type: 'multiply', value: 1.5 },
            description: '紧急订单加价50%',
            enabled: true
          }
        ],
        status: 'inactive',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-12T09:15:00Z',
        usageCount: 234
      }
    ]
  }

  const generateMockHistory = () => {
    return [
      {
        id: 'h1',
        templateId: '1',
        templateName: '标准能量包',
        oldPrice: 0.12,
        newPrice: 0.1,
        changeReason: '市场价格调整',
        changedBy: 'admin',
        changedAt: '2024-01-15T10:30:00Z'
      }
    ]
  }

  const updateStats = () => {
    state.stats.totalTemplates = state.templates.length
    state.stats.activeTemplates = state.templates.filter(t => t.status === 'active').length
    state.stats.averagePrice = state.templates.reduce((sum, t) => sum + t.basePrice, 0) / state.templates.length
    state.stats.priceChangeToday = Math.random() > 0.5 ? 2.5 : -1.2 // 模拟数据
  }

  const refreshPricing = () => {
    loadTemplates()
  }

  const updateFilters = (newFilters: Partial<PricingFilters>) => {
    state.filters = { ...state.filters, ...newFilters }
  }

  // 模板管理
  const showCreateTemplateModal = () => {
    state.modalMode = 'create'
    state.selectedTemplate = null
    resetTemplateForm()
    state.showTemplateModal = true
  }

  const showEditTemplateModal = (template: PriceTemplate) => {
    state.modalMode = 'edit'
    state.selectedTemplate = template
    loadTemplateToForm(template)
    state.showTemplateModal = true
  }

  const showViewTemplateModal = (template: PriceTemplate) => {
    state.modalMode = 'view'
    state.selectedTemplate = template
    loadTemplateToForm(template)
    state.showTemplateModal = true
  }

  const closeTemplateModal = () => {
    state.showTemplateModal = false
    state.selectedTemplate = null
    resetTemplateForm()
  }

  const resetTemplateForm = () => {
    templateForm.value = {
      name: '',
      description: '',
      type: 'energy',
      basePrice: 0,
      currency: 'TRX',
      rules: []
    }
  }

  const loadTemplateToForm = (template: PriceTemplate) => {
    templateForm.value = {
      name: template.name,
      description: template.description,
      type: template.type,
      basePrice: template.basePrice,
      currency: template.currency,
      rules: [...template.rules]
    }
  }

  const saveTemplate = async () => {
    state.isSaving = true
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (state.modalMode === 'create') {
        // 创建新模板
        const newTemplate: PriceTemplate = {
          id: Date.now().toString(),
          ...templateForm.value,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0
        }
        state.templates.push(newTemplate)
      } else if (state.modalMode === 'edit' && state.selectedTemplate) {
        // 更新模板
        const index = state.templates.findIndex(t => t.id === state.selectedTemplate!.id)
        if (index !== -1) {
          state.templates[index] = {
            ...state.selectedTemplate,
            ...templateForm.value,
            updatedAt: new Date().toISOString()
          }
        }
      }
      
      updateStats()
      closeTemplateModal()
      console.log('Template saved successfully')
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      state.isSaving = false
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (confirm('确定要删除这个定价模板吗？')) {
      try {
        state.templates = state.templates.filter(t => t.id !== templateId)
        updateStats()
        console.log('Template deleted successfully')
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  const toggleTemplateStatus = async (templateId: string) => {
    const template = state.templates.find(t => t.id === templateId)
    if (template) {
      template.status = template.status === 'active' ? 'inactive' : 'active'
      template.updatedAt = new Date().toISOString()
      updateStats()
    }
  }

  const duplicateTemplate = (template: PriceTemplate) => {
    const newTemplate: PriceTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (副本)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    }
    state.templates.push(newTemplate)
    updateStats()
  }

  // 价格计算
  const calculatePrice = (input: PriceCalculatorInput): PriceCalculation => {
    const template = input.templateId ? 
      state.templates.find(t => t.id === input.templateId) : 
      state.templates.find(t => t.type === input.type && t.status === 'active')

    if (!template) {
      return {
        baseAmount: input.amount,
        basePrice: 0.1, // 默认价格
        subtotal: input.amount * 0.1,
        discounts: [],
        fees: [],
        total: input.amount * 0.1,
        currency: 'TRX'
      }
    }

    const basePrice = template.basePrice
    let subtotal = input.amount * basePrice
    const discounts: any[] = []
    const fees: any[] = []

    // 应用规则
    template.rules.forEach(rule => {
      if (!rule.enabled) return

      let shouldApply = false

      switch (rule.type) {
        case 'volume':
          if (rule.condition.operator === 'gte' && input.amount >= rule.condition.value) {
            shouldApply = true
          }
          break
        case 'user_level':
          // 根据用户等级应用规则
          break
        case 'emergency':
          if (input.isEmergency) {
            shouldApply = true
          }
          break
      }

      if (shouldApply) {
        const adjustment = {
          id: rule.id,
          name: rule.description,
          type: rule.action.value < 1 ? 'discount' : 'fee',
          amount: 0,
          description: rule.description
        }

        if (rule.action.type === 'multiply') {
          if (rule.action.value < 1) {
            adjustment.amount = subtotal * (1 - rule.action.value)
            discounts.push(adjustment)
          } else {
            adjustment.amount = subtotal * (rule.action.value - 1)
            fees.push(adjustment)
          }
        }
      }
    })

    const totalDiscounts = discounts.reduce((sum, d) => sum + d.amount, 0)
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0)
    const total = subtotal - totalDiscounts + totalFees

    return {
      baseAmount: input.amount,
      basePrice,
      subtotal,
      discounts,
      fees,
      total,
      currency: template.currency
    }
  }

  // 格式化函数
  const formatCurrency = (value: number, currency: string = 'TRX') => {
    return `${value.toFixed(6)} ${currency}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 生命周期
  onMounted(() => {
    loadTemplates()
  })

  return {
    // 响应式数据
    templates: computed(() => state.templates),
    priceHistory: computed(() => state.priceHistory),
    stats: computed(() => state.stats),
    filters: computed(() => state.filters),
    isLoading: computed(() => state.isLoading),
    isSaving: computed(() => state.isSaving),
    showTemplateModal: computed(() => state.showTemplateModal),
    selectedTemplate: computed(() => state.selectedTemplate),
    modalMode: computed(() => state.modalMode),
    templateForm,
    
    // 计算属性
    priceStats,
    filteredTemplates,
    
    // 方法
    loadTemplates,
    refreshPricing,
    updateFilters,
    showCreateTemplateModal,
    showEditTemplateModal,
    showViewTemplateModal,
    closeTemplateModal,
    saveTemplate,
    deleteTemplate,
    toggleTemplateStatus,
    duplicateTemplate,
    calculatePrice,
    formatCurrency,
    formatDate
  }
}
