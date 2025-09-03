<template>
  <div>
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- 搜索框 -->
      <div class="flex-1 max-w-md">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索代理商编号、用户名或邮箱..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- 筛选器 -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- 状态筛选 -->
        <div class="relative">
          <select
            v-model="selectedStatus"
            class="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="handleFilter"
          >
            <option value="">全部状态</option>
            <option
              v-for="status in statusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </option>
          </select>
          <ChevronDown class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        <!-- 佣金率筛选 -->
        <div class="relative">
          <select
            v-model="selectedCommissionRange"
            class="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="handleFilter"
          >
            <option value="">全部佣金率</option>
            <option value="0-5">0% - 5%</option>
            <option value="5-10">5% - 10%</option>
            <option value="10-15">10% - 15%</option>
            <option value="15+">15% 以上</option>
          </select>
          <ChevronDown class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        <!-- 排序 -->
        <div class="relative">
          <select
            v-model="selectedSort"
            class="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="handleFilter"
          >
            <option value="created_at_desc">最新注册</option>
            <option value="created_at_asc">最早注册</option>
            <option value="total_earnings_desc">收益最高</option>
            <option value="total_earnings_asc">收益最低</option>
            <option value="total_orders_desc">订单最多</option>
            <option value="commission_rate_desc">佣金率最高</option>
          </select>
          <ChevronDown class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        <!-- 重置按钮 -->
        <button
          @click="handleReset"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw class="w-4 h-4 mr-2 inline" />
          重置
        </button>

        <!-- 导出按钮 -->
        <button
          @click="handleExport"
          :disabled="exporting"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download class="w-4 h-4 mr-2 inline" />
          {{ exporting ? '导出中...' : '导出' }}
        </button>
      </div>
    </div>

    <!-- 活动筛选标签 -->
    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
      <span class="text-sm text-gray-600">活动筛选:</span>
      
      <span
        v-if="selectedStatus"
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
      >
        状态: {{ getStatusLabel(selectedStatus) }}
        <button @click="selectedStatus = ''; handleFilter()" class="ml-2 hover:text-blue-600">
          <X class="w-3 h-3" />
        </button>
      </span>
      
      <span
        v-if="selectedCommissionRange"
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
      >
        佣金率: {{ selectedCommissionRange }}%
        <button @click="selectedCommissionRange = ''; handleFilter()" class="ml-2 hover:text-green-600">
          <X class="w-3 h-3" />
        </button>
      </span>
      
      <span
        v-if="searchQuery"
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
      >
        搜索: {{ searchQuery }}
        <button @click="searchQuery = ''; handleSearch()" class="ml-2 hover:text-purple-600">
          <X class="w-3 h-3" />
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentQuery } from '@/pages/Agents/types';
import { AGENT_STATUS_OPTIONS } from '@/pages/Agents/types';
import {
    ChevronDown,
    Download,
    RotateCcw,
    Search,
    X
} from 'lucide-vue-next';
import { computed, ref } from 'vue';

interface Emits {
  search: [query: AgentQuery];
  export: [];
}

const emit = defineEmits<Emits>();

// 搜索和筛选状态
const searchQuery = ref('');
const selectedStatus = ref('');
const selectedCommissionRange = ref('');
const selectedSort = ref('created_at_desc');
const exporting = ref(false);

// 状态选项
const statusOptions = AGENT_STATUS_OPTIONS;

// 是否有活动筛选
const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedStatus.value || selectedCommissionRange.value;
});

// 搜索防抖
let searchTimeout: NodeJS.Timeout;
const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emitQuery();
  }, 300);
};

// 筛选处理
const handleFilter = () => {
  emitQuery();
};

// 重置筛选
const handleReset = () => {
  searchQuery.value = '';
  selectedStatus.value = '';
  selectedCommissionRange.value = '';
  selectedSort.value = 'created_at_desc';
  emitQuery();
};

// 导出处理
const handleExport = async () => {
  exporting.value = true;
  try {
    emit('export');
  } finally {
    exporting.value = false;
  }
};

// 发送查询参数
const emitQuery = () => {
  const query: AgentQuery = {
    page: 1 // 重置到第一页
  };

  if (searchQuery.value) {
    query.search = searchQuery.value;
  }

  if (selectedStatus.value) {
    query.status = selectedStatus.value as any;
  }

  // 处理佣金率范围
  if (selectedCommissionRange.value) {
    const range = selectedCommissionRange.value;
    if (range === '0-5') {
      query.commission_min = 0;
      query.commission_max = 5;
    } else if (range === '5-10') {
      query.commission_min = 5;
      query.commission_max = 10;
    } else if (range === '10-15') {
      query.commission_min = 10;
      query.commission_max = 15;
    } else if (range === '15+') {
      query.commission_min = 15;
    }
  }

  // 处理排序
  if (selectedSort.value) {
    const [field, order] = selectedSort.value.split('_');
    query.sort_by = field;
    query.sort_order = order as 'asc' | 'desc';
  }

  emit('search', query);
};

// 获取状态标签
const getStatusLabel = (status: string) => {
  const option = statusOptions.find(opt => opt.value === status);
  return option?.label || status;
};
</script>