/**
 * 机器人搜索功能模块
 * 负责机器人的搜索、过滤和分页逻辑
 */
import { computed, ref, type Ref } from 'vue'
import type { BotConfig, SearchForm } from './botTypes'

export function useBotSearch(bots: Ref<BotConfig[]>) {
  // 搜索表单
  const searchForm = ref<SearchForm>({
    keyword: '',
    status: '',
    network: '',
    template: ''
  })

  // 分页相关
  const currentPage = ref(1)
  const pageSize = ref(12)
  const total = ref(0)

  // 计算属性：过滤后的机器人列表
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

    // 状态过滤
    if (searchForm.value.status) {
      result = result.filter(bot => {
        if (searchForm.value.status === 'active') {
          return bot.is_active
        } else if (searchForm.value.status === 'inactive') {
          return !bot.is_active
        }
        return true
      })
    }

    // 网络过滤
    if (searchForm.value.network) {
      result = result.filter(bot => {
        if (!bot.current_network) return false
        return bot.current_network.id === searchForm.value.network
      })
    }

    // 模板过滤
    if (searchForm.value.template) {
      result = result.filter(bot => bot.template === searchForm.value.template)
    }

    return result
  })

  // 计算属性：分页后的机器人列表
  const paginatedBots = computed(() => {
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    return filteredBots.value.slice(startIndex, endIndex)
  })

  // 计算属性：总页数
  const totalPages = computed(() => {
    return Math.ceil(filteredBots.value.length / pageSize.value)
  })

  // 计算属性：分页信息
  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value + 1
    const end = Math.min(currentPage.value * pageSize.value, filteredBots.value.length)
    const total = filteredBots.value.length

    return {
      start,
      end,
      total,
      currentPage: currentPage.value,
      totalPages: totalPages.value
    }
  })

  /**
   * 重置搜索条件
   */
  const resetSearch = () => {
    searchForm.value = {
      keyword: '',
      status: '',
      network: '',
      template: ''
    }
    currentPage.value = 1
  }

  /**
   * 执行搜索
   */
  const performSearch = () => {
    currentPage.value = 1 // 搜索时重置到第一页
  }

  /**
   * 设置页码
   */
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  /**
   * 上一页
   */
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  /**
   * 下一页
   */
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  /**
   * 设置每页大小
   */
  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1 // 重置到第一页
  }

  /**
   * 获取状态选项
   */
  const getStatusOptions = () => [
    { label: '全部状态', value: '' },
    { label: '活跃', value: 'active' },
    { label: '停用', value: 'inactive' }
  ]

  /**
   * 获取模板选项
   */
  const getTemplateOptions = () => {
    const templates = new Set<string>()
    bots.value.forEach(bot => {
      if (bot.template) {
        templates.add(bot.template)
      }
    })

    return [
      { label: '全部模板', value: '' },
      ...Array.from(templates).map(template => ({
        label: template,
        value: template
      }))
    ]
  }

  /**
   * 检查是否有搜索条件
   */
  const hasSearchConditions = computed(() => {
    return !!(
      searchForm.value.keyword ||
      searchForm.value.status ||
      searchForm.value.network ||
      searchForm.value.template
    )
  })

  return {
    // 数据
    searchForm,
    currentPage,
    pageSize,
    total,

    // 计算属性
    filteredBots,
    paginatedBots,
    totalPages,
    paginationInfo,
    hasSearchConditions,

    // 方法
    resetSearch,
    performSearch,
    setPage,
    prevPage,
    nextPage,
    setPageSize,
    getStatusOptions,
    getTemplateOptions
  }
}
