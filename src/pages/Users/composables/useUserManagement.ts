import { userService } from '@/services/userService'
import { Shield, UserCheck, Users, UserX } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
import type {
    BatchOperationParams,
    CreateUserParams,
    UpdateUserParams,
    User,
    UserFormData,
    UserListParams,
    UserModalMode,
    UserSearchParams,
    UserStats
} from '../types/user.types'

// 统计卡片接口
interface StatCard {
  label: string
  value: string | number
  icon: any
  bgColor: string
  iconColor: string
  change?: string
  changeColor?: string
}

export function useUserManagement() {
  // 响应式状态
  const isLoading = ref(false)
  const users = ref<User[]>([])
  const rawUserStats = ref<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    bannedUsers: 0,
    newUsersToday: 0,
    newUsersThisMonth: 0,
    totalBalance: 0,
    averageBalance: 0
  })

  // 搜索和筛选状态
  const searchParams = reactive<UserSearchParams>({
    query: '',
    status: '',
    type: '',
    dateRange: {
      start: '',
      end: ''
    }
  })

  // 分页状态
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalUsers = ref(0)

  // 选择状态
  const selectedUsers = ref<string[]>([])
  const selectAll = ref(false)

  // 模态框状态
  const modalMode = ref<UserModalMode>('view')
  const isModalOpen = ref(false)
  const currentUser = ref<User | undefined>()
  const isSubmitting = ref(false)

  // 其他状态
  const showUserMenu = ref('')

  // 计算属性
  const filteredUsers = computed(() => {
    // 安全检查：确保 users.value 是数组
    if (!Array.isArray(users.value)) {
      return []
    }
    
    let result = users.value

    // 搜索过滤
    if (searchParams.query) {
      const query = searchParams.query.toLowerCase()
      result = result.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      )
    }

    // 状态过滤
    if (searchParams.status) {
      result = result.filter(user => user.status === searchParams.status)
    }

    // 类型过滤
    if (searchParams.type) {
      result = result.filter(user => user.type === searchParams.type)
    }

    // 日期范围过滤
    if (searchParams.dateRange.start && searchParams.dateRange.end) {
      result = result.filter(user => {
        const userDate = new Date(user.created_at)
        const startDate = new Date(searchParams.dateRange.start)
        const endDate = new Date(searchParams.dateRange.end)
        return userDate >= startDate && userDate <= endDate
      })
    }

    return result
  })

  const totalPages = computed(() => {
    const filtered = filteredUsers.value
    if (!Array.isArray(filtered)) {
      return 0
    }
    return Math.ceil(filtered.length / pageSize.value)
  })

  const paginatedUsers = computed(() => {
    const filtered = filteredUsers.value
    if (!Array.isArray(filtered)) {
      return []
    }
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filtered.slice(start, end)
  })

  const selectedCount = computed(() => selectedUsers.value.length)

  // 统计卡片数据
  const userStats = computed((): StatCard[] => [
    {
      label: '总用户数',
      value: rawUserStats.value.totalUsers,
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: '活跃用户',
      value: rawUserStats.value.activeUsers,
      icon: UserCheck,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: '停用用户',
      value: rawUserStats.value.inactiveUsers,
      icon: UserX,
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      label: '封禁用户',
      value: rawUserStats.value.bannedUsers,
      icon: Shield,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ])

  // 工具函数
  const formatDateTime = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount)
  }

  const getTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      normal: '普通用户',
      vip: 'VIP用户',
      premium: '套餐用户',
      agent: '代理商',
      admin: '管理员'
    }
    return typeMap[type] || type
  }

  const getTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      normal: 'bg-gray-100 text-gray-800',
      vip: 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800',
      agent: 'bg-blue-100 text-blue-800',
      admin: 'bg-red-100 text-red-800'
    }
    return colorMap[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      active: '正常',
      inactive: '停用',
      banned: '封禁'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      banned: 'bg-red-100 text-red-800'
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  // 数据加载方法
  const loadUsers = async () => {
    try {
      isLoading.value = true
      const params: UserListParams = {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchParams.query || undefined,
        status: searchParams.status || undefined,
        type: searchParams.type || undefined,
        dateFrom: searchParams.dateRange.start || undefined,
        dateTo: searchParams.dateRange.end || undefined
      }
      
      console.debug('Loading users with params:', params)
      const response = await userService.getUserList(params)
      console.debug('User service response:', response)
      
      // 确保返回的数据结构正确
      if (response && typeof response === 'object') {
        users.value = Array.isArray(response.users) ? response.users : []
        totalUsers.value = typeof response.total === 'number' ? response.total : 0
        console.debug('Users loaded:', users.value.length, 'Total:', totalUsers.value)
      } else {
        console.debug('Invalid response structure:', response)
        users.value = []
        totalUsers.value = 0
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      // 确保在错误情况下也有正确的初始值
      users.value = []
      totalUsers.value = 0
    } finally {
      isLoading.value = false
    }
  }

  const loadUserStats = async () => {
    try {
      const stats = await userService.getUserStats()
      // 确保返回的数据结构正确
      if (stats && typeof stats === 'object') {
        rawUserStats.value = {
          totalUsers: stats.totalUsers || 0,
          activeUsers: stats.activeUsers || 0,
          inactiveUsers: stats.inactiveUsers || 0,
          bannedUsers: stats.bannedUsers || 0,
          newUsersToday: stats.newUsersToday || 0,
          newUsersThisMonth: stats.newUsersThisMonth || 0,
          totalBalance: stats.totalBalance || 0,
          averageBalance: stats.averageBalance || 0
        }
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
      // 保持默认值，避免页面崩溃
    }
  }

  // 搜索方法
  const handleSearch = (query: string) => {
    searchParams.query = query
    currentPage.value = 1
    loadUsers()
  }

  const handleStatusFilter = (status: string) => {
    searchParams.status = status as any
    currentPage.value = 1
    loadUsers()
  }

  const handleTypeFilter = (type: string) => {
    searchParams.type = type as any
    currentPage.value = 1
    loadUsers()
  }

  const handleDateRangeFilter = (start: string, end: string) => {
    searchParams.dateRange.start = start
    searchParams.dateRange.end = end
    currentPage.value = 1
    loadUsers()
  }

  const clearFilters = () => {
    searchParams.query = ''
    searchParams.status = ''
    searchParams.type = ''
    searchParams.dateRange.start = ''
    searchParams.dateRange.end = ''
    currentPage.value = 1
    loadUsers()
  }

  // 分页方法
  const handlePageChange = (page: number) => {
    currentPage.value = page
    loadUsers()
  }

  // 选择方法
  const toggleSelectAll = () => {
    if (selectAll.value) {
      selectedUsers.value = []
    } else {
      selectedUsers.value = paginatedUsers.value.map(user => user.id)
    }
    selectAll.value = !selectAll.value
  }

  const toggleUserSelect = (userId: string) => {
    const index = selectedUsers.value.indexOf(userId)
    if (index > -1) {
      selectedUsers.value.splice(index, 1)
    } else {
      selectedUsers.value.push(userId)
    }
    
    // 更新全选状态
    selectAll.value = selectedUsers.value.length === paginatedUsers.value.length
  }

  const clearSelection = () => {
    selectedUsers.value = []
    selectAll.value = false
  }

  // 模态框方法
  const openModal = (mode: UserModalMode, user?: User) => {
    modalMode.value = mode
    currentUser.value = user
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    currentUser.value = undefined
    isSubmitting.value = false
  }

  const viewUser = (user: User) => {
    openModal('view', user)
  }

  const editUser = (user: User) => {
    openModal('edit', user)
  }

  const createUser = () => {
    openModal('create')
  }

  // 用户操作方法
  const saveUser = async (formData: UserFormData) => {
    try {
      isSubmitting.value = true
      
      if (modalMode.value === 'create') {
        const createParams: CreateUserParams = {
          type: formData.type as any,
          role: formData.type as any,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          balance: formData.balance,
          password: formData.password,
          remark: formData.remark,
          // 根据类型设置特有字段
          telegram_id: formData.type === 'telegram_user' ? Math.floor(Math.random() * 1000000000) : undefined,
          first_name: formData.type === 'telegram_user' ? formData.first_name || formData.username : undefined,
          last_name: formData.type === 'telegram_user' ? formData.last_name || '' : undefined,
          agent_id: formData.type === 'agent' ? formData.agent_id : undefined,
          commission_rate: formData.type === 'agent' ? formData.commission_rate : undefined
        }
        await userService.createUser(createParams)
      } else if (modalMode.value === 'edit') {
        const updateParams: UpdateUserParams = {
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          status: formData.status as any,
          balance: formData.balance,
          remark: formData.remark,
          // 根据类型更新特有字段
          first_name: formData.first_name,
          last_name: formData.last_name,
          commission_rate: formData.commission_rate
        }
        if (formData.password) {
          updateParams.password = formData.password
        }
        await userService.updateUser(currentUser.value!.id, updateParams)
      }
      
      closeModal()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('保存用户失败:', error)
      // 这里可以添加错误提示
    } finally {
      isSubmitting.value = false
    }
  }

  const toggleUserStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active'
      await userService.updateUser(user.id, {
        status: newStatus
      })
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('切换用户状态失败:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId)
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }

  // 批量操作方法
  const batchActivate = async () => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'activate'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('批量启用失败:', error)
    }
  }

  const batchDeactivate = async () => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'deactivate'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('批量停用失败:', error)
    }
  }

  const batchDelete = async () => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'delete'
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  const batchExport = async () => {
    try {
      const params = {
        userIds: selectedUsers.value,
        format: 'excel' as const,
        fields: ['username', 'email', 'phone', 'type', 'status', 'balance', 'created_at']
      }
      await userService.exportUsers(params)
    } catch (error) {
      console.error('批量导出失败:', error)
    }
  }

  const batchTypeChange = async (type: string) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'typeChange',
        data: { type }
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('批量类型变更失败:', error)
    }
  }

  // 其他方法
  const toggleUserMenu = (userId: string) => {
    showUserMenu.value = showUserMenu.value === userId ? '' : userId
  }

  const resetPassword = async (user: User) => {
    try {
      await userService.resetUserPassword({
        userId: user.id,
        newPassword: 'temp123456' // 临时密码
      })
      // 这里可以添加成功提示
    } catch (error) {
      console.error('重置密码失败:', error)
    }
  }

  const adjustBalance = async (user: User) => {
    // 这里可以打开余额调整模态框
    console.log('调整余额:', user)
  }

  const viewUserOrders = (user: User) => {
    // 这里可以跳转到用户订单页面
    console.log('查看用户订单:', user)
  }

  const banUser = async (user: User) => {
    try {
      await userService.updateUser(user.id, {
        status: 'banned'
      })
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('封禁用户失败:', error)
    }
  }

  return {
    // 状态
    isLoading,
    users,
    userStats,
    searchParams,
    currentPage,
    pageSize,
    totalUsers,
    selectedUsers,
    selectAll,
    modalMode,
    isModalOpen,
    currentUser,
    isSubmitting,
    showUserMenu,
    
    // 计算属性
    filteredUsers,
    totalPages,
    paginatedUsers,
    selectedCount,
    
    // 工具函数
    formatDateTime,
    formatDate,
    formatCurrency,
    getTypeText,
    getTypeColor,
    getStatusText,
    getStatusColor,
    
    // 数据加载
    loadUsers,
    loadUserStats,
    
    // 搜索筛选
    handleSearch,
    handleStatusFilter,
    handleTypeFilter,
    handleDateRangeFilter,
    clearFilters,
    
    // 分页
    handlePageChange,
    
    // 选择
    toggleSelectAll,
    toggleUserSelect,
    clearSelection,
    
    // 模态框
    openModal,
    closeModal,
    viewUser,
    editUser,
    createUser,
    
    // 用户操作
    saveUser,
    toggleUserStatus,
    deleteUser,
    
    // 批量操作
    batchActivate,
    batchDeactivate,
    batchDelete,
    batchExport,
    batchTypeChange,
    
    // 其他
    toggleUserMenu,
    resetPassword,
    adjustBalance,
    viewUserOrders,
    banUser
  }
}