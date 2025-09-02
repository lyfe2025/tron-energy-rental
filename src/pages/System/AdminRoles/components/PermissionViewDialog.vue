<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg">
            <Shield class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">用户权限详情</h3>
            <p class="text-sm text-gray-500">
              查看用户 {{ admin?.username }} 的所有权限
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
      <div class="overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="flex items-center gap-3 text-gray-500">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>加载权限信息中...</span>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
          <div class="text-red-500 mb-2">{{ error }}</div>
          <button
            @click="loadPermissions"
            class="text-blue-600 hover:text-blue-700 underline"
          >
            重试
          </button>
        </div>

        <!-- 无权限状态（用户非活跃或无权限）-->
        <div v-else-if="!permissionInfo && !loading && !error" class="flex flex-col items-center justify-center py-12">
          <div class="text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield class="w-8 h-8 text-gray-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">无权限信息</h3>
            <p class="text-gray-500 mb-4">该管理员可能状态为非活跃或未分配任何角色权限</p>
            <div class="text-sm text-gray-400">
              <p>用户名: {{ admin?.username || '未知' }}</p>
              <p>邮箱: {{ admin?.email || '未知' }}</p>
              <p>状态: {{ admin?.status || '未知' }}</p>
            </div>
          </div>
        </div>

        <!-- 权限内容 -->
        <div v-else-if="permissionInfo" class="p-6">

          <!-- 用户信息 -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User class="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ permissionInfo.username }}</div>
                <div class="text-sm text-gray-500">用户ID: {{ permissionInfo.admin_id }}</div>
              </div>
            </div>
          </div>

          <!-- 权限统计 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg">
              <div class="flex items-center gap-2">
                <Users class="w-5 h-5 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">角色数量</span>
              </div>
              <div class="text-2xl font-bold text-blue-600 mt-1">
                {{ permissionInfo.roles.length }}
              </div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg">
              <div class="flex items-center gap-2">
                <Shield class="w-5 h-5 text-green-600" />
                <span class="text-sm font-medium text-green-900">权限数量</span>
              </div>
              <div class="text-2xl font-bold text-green-600 mt-1">
                {{ permissionInfo.permissions.length }}
              </div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
              <div class="flex items-center gap-2">
                <Key class="w-5 h-5 text-purple-600" />
                <span class="text-sm font-medium text-purple-900">直接权限</span>
              </div>
              <div class="text-2xl font-bold text-purple-600 mt-1">
                {{ directPermissions.length }}
              </div>
            </div>
          </div>

          <!-- 标签页 -->
          <div class="mb-6">
            <div class="border-b border-gray-200">
              <nav class="-mb-px flex space-x-8">
                <button
                  @click="activeTab = 'roles'"
                  class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  :class="activeTab === 'roles' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  角色权限
                </button>
                <button
                  @click="activeTab = 'permissions'"
                  class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  :class="activeTab === 'permissions' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  所有权限
                </button>
                <button
                  @click="activeTab = 'direct'"
                  class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  :class="activeTab === 'direct' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  直接权限
                </button>
              </nav>
            </div>
          </div>

          <!-- 角色权限标签页 -->
          <div v-if="activeTab === 'roles'" class="space-y-4">
            <div
              v-for="role in permissionInfo.roles"
              :key="role.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users class="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ role.name }}</div>
                    <div class="text-sm text-gray-500">{{ role.permissions.length }} 个权限</div>
                  </div>
                </div>
                <button
                  @click="toggleRoleExpanded(role.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown 
                    class="w-5 h-5 transition-transform"
                    :class="expandedRoles.includes(role.id) ? 'rotate-180' : ''"
                  />
                </button>
              </div>
              
              <div v-if="expandedRoles.includes(role.id)" class="space-y-2">
                <div
                  v-for="permission in role.permissions"
                  :key="permission.id"
                  class="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div class="flex items-center gap-2">
                    <Key class="w-4 h-4 text-gray-400" />
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ permission.name }}</div>
                      <div class="text-xs text-gray-500">{{ permission.key }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-600">{{ permission.resource }}</div>
                    <div class="text-xs text-gray-400">{{ permission.action }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="permissionInfo.roles.length === 0" class="text-center py-8 text-gray-500">
              该用户暂未分配任何角色
            </div>
          </div>

          <!-- 所有权限标签页 -->
          <div v-if="activeTab === 'permissions'" class="space-y-2">
            <!-- 搜索框 -->
            <div class="relative mb-4">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                v-model="permissionSearchQuery"
                type="text"
                placeholder="搜索权限..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div
              v-for="permission in filteredPermissions"
              :key="permission.id"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
                              <div class="flex items-center gap-3">
                <Key class="w-4 h-4 text-gray-400" />
                <div>
                  <div class="font-medium text-gray-900">{{ permission.name }}</div>
                  <div class="text-sm text-gray-500">{{ permission.key }}</div>
                  <div v-if="permission.resource" class="text-xs text-gray-400">
                    {{ permission.resource }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="flex items-center gap-1 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full"
                    :class="permission.source === 'role' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'"
                  >
                    {{ permission.source === 'role' ? '角色' : '直接' }}
                  </span>
                  <span class="text-gray-500">{{ permission.source_name }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="filteredPermissions.length === 0" class="text-center py-8 text-gray-500">
              {{ permissionSearchQuery ? '未找到匹配的权限' : '该用户暂无任何权限' }}
            </div>
          </div>

          <!-- 直接权限标签页 -->
          <div v-if="activeTab === 'direct'" class="space-y-2">
            <div
              v-for="permission in directPermissions"
              :key="permission.id"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <Key class="w-4 h-4 text-purple-500" />
                <div>
                  <div class="font-medium text-gray-900">{{ permission.name }}</div>
                  <div class="text-sm text-gray-500">{{ permission.key }}</div>
                  <div v-if="permission.resource" class="text-xs text-gray-400">
                    {{ permission.resource }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-purple-600">直接分配</div>
              </div>
            </div>
            
            <div v-if="directPermissions.length === 0" class="text-center py-8 text-gray-500">
              该用户暂无直接分配的权限
            </div>
          </div>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Key, Search, Shield, User, Users, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useAdminRoles } from '../composables/useAdminRoles'
import type { AdminPermissionInfo, AdminRoleInfo } from '../types'

interface Props {
  visible: boolean
  admin?: AdminRoleInfo | null
  loading?: boolean
}

interface Emits {
  'update:visible': [visible: boolean]
  'close': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用组合式函数
const { getUserPermissions } = useAdminRoles()

// 状态
const loading = ref(false)
const error = ref<string | null>(null)
const permissionInfo = ref<AdminPermissionInfo | null>(null)
const activeTab = ref<'roles' | 'permissions' | 'direct'>('roles')
const expandedRoles = ref<number[]>([])
const permissionSearchQuery = ref('')

// 计算属性
const directPermissions = computed(() => {
  if (!permissionInfo.value) return []
  return permissionInfo.value.permissions.filter(p => p.source === 'direct')
})



const filteredPermissions = computed(() => {
  if (!permissionInfo.value) return []
  
  if (!permissionSearchQuery.value) {
    return permissionInfo.value.permissions
  }
  
  const query = permissionSearchQuery.value.toLowerCase()
  return permissionInfo.value.permissions.filter(permission => 
    permission.name.toLowerCase().includes(query) ||
    permission.key.toLowerCase().includes(query) ||
    permission.resource.toLowerCase().includes(query) ||
    permission.action.toLowerCase().includes(query) ||
    (permission.description && permission.description.toLowerCase().includes(query))
  )
})

// 方法
const loadPermissions = async () => {
  if (!props.admin) return
  
  try {
    loading.value = true
    error.value = null
    
    const result = await getUserPermissions(props.admin.admin_id)
    if (result) {
      permissionInfo.value = result
    } else {
      error.value = '获取权限信息失败'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取权限信息失败'
    console.error('获取权限信息失败:', err)
  } finally {
    loading.value = false
  }
}

const toggleRoleExpanded = (roleId: number) => {
  const index = expandedRoles.value.indexOf(roleId)
  if (index > -1) {
    expandedRoles.value.splice(index, 1)
  } else {
    expandedRoles.value.push(roleId)
  }
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 生命周期钩子
onMounted(() => {
  // 如果组件挂载时就是可见的且有管理员数据，立即加载权限
  if (props.visible && props.admin) {
    loadPermissions()
  }
})

// 监听器
watch(() => props.visible, (visible) => {
  if (visible && props.admin) {
    // 重置状态
    permissionInfo.value = null
    error.value = null
    activeTab.value = 'roles'
    expandedRoles.value = []
    permissionSearchQuery.value = ''
    
    // 加载权限信息
    loadPermissions()
  }
})

// 监听 admin 属性变化
watch(() => props.admin, (admin) => {
  if (props.visible && admin) {
    loadPermissions()
  }
})
</script>