<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <!-- 调试信息 -->
    <div class="bg-yellow-100 p-2 text-sm mb-4">
      🔍 AdminActions 组件已渲染 - 选中数量: {{ selectedCount }}
    </div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- 左侧：选择信息和批量操作 -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <!-- 选择信息 -->
        <div class="flex items-center text-sm text-gray-600">
          <span v-if="selectedCount === 0">未选择任何管理员</span>
          <span v-else class="font-medium">
            已选择 {{ selectedCount }} 个管理员
            <button
              @click="$emit('clearSelection')"
              class="ml-2 text-blue-600 hover:text-blue-800"
            >
              清除选择
            </button>
          </span>
        </div>

        <!-- 批量操作按钮 -->
        <div v-if="selectedCount > 0" class="flex flex-wrap items-center gap-2">
          <button
            @click="handleBatchEnable"
            :disabled="loading"
            class="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <UserCheck class="h-4 w-4 mr-1" />
            批量启用
          </button>
          
          <button
            @click="handleBatchDisable"
            :disabled="loading"
            class="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <UserX class="h-4 w-4 mr-1" />
            批量停用
          </button>
          
          <button
            @click="handleBatchPermissions"
            :disabled="loading"
            class="inline-flex items-center px-3 py-1.5 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <Shield class="h-4 w-4 mr-1" />
            批量权限配置
          </button>
          
          <button
            @click="handleExportSelected"
            :disabled="loading"
            class="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Download class="h-4 w-4 mr-1" />
            导出选中
          </button>
          
          <button
            @click="handleBatchDelete"
            :disabled="loading"
            class="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Trash2 class="h-4 w-4 mr-1" />
            批量删除
          </button>
        </div>
      </div>

      <!-- 右侧：新建按钮和其他操作 -->
      <div class="flex items-center gap-2">
        <button
          @click="handleExportAll"
          class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Download class="h-4 w-4 mr-2" />
          导出全部
        </button>
        
        <!-- 临时测试按钮 -->
        <button
          @click="testCreate"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus class="h-4 w-4 mr-2" />
          测试新建管理员
        </button>
        
        <button
          v-if="canCreateAdmin"
          @click="$emit('create')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus class="h-4 w-4 mr-2" />
          新建管理员
        </button>
      </div>
    </div>
  </div>

  <!-- 确认对话框 -->
  <ConfirmDialog
    v-model:visible="confirmDialog.visible"
    :title="confirmDialog.title"
    :message="confirmDialog.message"
    :type="confirmDialog.type"
    :loading="confirmDialog.loading"
    @confirm="confirmDialog.onConfirm"
    @cancel="confirmDialog.onCancel"
  />
</template>

<script setup lang="ts">
import { Download, Plus, Shield, Trash2, UserCheck, UserX } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import { useAuthStore } from '../../../stores/auth';

interface Props {
  selectedIds: string[];
  loading?: boolean;
}

interface Emits {
  create: [];
  clearSelection: [];
  batchEnable: [ids: string[]];
  batchDisable: [ids: string[]];
  batchPermissions: [ids: string[]];
  batchDelete: [ids: string[]];
  exportSelected: [ids: string[]];
  exportAll: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 权限检查
const authStore = useAuthStore();
const canCreateAdmin = computed(() => {
  const isSuperAdmin = authStore.isSuperAdmin;
  const isAdmin = authStore.isAdmin;
  const user = authStore.user;
  
  // 调试信息
  console.log('🔍 AdminActions 权限检查:', {
    isSuperAdmin,
    isAdmin,
    user,
    canCreate: isSuperAdmin || isAdmin
  });
  
  return isSuperAdmin || isAdmin;
});

// 选中数量
const selectedCount = computed(() => props.selectedIds.length);

// 测试方法
const testCreate = () => {
  console.log('🔍 测试按钮被点击了！');
  alert('测试按钮被点击了！');
  emit('create');
};

// 确认对话框状态
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  type: 'info' as 'info' | 'warning' | 'danger',
  loading: false,
  onConfirm: () => {},
  onCancel: () => {
    confirmDialog.value.visible = false;
  }
});

// 批量启用
const handleBatchEnable = () => {
  confirmDialog.value = {
    visible: true,
    title: '批量启用管理员',
    message: `确定要启用选中的 ${selectedCount.value} 个管理员吗？`,
    type: 'info',
    loading: false,
    onConfirm: () => {
      confirmDialog.value.loading = true;
      emit('batchEnable', props.selectedIds);
      confirmDialog.value.visible = false;
      confirmDialog.value.loading = false;
    },
    onCancel: () => {
      confirmDialog.value.visible = false;
    }
  };
};

// 批量停用
const handleBatchDisable = () => {
  confirmDialog.value = {
    visible: true,
    title: '批量停用管理员',
    message: `确定要停用选中的 ${selectedCount.value} 个管理员吗？停用后这些管理员将无法登录系统。`,
    type: 'warning',
    loading: false,
    onConfirm: () => {
      confirmDialog.value.loading = true;
      emit('batchDisable', props.selectedIds);
      confirmDialog.value.visible = false;
      confirmDialog.value.loading = false;
    },
    onCancel: () => {
      confirmDialog.value.visible = false;
    }
  };
};

// 批量权限配置
const handleBatchPermissions = () => {
  emit('batchPermissions', props.selectedIds);
};

// 批量删除
const handleBatchDelete = () => {
  confirmDialog.value = {
    visible: true,
    title: '批量删除管理员',
    message: `确定要删除选中的 ${selectedCount.value} 个管理员吗？此操作不可撤销，请谨慎操作。`,
    type: 'danger',
    loading: false,
    onConfirm: () => {
      confirmDialog.value.loading = true;
      emit('batchDelete', props.selectedIds);
      confirmDialog.value.visible = false;
      confirmDialog.value.loading = false;
    },
    onCancel: () => {
      confirmDialog.value.visible = false;
    }
  };
};

// 导出选中
const handleExportSelected = () => {
  emit('exportSelected', props.selectedIds);
};

// 导出全部
const handleExportAll = () => {
  emit('exportAll');
};
</script>