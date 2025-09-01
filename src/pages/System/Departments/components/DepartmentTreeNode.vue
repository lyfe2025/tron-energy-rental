<template>
  <div class="department-tree-node">
    <!-- 当前节点 -->
    <div 
      class="flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
      :class="{
        'bg-blue-50 border border-blue-200': selected === department.id,
        'opacity-60': department.status === 0
      }"
      @click="handleSelect"
    >
      <!-- 展开/收起按钮 -->
      <div class="flex items-center justify-center w-6 h-6 mr-2">
        <button
          v-if="department.hasChildren"
          @click.stop="handleToggle"
          class="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronRight 
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded }"
          />
        </button>
        <div v-else class="w-5 h-5"></div>
      </div>

      <!-- 部门图标 -->
      <div class="flex items-center justify-center w-8 h-8 mr-3">
        <div 
          class="flex items-center justify-center w-6 h-6 rounded"
          :class="getIconClass()"
        >
          <Building2 class="w-4 h-4" />
        </div>
      </div>

      <!-- 部门信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-medium text-gray-900 truncate">
            {{ department.name }}
          </h4>
          
          <!-- 状态标签 -->
          <span 
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getStatusBadgeClass()"
          >
            {{ getStatusText() }}
          </span>
          
          <!-- 用户数量 -->
          <span 
            v-if="department.userCount !== undefined"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
          >
            {{ department.userCount }} 人
          </span>
        </div>
        
        <p 
          v-if="department.description"
          class="text-xs text-gray-500 mt-0.5 truncate"
        >
          {{ department.description }}
        </p>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1 ml-3">
        <button
          @click.stop="handleCreateChild"
          class="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="添加子部门"
        >
          <Plus class="w-4 h-4" />
        </button>
        
        <button
          @click.stop="handleEdit"
          class="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="编辑部门"
        >
          <Edit class="w-4 h-4" />
        </button>
        
        <button
          @click.stop="handleDelete"
          class="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="删除部门"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 子节点 -->
    <div 
      v-if="department.children?.length && isExpanded"
      class="ml-6 mt-1 space-y-1"
    >
      <DepartmentTreeNode
        v-for="child in department.children"
        :key="child.id"
        :department="child"
        :expanded="expanded"
        :selected="selected"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @create-child="$emit('create-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronRight,
  Building2,
  Plus,
  Edit,
  Trash2
} from 'lucide-vue-next'
import type { DepartmentTreeNode as DepartmentTreeNodeType } from '../types'

interface Props {
  department: DepartmentTreeNodeType
  expanded: Set<number>
  selected?: number
}

interface Emits {
  toggle: [departmentId: number]
  select: [department: DepartmentTreeNodeType]
  'create-child': [department: DepartmentTreeNodeType]
  edit: [department: DepartmentTreeNodeType]
  delete: [department: DepartmentTreeNodeType]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const isExpanded = computed(() => {
  return props.expanded.has(props.department.id)
})

// 方法
const handleToggle = () => {
  emit('toggle', props.department.id)
}

const handleSelect = () => {
  emit('select', props.department)
}

const handleCreateChild = () => {
  emit('create-child', props.department)
}

const handleEdit = () => {
  emit('edit', props.department)
}

const handleDelete = () => {
  emit('delete', props.department)
}

const getIconClass = (): string => {
  if (props.department.status === 0) {
    return 'bg-gray-100 text-gray-400'
  }
  
  if (props.department.level === 0) {
    return 'bg-blue-100 text-blue-600'
  } else if (props.department.level === 1) {
    return 'bg-green-100 text-green-600'
  } else {
    return 'bg-purple-100 text-purple-600'
  }
}

const getStatusBadgeClass = (): string => {
  return props.department.status === 1
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800'
}

const getStatusText = (): string => {
  return props.department.status === 1 ? '正常' : '停用'
}
</script>

<style scoped>
.department-tree-node {
  position: relative;
}

.department-tree-node::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #e5e7eb;
}

.department-tree-node:last-child::before {
  height: 50%;
}

.department-tree-node::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 12px;
  height: 1px;
  background-color: #e5e7eb;
}

/* 根节点不显示连接线 */
.department-tree-node:not(.ml-6)::before,
.department-tree-node:not(.ml-6)::after {
  display: none;
}
</style>