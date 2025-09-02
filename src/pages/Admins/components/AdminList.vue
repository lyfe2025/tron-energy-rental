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
              部门
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              岗位
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
            
            <!-- 部门 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ admin.department_name || '-' }}
            </td>
            
            <!-- 岗位 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ admin.position_name || '-' }}
            </td>
            
            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                @click="$emit('toggle-status', admin)"
                :class="getStatusClass(admin.status)"
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                :title="`点击${admin.status === 'active' ? '停用' : '启用'}管理员`"
              >
                {{ getStatusLabel(admin.status) }}
              </button>
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
                  @click="$emit('assign-role', admin)"
                  class="text-orange-600 hover:text-orange-900"
                  title="分配角色"
                >
                  <UserPlus class="h-4 w-4" />
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
                  <button
                    @click="$emit('toggle-status', admin)"
                    :class="getStatusClass(admin.status)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    :title="`点击${admin.status === 'active' ? '停用' : '启用'}管理员`"
                  >
                    {{ getStatusLabel(admin.status) }}
                  </button>
                </div>
                
                <div class="mt-2 text-xs text-gray-500">
                  <p v-if="admin.department_name">部门: {{ admin.department_name }}</p>
                  <p v-if="admin.position_name">岗位: {{ admin.position_name }}</p>
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
                @click="$emit('assign-role', admin)"
                class="p-2 text-orange-600 hover:bg-orange-50 rounded"
                title="分配角色"
              >
                <UserPlus class="h-4 w-4" />
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

    <!-- 分页组件 -->
    <div v-if="pagination && pagination.totalPages > 1" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          显示第 {{ (pagination.page - 1) * pagination.limit + 1 }} 到 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 条，
          共 {{ pagination.total }} 条记录
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- 上一页 -->
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          
          <!-- 页码 -->
          <div class="flex items-center space-x-1">
            <template v-for="page in getVisiblePages()" :key="page">
              <button
                v-if="typeof page === 'number'"
                @click="handlePageChange(page)"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-md',
                  page === pagination.page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
              <span v-else class="px-2 py-2 text-gray-500">...</span>
            </template>
          </div>
          
          <!-- 下一页 -->
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Edit, Eye, Shield, Trash2, User, UserPlus } from 'lucide-vue-next';
import { computed } from 'vue';
import type { Admin, AdminPagination } from '../types';
import { ADMIN_ROLE_LABELS, ADMIN_STATUS_LABELS } from '../types';

interface Props {
  admins: Admin[];
  selectedIds: string[];
  loading?: boolean;
  pagination?: AdminPagination;
}

interface Emits {
  'selection-change': [ids: string[]];
  'page-change': [page: number];
  view: [admin: Admin];
  edit: [admin: Admin];
  permissions: [admin: Admin];
  'assign-role': [admin: Admin];
  delete: [admin: Admin];
  'toggle-status': [admin: Admin];
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

// 获取分页页码
const getVisiblePages = () => {
  const pages: (number | string)[] = [];
  const totalPages = props.pagination?.totalPages || 0;
  const currentPage = props.pagination?.page || 1;

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push('...');
    }
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
  }
  return pages;
};

// 处理分页变化
const handlePageChange = (page: number) => {
  emit('page-change', page);
};
</script>