import { ref, computed, onMounted, onUnmounted } from 'vue'
import { energyPackagesAPI, type PaginatedResponse } from '@/services/api'
import type { EnergyPackage } from '@/types/api'
import type {
  EnergyPackageStats,
  EnergyPackageForm,
  EnergyPackageFilters,
  EnergyPackagePagination,
  ModalMode
} from '../types'

export function useEnergyPackages() {
  // 响应式状态
  const isLoading = ref(false)
  const isSaving = ref(false)
  const packages = ref<EnergyPackage[]>([])
  const packageStats = ref<EnergyPackageStats>({
    total: 0,
    active: 0,
    today_sales: 0,
    total_sales: 0
  })

  // 筛选和分页状态
  const filters = ref<EnergyPackageFilters>({
    searchQuery: '',
    statusFilter: 'all',
    typeFilter: 'all'
  })

  const pagination = ref<EnergyPackagePagination>({
    currentPage: 1,
    pageSize: 10,
    totalPages: 0
  })

  // 选择状态
  const selectedPackages = ref<string[]>([])

  // 模态框状态
  const showPackageModal = ref(false)
  const modalMode = ref<ModalMode>('view')
  const selectedPackage = ref<EnergyPackage | null>(null)
  const showPackageMenu = ref('')

  // 表单状态
  const packageForm = ref<EnergyPackageForm>({
    name: '',
    type: 'energy',
    description: '',
    energy_amount: 0,
    bandwidth_amount: 0,
    price: 0,
    original_price: 0,
    discount_percentage: 0,
    status: 'active'
  })

  // 计算属性
  const filteredPackages = computed(() => {
    // 确保packages.value是数组
    if (!Array.isArray(packages.value)) {
      return []
    }
    
    let filtered = packages.value

    // 搜索过滤
    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase()
      filtered = filtered.filter(pkg =>
        pkg.name.toLowerCase().includes(query) ||
        (pkg.description && pkg.description.toLowerCase().includes(query))
      )
    }

    // 状态过滤
    if (filters.value.statusFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === filters.value.statusFilter)
    }

    // 类型过滤
    if (filters.value.typeFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.type === filters.value.typeFilter)
    }

    return filtered
  })

  const totalPages = computed(() => {
    return Math.ceil(filteredPackages.value.length / pagination.value.pageSize)
  })

  const paginatedPackages = computed(() => {
    const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    return filteredPackages.value.slice(start, end)
  })

  // 格式化函数
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN')
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  }

  const getTypeText = (type: 'energy' | 'bandwidth' | 'mixed') => {
    const typeMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
      energy: '纯能量',
      bandwidth: '纯带宽',
      mixed: '混合包'
    }
    return typeMap[type]
  }

  const getTypeColor = (type: 'energy' | 'bandwidth' | 'mixed') => {
    const colorMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
      energy: 'bg-yellow-100 text-yellow-800',
      bandwidth: 'bg-blue-100 text-blue-800',
      mixed: 'bg-green-100 text-green-800'
    }
    return colorMap[type]
  }

  const getStatusText = (status: 'active' | 'inactive') => {
    const statusMap: Record<'active' | 'inactive', string> = {
      active: '启用',
      inactive: '禁用'
    }
    return statusMap[status]
  }

  const getStatusColor = (status: 'active' | 'inactive') => {
    const colorMap: Record<'active' | 'inactive', string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    return colorMap[status]
  }

  // 数据加载
  const loadPackages = async () => {
    try {
      isLoading.value = true
      const response = await energyPackagesAPI.getEnergyPackages()
      // 根据实际API响应结构解析数据
      if (response.data && response.data.data && response.data.data.users) {
        packages.value = response.data.data.users
      } else {
        packages.value = []
      }
      updatePackageStats()
    } catch (error) {
      console.error('加载能量包失败:', error)
      packages.value = [] // 确保在错误时packages是空数组
    } finally {
      isLoading.value = false
    }
  }

  const updatePackageStats = () => {
    // 确保packages.value是数组
    if (!Array.isArray(packages.value)) {
      packages.value = []
    }
    
    const stats = packages.value.reduce(
      (acc, pkg) => {
        acc.total++
        if (pkg.status === 'active') {
          acc.active++
        }
        acc.today_sales += pkg.today_sales || 0
        acc.total_sales += pkg.sales_count || 0
        return acc
      },
      { total: 0, active: 0, today_sales: 0, total_sales: 0 }
    )
    packageStats.value = stats
  }

  const refreshPackages = async () => {
    await loadPackages()
  }

  // 模态框操作
  const viewPackage = (pkg: EnergyPackage) => {
    selectedPackage.value = pkg
    modalMode.value = 'view'
    showPackageModal.value = true
  }

  const editPackage = (pkg: EnergyPackage) => {
    selectedPackage.value = pkg
    modalMode.value = 'edit'
    packageForm.value = {
      id: pkg.id,
      name: pkg.name,
      type: pkg.type,
      description: pkg.description || '',
      energy_amount: pkg.energy_amount || 0,
      bandwidth_amount: pkg.bandwidth_amount || 0,
      price: pkg.price,
      original_price: pkg.original_price || 0,
      discount_percentage: pkg.discount_percentage || 0,
      status: pkg.status
    }
    showPackageModal.value = true
  }

  const showCreatePackageModal = () => {
    selectedPackage.value = null
    modalMode.value = 'create'
    resetPackageForm()
    showPackageModal.value = true
  }

  const closePackageModal = () => {
    showPackageModal.value = false
    selectedPackage.value = null
    resetPackageForm()
  }

  const resetPackageForm = () => {
    packageForm.value = {
      name: '',
      type: 'energy',
      description: '',
      energy_amount: 0,
      bandwidth_amount: 0,
      price: 0,
      original_price: 0,
      discount_percentage: 0,
      status: 'active'
    }
  }

  // 保存能量包
  const savePackage = async () => {
    try {
      isSaving.value = true
      
      if (modalMode.value === 'create') {
        await energyPackagesAPI.createPackage(packageForm.value)
      } else {
        await energyPackagesAPI.updatePackage(packageForm.value.id!, packageForm.value)
      }
      
      await refreshPackages()
      closePackageModal()
    } catch (error) {
      console.error('保存能量包失败:', error)
    } finally {
      isSaving.value = false
    }
  }

  // 能量包操作
  const togglePackageStatus = async (pkg: EnergyPackage) => {
    try {
      const newStatus = pkg.status === 'active' ? 'inactive' : 'active'
      await energyPackagesAPI.updatePackage(pkg.id, { status: newStatus })
      await refreshPackages()
    } catch (error) {
      console.error('切换能量包状态失败:', error)
    }
  }

  const duplicatePackage = async (pkg: EnergyPackage) => {
    try {
      const duplicatedPackage = {
        ...pkg,
        name: `${pkg.name} (副本)`,
        id: undefined
      }
      await energyPackagesAPI.createPackage(duplicatedPackage)
      await refreshPackages()
    } catch (error) {
      console.error('复制能量包失败:', error)
    }
  }

  const viewPackageStats = (pkg: EnergyPackage) => {
    // 这里可以实现查看统计的逻辑
    console.log('查看能量包统计:', pkg)
  }

  const deletePackage = async (pkg: EnergyPackage) => {
    if (!confirm(`确定要删除能量包 "${pkg.name}" 吗？`)) {
      return
    }
    
    try {
      await energyPackagesAPI.deletePackage(pkg.id)
      await refreshPackages()
    } catch (error) {
      console.error('删除能量包失败:', error)
    }
  }

  // 批量操作
  const batchEnablePackages = async () => {
    if (selectedPackages.value.length === 0) return
    
    try {
      await Promise.all(
        selectedPackages.value.map(id =>
          energyPackagesAPI.updatePackage(id, { status: 'active' })
        )
      )
      await refreshPackages()
      clearSelection()
    } catch (error) {
      console.error('批量启用失败:', error)
    }
  }

  const batchDisablePackages = async () => {
    if (selectedPackages.value.length === 0) return
    
    try {
      await Promise.all(
        selectedPackages.value.map(id =>
          energyPackagesAPI.updatePackage(id, { status: 'inactive' })
        )
      )
      await refreshPackages()
      clearSelection()
    } catch (error) {
      console.error('批量禁用失败:', error)
    }
  }

  const batchDeletePackages = async () => {
    if (selectedPackages.value.length === 0) return
    
    if (!confirm(`确定要删除选中的 ${selectedPackages.value.length} 个能量包吗？`)) {
      return
    }
    
    try {
      await Promise.all(
        selectedPackages.value.map(id => energyPackagesAPI.deletePackage(id))
      )
      await refreshPackages()
      clearSelection()
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  const clearSelection = () => {
    selectedPackages.value = []
  }

  // 导出数据
  const exportPackages = () => {
    const csvContent = [
      ['名称', '类型', '描述', '能量数量', '带宽数量', '价格', '原价', '折扣', '状态', '销量'].join(','),
      ...packages.value.map(pkg => [
        pkg.name,
        getTypeText(pkg.type),
        pkg.description || '',
        pkg.energy_amount || 0,
        pkg.bandwidth_amount || 0,
        pkg.price,
        pkg.original_price || 0,
        pkg.discount_percentage || 0,
        getStatusText(pkg.status),
        pkg.sales_count || 0
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `energy_packages_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 点击外部关闭菜单
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.package-menu')) {
      showPackageMenu.value = ''
    }
  }

  // 生命周期
  onMounted(() => {
    loadPackages()
    document.addEventListener('click', handleClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  return {
    // 状态
    isLoading,
    isSaving,
    packages,
    packageStats,
    filters,
    pagination,
    selectedPackages,
    showPackageModal,
    modalMode,
    selectedPackage,
    showPackageMenu,
    packageForm,
    
    // 计算属性
    filteredPackages,
    totalPages,
    paginatedPackages,
    
    // 格式化函数
    formatNumber,
    formatCurrency,
    getTypeText,
    getTypeColor,
    getStatusText,
    getStatusColor,
    
    // 数据操作
    loadPackages,
    refreshPackages,
    
    // 模态框操作
    viewPackage,
    editPackage,
    showCreatePackageModal,
    closePackageModal,
    resetPackageForm,
    savePackage,
    
    // 能量包操作
    togglePackageStatus,
    duplicatePackage,
    viewPackageStats,
    deletePackage,
    
    // 批量操作
    batchEnablePackages,
    batchDisablePackages,
    batchDeletePackages,
    clearSelection,
    
    // 其他操作
    exportPackages
  }
}