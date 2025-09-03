<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Edit class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">编辑管理员</h3>
            <p class="text-sm text-gray-500">
              修改管理员 {{ admin?.username }} 的基本信息
            </p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 用户名 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                用户名 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.username"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
              <div v-if="errors.username" class="mt-1 text-sm text-red-600">
                {{ errors.username }}
              </div>
            </div>

            <!-- 邮箱 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                邮箱 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入邮箱地址"
              />
              <div v-if="errors.email" class="mt-1 text-sm text-red-600">
                {{ errors.email }}
              </div>
            </div>
          </div>

          <!-- 角色选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2">
              角色 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.role_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择角色</option>
              <option
                v-for="role in roleOptions"
                :key="role.id"
                :value="role.id"
                :disabled="role.disabled"
              >
                {{ role.name }}
              </option>
            </select>
            <div v-if="errors.role_id" class="mt-1 text-sm text-red-600">
              {{ errors.role_id }}
            </div>
          </div>

          <!-- 部门和岗位 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 部门 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                部门
                <span class="text-xs text-gray-500 font-normal ml-1">(根据岗位自动关联)</span>
              </label>
              <select
                v-model="form.department_id"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              >
                <option value="">请选择部门</option>
                <option
                  v-for="department in departmentOptions"
                  :key="department.id"
                  :value="department.id"
                >
                  {{ department.name }}
                </option>
              </select>
              <div class="mt-1 text-xs text-gray-500">
                选择岗位后将自动关联对应部门
              </div>
              <div v-if="errors.department_id" class="mt-1 text-sm text-red-600">
                {{ errors.department_id }}
              </div>
            </div>

            <!-- 岗位 -->
            <div>
              <label class="block text-sm font-medium text-gray-900 mb-2">
                岗位
              </label>
              <select
                v-model="form.position_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择岗位</option>
                <option
                  v-for="position in positionOptions"
                  :key="position.id"
                  :value="position.id"
                >
                  {{ position.name }}
                </option>
              </select>
              <div v-if="errors.position_id" class="mt-1 text-sm text-red-600">
                {{ errors.position_id }}
              </div>
            </div>
          </div>

          <!-- 状态 -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2">
              状态
            </label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  v-model="form.status"
                  type="radio"
                  value="active"
                  class="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">正常</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="form.status"
                  type="radio"
                  value="inactive"
                  class="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">禁用</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AdminService } from '@/services/adminService'
import { Edit, X } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import { useDepartments } from '../../Departments/composables/useDepartments'
import { usePositions } from '../../Positions/composables/usePositions'
import { useAdminRoles } from '../composables/useAdminRoles'
import type { AdminRoleInfo } from '../types'

interface Props {
  visible: boolean
  admin?: AdminRoleInfo | null
  loading?: boolean
}

interface Emits {
  close: []
  success: []
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 使用组合式函数
const { getRoleOptions } = useAdminRoles()
const { getPositionOptions } = usePositions()
const { getDepartmentOptions } = useDepartments()

// 状态
const form = ref({
  username: '',
  email: '',
  role_id: '',
  department_id: '',
  position_id: '',
  status: 'active'
})

const errors = ref<Record<string, string>>({})
const roleOptions = ref<any[]>([])
const departmentOptions = ref<any[]>([])
const positionOptions = ref<any[]>([])
const loading = ref(false)

// 方法
const validateForm = (): boolean => {
  errors.value = {}
  
  if (!form.value.username.trim()) {
    errors.value.username = '请输入用户名'
    return false
  }
  
  if (!form.value.email.trim()) {
    errors.value.email = '请输入邮箱'
    return false
  }
  
  if (!form.value.role_id || form.value.role_id === '') {
    errors.value.role_id = '请选择角色'
    return false
  }
  
  return true
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  if (!props.admin?.admin_id) {
    console.error('管理员ID不存在')
    return
  }
  
  try {
    loading.value = true
    
    // 准备提交数据
    const submitData = {
      username: form.value.username,
      email: form.value.email,
      role_id: form.value.role_id ? Number(form.value.role_id) : undefined,
      department_id: form.value.department_id ? Number(form.value.department_id) : undefined,
      position_id: form.value.position_id ? Number(form.value.position_id) : undefined,
      status: form.value.status as 'active' | 'inactive'
    }
    
    console.log('🔍 [EditAdminDialog] 提交数据:', submitData)
    console.log('🔍 [EditAdminDialog] 管理员ID:', props.admin.admin_id)
    
    // 调用API更新管理员
    await AdminService.updateAdmin(props.admin.admin_id, submitData)
    
    // 显示成功消息
    const event = new CustomEvent('show-message', {
      detail: { type: 'success', message: '管理员信息更新成功' }
    })
    window.dispatchEvent(event)
    
    emit('success')
    handleClose()
    
  } catch (error: any) {
    console.error('更新管理员失败:', error)
    
    // 显示错误消息
    const event = new CustomEvent('show-message', {
      detail: { type: 'error', message: error.message || '更新管理员失败' }
    })
    window.dispatchEvent(event)
  } finally {
    loading.value = false
  }
}

const loadOptions = async (): Promise<void> => {
  try {
    // 并行加载所有选项
    const [roles, departments, positions] = await Promise.all([
      getRoleOptions(),
      getDepartmentOptions(),
      getPositionOptions()
    ])
    
    roleOptions.value = roles
    departmentOptions.value = departments
    positionOptions.value = positions
  } catch (err) {
    console.error('加载选项失败:', err)
    throw err
  }
}

// 监听岗位变化，自动关联部门
watch(() => form.value.position_id, (newPositionId) => {
  if (newPositionId && positionOptions.value.length > 0) {
    // 确保数据类型匹配，处理字符串和数字两种情况
    const selectedPosition = positionOptions.value.find(p => {
      if (!p || p.id === undefined || p.id === null) return false
      if (newPositionId === undefined || newPositionId === null) return false
      return String(p.id) === String(newPositionId)
    })
    
    if (selectedPosition && selectedPosition.department_id !== undefined && selectedPosition.department_id !== null) {
      form.value.department_id = String(selectedPosition.department_id)
    } else {
      // 清空部门选择
      form.value.department_id = ''
    }
  } else if (newPositionId === '' || newPositionId === null) {
    // 如果清空岗位选择，也清空部门选择
    form.value.department_id = ''
  }
}, { immediate: false })

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.admin) {
    try {
      // 首先加载选项
      await loadOptions()
      
      // 然后填充表单数据
      form.value = {
        username: props.admin.username || '',
        email: props.admin.email || '',
        role_id: props.admin.roles?.[0]?.id ? String(props.admin.roles[0].id) : '',
        department_id: props.admin.department_id ? String(props.admin.department_id) : '',
        position_id: props.admin.position_id ? String(props.admin.position_id) : '',
        status: props.admin.status || 'active'
      }
      errors.value = {}
    } catch (err) {
      console.error('初始化表单失败:', err)
    }
  }
})

// 生命周期
onMounted(async () => {
  if (props.visible) {
    try {
      await loadOptions()
    } catch (err) {
      console.error('组件挂载时加载选项失败:', err)
    }
  }
})
</script>