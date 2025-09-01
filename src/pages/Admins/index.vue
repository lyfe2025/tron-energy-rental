<!--
管理员页面主文件 - 安全分离后的简化版本
整合分离的组件和逻辑，保持原有功能不变
-->

<template>
  <Layout>
    <!-- 页面头部 -->
    <AdminPageHeader />
    
    <!-- 网络状态和错误提示 -->
    <AdminNetworkStatus
      :is-online="isOnline"
      :has-error="hasError"
      :error-message="errorMessage"
      :refreshing="refreshing"
      @refresh="refreshData"
    />
    
    <!-- 主内容区域 -->
    <div class="px-4 sm:px-6 lg:px-8 py-6">
      <!-- 统计卡片 -->
      <div v-if="adminStore.stats" class="mb-8">
        <StatCard
          v-for="(card, index) in statCards"
          :key="index"
          v-bind="card"
          class="mb-4"
        />
      </div>
      
      <!-- 管理员组件 -->
      <div class="bg-white shadow rounded-lg">
        <!-- 工具栏：搜索、筛选、批量操作 -->
        <AdminToolbar
          :selected-count="selectedAdmins.length"
          @search="handleSearch"
          @reset="handleSearchReset"
          @create="showCreateModal"
          @bulk-action="handleBulkAction"
          @clear-selection="clearSelection"
        />
        
        <!-- 管理员表格 -->
        <AdminTable
          :loading="adminStore.loading"
          :admins="adminStore.admins"
          :pagination="adminStore.pagination"
          :selected="selectedAdmins"
          @selection-change="handleSelectionChange"
          @page-change="handlePageChange"
          @view="showDetailModal"
          @edit="showEditModal"
          @delete="handleDelete"
          @toggle-status="handleToggleStatus"
          @manage-permissions="showPermissionModal"
        />
      </div>
    </div>
    
    <!-- 表单弹窗 -->
    <AdminForm
      v-if="formModal.visible"
      :visible="formModal.visible"
      :admin="formModal.admin"
      :loading="formModal.loading"
      @close="closeFormModal"
      @submit="handleFormSubmit"
    />
    
    <!-- 详情弹窗 -->
    <AdminDetailModal
      v-if="detailModal.visible"
      :visible="detailModal.visible"
      :admin-id="detailModal.adminId!"
      @close="closeDetailModal"
      @edit="showEditModalFromDetail"
      @delete="handleDelete"
      @manage-permissions="showPermissionModalFromDetail"
    />
    
    <!-- 权限配置弹窗 -->
    <PermissionDialog
      v-if="permissionModal.visible"
      :visible="permissionModal.visible"
      :admin="permissionModal.admin"
      @close="closePermissionModal"
      @saved="handlePermissionSaved"
    />
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="confirmDialog.visible"
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.onConfirm"
      @cancel="closeConfirmDialog"
    />
  </Layout>
</template>

<script setup lang="ts">
import { Shield, UserCheck, Users, UserX } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted } from 'vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import Layout from '../../components/Layout.vue'
import StatCard from '../../components/StatCard.vue'
import AdminDetailModal from './components/AdminDetailModal.vue'
import AdminForm from './components/AdminForm.vue'
import AdminNetworkStatus from './components/AdminNetworkStatus.vue'
import AdminPageHeader from './components/AdminPageHeader.vue'
import AdminTable from './components/AdminTable.vue'
import AdminToolbar from './components/AdminToolbar.vue'
import PermissionDialog from './components/PermissionDialog.vue'
import { useAdminPage } from './composables/useAdminPage'
import { useAdminStore } from './composables/useAdminStore'

// Store
const adminStore = useAdminStore()

// 页面逻辑
const pageLogic = useAdminPage()

// 解构页面逻辑
const {
  selectedAdmins,
  refreshing,
  isOnline,
  hasError,
  errorMessage,
  formModal,
  detailModal,
  permissionModal,
  confirmDialog,
  setupNetworkListeners,
  initData,
  refreshData,
  handleSearch,
  handleSearchReset,
  handlePageChange,
  handleSelectionChange,
  clearSelection,
  showCreateModal,
  showEditModal,
  showEditModalFromDetail,
  closeFormModal,
  handleFormSubmit,
  showDetailModal,
  closeDetailModal,
  showPermissionModal,
  showPermissionModalFromDetail,
  closePermissionModal,
  handlePermissionSaved,
  handleDelete,
  handleBulkAction,
  closeConfirmDialog
} = pageLogic

// 统计卡片计算属性
const statCards = computed(() => {
  if (!adminStore.stats.value) return []
  
  const stats = adminStore.stats.value
  
  return [
    {
      label: '总管理员',
      value: stats.total,
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: '活跃用户',
      value: stats.active,
      icon: UserCheck,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      label: '停用用户',
      value: stats.inactive,
      icon: UserX,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    {
      label: '超级管理员',
      value: stats.by_role?.super_admin || 0,
      icon: Shield,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    }
  ]
})

// 处理状态切换
const handleToggleStatus = async (admin: any) => {
  const newStatus = admin.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '停用'
  
  confirmDialog.value = {
    visible: true,
    title: `确认${action}`,
    message: `确定要${action}管理员 "${admin.username}" 吗？`,
    type: newStatus === 'active' ? 'info' : 'warning',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true
      try {
        await adminStore.updateAdmin(admin.id, { status: newStatus })
        
        if (adminStore.error.value) {
          throw new Error(adminStore.error.value)
        }
        
        // 刷新数据
        await Promise.all([
          adminStore.fetchAdmins(),
          adminStore.fetchStats()
        ])
        
        closeConfirmDialog()
      } catch (error: any) {
        console.error(`${action}管理员失败:`, error)
      } finally {
        confirmDialog.value.loading = false
      }
    }
  }
}

// 生命周期
onMounted(async () => {
  const cleanupNetwork = setupNetworkListeners()
  await initData()
  
  onUnmounted(() => {
    cleanupNetwork()
  })
})
</script>

<style scoped>
/* 保持原有的样式，如果有的话 */
</style>