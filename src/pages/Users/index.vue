<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
            <p class="mt-1 text-sm text-gray-500">管理系统用户信息和权限</p>
          </div>
          <div class="flex space-x-3">
            <button
              @click="createUser"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus class="-ml-1 mr-2 h-5 w-5" />
              新增用户
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 用户统计 -->
      <UserStats :user-stats="userStats" class="mb-8" />

      <!-- 搜索和筛选 -->
      <UserSearch
        :search-query="searchParams.query"
        :status-filter="searchParams.status"
        :type-filter="searchParams.type"
        :user-type-filter="searchParams.user_type || ''"
        @update:search-query="handleSearch"
        @update:status-filter="handleStatusFilter"
        @update:type-filter="handleTypeFilter"
        @update:user-type-filter="handleUserTypeFilter"
        @export="batchExport"
        class="mb-6"
      />

      <!-- 批量操作 -->
      <UserActions
        v-if="selectedCount > 0"
        :is-loading="isLoading"
        :selected-count="selectedCount"
        @batch-activate="batchActivate"
        @batch-deactivate="batchDeactivate"
        @batch-delete="batchDelete"
        @batch-export="batchExport"
        @batch-type-change="batchTypeChange"
        @clear-selection="clearSelection"
        class="mb-6"
      />

      <!-- 用户列表 -->
      <UserList
        :users="users"
        :is-loading="isLoading"
        :paginated-users="paginatedUsers"
        :selected-users="selectedUsers"
        :select-all="selectAll"
        :show-user-menu="showUserMenu"
        :current-page="currentPage"
        :page-size="pageSize"
        :total-users="totalUsers"
        :total-pages="totalPages"
        :format-date-time="formatDateTime"
        :format-date="formatDate"
        :format-currency="formatCurrency"
        :get-type-text="getTypeText"
        :get-type-color="getTypeColor"
        :get-user-type-text="getUserTypeText"
        :get-user-type-color="getUserTypeColor"
        :get-status-text="getStatusText"
        :get-status-color="getStatusColor"
        @toggle-select-all="toggleSelectAll"
        @toggle-user-select="toggleUserSelect"
        @view-user="viewUser"
        @edit-user="editUser"
        @toggle-user-status="toggleUserStatus"
        @toggle-user-menu="toggleUserMenu"
        @reset-password="resetPassword"
        @adjust-balance="adjustBalance"
        @view-user-orders="viewUserOrders"
        @ban-user="banUser"
        @page-change="handlePageChange"
        @create-user="createUser"
      />
    </div>

    <!-- 用户详情/编辑模态框 -->
    <UserModal
      :is-open="isModalOpen"
      :mode="modalMode"
      :user="currentUser"
      :is-submitting="isSubmitting"
      :format-date-time="formatDateTime"
      @close="closeModal"
      @save="saveUser"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Plus } from 'lucide-vue-next'
import UserStats from './components/UserStats.vue'
import UserSearch from './components/UserSearch.vue'
import UserList from './components/UserList.vue'
import UserModal from './components/UserModal.vue'
import UserActions from './components/UserActions.vue'
import { useUserManagement } from './composables/useUserManagement'

// 使用 composable
const {
  // 状态
  isLoading,
  users,
  userStats,
  searchParams,
  currentPage,
  pageSize,
  totalUsers,
  totalPages,
  selectedUsers,
  selectAll,
  modalMode,
  isModalOpen,
  currentUser,
  isSubmitting,
  showUserMenu,
  
  // 计算属性
  filteredUsers,
  paginatedUsers,
  selectedCount,
  
  // 工具函数
  formatDateTime,
  formatDate,
  formatCurrency,
  getTypeText,
  getTypeColor,
  getUserTypeText,
  getUserTypeColor,
  getStatusText,
  getStatusColor,
  
  // 数据加载
  loadUsers,
  loadUserStats,
  
  // 搜索筛选
  handleSearch,
  handleStatusFilter,
  handleTypeFilter,
  handleUserTypeFilter,
  handleDateRangeFilter,
  clearFilters,
  
  // 分页
  handlePageChange,
  
  // 选择
  toggleSelectAll,
  toggleUserSelect,
  clearSelection,
  
  // 模态框
  viewUser,
  editUser,
  createUser,
  closeModal,
  
  // 用户操作
  saveUser,
  toggleUserStatus,
  deleteUser,
  
  // 批量操作
  batchActivate,
  batchDeactivate,
  batchDelete,
  batchExport,
  batchTypeChange,
  
  // 其他
  toggleUserMenu,
  resetPassword,
  adjustBalance,
  viewUserOrders,
  banUser
} = useUserManagement()

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadUsers(),
    loadUserStats()
  ])
})
</script>

<style scoped>
/* 页面特定样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .max-w-7xl {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* 加载状态样式 */
.loading-overlay {
  position: relative;
}

.loading-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 11;
}

/* 选择状态样式 */
.selected-row {
  background-color: #eff6ff;
}

/* 操作按钮样式 */
.action-button {
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* 状态标签样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 角色标签样式 */
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* 表格样式优化 */
.table-container {
  overflow-x: auto;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header {
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.table-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background-color: #f9fafb;
}

.table-cell {
  padding: 1rem;
  text-align: left;
  vertical-align: middle;
}

/* 移动端卡片样式 */
.mobile-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.2s ease;
}

.mobile-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* 分页样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.pagination-button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-state-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: #d1d5db;
}

/* 搜索框样式 */
.search-input {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 筛选器样式 */
.filter-select {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 统计卡片样式 */
.stats-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;
}

.stats-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stats-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.stats-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.stats-change {
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.stats-change.positive {
  color: #059669;
}

.stats-change.negative {
  color: #dc2626;
}
</style>