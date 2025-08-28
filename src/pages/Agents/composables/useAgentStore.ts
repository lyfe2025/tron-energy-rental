/**
 * 代理商管理状态管理
 */
import { ref, computed } from 'vue';
import { agentService } from '@/services/agentService';
import type {
  Agent,
  AgentQuery,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentPagination,
  AgentPricingConfig,
  AgentPricingQuery,
  BatchConfigRequest,
  AgentLevelStats
} from '@/pages/Agents/types';

export function useAgentStore() {
  // 代理商列表状态
  const agents = ref<Agent[]>([]);
  const selectedAgents = ref<string[]>([]);
  const pagination = ref<AgentPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // 代理商详情状态
  const currentAgent = ref<Agent | null>(null);
  const agentLoading = ref(false);
  
  // 价格配置状态
  const pricingConfigs = ref<AgentPricingConfig[]>([]);
  const pricingPagination = ref<AgentPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const pricingLoading = ref(false);
  
  // 统计数据状态
  const stats = ref<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
    rejected: number;
    total_earnings: number;
    total_orders: number;
    total_customers: number;
  } | null>(null);
  const levelStats = ref<AgentLevelStats[]>([]);
  const statsLoading = ref(false);
  
  // 操作状态
  const submitting = ref(false);

  // Actions
  const fetchAgents = async (params?: AgentQuery) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await agentService.getAgents(params);
      if (response.success) {
        agents.value = response.data.agents;
        pagination.value = response.data.pagination;
      } else {
        error.value = response.message || '获取代理商列表失败';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取代理商列表失败';
    } finally {
      loading.value = false;
    }
  };

  const fetchAgent = async (id: string) => {
    agentLoading.value = true;
    error.value = null;
    try {
      const response = await agentService.getAgent(id);
      if (response.success) {
        currentAgent.value = response.data.agent;
        return response.data.agent;
      } else {
        error.value = response.message || '获取代理商详情失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取代理商详情失败';
      return null;
    } finally {
      agentLoading.value = false;
    }
  };

  const createAgent = async (data: CreateAgentRequest) => {
    submitting.value = true;
    error.value = null;
    try {
      const response = await agentService.createAgent(data);
      if (response.success) {
        await fetchAgents();
        return true;
      } else {
        error.value = response.message || '创建代理商失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建代理商失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const updateAgent = async (id: string, data: UpdateAgentRequest) => {
    submitting.value = true;
    error.value = null;
    try {
      const response = await agentService.updateAgent(id, data);
      if (response.success) {
        await fetchAgents();
        if (currentAgent.value?.id === id) {
          await fetchAgent(id);
        }
        return true;
      } else {
        error.value = response.message || '更新代理商失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新代理商失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const deleteAgent = async (id: string) => {
    submitting.value = true;
    error.value = null;
    try {
      const response = await agentService.deleteAgent(id);
      if (response.success) {
        await fetchAgents();
        if (currentAgent.value?.id === id) {
          currentAgent.value = null;
        }
        return true;
      } else {
        error.value = response.message || '删除代理商失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除代理商失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const batchUpdateStatus = async (agentIds: string[], status: 'active' | 'pending' | 'rejected' | 'suspended') => {
    submitting.value = true;
    error.value = null;
    try {
      const response = await agentService.batchUpdateStatus(agentIds, status);
      if (response.success) {
        await fetchAgents();
        return true;
      } else {
        error.value = response.message || '批量更新状态失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量更新状态失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const batchDelete = async (agentIds: string[]) => {
    submitting.value = true;
    error.value = null;
    try {
      const response = await agentService.batchDelete(agentIds);
      if (response.success) {
        await fetchAgents();
        return true;
      } else {
        error.value = response.message || '批量删除失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量删除失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  // 价格配置相关 - 注意：相关API已移除
  const fetchPricingConfigs = async (params?: AgentPricingQuery) => {
    pricingLoading.value = true;
    error.value = null;
    try {
      // 注意：getPricingConfigs方法已从agentService中移除
      console.warn('价格配置API已移除，请使用新的定价策略API');
      pricingConfigs.value = [];
      pricingPagination.value = { page: 1, limit: 20, total: 0, totalPages: 0 };
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取价格配置失败';
    } finally {
      pricingLoading.value = false;
    }
  };

  const fetchAgentPricingConfigs = async (agentId: string) => {
    pricingLoading.value = true;
    error.value = null;
    try {
      // 注意：getAgentPricingConfigs方法已从agentService中移除
      console.warn('代理商价格配置API已移除，请使用新的定价策略API');
      pricingConfigs.value = [];
      pricingPagination.value = { page: 1, limit: 20, total: 0, totalPages: 0 };
      return [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取代理商价格配置失败';
      return [];
    } finally {
      pricingLoading.value = false;
    }
  };

  const createPricingConfig = async (data: any) => {
    submitting.value = true;
    error.value = null;
    try {
      // 注意：createPricingConfig方法已从agentService中移除
      console.warn('创建价格配置API已移除，请使用新的定价策略API');
      error.value = '价格配置功能已移除，请使用新的定价策略';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建价格配置失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const updatePricingConfig = async (id: string, data: any) => {
    submitting.value = true;
    error.value = null;
    try {
      // 注意：updatePricingConfig方法已从agentService中移除
      console.warn('更新价格配置API已移除，请使用新的定价策略API');
      error.value = '价格配置功能已移除，请使用新的定价策略';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新价格配置失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const deletePricingConfig = async (id: string) => {
    submitting.value = true;
    error.value = null;
    try {
      // 注意：deletePricingConfig方法已从agentService中移除
      console.warn('删除价格配置API已移除，请使用新的定价策略API');
      error.value = '价格配置功能已移除，请使用新的定价策略';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除价格配置失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const batchSetPricingConfigs = async (data: BatchConfigRequest) => {
    submitting.value = true;
    error.value = null;
    try {
      // 注意：batchSetPricingConfigs方法已从agentService中移除
      console.warn('批量设置价格配置API已移除，请使用新的定价策略API');
      error.value = '价格配置功能已移除，请使用新的定价策略';
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量设置价格配置失败';
      return false;
    } finally {
      submitting.value = false;
    }
  };

  // 统计数据相关
  const fetchStats = async () => {
    statsLoading.value = true;
    error.value = null;
    try {
      const response = await agentService.getAgentStats();
      if (response.success) {
        stats.value = response.data;
      } else {
        error.value = '获取统计数据失败';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取统计数据失败';
    } finally {
      statsLoading.value = false;
    }
  };

  const fetchLevelStats = async () => {
    statsLoading.value = true;
    error.value = null;
    try {
      // 注意：getLevelStats方法已从agentService中移除
      console.warn('等级统计API已移除');
      levelStats.value = [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取等级统计失败';
    } finally {
      statsLoading.value = false;
    }
  };

  // 选择相关
  const setSelectedAgents = (agentIds: string[]) => {
    selectedAgents.value = agentIds;
  };

  const toggleAgentSelection = (agentId: string) => {
    const index = selectedAgents.value.indexOf(agentId);
    if (index > -1) {
      selectedAgents.value.splice(index, 1);
    } else {
      selectedAgents.value.push(agentId);
    }
  };

  const clearSelection = () => {
    selectedAgents.value = [];
  };

  const selectAll = () => {
    selectedAgents.value = agents.value.map(agent => agent.id);
  };

  // 重置状态
  const resetError = () => {
    error.value = null;
  };

  const resetCurrentAgent = () => {
    currentAgent.value = null;
  };

  return {
    // 状态
    agents,
    selectedAgents,
    pagination,
    loading,
    error,
    currentAgent,
    agentLoading,
    pricingConfigs,
    pricingPagination,
    pricingLoading,
    stats,
    levelStats,
    statsLoading,
    submitting,
    
    // Actions
    fetchAgents,
    fetchAgent,
    fetchAgentDetail: fetchAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    batchUpdateStatus,
    batchDelete,
    fetchPricingConfigs,
    fetchAgentPricingConfigs,
    fetchAgentPricing: fetchAgentPricingConfigs,
    createPricingConfig,
    updatePricingConfig,
    deletePricingConfig,
    batchSetPricingConfigs,
    fetchStats,
    fetchLevelStats,
    setSelectedAgents,
    toggleAgentSelection,
    clearSelection,
    selectAll,
    resetError,
    resetCurrentAgent
  };
}