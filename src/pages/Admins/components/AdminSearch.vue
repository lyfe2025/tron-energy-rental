<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- 搜索框 -->
      <div class="flex-1 max-w-md">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="searchForm.search"
            type="text"
            placeholder="搜索用户名、邮箱..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @keyup.enter="handleSearch"
          />
        </div>
      </div>

      <!-- 筛选条件 -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- 状态筛选 -->
        <select
          v-model="searchForm.status"
          class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="inactive">停用</option>
        </select>

        <!-- 角色筛选 -->
        <select
          v-model="searchForm.role"
          class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部角色</option>
          <option value="super_admin">超级管理员</option>
          <option value="admin">管理员</option>
          <option value="operator">操作员</option>
        </select>

        <!-- 创建时间筛选 -->
        <select
                      v-model="searchForm.startDate"
          class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
        </select>

        <!-- 搜索按钮 -->
        <button
          @click="handleSearch"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Search :class="['h-4 w-4 mr-2', { 'animate-spin': loading }]" />
          搜索
        </button>

        <!-- 重置按钮 -->
        <button
          @click="handleReset"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RotateCcw class="h-4 w-4 mr-2" />
          重置
        </button>
      </div>
    </div>

    <!-- 高级搜索展开区域 -->
    <div v-if="showAdvanced" class="mt-4 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 创建时间范围 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">创建时间范围</label>
          <div class="flex items-center space-x-2">
            <input
              v-model="searchForm.startDate"
              type="date"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="text-gray-500">至</span>
            <input
              v-model="searchForm.endDate"
              type="date"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- 最后登录时间 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">最后登录</label>
          <select
            v-model="searchForm.lastLogin"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">不限</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="never">从未登录</option>
          </select>
        </div>

        <!-- 排序方式 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">排序方式</label>
          <select
            v-model="searchForm.sortBy"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at_desc">创建时间（新到旧）</option>
            <option value="created_at_asc">创建时间（旧到新）</option>
            <option value="username_asc">用户名（A-Z）</option>
            <option value="username_desc">用户名（Z-A）</option>
            <option value="last_login_desc">最后登录（新到旧）</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 高级搜索切换 -->
    <div class="mt-4 flex items-center justify-between">
      <button
        @click="showAdvanced = !showAdvanced"
        class="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        <ChevronDown :class="['h-4 w-4 mr-1 transition-transform', { 'rotate-180': showAdvanced }]" />
        {{ showAdvanced ? '收起' : '展开' }}高级搜索
      </button>

      <!-- 当前筛选条件提示 -->
      <div v-if="hasActiveFilters" class="flex items-center text-sm text-gray-600">
        <Filter class="h-4 w-4 mr-1" />
        已应用 {{ activeFiltersCount }} 个筛选条件
        <button
          @click="handleReset"
          class="ml-2 text-blue-600 hover:text-blue-800"
        >
          清除全部
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import type { AdminSearchParams } from '../types';

interface Props {
  loading?: boolean;
}

interface Emits {
  search: [query: AdminSearchParams];
  reset: [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

// 搜索表单
const searchForm = ref<AdminSearchParams>({
  search: '',
  status: '',
  role: '',
  startDate: '',
  endDate: '',
  lastLogin: '',
  sortBy: 'created_at_desc',
  sortOrder: 'desc',
  page: 1,
  limit: 10
});

// 高级搜索展开状态
const showAdvanced = ref(false);

// 是否有活跃的筛选条件
const hasActiveFilters = computed(() => {
  return !!(searchForm.value.search || 
           searchForm.value.status || 
           searchForm.value.role || 
           searchForm.value.startDate ||
           searchForm.value.endDate ||
           searchForm.value.lastLogin ||
           searchForm.value.sortBy !== 'created_at_desc');
});

// 活跃筛选条件数量
const activeFiltersCount = computed(() => {
  let count = 0;
  if (searchForm.value.search) count++;
  if (searchForm.value.status) count++;
  if (searchForm.value.role) count++;
  if (searchForm.value.startDate) count++;
  if (searchForm.value.startDate || searchForm.value.endDate) count++;
  if (searchForm.value.lastLogin) count++;
  if (searchForm.value.sortBy !== 'created_at_desc') count++;
  return count;
});

// 处理搜索
const handleSearch = () => {
  // 重置页码
  searchForm.value.page = 1;
  
  // 构建查询参数
  const query: AdminSearchParams = {
    ...searchForm.value
  };
  
  // 移除空值
  Object.keys(query).forEach(key => {
    if (query[key as keyof AdminSearchParams] === '' || query[key as keyof AdminSearchParams] === null) {
      delete query[key as keyof AdminSearchParams];
    }
  });
  
  emit('search', query);
};

// 处理重置
const handleReset = () => {
  searchForm.value = {
    search: '',
    status: '',
    role: '',
    startDate: '',
    endDate: '',
    lastLogin: '',
    sortBy: 'created_at_desc',
    page: 1,
    limit: 20
  };
  
  showAdvanced.value = false;
  emit('reset');
};

// 监听日期范围变化，自动设置具体日期
watch(() => searchForm.value.startDate, (newRange) => {
  if (!newRange) {
    searchForm.value.startDate = '';
    searchForm.value.endDate = '';
    return;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (newRange) {
    case 'today':
      searchForm.value.startDate = today.toISOString().split('T')[0];
      searchForm.value.endDate = today.toISOString().split('T')[0];
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      searchForm.value.startDate = weekStart.toISOString().split('T')[0];
      searchForm.value.endDate = today.toISOString().split('T')[0];
      break;
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      searchForm.value.startDate = monthStart.toISOString().split('T')[0];
      searchForm.value.endDate = today.toISOString().split('T')[0];
      break;
    case 'quarter':
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      searchForm.value.startDate = quarterStart.toISOString().split('T')[0];
      searchForm.value.endDate = today.toISOString().split('T')[0];
      break;
  }
});
</script>