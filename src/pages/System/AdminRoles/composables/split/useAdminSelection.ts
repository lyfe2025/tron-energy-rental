/**
 * 管理员选择和批量操作逻辑
 */
import { computed, ref } from 'vue'
import type { AdminRoleInfo } from '../../types'

export function useAdminSelection(adminRoles: any) {
  // 选择状态
  const selectedAdmins = ref<string[]>([])
  
  // 计算选中的管理员详细信息
  const selectedAdminList = computed(() => {
    return (adminRoles.value || []).filter((admin: AdminRoleInfo) => 
      selectedAdmins.value.includes(admin.admin_id)
    )
  })

  // 是否全选
  const isAllSelected = computed(() => {
    const roles = adminRoles.value || []
    return roles.length > 0 && selectedAdmins.value.length === roles.length
  })

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      selectedAdmins.value = []
    } else {
      selectedAdmins.value = (adminRoles.value || []).map((admin: AdminRoleInfo) => admin.admin_id)
    }
  }

  // 清空选择
  const clearSelection = () => {
    selectedAdmins.value = []
  }

  // 选择单个管理员
  const toggleAdminSelection = (adminId: string) => {
    const index = selectedAdmins.value.indexOf(adminId)
    if (index > -1) {
      selectedAdmins.value.splice(index, 1)
    } else {
      selectedAdmins.value.push(adminId)
    }
  }

  // 是否选中指定管理员
  const isAdminSelected = (adminId: string) => {
    return selectedAdmins.value.includes(adminId)
  }

  // 获取批量操作的管理员ID列表
  const getSelectedAdminIds = () => {
    return [...selectedAdmins.value]
  }

  // 重置选择状态（通常在数据刷新后调用）
  const resetSelection = () => {
    selectedAdmins.value = []
  }

  return {
    // 状态
    selectedAdmins,
    selectedAdminList,
    
    // 计算属性
    isAllSelected,
    
    // 方法
    toggleSelectAll,
    clearSelection,
    toggleAdminSelection,
    isAdminSelected,
    getSelectedAdminIds,
    resetSelection
  }
}
