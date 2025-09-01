<template>
  <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">部门管理</h1>
      <p class="text-gray-600 mt-1">管理组织架构和部门信息</p>
    </div>

    <!-- 操作栏 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="flex items-center justify-between">
        <!-- 搜索框 -->
        <div class="flex items-center gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索部门名称..."
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              @input="handleSearch"
            />
          </div>
          
          <button
            @click="handleSearch"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Search class="w-4 h-4" />
            搜索
          </button>
          
          <button
            @click="handleReset"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RotateCcw class="w-4 h-4" />
            重置
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-3">
          <button
            @click="toggleExpandAll"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <component :is="isAllExpanded ? ChevronUp : ChevronDown" class="w-4 h-4" />
            {{ isAllExpanded ? '收起全部' : '展开全部' }}
          </button>
          
          <button
            @click="() => loadDepartments()"
            :disabled="loading"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            刷新
          </button>
          
          <button
            @click="handleCreate"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus class="w-4 h-4" />
            新增部门
          </button>
        </div>
      </div>
    </div>

    <!-- 部门树形列表 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>加载中...</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
        <AlertCircle class="w-12 h-12 text-red-500 mb-4" />
        <p class="text-gray-500 mb-4">{{ error }}</p>
        <button
          @click="() => loadDepartments()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!departmentTree.length" class="flex flex-col items-center justify-center py-12">
        <Building2 class="w-12 h-12 text-gray-400 mb-4" />
        <p class="text-gray-500 mb-4">暂无部门数据</p>
        <button
          @click="handleCreate"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          创建第一个部门
        </button>
      </div>

      <!-- 部门树 -->
      <div v-else class="p-4">
        <DepartmentTreeNode
          v-for="department in departmentTree"
          :key="department.id"
          :department="department"
          :expanded="expandedNodes"
          :selected="selectedDepartment?.id"
          @toggle="handleToggleNode"
          @select="handleSelectDepartment"
          @create-child="handleCreateChild"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- 对话框 -->
    <DepartmentDialog
      :visible="dialogVisible"
      :department="editingDepartment"
      :parent-options="departmentOptions"
      @close="handleDialogClose"
      @submit="handleDialogSubmit"
    />

    <ConfirmDialog
      :visible="confirmDialogVisible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      :loading="confirmDialog.loading"
      @close="handleConfirmDialogClose"
      @confirm="handleConfirmDialogConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Search,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Plus,
  AlertCircle,
  Building2
} from 'lucide-vue-next'
import { useDepartments } from './composables/useDepartments'
import DepartmentTreeNode from './components/DepartmentTreeNode.vue'
import DepartmentDialog from './components/DepartmentDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import type { Department, DepartmentTreeNode as DepartmentTreeNodeType } from './types'
import { DepartmentStatus } from './types'

// 组合式函数
const {
  departments,
  departmentTree,
  departmentOptions,
  loading,
  error,
  loadDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  buildDepartmentTree
} = useDepartments()

// 响应式数据
const searchQuery = ref('')
const expandedNodes = ref<Set<number>>(new Set())
const selectedDepartment = ref<Department | null>(null)
const dialogVisible = ref(false)
const editingDepartment = ref<Department | null>(null)
const confirmDialogVisible = ref(false)
const confirmDialog = ref({
  title: '',
  message: '',
  type: 'warning' as 'warning' | 'danger' | 'info' | 'success',
  loading: false,
  action: null as (() => Promise<void>) | null
})

// 计算属性
const isAllExpanded = computed(() => {
  const allNodeIds = getAllNodeIds(departmentTree.value)
  return allNodeIds.every(id => expandedNodes.value.has(id))
})

// 方法
const getAllNodeIds = (nodes: DepartmentTreeNodeType[]): number[] => {
  const ids: number[] = []
  const traverse = (nodeList: DepartmentTreeNodeType[]) => {
    nodeList.forEach(node => {
      ids.push(node.id)
      if (node.children?.length) {
        traverse(node.children)
      }
    })
  }
  traverse(nodes)
  return ids
}

const toggleExpandAll = () => {
  const allNodeIds = getAllNodeIds(departmentTree.value)
  if (isAllExpanded.value) {
    expandedNodes.value.clear()
  } else {
    allNodeIds.forEach(id => expandedNodes.value.add(id))
  }
}

const handleToggleNode = (departmentId: number) => {
  if (expandedNodes.value.has(departmentId)) {
    expandedNodes.value.delete(departmentId)
  } else {
    expandedNodes.value.add(departmentId)
  }
}

const handleSelectDepartment = (department: Department) => {
  selectedDepartment.value = department
}

const handleSearch = () => {
  // 实现搜索逻辑
  console.log('搜索:', searchQuery.value)
}

const handleReset = () => {
  searchQuery.value = ''
  selectedDepartment.value = null
  loadDepartments()
}

const handleCreate = () => {
  editingDepartment.value = null
  dialogVisible.value = true
}

const handleCreateChild = (parentDepartment: Department) => {
  editingDepartment.value = {
    id: 0,
    name: '',
    code: '',
    description: '',
    parent_id: parentDepartment.id,
    sort_order: 0,
    status: DepartmentStatus.ACTIVE,
    created_at: '',
    updated_at: ''
  }
  dialogVisible.value = true
}

const handleEdit = (department: Department) => {
  editingDepartment.value = { ...department }
  dialogVisible.value = true
}

const handleDelete = (department: Department) => {
  confirmDialog.value = {
    title: '确认删除',
    message: `确定要删除部门 "${department.name}" 吗？此操作不可撤销。`,
    type: 'danger',
    loading: false,
    action: async () => {
      confirmDialog.value.loading = true
      try {
        await deleteDepartment(department.id)
        await loadDepartments()
        confirmDialogVisible.value = false
      } catch (error) {
        console.error('删除部门失败:', error)
      } finally {
        confirmDialog.value.loading = false
      }
    }
  }
  confirmDialogVisible.value = true
}

const handleDialogClose = () => {
  dialogVisible.value = false
  editingDepartment.value = null
}

const handleDialogSubmit = async (departmentData: Partial<Department>) => {
  try {
    if (editingDepartment.value?.id) {
      await updateDepartment(editingDepartment.value.id, departmentData)
    } else {
      // 转换为CreateDepartmentRequest类型
      const createRequest = {
        name: departmentData.name!,
        code: departmentData.code!,
        description: departmentData.description,
        parent_id: departmentData.parent_id,
        sort_order: departmentData.sort_order,
        status: departmentData.status
      }
      await createDepartment(createRequest)
    }
    await loadDepartments()
    dialogVisible.value = false
    editingDepartment.value = null
  } catch (error) {
    console.error('保存部门失败:', error)
  }
}

const handleConfirmDialogClose = () => {
  confirmDialogVisible.value = false
  confirmDialog.value.action = null
}

const handleConfirmDialogConfirm = async () => {
  if (confirmDialog.value.action) {
    await confirmDialog.value.action()
  }
}

// 生命周期
onMounted(() => {
  loadDepartments()
})
</script>