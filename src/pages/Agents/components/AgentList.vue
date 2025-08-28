<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- 桌面端表格 -->
    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="handleSelectAll"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              代理商信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              佣金率
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              业绩统计
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              注册时间
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="agent in agents"
            :key="agent.id"
            class="hover:bg-gray-50 transition-colors"
            :class="{ 'bg-blue-50': selectedAgents.includes(agent.id) }"
          >
            <td class="px-6 py-4">
              <input
                type="checkbox"
                :checked="selectedAgents.includes(agent.id)"
                @change="handleSelectAgent(agent.id)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span class="text-white font-medium text-sm">
                      {{ agent.agent_code.slice(0, 2).toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">
                    {{ agent.agent_code }}
                  </div>
                  <div class="text-sm text-gray-500">
                    ID: {{ agent.id.slice(0, 8) }}...
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                :class="getStatusClass(agent.status)"
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              >
                {{ getStatusLabel(agent.status) }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              {{ agent.commission_rate }}%
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">
                <div>收益: ¥{{ formatNumber(agent.total_earnings) }}</div>
                <div class="text-gray-500">
                  订单: {{ formatNumber(agent.total_orders) }} | 
                  客户: {{ formatNumber(agent.total_customers) }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ formatDate(agent.created_at) }}
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
              <div class="flex items-center justify-end space-x-2">
                <button
                  @click="handleView(agent)"
                  class="text-blue-600 hover:text-blue-900 transition-colors"
                  title="查看详情"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  @click="handleEdit(agent)"
                  class="text-green-600 hover:text-green-900 transition-colors"
                  title="编辑"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  @click="handlePricing(agent)"
                  class="text-purple-600 hover:text-purple-900 transition-colors"
                  title="价格配置"
                >
                  <Settings class="w-4 h-4" />
                </button>
                <button
                  @click="handleDelete(agent)"
                  class="text-red-600 hover:text-red-900 transition-colors"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端卡片 -->
    <div class="md:hidden">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="p-4 border-b border-gray-200 last:border-b-0"
        :class="{ 'bg-blue-50': selectedAgents.includes(agent.id) }"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            <input
              type="checkbox"
              :checked="selectedAgents.includes(agent.id)"
              @change="handleSelectAgent(agent.id)"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
            />
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span class="text-white font-medium text-sm">
                  {{ agent.agent_code.slice(0, 2).toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-3">
              <div class="text-sm font-medium text-gray-900">
                {{ agent.agent_code }}
              </div>
              <div class="text-xs text-gray-500">
                ID: {{ agent.id.slice(0, 8) }}...
              </div>
            </div>
          </div>
          <span
            :class="getStatusClass(agent.status)"
            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
          >
            {{ getStatusLabel(agent.status) }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span class="text-gray-500">佣金率:</span>
            <span class="ml-1 font-medium">{{ agent.commission_rate }}%</span>
          </div>
          <div>
            <span class="text-gray-500">总收益:</span>
            <span class="ml-1 font-medium">¥{{ formatNumber(agent.total_earnings) }}</span>
          </div>
          <div>
            <span class="text-gray-500">订单数:</span>
            <span class="ml-1 font-medium">{{ formatNumber(agent.total_orders) }}</span>
          </div>
          <div>
            <span class="text-gray-500">客户数:</span>
            <span class="ml-1 font-medium">{{ formatNumber(agent.total_customers) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>注册时间: {{ formatDate(agent.created_at) }}</span>
          <div class="flex items-center space-x-3">
            <button
              @click="handleView(agent)"
              class="text-blue-600 hover:text-blue-900"
            >
              <Eye class="w-4 h-4" />
            </button>
            <button
              @click="handleEdit(agent)"
              class="text-green-600 hover:text-green-900"
            >
              <Edit class="w-4 h-4" />
            </button>
            <button
              @click="handlePricing(agent)"
              class="text-purple-600 hover:text-purple-900"
            >
              <Settings class="w-4 h-4" />
            </button>
            <button
              @click="handleDelete(agent)"
              class="text-red-600 hover:text-red-900"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.totalPages > 1" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          显示 {{ (pagination.page - 1) * pagination.limit + 1 }} 到 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 条，
          共 {{ pagination.total }} 条记录
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="handlePageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="text-sm text-gray-700">
            第 {{ pagination.page }} / {{ pagination.totalPages }} 页
          </span>
          <button
            @click="handlePageChange(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Agent, AgentPagination } from '@/pages/Agents/types';
import { AGENT_STATUS_OPTIONS } from '@/pages/Agents/types';
import {
    Edit,
    Eye,
    Settings,
    Trash2
} from 'lucide-vue-next';
import { computed } from 'vue';

interface Props {
  agents: Agent[];
  selectedAgents: string[];
  pagination: AgentPagination;
  loading?: boolean;
}

interface Emits {
  select: [agentId: string, selected: boolean];
  selectAll: [selected: boolean];
  view: [agent: Agent];
  edit: [agent: Agent];
  pricing: [agent: Agent];
  delete: [agent: Agent];
  pageChange: [page: number];
  pageSizeChange: [pageSize: number];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const emit = defineEmits<Emits>();

// 全选状态
const isAllSelected = computed(() => {
  return props.agents.length > 0 && props.selectedAgents.length === props.agents.length;
});

const isIndeterminate = computed(() => {
  return props.selectedAgents.length > 0 && props.selectedAgents.length < props.agents.length;
});

// 事件处理
const handleSelectAgent = (agentId: string) => {
  const isSelected = props.selectedAgents.includes(agentId);
  emit('select', agentId, !isSelected);
};

const handleSelectAll = () => {
  emit('selectAll', !isAllSelected.value);
};

const handleView = (agent: Agent) => {
  emit('view', agent);
};

const handleEdit = (agent: Agent) => {
  emit('edit', agent);
};

const handlePricing = (agent: Agent) => {
  emit('pricing', agent);
};

const handleDelete = (agent: Agent) => {
  emit('delete', agent);
};

const handlePageChange = (page: number) => {
  emit('pageChange', page);
};

// 工具函数
const getStatusClass = (status: string) => {
  const statusOption = AGENT_STATUS_OPTIONS.find(opt => opt.value === status);
  const color = statusOption?.color || 'gray';
  
  const colorMap = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };
  
  return colorMap[color as keyof typeof colorMap] || colorMap.gray;
};

const getStatusLabel = (status: string) => {
  const statusOption = AGENT_STATUS_OPTIONS.find(opt => opt.value === status);
  return statusOption?.label || status;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};
</script>