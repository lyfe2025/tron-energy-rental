<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">
            {{ targetAdmins.length > 1 ? '批量分配角色' : '分配角色' }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ targetAdmins.length > 1 ? `已选择 ${targetAdmins.length} 个管理员` : targetAdmins[0]?.username || '未知用户' }}
          </p>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- 对话框内容 -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <!-- 目标用户信息 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">目标用户</h4>
          <div class="bg-gray-50 rounded-lg p-4">
            <div v-if="targetAdmins.length > 1" class="space-y-2">
              <div v-for="admin in targetAdmins" :key="admin.admin_id" class="flex items-center justify-between">
                <span class="text-sm font-medium">{{ admin.username }}</span>
                <span class="text-xs text-gray-500">{{ admin.email }}</span>
              </div>
            </div>
            <div v-else class="flex items-center justify-between">
              <div>
                <div class="font-medium">{{ targetAdmins[0]?.username }}</div>
                <div class="text-sm text-gray-500">{{ targetAdmins[0]?.email }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 当前角色（单个用户时显示） -->
        <div v-if="targetAdmins.length === 1 && targetAdmins[0]?.roles?.length" class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">当前角色</h4>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="role in targetAdmins[0].roles"
              :key="role.id"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {{ role.name }}
            </span>
          </div>
        </div>

        <!-- 操作说明 -->
        <div class="mb-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-blue-800">操作说明</h4>
                <p class="text-sm text-blue-700 mt-1">
                  将为选中的管理员分配新角色，替换其当前角色。每个管理员只能拥有一个角色。
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 角色选择 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">
            选择角色（单选）
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
          
          <!-- 角色列表 -->
          <div class="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <!-- 单选模式 -->
              <input
                :id="`role-${role.id}`"
                v-model="selectedRoleId"
                :value="role.id"
                type="radio"
                name="role"
                class="mr-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                :disabled="role.disabled"
              />
              <label
                :for="`role-${role.id}`"
                class="flex-1 cursor-pointer"
                :class="{ 'opacity-50 cursor-not-allowed': role.disabled }"
              >
                <div class="font-medium text-gray-900">{{ role.name }}</div>
                <div v-if="role.code" class="text-sm text-gray-500">{{ role.code }}</div>
              </label>
              <span
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                :class="!role.disabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ !role.disabled ? '启用' : '禁用' }}
              </span>
            </div>
            
            <div v-if="filteredRoles.length === 0" class="p-4 text-center text-gray-500">
            {{ roleSearchQuery ? '未找到匹配的角色' : '暂无可用角色' }}
          </div>
          </div>
          
          <div v-if="errors.role_id" class="mt-1 text-sm text-red-600">
            {{ errors.role_id }}
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
      <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="!selectedRoleId"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认分配
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, User, UserPlus, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { RoleOption } from '../../Roles/types'
import { useRoles } from '../../Roles/composables/useRoles'
import { useAdminRoles } from '../composables/useAdminRoles'
import type { Admin, AdminRoleAssignRequest, AdminRoleInfo, Role } from '../types'

const props = defineProps<{
  visible: boolean
  targetAdmins: Admin[]
}>()

const emit = defineEmits<{
  close: []
  submit: [data: {
    admin_ids: string[]
    role_id: number
    operation_type: 'replace'
    reason?: string
  }]
}>()

// 响应式状态
const form = reactive({
  operation_type: 'replace' as 'replace',
  reason: ''
})

const selectedRoleId = ref<number | null>(null)
const errors = reactive({
  role_id: '',
  reason: ''
})
const roleOptions = ref<RoleOption[]>([])
const roleSearchQuery = ref('')

const filteredRoles = computed(() => {
  if (!roleSearchQuery.value) return roleOptions.value
  return roleOptions.value.filter(role => 
    role.name.toLowerCase().includes(roleSearchQuery.value.toLowerCase()) ||
    role.code?.toLowerCase().includes(roleSearchQuery.value.toLowerCase())
  )
})

// 方法
const validateForm = () => {
  errors.role_id = ''
  errors.reason = ''
  
  if (!selectedRoleId.value) {
    errors.role_id = '请选择一个角色'
    return false
  }
  
  return true
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!validateForm()) return
  
  const submitData = {
    admin_ids: props.targetAdmins.map(admin => admin.admin_id),
    role_id: selectedRoleId.value!,
    operation_type: form.operation_type,
    reason: form.reason || undefined
  }
  
  emit('submit', submitData)
}

const { getRoleOptions } = useRoles()

const loadRoleOptions = async () => {
  try {
    const options = await getRoleOptions()
    roleOptions.value = options.map(option => ({
      ...option,
      disabled: false // 默认不禁用，因为API只返回可用的角色
    }))
  } catch (error) {
    console.error('加载角色选项失败:', error)
  }
}

// 监听器
watch(() => props.visible, (visible) => {
  if (visible) {
    // 重置表单
    form.operation_type = 'replace'
    form.reason = ''
    selectedRoleId.value = null
    errors.role_id = ''
    errors.reason = ''
    roleSearchQuery.value = ''
    
    // 如果是单个管理员，设置当前角色为默认选中
    if (props.targetAdmins.length === 1 && props.targetAdmins[0].roles?.length > 0) {
      selectedRoleId.value = props.targetAdmins[0].roles[0].id
    }
    
    // 加载角色选项
    loadRoleOptions()
  }
})

// 生命周期
onMounted(() => {
  loadRoleOptions()
})
</script>