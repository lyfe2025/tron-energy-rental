<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <div class="bg-white shadow">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 class="text-2xl font-bold text-gray-900">管理员管理</h1>
                <p class="mt-1 text-sm text-gray-500">管理系统管理员账户和权限</p>
              </div>
            </div>
        </div>
      </div>
    </div>

    <div class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- 网络状态和错误提示 -->
      <div v-if="!isOnline || hasError" class="mb-6">
        <!-- 网络状态提示 -->
        <div v-if="!isOnline" class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <div class="flex items-center">
            <WifiOff class="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <h3 class="text-sm font-medium text-yellow-800">网络连接异常</h3>
              <p class="text-sm text-yellow-700 mt-1">请检查网络设置，网络恢复后将自动重新加载数据</p>
            </div>
          </div>
        </div>
        
        <!-- 错误状态提示 -->
        <div v-if="hasError && isOnline" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <AlertCircle class="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 class="text-sm font-medium text-red-800">数据加载失败</h3>
                <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
              </div>
            </div>
            <button
              @click="refreshData"
              :disabled="refreshing"
              class="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': refreshing }" />
              重试
            </button>
          </div>
        </div>
      </div>
      
      <!-- 统计信息 -->
      <AdminStats class="mb-8" />

      <!-- 搜索筛选 -->
      <AdminSearch
        class="mb-6"
        @search="handleSearch"
        @reset="handleSearchReset"
      />

      <!-- 批量操作 -->
      <AdminActions
        class="mb-6"
        :selected-ids="selectedAdmins"
        @bulk-action="handleBulkAction"
        @create="showCreateModal"
        @clear-selection="clearSelection"
      />

      <!-- 管理员列表 -->
      <AdminList
        :admins="adminStore.admins.value"
        :loading="adminStore.loading.value"
        :selected-ids="selectedAdmins"
        @selection-change="handleSelectionChange"
        @view="showDetailModal"
        @edit="showEditModal"
        @permissions="showPermissionModal"
        @delete="handleDelete"
      />

      <!-- 分页 -->
      <div v-if="adminStore.admins.value.length > 0" class="mt-6">
        <Pagination
          :current-page="adminStore.pagination.value.page"
          :page-size="adminStore.pagination.value.limit"
          :total="adminStore.pagination.value.total"
          @page-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 管理员表单弹窗 -->
    <AdminForm
      v-model:visible="formModal.visible"
      :admin="formModal.admin"
      :loading="formModal.loading"
      @submit="handleFormSubmit"
      @close="closeFormModal"
    />

    <!-- 管理员详情弹窗 -->
    <AdminDetailModal
      v-model:visible="detailModal.visible"
      :admin-id="detailModal.adminId"
      @close="closeDetailModal"
      @edit="showEditModalFromDetail"
      @permission-config="showPermissionModalFromDetail"
    />

    <!-- 权限配置弹窗 -->
    <AdminPermissionModal
      v-model:visible="permissionModal.visible"
      :admin="permissionModal.admin"
      @close="closePermissionModal"
      @saved="handlePermissionSaved"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :type="confirmDialog.type"
      :loading="confirmDialog.loading"
      @confirm="confirmDialog.onConfirm"
      @cancel="closeConfirmDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RefreshCw, Plus, AlertCircle, Wifi, WifiOff } from 'lucide-vue-next';
import { useAdminStore } from './composables/useAdminStore';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';
import AdminStats from './components/AdminStats.vue';
import AdminSearch from './components/AdminSearch.vue';
import AdminActions from './components/AdminActions.vue';
import AdminList from './components/AdminList.vue';
import AdminForm from './components/AdminForm.vue';
import AdminDetailModal from './components/AdminDetailModal.vue';
import AdminPermissionModal from './components/AdminPermissionModal.vue';
import Pagination from '../../components/Pagination.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import type { Admin, AdminSearchParams, CreateAdminRequest, UpdateAdminRequest } from './types';

const adminStore = useAdminStore();
const authStore = useAuthStore();
const toast = useToast();

// 选中的管理员
const selectedAdmins = ref<string[]>([]);

// 刷新状态
const refreshing = ref(false);

// 网络状态
const isOnline = ref(navigator.onLine);
const retryCount = ref(0);
const maxRetries = 3;

// 错误状态
const hasError = computed(() => !!adminStore.error.value);
const errorMessage = computed(() => adminStore.error.value || '');

// 表单弹窗状态
const formModal = ref({
  visible: false,
  admin: null as Admin | null,
  loading: false
});

// 详情弹窗状态
const detailModal = ref({
  visible: false,
  adminId: null as string | null
});

// 权限配置弹窗状态
const permissionModal = ref({
  visible: false,
  admin: null as Admin | null
});

// 确认对话框状态
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  type: 'info' as 'info' | 'warning' | 'danger',
  loading: false,
  onConfirm: () => {}
});

// 网络状态监听
const setupNetworkListeners = () => {
  const handleOnline = () => {
    isOnline.value = true;
    toast.success('网络连接已恢复');
    if (hasError.value) {
      initData();
    }
  };
  
  const handleOffline = () => {
    isOnline.value = false;
    toast.warning('网络连接已断开，请检查网络设置');
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// 错误处理函数
const handleApiError = (error: any, operation: string) => {
  console.error(`${operation}失败:`, error);
  
  let errorMsg = `${operation}失败`;
  
  if (!isOnline.value) {
    errorMsg = '网络连接异常，请检查网络设置';
  } else if (error?.response?.status === 401) {
    errorMsg = '登录已过期，请重新登录';
    authStore.logout();
  } else if (error?.response?.status === 403) {
    errorMsg = '权限不足，无法执行此操作';
  } else if (error?.response?.status >= 500) {
    errorMsg = '服务器异常，请稍后重试';
  } else if (error?.response?.data?.message) {
    errorMsg = error.response.data.message;
  } else if (typeof error === 'string') {
    errorMsg = error;
  } else if (error?.message && typeof error.message === 'string') {
    errorMsg = error.message;
  } else if (error instanceof Error) {
    errorMsg = error.message;
  } else {
    // 处理其他类型的错误对象
    errorMsg = `${operation}失败，请稍后重试`;
  }
  
  toast.error(errorMsg);
  return errorMsg;
};

// 重试机制
const retryOperation = async (operation: () => Promise<void>, operationName: string) => {
  try {
    await operation();
    retryCount.value = 0;
  } catch (error) {
    if (retryCount.value < maxRetries && isOnline.value) {
      retryCount.value++;
      toast.warning(`${operationName}失败，正在重试 (${retryCount.value}/${maxRetries})`);
      setTimeout(() => retryOperation(operation, operationName), 1000 * retryCount.value);
    } else {
      handleApiError(error, operationName);
    }
  }
};

// 初始化数据
const initData = async () => {
  // 确保用户已认证
  if (!authStore.isAuthenticated) {
    toast.warning('用户未认证，请先登录');
    return;
  }
  
  if (!isOnline.value) {
    toast.error('网络连接异常，无法获取数据');
    return;
  }
  
  try {
    await Promise.all([
      adminStore.fetchAdmins(),
      adminStore.fetchStats()
    ]);
    
    if (adminStore.error.value) {
      handleApiError(adminStore.error.value, '获取管理员数据');
    } else {
      retryCount.value = 0;
    }
  } catch (error) {
    handleApiError(error, '获取管理员数据');
  }
};

// 刷新数据
const refreshData = async () => {
  refreshing.value = true;
  try {
    await retryOperation(initData, '刷新数据');
    toast.success('数据刷新成功');
  } catch (error) {
    handleApiError(error, '刷新数据');
  } finally {
    refreshing.value = false;
  }
};

// 处理搜索
const handleSearch = async (params: AdminSearchParams) => {
  try {
    await adminStore.fetchAdmins(params);
    if (adminStore.error.value) {
      handleApiError(adminStore.error.value, '搜索管理员');
    }
  } catch (error) {
    handleApiError(error, '搜索管理员');
  }
};

// 处理搜索重置
const handleSearchReset = async () => {
  try {
    await adminStore.fetchAdmins();
    if (adminStore.error.value) {
      handleApiError(adminStore.error.value, '重置搜索');
    }
  } catch (error) {
    handleApiError(error, '重置搜索');
  }
};

// 处理分页变化
const handlePageChange = async (page: number) => {
  try {
    await adminStore.fetchAdmins({ page });
    if (adminStore.error.value) {
      handleApiError(adminStore.error.value, '加载页面数据');
    }
  } catch (error) {
    handleApiError(error, '加载页面数据');
  }
};

// 处理选择变化
const handleSelectionChange = (selected: string[]) => {
  selectedAdmins.value = selected;
};

// 清除选择
const clearSelection = () => {
  selectedAdmins.value = [];
};

// 显示创建弹窗
const showCreateModal = () => {
  formModal.value = {
    visible: true,
    admin: null,
    loading: false
  };
};

// 显示编辑弹窗
const showEditModal = (admin: Admin) => {
  formModal.value = {
    visible: true,
    admin,
    loading: false
  };
};

// 从详情弹窗显示编辑弹窗
const showEditModalFromDetail = (admin: Admin) => {
  detailModal.value.visible = false;
  showEditModal(admin);
};

// 关闭表单弹窗
const closeFormModal = () => {
  formModal.value = {
    visible: false,
    admin: null,
    loading: false
  };
};

// 处理表单提交
const handleFormSubmit = async (data: CreateAdminRequest | UpdateAdminRequest) => {
  formModal.value.loading = true;
  
  try {
    const isEdit = !!formModal.value.admin;
    const operation = isEdit ? '更新管理员' : '创建管理员';
    
    if (isEdit) {
      await adminStore.updateAdmin(formModal.value.admin!.id, data as UpdateAdminRequest);
    } else {
      await adminStore.createAdmin(data as CreateAdminRequest);
    }
    
    if (adminStore.error.value) {
      handleApiError(new Error(adminStore.error.value), operation);
      return;
    }
    
    toast.success(isEdit ? '管理员更新成功' : '管理员创建成功');
    closeFormModal();
    
    // 刷新数据
    await Promise.all([
      adminStore.fetchAdmins(),
      adminStore.fetchStats()
    ]);
  } catch (error) {
    const operation = formModal.value.admin ? '更新管理员' : '创建管理员';
    handleApiError(error, operation);
  } finally {
    formModal.value.loading = false;
  }
};

// 显示详情弹窗
const showDetailModal = (admin: Admin) => {
  detailModal.value = {
    visible: true,
    adminId: admin.id
  };
};

// 关闭详情弹窗
const closeDetailModal = () => {
  detailModal.value = {
    visible: false,
    adminId: null
  };
};

// 显示权限配置弹窗
const showPermissionModal = (admin: Admin) => {
  permissionModal.value = {
    visible: true,
    admin
  };
};

// 从详情弹窗显示权限配置弹窗
const showPermissionModalFromDetail = (admin: Admin) => {
  detailModal.value.visible = false;
  showPermissionModal(admin);
};

// 关闭权限配置弹窗
const closePermissionModal = () => {
  permissionModal.value = {
    visible: false,
    admin: null
  };
};

// 处理权限保存
const handlePermissionSaved = async () => {
  try {
    toast.success('权限配置保存成功');
    closePermissionModal();
    await adminStore.fetchAdmins();
    
    if (adminStore.error.value) {
      handleApiError(new Error(adminStore.error.value), '刷新管理员数据');
    }
  } catch (error) {
    handleApiError(error, '刷新管理员数据');
  }
};

// 处理删除
const handleDelete = (admin: Admin) => {
  confirmDialog.value = {
    visible: true,
    title: '确认删除',
    message: `确定要删除管理员 "${admin.username}" 吗？此操作不可撤销。`,
    type: 'danger',
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true;
      try {
        await adminStore.deleteAdmin(admin.id);
        
        if (adminStore.error.value) {
          handleApiError(new Error(adminStore.error.value), '删除管理员');
          return;
        }
        
        toast.success(`管理员 "${admin.username}" 删除成功`);
        
        await Promise.all([
          adminStore.fetchAdmins(),
          adminStore.fetchStats()
        ]);
        
        closeConfirmDialog();
      } catch (error) {
        handleApiError(error, '删除管理员');
      } finally {
        confirmDialog.value.loading = false;
      }
    }
  };
};

// 处理批量操作
const handleBulkAction = async (action: string, adminIds: string[]) => {
  const actionMap: Record<string, { title: string; message: string; type: 'info' | 'warning' | 'danger' }> = {
    enable: {
      title: '批量启用',
      message: `确定要启用选中的 ${adminIds.length} 个管理员吗？`,
      type: 'info'
    },
    disable: {
      title: '批量停用',
      message: `确定要停用选中的 ${adminIds.length} 个管理员吗？`,
      type: 'warning'
    },
    delete: {
      title: '批量删除',
      message: `确定要删除选中的 ${adminIds.length} 个管理员吗？此操作不可撤销。`,
      type: 'danger'
    }
  };
  
  const config = actionMap[action];
  if (!config) return;
  
  confirmDialog.value = {
    visible: true,
    title: config.title,
    message: config.message,
    type: config.type,
    loading: false,
    onConfirm: async () => {
      confirmDialog.value.loading = true;
      try {
        await adminStore.bulkAction(action, adminIds);
        
        if (adminStore.error.value) {
          handleApiError(new Error(adminStore.error.value), config.title);
          return;
        }
        
        const actionMessages: Record<string, string> = {
          enable: `成功启用 ${adminIds.length} 个管理员`,
          disable: `成功停用 ${adminIds.length} 个管理员`,
          delete: `成功删除 ${adminIds.length} 个管理员`
        };
        
        toast.success(actionMessages[action] || '批量操作完成');
        
        await Promise.all([
          adminStore.fetchAdmins(),
          adminStore.fetchStats()
        ]);
        
        clearSelection();
        closeConfirmDialog();
      } catch (error) {
        handleApiError(error, config.title);
      } finally {
        confirmDialog.value.loading = false;
      }
    }
  };
};

// 关闭确认对话框
const closeConfirmDialog = () => {
  confirmDialog.value = {
    visible: false,
    title: '',
    message: '',
    type: 'info',
    loading: false,
    onConfirm: () => {}
  };
};

// 组件挂载时初始化数据
onMounted(async () => {
  // 设置网络状态监听
  const cleanupNetworkListeners = setupNetworkListeners();
  
  // 初始化认证状态
  await authStore.initializeAuth();
  
  // 获取管理员数据
  await initData();
  
  // 组件卸载时清理监听器
  return cleanupNetworkListeners;
});
</script>