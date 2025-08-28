<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="handleBackdropClick"
  >
    <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">
          管理员详情
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="py-8">
        <div class="text-center">
          <AlertCircle class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="loadAdminDetail"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>

      <!-- 详情内容 -->
      <div v-else-if="adminDetail" class="mt-6">
        <!-- 基本信息 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-medium text-gray-900">基本信息</h4>
            <div class="flex space-x-2">
              <button
                @click="handleEdit"
                class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit class="h-4 w-4 mr-1" />
                编辑
              </button>
              <button
                @click="handlePermissionConfig"
                class="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Shield class="h-4 w-4 mr-1" />
                权限配置
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-500">用户名</label>
              <p class="mt-1 text-sm text-gray-900">{{ adminDetail.username }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">邮箱</label>
              <p class="mt-1 text-sm text-gray-900">{{ adminDetail.email }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">角色</label>
              <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getRoleClass(adminDetail.role)">
                {{ getRoleLabel(adminDetail.role) }}
              </span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">状态</label>
              <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusClass(adminDetail.status)">
                {{ getStatusLabel(adminDetail.status) }}
              </span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">创建时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(adminDetail.created_at) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-500">最后登录</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ adminDetail.last_login ? formatDate(adminDetail.last_login) : '从未登录' }}
              </p>
            </div>
          </div>
          
          <div v-if="adminDetail.notes" class="mt-6">
            <label class="block text-sm font-medium text-gray-500">备注</label>
            <p class="mt-1 text-sm text-gray-900">{{ adminDetail.notes }}</p>
          </div>
        </div>

        <!-- 权限信息 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-medium text-gray-900">权限信息</h4>
            <span class="text-sm text-gray-500">
              共 {{ adminDetail.permissions?.length || 0 }} 项权限
            </span>
          </div>
          
          <div v-if="adminDetail.permissions && adminDetail.permissions.length > 0" class="space-y-4">
            <div
              v-for="(group, groupName) in groupedPermissions"
              :key="groupName"
              class="border border-gray-100 rounded-lg p-4"
            >
              <h5 class="text-sm font-medium text-gray-900 mb-2">
                {{ getGroupDisplayName(groupName) }}
                <span class="text-gray-500">({{ group.length }})</span>
              </h5>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="permission in group"
                  :key="permission.id"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {{ permission.name }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <Shield class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">暂无权限配置</p>
          </div>
        </div>

        <!-- 操作日志 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-medium text-gray-900">最近操作日志</h4>
            <button
              @click="loadOperationLogs"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              查看更多
            </button>
          </div>
          
          <div v-if="operationLogs.length > 0" class="space-y-3">
            <div
              v-for="log in operationLogs.slice(0, 5)"
              :key="log.id"
              class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <div class="flex-1">
                <p class="text-sm text-gray-900">{{ log.action }}</p>
                <p class="text-xs text-gray-500">{{ log.details }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">{{ formatDate(log.created_at) }}</p>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="getLogStatusClass(log.status)">
                  {{ log.status === 'success' ? '成功' : '失败' }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <FileText class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">暂无操作日志</p>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="mt-8 flex items-center justify-end space-x-3">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, AlertCircle, Edit, Shield, FileText } from 'lucide-vue-next';
import type { Admin, AdminPermission } from '../types';
import { useAdminStore } from '../composables/useAdminStore';

interface Props {
  visible: boolean;
  adminId?: string | null;
}

interface Emits {
  'update:visible': [visible: boolean];
  close: [];
  edit: [admin: Admin];
  'permission-config': [admin: Admin];
}

interface OperationLog {
  id: string;
  action: string;
  details: string;
  status: 'success' | 'failed';
  created_at: string;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const adminStore = useAdminStore();

// 状态
const loading = ref(false);
const error = ref('');
const adminDetail = ref<Admin | null>(null);
const operationLogs = ref<OperationLog[]>([]);

// 权限分组
const groupedPermissions = computed(() => {
  if (!adminDetail.value?.permissions) return {};
  
  const groups: Record<string, AdminPermission[]> = {};
  
  adminDetail.value.permissions.forEach(permission => {
    const group = permission.resource || 'other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(permission);
  });
  
  return groups;
});

// 获取分组显示名称
const getGroupDisplayName = (groupName: string): string => {
  const groupNames: Record<string, string> = {
    users: '用户管理',
    agents: '代理商管理',
    admins: '管理员管理',
    orders: '订单管理',
    pricing: '价格配置',
    bots: '机器人管理',
    energy: '能量管理',
    statistics: '统计分析',
    system: '系统设置',
    other: '其他权限'
  };
  
  return groupNames[groupName] || groupName;
};

// 获取角色样式
const getRoleClass = (role: string): string => {
  const classes: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    operator: 'bg-green-100 text-green-800'
  };
  return classes[role] || 'bg-gray-100 text-gray-800';
};

// 获取角色标签
const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    operator: '操作员'
  };
  return labels[role] || role;
};

// 获取状态样式
const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

// 获取状态标签
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: '活跃',
    inactive: '停用'
  };
  return labels[status] || status;
};

// 获取日志状态样式
const getLogStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 加载管理员详情
const loadAdminDetail = async () => {
  if (!props.adminId) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    await adminStore.fetchAdminDetail(props.adminId);
    adminDetail.value = adminStore.currentAdmin.value;
    
    // 加载操作日志（模拟数据）
    operationLogs.value = [
      {
        id: '1',
        action: '登录系统',
        details: '从 IP: 192.168.1.100 登录',
        status: 'success',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: '2',
        action: '修改用户信息',
        details: '修改用户 user123 的状态',
        status: 'success',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: '3',
        action: '创建代理商',
        details: '创建代理商账户 agent456',
        status: 'success',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
      },
      {
        id: '4',
        action: '删除订单',
        details: '尝试删除订单 #12345',
        status: 'failed',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
      }
    ];
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载管理员详情失败';
  } finally {
    loading.value = false;
  }
};

// 加载操作日志
const loadOperationLogs = () => {
  // 这里可以跳转到专门的日志页面或打开日志弹窗
  console.log('加载更多操作日志');
};

// 处理编辑
const handleEdit = () => {
  if (adminDetail.value) {
    emit('edit', adminDetail.value);
  }
};

// 处理权限配置
const handlePermissionConfig = () => {
  if (adminDetail.value) {
    emit('permission-config', adminDetail.value);
  }
};

// 处理关闭
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

// 处理背景点击
const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.adminId) {
    loadAdminDetail();
  }
});

// 监听管理员ID变化
watch(() => props.adminId, (adminId) => {
  if (adminId && props.visible) {
    loadAdminDetail();
  }
});
</script>