<template>
  <div class="positions-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 rounded-lg">
          <Users class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">岗位管理</h1>
          <p class="text-sm text-gray-500">管理系统岗位信息，配置岗位权限</p>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- 搜索和筛选 -->
        <div class="flex flex-col sm:flex-row gap-4 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchQuery.search"
              type="text"
              placeholder="搜索岗位名称..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="handleSearch"
            />
          </div>
          
          <select
            v-model="searchQuery.department_id"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部部门</option>
            <option v-for="dept in departmentOptions" :key="dept.id" :value="dept.id">
              {{ dept.name }}
            </option>
          </select>
          
          <select
            v-model="searchQuery.status"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button
            @click="handleSearch"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Search class="w-4 h-4" />
            搜索
          </button>
          
          <button
            @click="handleRefresh"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw class="w-4 h-4" />
            刷新
          </button>
          
          <button
            @click="handleCreatePosition"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus class="w-4 h-4" />
            新增岗位
          </button>
        </div>
      </div>
    </div>

    <!-- 岗位列表 -->
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
        <div class="text-red-500 mb-2">加载失败</div>
        <button
          @click="handleRefresh"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          重试
        </button>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="positions.length === 0" class="flex flex-col items-center justify-center py-12">
        <Users class="w-12 h-12 text-gray-400 mb-4" />
        <div class="text-gray-500 mb-2">暂无岗位数据</div>
        <button
          @click="handleCreatePosition"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          创建第一个岗位
        </button>
      </div>
      
      <!-- 岗位表格 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                岗位信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属部门
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                排序
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="position in positions" :key="position.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ position.name }}</div>
                  <div v-if="position.description" class="text-sm text-gray-500 mt-1">
                    {{ position.description }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ position.department_name || '-' }}</div>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    position.status === 1
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ position.status === 1 ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ position.sort_order }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  {{ new Date(position.created_at).toLocaleDateString() }}
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleEditPosition(position)"
                    class="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="编辑岗位"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDeletePosition(position)"
                    class="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除岗位"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div v-if="pagination.total > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            共 {{ pagination.total }} 条记录，第 {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.limit) }} 页
          </div>
          <div class="flex gap-2">
            <button
              :disabled="pagination.page <= 1"
              @click="handlePageChange(pagination.page - 1)"
              class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
              @click="handlePageChange(pagination.page + 1)"
              class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 岗位对话框 -->
    <PositionDialog
      v-if="dialogVisible"
      :visible="dialogVisible"
      :position="currentPosition"
      :loading="dialogLoading"
      :department-options="departmentOptions"
      @close="handleCloseDialog"
      @submit="handleSubmitPosition"
    />

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      v-if="confirmVisible"
      :visible="confirmVisible"
      :title="'删除岗位'"
      :message="confirmMessage"
      :loading="confirmLoading"
      type="danger"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Search, RefreshCw, Users, Edit, Trash2 } from 'lucide-vue-next'
import { usePositions } from './composables/usePositions'
import { useDepartments } from '../Departments/composables/useDepartments'
import PositionDialog from './components/PositionDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import type { Position, PositionQuery, CreatePositionRequest, UpdatePositionRequest } from './types'

// 使用组合式函数
const {
  positions,
  pagination,
  loading,
  error,
  loadPositions,
  createPosition,
  updatePosition,
  deletePositionById
} = usePositions()

const { departments, departmentOptions, loadDepartments, getDepartmentOptions } = useDepartments()

// 状态
const searchQuery = ref<PositionQuery>({
  search: '',
  department_id: undefined,
  status: undefined
})
const currentPosition = ref<Position | null>(null)
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmMessage = ref('')
const positionToDelete = ref<Position | null>(null)

// 计算属性 - 移除了departmentOptions的重复定义，直接使用useDepartments提供的departmentOptions

// 方法
const handleSearch = async () => {
  await loadPositions(searchQuery.value)
}

const handleRefresh = async () => {
  searchQuery.value = { search: '', department_id: undefined, status: undefined }
  await loadPositions()
}

const handleCreatePosition = () => {
  currentPosition.value = null
  dialogVisible.value = true
}

const handleEditPosition = (position: Position) => {
  currentPosition.value = position
  dialogVisible.value = true
}

const handleDeletePosition = (position: Position) => {
  positionToDelete.value = position
  confirmMessage.value = `确定要删除岗位「${position.name}」吗？此操作不可恢复。`
  confirmVisible.value = true
}

const handleCloseDialog = () => {
  dialogVisible.value = false
  currentPosition.value = null
}

const handleSubmitPosition = async (data: CreatePositionRequest | UpdatePositionRequest) => {
  try {
    dialogLoading.value = true
    
    let result: Position | null = null
    
    if (currentPosition.value) {
      // 编辑
      result = await updatePosition(currentPosition.value.id, data as UpdatePositionRequest)
    } else {
      // 创建
      result = await createPosition(data as CreatePositionRequest)
    }
    
    if (result) {
      dialogVisible.value = false
      currentPosition.value = null
      await loadPositions()
    }
  } catch (err) {
    console.error('操作失败:', err)
  } finally {
    dialogLoading.value = false
  }
}

const handleConfirmDelete = async () => {
  if (!positionToDelete.value) return
  
  try {
    confirmLoading.value = true
    
    const success = await deletePositionById(positionToDelete.value.id)
    
    if (success) {
      confirmVisible.value = false
      positionToDelete.value = null
      await loadPositions()
    }
  } catch (err) {
    console.error('删除失败:', err)
  } finally {
    confirmLoading.value = false
  }
}

const handleCancelDelete = () => {
  confirmVisible.value = false
  positionToDelete.value = null
}

const handlePageChange = async (page: number) => {
  await loadPositions(searchQuery.value, page)
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadPositions(),
    loadDepartments(),
    getDepartmentOptions()
  ])
})
</script>

<style scoped>
.positions-page {
  @apply p-6 space-y-6;
}

.page-header {
  @apply mb-6;
}
</style>