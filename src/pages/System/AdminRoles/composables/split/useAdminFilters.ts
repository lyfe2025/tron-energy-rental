/**
 * 管理员筛选逻辑
 */
import { computed, ref } from 'vue'
import { usePositions } from '../../../Positions/composables/usePositions'
import { useRoles } from '../../../Roles/composables/useRoles'

export function useAdminFilters() {
  // 筛选状态
  const searchQuery = ref('')
  const filterDepartment = ref('')
  const filterRole = ref('')

  // 选项数据
  const { getPositionOptions } = usePositions()
  const { getRoleOptions } = useRoles()
  
  const positionOptions = ref<Array<{ value: number; label: string }>>([])
  const roleOptions = ref<Array<{ value: number; label: string }>>([])

  // 初始化选项数据
  const initOptions = async () => {
    try {
      const [positions, roles] = await Promise.all([
        getPositionOptions(),
        getRoleOptions()
      ])
      
      // 转换岗位数据格式：从 {id, name} 转换为 {value, label}
      positionOptions.value = positions.map((position: any) => ({
        value: position.id,
        label: position.name
      }))
      
      // 转换角色数据格式：从 {id, name} 转换为 {value, label}  
      roleOptions.value = roles.map(role => ({
        value: role.id,
        label: role.name
      }))
    } catch (error) {
      console.error('获取选项数据失败:', error)
    }
  }

  // 重置筛选条件
  const resetFilters = () => {
    searchQuery.value = ''
    filterDepartment.value = ''
    filterRole.value = ''
  }

  // 获取筛选参数
  const getFilterParams = () => {
    const params: any = {}
    
    if (searchQuery.value.trim()) {
      params.username = searchQuery.value.trim()
    }
    
    if (filterDepartment.value) {
      params.department_id = Number(filterDepartment.value)
    }
    
    if (filterRole.value) {
      params.role_id = Number(filterRole.value)
    }
    
    return params
  }

  // 检查是否有筛选条件
  const hasFilters = computed(() => {
    return !!(searchQuery.value.trim() || filterDepartment.value || filterRole.value)
  })

  return {
    // 状态
    searchQuery,
    filterDepartment,
    filterRole,
    positionOptions,
    roleOptions,
    
    // 计算属性
    hasFilters,
    
    // 方法
    initOptions,
    resetFilters,
    getFilterParams
  }
}
