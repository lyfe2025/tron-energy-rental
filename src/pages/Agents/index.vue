<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">代理商管理</h1>
              <p class="mt-1 text-sm text-gray-600">
                管理代理商账户、价格配置和业绩统计
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <button
                @click="handleRefresh"
                :disabled="loading"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <RotateCcw :class="['w-4 h-4 mr-2', loading && 'animate-spin']" />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 统计卡片 -->
      <AgentStats
        :stats="stats"
        :loading="statsLoading"
        class="mb-8"
      />

      <!-- 搜索和筛选 -->
      <AgentSearch
        v-model:query="searchQuery"
        @search="handleSearch"
        @export="handleExport"
        class="mb-6"
      />

      <!-- 批量操作 -->
      <AgentActions
        :selected-agents="selectedAgents"
        :submitting="submitting"
        @create="handleCreate"
        @clear-selection="handleClearSelection"
        @batch-status="handleBatchStatus"
        @batch-pricing="handleBatchPricing"
        @batch-delete="handleBatchDelete"
        @export-selected="handleExportSelected"
      />

      <!-- 代理商列表 -->
      <AgentList
        :agents="agents"
        :loading="loading"
        :pagination="pagination"
        :selected-agents="selectedAgents"
        @select="handleSelect"
        @select-all="(selected: boolean) => handleSelectAll(selected)"
        @view="handleView"
        @edit="handleEdit"
        @delete="handleDelete"
        @pricing="handlePricing"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      />
    </div>

    <!-- 代理商表单弹窗 -->
    <AgentForm
      :visible="showForm"
      :agent="currentAgent"
      :submitting="submitting"
      @close="handleCloseForm"
      @submit="handleSubmitForm"
    />

    <!-- 价格配置弹窗 -->
    <AgentPricingModal
      v-if="showPricingModal"
      :visible="showPricingModal"
      :agent-id="currentAgentId"
      @close="handleClosePricing"
    />

    <!-- 代理商详情弹窗 -->
    <AgentDetailModal
      v-if="showDetailModal"
      :visible="showDetailModal"
      :agent-id="currentAgentId"
      @close="handleCloseDetail"
      @edit="handleEditFromDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import { toast } from 'sonner';
import { useAgentStore } from './composables/useAgentStore';
import AgentStats from './components/AgentStats.vue';
import AgentSearch from './components/AgentSearch.vue';
import AgentActions from './components/AgentActions.vue';
import AgentList from './components/AgentList.vue';
import AgentForm from './components/AgentForm.vue';
import AgentPricingModal from './components/AgentPricingModal.vue';
import AgentDetailModal from './components/AgentDetailModal.vue';
import type {
  Agent,
  AgentQuery,
  CreateAgentRequest,
  UpdateAgentRequest
} from './types';

// Store
const agentStore = useAgentStore();

// 响应式状态
const loading = ref(false);
const statsLoading = ref(false);
const submitting = ref(false);
const selectedAgents = ref<string[]>([]);
const searchQuery = reactive<AgentQuery>({
  page: 1,
  limit: 20,
  search: '',
  status: undefined,
  agent_level: undefined,
  commission_min: undefined,
  commission_max: undefined,
  sort_by: 'created_at',
  sort_order: 'desc'
});

// 弹窗状态
const showForm = ref(false);
const showPricingModal = ref(false);
const showDetailModal = ref(false);
const currentAgent = ref<Agent | null>(null);
const currentAgentId = ref<string>('');

// 计算属性
const agents = computed(() => agentStore.agents.value);
const pagination = computed(() => agentStore.pagination.value);
const stats = computed(() => agentStore.stats.value);

// 初始化数据
const initData = async () => {
  await Promise.all([
    loadAgents(),
    loadStats()
  ]);
};

// 加载代理商列表
const loadAgents = async () => {
  try {
    loading.value = true;
    await agentStore.fetchAgents(searchQuery);
  } catch (error) {
    console.error('加载代理商列表失败:', error);
    toast.error('加载代理商列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    statsLoading.value = true;
    await agentStore.fetchStats();
  } catch (error) {
    console.error('加载统计数据失败:', error);
    toast.error('加载统计数据失败');
  } finally {
    statsLoading.value = false;
  }
};

// 事件处理
const handleRefresh = () => {
  selectedAgents.value = [];
  initData();
};

const handleSearch = (query: AgentQuery) => {
  Object.assign(searchQuery, query);
  searchQuery.page = 1;
  selectedAgents.value = [];
  loadAgents();
};

const handleExport = () => {
  // TODO: 实现导出功能
  toast.info('导出功能开发中...');
};

const handleCreate = () => {
  currentAgent.value = null;
  showForm.value = true;
};

const handleEdit = (agent: Agent) => {
  currentAgent.value = agent;
  showForm.value = true;
};

const handleEditFromDetail = (agentId: string) => {
  const agent = agents.value.find(a => a.id === agentId);
  if (agent) {
    currentAgent.value = agent;
    showDetailModal.value = false;
    showForm.value = true;
  }
};

const handleView = (agent: Agent) => {
  currentAgentId.value = agent.id;
  showDetailModal.value = true;
};

const handleDelete = async (agent: Agent) => {
  try {
    submitting.value = true;
    await agentStore.deleteAgent(agent.id);
    toast.success('删除代理商成功');
    selectedAgents.value = selectedAgents.value.filter(id => id !== agent.id);
    loadAgents();
  } catch (error) {
    console.error('删除代理商失败:', error);
    toast.error('删除代理商失败');
  } finally {
    submitting.value = false;
  }
};

const handlePricing = (agent: Agent) => {
  currentAgentId.value = agent.id;
  showPricingModal.value = true;
};

const handleSelect = (agentId: string, selected: boolean) => {
  if (selected) {
    if (!selectedAgents.value.includes(agentId)) {
      selectedAgents.value.push(agentId);
    }
  } else {
    selectedAgents.value = selectedAgents.value.filter(id => id !== agentId);
  }
};

const handleSelectAll = (selected: boolean) => {
  if (selected) {
    selectedAgents.value = agents.value.map(agent => agent.id);
  } else {
    selectedAgents.value = [];
  }
};

const handleClearSelection = () => {
  selectedAgents.value = [];
};

const handleBatchStatus = async (agentIds: string[], status: 'active' | 'pending' | 'rejected' | 'suspended') => {
  try {
    submitting.value = true;
    await agentStore.batchUpdateStatus(agentIds, status);
    toast.success(`批量更新状态成功`);
    selectedAgents.value = [];
    loadAgents();
  } catch (error) {
    console.error('批量更新状态失败:', error);
    toast.error('批量更新状态失败');
  } finally {
    submitting.value = false;
  }
};

const handleBatchPricing = (agentIds: string[]) => {
  // TODO: 实现批量价格配置
  toast.info('批量价格配置功能开发中...');
};

const handleBatchDelete = async (agentIds: string[]) => {
  try {
    submitting.value = true;
    await agentStore.batchDelete(agentIds);
    toast.success('批量删除成功');
    selectedAgents.value = [];
    loadAgents();
  } catch (error) {
    console.error('批量删除失败:', error);
    toast.error('批量删除失败');
  } finally {
    submitting.value = false;
  }
};

const handleExportSelected = (agentIds: string[]) => {
  // TODO: 实现导出选中功能
  toast.info('导出选中功能开发中...');
};

const handlePageChange = (page: number) => {
  searchQuery.page = page;
  loadAgents();
};

const handlePageSizeChange = (pageSize: number) => {
  searchQuery.limit = pageSize;
  searchQuery.page = 1;
  loadAgents();
};

const handleCloseForm = () => {
  showForm.value = false;
  currentAgent.value = null;
};

const handleSubmitForm = async (data: CreateAgentRequest | UpdateAgentRequest) => {
  try {
    submitting.value = true;
    
    if (currentAgent.value) {
      // 更新代理商
      await agentStore.updateAgent(currentAgent.value.id, data as UpdateAgentRequest);
      toast.success('更新代理商成功');
    } else {
      // 创建代理商
      await agentStore.createAgent(data as CreateAgentRequest);
      toast.success('创建代理商成功');
    }
    
    showForm.value = false;
    currentAgent.value = null;
    loadAgents();
    loadStats();
  } catch (error) {
    console.error('保存代理商失败:', error);
    toast.error('保存代理商失败');
  } finally {
    submitting.value = false;
  }
};

const handleClosePricing = () => {
  showPricingModal.value = false;
  currentAgentId.value = '';
};

const handleCloseDetail = () => {
  showDetailModal.value = false;
  currentAgentId.value = '';
};

// 组件挂载时初始化数据
onMounted(() => {
  initData();
});
</script>