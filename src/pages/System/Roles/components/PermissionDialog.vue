<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
      <!-- 对话框头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg">
            <Settings class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              权限配置
            </h3>
            <p class="text-sm text-gray-500">
              为角色 "{{ role?.name }}" 配置权限
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

      <!-- 搜索和操作栏 -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索权限..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="expandAll"
              class="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronDown class="w-4 h-4 inline mr-1" />
              展开全部
            </button>
            <button
              @click="collapseAll"
              class="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronUp class="w-4 h-4 inline mr-1" />
              收起全部
            </button>
            <button
              @click="selectAll"
              class="px-3 py-2 text-sm text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <CheckSquare class="w-4 h-4 inline mr-1" />
              全选
            </button>
            <button
              @click="selectNone"
              class="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Square class="w-4 h-4 inline mr-1" />
              全不选
            </button>
          </div>
        </div>
      </div>

      <!-- 权限树 -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载权限数据...</span>
        </div>
        
        <div v-else-if="error" class="text-center py-12">
          <AlertCircle class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="loadPermissions"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
        
        <div v-else-if="filteredPermissions.length === 0" class="text-center py-12">
          <Folder class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-600">暂无权限数据</p>
        </div>
        
        <div v-else class="space-y-2">
          <PermissionTreeNodeComponent
            v-for="permission in filteredPermissions"
            :key="permission.id"
            :permission="permission"
            :selected-permissions="selectedPermissions"
            :expanded-nodes="expandedNodes"
            @toggle-expand="toggleExpand"
            @toggle-select="toggleSelect"
          />
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div class="flex items-center justify-between text-sm text-gray-600">
          <span>已选择 {{ selectedPermissions.size }} 个权限</span>
          <span>共 {{ totalPermissionCount }} 个权限</span>
        </div>
      </div>

      <!-- 对话框底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <div v-if="submitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {{ submitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  X,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  AlertCircle,
  Folder
} from 'lucide-vue-next'
import type { Role, PermissionTreeNode } from '../types'
import { useRoles } from '../composables/useRoles'
import PermissionTreeNodeComponent from './PermissionTreeNode.vue'

interface Props {
  visible: boolean
  role?: Role | null
}

interface Emits {
  close: []
  submit: [permissionIds: number[]]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getPermissionTree, getRolePermissions } = useRoles()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const searchKeyword = ref('')
const permissions = ref<PermissionTreeNode[]>([])
const selectedPermissions = ref<Set<number>>(new Set())
const expandedNodes = ref<Set<number>>(new Set())

// 计算属性
const filteredPermissions = computed(() => {
  if (!searchKeyword.value.trim()) {
    return permissions.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  
  const filterNode = (node: PermissionTreeNode): PermissionTreeNode | null => {
    const matchesKeyword = node.name.toLowerCase().includes(keyword) ||
                          (node.description && node.description.toLowerCase().includes(keyword))
    
    const filteredChildren = node.children
      ?.map(child => filterNode(child))
      .filter(Boolean) as PermissionTreeNode[] || []
    
    if (matchesKeyword || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      }
    }
    
    return null
  }
  
  return permissions.value
    .map(node => filterNode(node))
    .filter(Boolean) as PermissionTreeNode[]
})

const totalPermissionCount = computed(() => {
  const countNodes = (nodes: PermissionTreeNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + (node.children ? countNodes(node.children) : 0)
    }, 0)
  }
  return countNodes(permissions.value)
})

// 监听器
watch(
  () => props.visible,
  async (visible) => {
    if (visible && props.role) {
      await loadPermissions()
      await loadRolePermissions()
    }
  }
)

// 方法
const loadPermissions = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const result = await getPermissionTree()
    permissions.value = result
  } catch (err) {
    error.value = '加载权限数据失败'
    console.error('加载权限失败:', err)
  } finally {
    loading.value = false
  }
}

const loadRolePermissions = async () => {
  if (!props.role?.id) return
  
  try {
    const rolePermissions = await getRolePermissions(props.role.id)
    selectedPermissions.value = new Set(rolePermissions)
  } catch (err) {
    console.error('加载角色权限失败:', err)
  }
}

const toggleExpand = (nodeId: number) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

const toggleSelect = (nodeId: number, selected: boolean) => {
  if (selected) {
    selectedPermissions.value.add(nodeId)
  } else {
    selectedPermissions.value.delete(nodeId)
  }
}

const expandAll = () => {
  const expandNode = (nodes: PermissionTreeNode[]) => {
    nodes.forEach(node => {
      expandedNodes.value.add(node.id)
      if (node.children) {
        expandNode(node.children)
      }
    })
  }
  expandNode(permissions.value)
}

const collapseAll = () => {
  expandedNodes.value.clear()
}

const selectAll = () => {
  const selectNode = (nodes: PermissionTreeNode[]) => {
    nodes.forEach(node => {
      selectedPermissions.value.add(node.id)
      if (node.children) {
        selectNode(node.children)
      }
    })
  }
  selectNode(permissions.value)
}

const selectNone = () => {
  selectedPermissions.value.clear()
}

const handleSubmit = async () => {
  submitting.value = true
  
  try {
    const permissionIds = Array.from(selectedPermissions.value)
    emit('submit', permissionIds)
  } catch (error) {
    console.error('提交权限配置失败:', error)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  if (!submitting.value) {
    emit('close')
  }
}
</script>