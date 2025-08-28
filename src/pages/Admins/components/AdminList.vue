<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- 桌面端表格视图 -->
    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              管理员信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              角色
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最后登录
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
          <tr v-for="admin in admins" :key="admin.id" class="hover:bg-gray-50">
            <!-- 选择框 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <input
                type="checkbox"
                :checked="selectedIds.includes(admin.id)"
                @change="toggleSelect(admin.id)"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </td>
            
            <!-- 管理员信息 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User class="h-5 w-5 text-gray-600" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ admin.username }}</div>
                  <div class="text-sm text-gray-500">{{ admin.email }}</div>
                </div>
              </div>
            </td>
            
            <!-- 角色 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getRoleClass(admin.role)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                {{ getRoleLabel(admin.role) }}
              </span>
            </td>
            
            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(admin.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                {{ getStatusLabel(admin.status) }}
              </span>
            </td>
            
            <!-- 最后登录 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatLastLogin(admin.last_login) }}
            </td>
            
            <!-- 创建时间 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(admin.created_at) }}
            </td>
            
            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex items-center justify-end space-x-2">
                <button
                  @click="$emit('view', admin)"
                  class="text-blue-600 hover:text-blue-900"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('edit', admin)"
                  class="text-green-600 hover:text-green-900"
                  title="编辑"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('permissions', admin)"
                  class="text-purple-600 hover:text-purple-900"
                  title="权限配置"
                >
                  <Shield class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('delete', admin)"
                  class="text-red-600 hover:text-red-900"
                  title="删除"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端卡片视图 -->
    <div class="md:hidden">
      <div class="p-4 border-b border-gray-200">
        <label class="flex items-center">
          <input
            type="checkbox"
            :checked="isAllSelected"
            @change="toggleSelectAll"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span class="ml-2 text-sm text-gray-600">全选</span>
        </label>
      </div>
      
      <div class="divide-y divide-gray-200">
        <div v-for="admin in admins" :key="admin.id" class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3 flex-1">
              <input
                type="checkbox"
                :checked="selectedIds.includes(admin.id)"
                @change="toggleSelect(admin.id)"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User class="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ admin.username }}</p>
                    <p class="text-xs text-gray-500">{{ admin.email }}</p>
                  </div>
                </div>
                
                <div class="mt-2 flex flex-wrap gap-2">
                  <span :class="getRoleClass(admin.role)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                    {{ getRoleLabel(admin.role) }}
                  </span>
                  <span :class="getStatusClass(admin.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                    {{ getStatusLabel(admin.status) }}
                  </span>
                </div>
                
                <div class="mt-2 text-xs text-gray-500">
                  <p>最后登录: {{ formatLastLogin(admin.last_login) }}</p>
                  <p>创建时间: {{ formatDate(admin.created_at) }}</p>
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex items-center space-x-1 ml-2">
              <button
                @click="$emit('view', admin)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                title="查看详情"
              >
                <Eye class="h-4 w-4" />
              </button>
              <button
                @click="$emit('edit', admin)"
                class="p-2 text-green-600 hover:bg-green-50 rounded"
                title="编辑"
              >
                <Edit class="h-4 w-4" />
              </button>
              <button
                @click="$emit('permissions', admin)"
                class="p-2 text-purple-600 hover:bg-purple-50 rounded"
                title="权限配置"
              >
                <Shield class="h-4 w-4" />
              </button>
              <button
                @click="$emit('delete', admin)"
                class="p-2 text-red-600 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="admins.length === 0" class="text-center py-12">
      <User class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">暂无管理员</h3>
      <p class="mt-1 text-sm text-gray-500">开始创建第一个管理员账户</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { User, Eye, Edit, Shield, Trash2 } from 'lucide-vue-next';
import type { Admin } from '../types';
import { ADMIN_STATUS_LABELS, ADMIN_ROLE_LABELS } from '../types';

interface Props {
  admins: Admin[];
  selectedIds: string[];
  loading?: boolean;
}

interface Emits {
  'selection-change': [ids: string[]];
  view: [admin: Admin];
  edit: [admin: Admin];
  permissions: [admin: Admin];
  delete: [admin: Admin];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 是否全选
const isAllSelected = computed(() => {
  return props.admins.length > 0 && props.selectedIds.length === props.admins.length;
});

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    emit('selection-change', []);
  } else {
    emit('selection-change', props.admins.map(admin => admin.id));
  }
};

// 切换单个选择
const toggleSelect = (id: string) => {
  const newSelectedIds = props.selectedIds.includes(id)
    ? props.selectedIds.filter(selectedId => selectedId !== id)
    : [...props.selectedIds, id];
  emit('selection-change', newSelectedIds);
};

// 获取状态样式
const getStatusClass = (status: string) => {
  const classes = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800'
  };
  return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
};

// 获取状态标签
const getStatusLabel = (status: string) => {
  return ADMIN_STATUS_LABELS[status as keyof typeof ADMIN_STATUS_LABELS] || status;
};

// 获取角色样式
const getRoleClass = (role: string) => {
  const classes = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    operator: 'bg-orange-100 text-orange-800',
    customer_service: 'bg-green-100 text-green-800'
  };
  return classes[role as keyof typeof classes] || 'bg-gray-100 text-gray-800';
};

// 获取角色标签
const getRoleLabel = (role: string) => {
  return ADMIN_ROLE_LABELS[role as keyof typeof ADMIN_ROLE_LABELS] || role;
};

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化最后登录时间
const formatLastLogin = (dateString: string | null) => {
  if (!dateString) return '从未登录';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(dateString);
  }
};
</script>