import { ref, computed, reactive } from 'vue'
import { Users, UserCheck, UserX, Shield } from 'lucide-vue-next'
import type {
  User,
  UserStats,
  UserSearchParams,
  UserListParams,
  UserFormData,
  UserModalMode,
  BatchOperationParams,
  CreateUserParams,
  UpdateUserParams
} from '../types/user.types'
import { userService } from '@/services/userService'

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
    role: '',
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

    // 角色过滤
    if (searchParams.role) {
      result = result.filter(user => user.role === searchParams.role)
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
    return Math.ceil(filteredUsers.value.length / pageSize.value)
  })

  const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredUsers.value.slice(start, end)
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

  const getRoleText = (role: string): string => {
    const roleMap: Record<string, string> = {
      user: '普通用户',
      vip: 'VIP用户',
      admin: '管理员'
    }
    return roleMap[role] || role
  }

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      user: 'bg-gray-100 text-gray-800',
      vip: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-red-100 text-red-800'
    }
    return colorMap[role] || 'bg-gray-100 text-gray-800'
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
        role: searchParams.role || undefined,
        dateFrom: searchParams.dateRange.start || undefined,
        dateTo: searchParams.dateRange.end || undefined
      }
      
      const response = await userService.getUserList(params)
      users.value = response.users
      totalUsers.value = response.total
    } catch (error) {
      console.error('加载用户列表失败:', error)
      // 这里可以添加错误提示
    } finally {
      isLoading.value = false
    }
  }

  const loadUserStats = async () => {
    try {
      const stats = await userService.getUserStats()
      rawUserStats.value = stats
    } catch (error) {
      console.error('加载用户统计失败:', error)
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

  const handleRoleFilter = (role: string) => {
    searchParams.role = role as any
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
    searchParams.role = ''
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
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          role: formData.role as any,
          status: formData.status,
          balance: formData.balance,
          password: formData.password,
          remark: formData.remark
        }
        await userService.createUser(createParams)
      } else if (modalMode.value === 'edit') {
        const updateParams: UpdateUserParams = {
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          role: formData.role as any,
          status: formData.status,
          balance: formData.balance,
          remark: formData.remark
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
        fields: ['username', 'email', 'phone', 'role', 'status', 'balance', 'created_at']
      }
      await userService.exportUsers(params)
    } catch (error) {
      console.error('批量导出失败:', error)
    }
  }

  const batchRoleChange = async (role: string) => {
    try {
      const params: BatchOperationParams = {
        userIds: selectedUsers.value,
        operation: 'roleChange',
        data: { role }
      }
      await userService.batchOperation(params)
      clearSelection()
      await loadUsers()
      await loadUserStats()
    } catch (error) {
      console.error('批量角色变更失败:', error)
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
    getRoleText,
    getRoleColor,
    getStatusText,
    getStatusColor,
    
    // 数据加载
    loadUsers,
    loadUserStats,
    
    // 搜索筛选
    handleSearch,
    handleStatusFilter,
    handleRoleFilter,
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
    batchRoleChange,
    
    // 其他
    toggleUserMenu,
    resetPassword,
    adjustBalance,
    viewUserOrders,
    banUser
  }
}