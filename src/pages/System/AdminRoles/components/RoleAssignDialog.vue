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
            <UserPlus class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ isBatchMode ? '批量分配角色' : '分配角色' }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ isBatchMode ? `为 ${users.length} 个用户分配角色` : `为用户 ${user?.username} 分配角色` }}
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
        <!-- 用户信息 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">目标用户</h4>
          <div class="space-y-2">
            <div
              v-for="targetUser in users"
              :key="targetUser.admin_id"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User class="w-4 h-4 text-gray-500" />
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ targetUser.username }}</div>
                <div class="text-sm text-gray-500">{{ targetUser.email }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">{{ targetUser.department_name || '-' }}</div>
                <div class="text-xs text-gray-400">{{ targetUser.position_name || '-' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 当前角色 -->
        <div v-if="!isBatchMode && user" class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">当前角色</h4>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="role in user.roles"
              :key="role.id"
              class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
            >
              {{ role.name }}
            </span>
            <span
              v-if="user.roles.length === 0"
              class="text-sm text-gray-500"
            >
              暂无角色
            </span>
          </div>
        </div>

        <!-- 操作类型 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">操作类型</h4>
          <div class="grid grid-cols-3 gap-3">
            <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                v-model="form.operation"
                type="radio"
                value="assign"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div class="font-medium text-gray-900">添加角色</div>
                <div class="text-xs text-gray-500">在现有角色基础上添加</div>
              </div>
            </label>
            <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                v-model="form.operation"
                type="radio"
                value="replace"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div class="font-medium text-gray-900">替换角色</div>
                <div class="text-xs text-gray-500">替换所有现有角色</div>
              </div>
            </label>
            <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                v-model="form.operation"
                type="radio"
                value="remove"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div class="font-medium text-gray-900">移除角色</div>
                <div class="text-xs text-gray-500">移除指定的角色</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 角色选择 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">
            选择角色
            <span class="text-red-500">*</span>
          </h4>
          
          <!-- 搜索框 -->
          <div class="relative mb-4">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="roleSearchQuery"
              type="text"
              placeholder="搜索角色..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- 快速选择 -->
          <div class="flex gap-2 mb-4">
            <button
              @click="handleSelectAllRoles"
              class="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              全选
            </button>
            <button
              @click="handleSelectNoneRoles"
              class="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              全不选
            </button>
          </div>
          
          <!-- 角色列表 -->
          <div class="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <input
                :id="`role-${role.id}`"
                v-model="form.role_ids"
                :value="role.id"
                type="checkbox"
                class="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                :for="`role-${role.id}`"
                class="flex-1 cursor-pointer"
              >
                <div class="font-medium text-gray-900">{{ role.name }}</div>
                <div v-if="role.code" class="text-sm text-gray-500">{{ role.code }}</div>
              </label>
              <span
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                :class="!role.disabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ !role.disabled ? '正常' : '禁用' }}
              </span>
            </div>
            
            <div v-if="filteredRoles.length === 0" class="p-4 text-center text-gray-500">
              {{ roleSearchQuery ? '未找到匹配的角色' : '暂无可用角色' }}
            </div>
          </div>
          
          <div v-if="errors.role_ids" class="mt-1 text-sm text-red-600">
            {{ errors.role_ids }}
          </div>
        </div>

        <!-- 操作原因 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-900 mb-2">
            操作原因
          </label>
          <textarea
            v-model="form.reason"
            rows="3"
            placeholder="请输入操作原因（可选）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
        </div>
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
          :disabled="loading || form.role_ids.length === 0"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ loading ? '处理中...' : '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { X, UserPlus, User, Search } from 'lucide-vue-next'
import { useRoles } from '../../Roles/composables/useRoles'
import type { AdminRoleInfo, AdminRoleAssignRequest } from '../types'
import type { RoleOption } from '../../Roles/types'

interface Props {
  visible: boolean
  user?: AdminRoleInfo | null
  users: AdminRoleInfo[]
  loading?: boolean
}

interface Emits {
  close: []
  submit: [data: AdminRoleAssignRequest]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 使用组合式函数
const { getRoleOptions } = useRoles()

// 状态
const form = ref<AdminRoleAssignRequest>({
  admin_ids: [],
  role_ids: [],
  operation: 'assign',
  reason: ''
})

const errors = ref<Record<string, string>>({})
const roleOptions = ref<RoleOption[]>([])
const roleSearchQuery = ref('')

// 计算属性
const isBatchMode = computed(() => props.users.length > 1)

const filteredRoles = computed(() => {
  if (!roleSearchQuery.value) {
    return roleOptions.value
  }
  
  const query = roleSearchQuery.value.toLowerCase()
  return roleOptions.value.filter(role => 
    role.name.toLowerCase().includes(query) ||
    role.code.toLowerCase().includes(query)
  )
})

// 方法
const validateForm = (): boolean => {
  errors.value = {}
  
  if (form.value.role_ids.length === 0) {
    errors.value.role_ids = '请至少选择一个角色'
    return false
  }
  
  return true
}

const handleSelectAllRoles = () => {
  form.value.role_ids = filteredRoles.value
    .filter(role => !role.disabled)
    .map(role => role.id)
}

const handleSelectNoneRoles = () => {
  form.value.role_ids = []
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  
  const data: AdminRoleAssignRequest = {
    ...form.value,
    admin_ids: props.users.map(user => user.admin_id)
  }
  
  emit('submit', data)
}

const loadRoleOptions = async () => {
  try {
    roleOptions.value = await getRoleOptions()
  } catch (err) {
    console.error('加载角色选项失败:', err)
  }
}

// 监听器
watch(() => props.visible, (visible) => {
  if (visible) {
    // 重置表单
    form.value = {
      admin_ids: [],
      role_ids: [],
      operation: 'assign',
      reason: ''
    }
    errors.value = {}
    roleSearchQuery.value = ''
    
    // 加载角色选项
    loadRoleOptions()
  }
})

// 生命周期
onMounted(() => {
  if (props.visible) {
    loadRoleOptions()
  }
})
</script>