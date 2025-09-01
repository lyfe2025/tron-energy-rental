<template>
  <div class="permission-tree-node">
    <div
      class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
      :class="{
        'bg-blue-50': isSelected,
        'border border-blue-200': isSelected
      }"
    >
      <!-- 展开/收起按钮 -->
      <button
        v-if="hasChildren"
        @click="handleToggleExpand"
        class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronRight
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <div v-else class="w-6 h-6 flex-shrink-0"></div>

      <!-- 选择框 -->
      <label class="flex items-center cursor-pointer flex-1">
        <input
          type="checkbox"
          :checked="isSelected"
          @change="handleToggleSelect"
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        
        <!-- 权限图标 -->
        <div class="ml-3 flex-shrink-0">
          <component
            :is="getPermissionIcon(permission.type)"
            class="w-4 h-4"
            :class="getPermissionIconColor(permission.type)"
          />
        </div>
        
        <!-- 权限信息 -->
        <div class="ml-2 flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-900 truncate">
              {{ permission.name }}
            </span>
            <span
              v-if="permission.code"
              class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {{ permission.code }}
            </span>
            <span
              v-if="permission.type"
              class="px-2 py-0.5 text-xs rounded"
              :class="getPermissionTypeBadge(permission.type)"
            >
              {{ getPermissionTypeText(permission.type) }}
            </span>
          </div>
          <p
            v-if="permission.description"
            class="text-xs text-gray-500 mt-0.5 truncate"
            :title="permission.description"
          >
            {{ permission.description }}
          </p>
        </div>
        
        <!-- 子权限数量 -->
        <div v-if="hasChildren" class="flex-shrink-0">
          <span class="text-xs text-gray-500">
            {{ permission.children?.length }} 项
          </span>
        </div>
      </label>
    </div>

    <!-- 子权限 -->
    <div
      v-if="hasChildren && isExpanded"
      class="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-4"
    >
      <PermissionTreeNode
        v-for="child in permission.children"
        :key="child.id"
        :permission="child"
        :selected-permissions="selectedPermissions"
        :expanded-nodes="expandedNodes"
        @toggle-expand="$emit('toggle-expand', $event)"
        @toggle-select="(nodeId, selected) => $emit('toggle-select', nodeId, selected)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronRight,
  Shield,
  Users,
  Settings,
  FileText,
  Database,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload
} from 'lucide-vue-next'
import type { PermissionTreeNode, PermissionType } from '../types'

interface Props {
  permission: PermissionTreeNode
  selectedPermissions: Set<number>
  expandedNodes: Set<number>
}

interface Emits {
  'toggle-expand': [nodeId: number]
  'toggle-select': [nodeId: number, selected: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const hasChildren = computed(() => {
  return props.permission.children && props.permission.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedNodes.has(props.permission.id)
})

const isSelected = computed(() => {
  return props.selectedPermissions.has(props.permission.id)
})

// 方法
const handleToggleExpand = () => {
  emit('toggle-expand', props.permission.id)
}

const handleToggleSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('toggle-select', props.permission.id, target.checked)
}

const getPermissionIcon = (type?: PermissionType) => {
  switch (type) {
    case 'menu':
      return FileText
    case 'button':
      return Settings
    case 'api':
      return Database
    case 'page':
      return Eye
    case 'operation':
      return Edit
    default:
      return Shield
  }
}

const getPermissionIconColor = (type?: PermissionType) => {
  switch (type) {
    case 'menu':
      return 'text-blue-500'
    case 'button':
      return 'text-green-500'
    case 'api':
      return 'text-purple-500'
    case 'page':
      return 'text-orange-500'
    case 'operation':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

const getPermissionTypeText = (type?: PermissionType) => {
  switch (type) {
    case 'menu':
      return '菜单'
    case 'button':
      return '按钮'
    case 'api':
      return 'API'
    case 'page':
      return '页面'
    case 'operation':
      return '操作'
    default:
      return '未知'
  }
}

const getPermissionTypeBadge = (type?: PermissionType) => {
  switch (type) {
    case 'menu':
      return 'bg-blue-100 text-blue-700'
    case 'button':
      return 'bg-green-100 text-green-700'
    case 'api':
      return 'bg-purple-100 text-purple-700'
    case 'page':
      return 'bg-orange-100 text-orange-700'
    case 'operation':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>

<style scoped>
.permission-tree-node {
  @apply select-none;
}
</style>