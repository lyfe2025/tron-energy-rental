<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdrop"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">
            代理商详情
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            查看代理商的详细信息和业绩数据
          </p>
        </div>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">加载中...</span>
        </div>

        <!-- 代理商详情 -->
        <div v-else-if="agent" class="space-y-8">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- 左侧：基本信息 -->
            <div class="space-y-6">
              <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User class="w-5 h-5 mr-2" />
                  基本信息
                </h3>
                <div class="space-y-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">用户名:</span>
                    <span class="font-medium">{{ agent.user?.username || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">邮箱:</span>
                    <span class="font-medium">{{ agent.user?.email || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">手机号:</span>
                    <span class="font-medium">{{ agent.user?.phone || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Telegram ID:</span>
                    <span class="font-medium">{{ agent.user?.telegram_id || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">状态:</span>
                    <span
                      :class="[
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(agent.status)
                      ]"
                    >
                      {{ getStatusLabel(agent.status) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">注册时间:</span>
                    <span class="font-medium">{{ formatDate(agent.created_at) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">最后登录:</span>
                    <span class="font-medium">{{ formatDate(agent.last_login_at) || '-' }}</span>
                  </div>
                </div>
              </div>

              <!-- 联系信息 -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Building class="w-5 h-5 mr-2" />
                  联系信息
                </h3>
                <div class="space-y-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">公司名称:</span>
                    <span class="font-medium">{{ agent.company_name || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">联系人:</span>
                    <span class="font-medium">{{ agent.contact_person || '-' }}</span>
                  </div>
                  <div v-if="agent.address" class="">
                    <span class="text-gray-600 block mb-2">地址:</span>
                    <span class="font-medium text-sm">{{ agent.address }}</span>
                  </div>
                  <div v-if="agent.notes" class="">
                    <span class="text-gray-600 block mb-2">备注:</span>
                    <span class="font-medium text-sm">{{ agent.notes }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：代理商信息 -->
            <div class="space-y-6">
              <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Crown class="w-5 h-5 mr-2" />
                  代理商信息
                </h3>
                <div class="space-y-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">代理商等级:</span>
                    <span class="font-medium">{{ getAgentLevelLabel(agent.agent_level) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">佣金率:</span>
                    <span class="font-medium text-green-600">{{ agent.commission_rate }}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">最大折扣率:</span>
                    <span class="font-medium">{{ agent.max_discount_rate || 0 }}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">信用额度:</span>
                    <span class="font-medium">{{ formatCurrency(agent.credit_limit) }} TRX</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">已用额度:</span>
                    <span class="font-medium text-orange-600">{{ formatCurrency(agent.used_credit) }} TRX</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">可用额度:</span>
                    <span class="font-medium text-blue-600">
                      {{ formatCurrency((agent.credit_limit || 0) - (agent.used_credit || 0)) }} TRX
                    </span>
                  </div>
                </div>
              </div>

              <!-- 业绩统计 -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp class="w-5 h-5 mr-2" />
                  业绩统计
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">{{ agent.total_orders || 0 }}</div>
                    <div class="text-sm text-gray-600">总订单数</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">{{ formatCurrency(agent.total_revenue) }}</div>
                    <div class="text-sm text-gray-600">总收益 (TRX)</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">{{ agent.stats?.total_users || 0 }}</div>
                    <div class="text-sm text-gray-600">管理用户数</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-orange-600">{{ formatCurrency(agent.stats?.total_commission) }}</div>
                    <div class="text-sm text-gray-600">总佣金 (TRX)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 价格配置 -->
          <div class="border-t border-gray-200 pt-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-medium text-gray-900 flex items-center">
                <Settings class="w-5 h-5 mr-2" />
                价格配置
              </h3>
              <button
                @click="handleEditPricing"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit class="w-4 h-4 mr-2" />
                编辑配置
              </button>
            </div>

            <!-- 价格配置列表 -->
            <div v-if="pricingConfigs.length > 0" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      能量包
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      代理商价格
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      折扣率
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="config in pricingConfigs" :key="config.id">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">
                        价格配置 #{{ config.price_config_id || config.id }}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ config.agent_price }} TRX</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{{ config.discount_rate }}%</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        :class="[
                          'px-2 py-1 rounded-full text-xs font-medium',
                          config.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        ]"
                      >
                        {{ config.is_active ? '启用' : '禁用' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <Package class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-600">暂无价格配置</p>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="text-center py-12">
          <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p class="text-gray-600 mb-4">无法加载代理商详情</p>
          <button
            @click="loadData"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex justify-between items-center p-6 border-t border-gray-200">
        <div class="flex space-x-3">
          <button
            v-if="agent"
            @click="handleEdit"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Edit class="w-4 h-4 mr-2" />
            编辑代理商
          </button>
        </div>
        <button
          @click="handleClose"
          class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    AlertCircle,
    Building,
    Crown,
    Edit,
    Package,
    Settings,
    TrendingUp,
    User,
    X
} from 'lucide-vue-next';
import { toast } from 'sonner';
import { ref, watch } from 'vue';
import { useAgentStore } from '../composables/useAgentStore';
import type { Agent, AgentPricingConfig } from '../types';

interface Props {
  visible: boolean;
  agentId: string;
}

interface Emits {
  close: [];
  edit: [agentId: string];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Store
const agentStore = useAgentStore();

// 响应式状态
const loading = ref(false);
const agent = ref<Agent | null>(null);
const pricingConfigs = ref<AgentPricingConfig[]>([]);

// 加载数据
const loadData = async () => {
  if (!props.agentId) return;
  
  try {
    loading.value = true;
    
    // 并行加载代理商详情和价格配置
    const [agentDetail, configs] = await Promise.all([
      agentStore.fetchAgentDetail(props.agentId),
      agentStore.fetchAgentPricing(props.agentId)
    ]);
    
    agent.value = agentDetail;
    pricingConfigs.value = configs || [];
  } catch (error) {
    console.error('加载代理商详情失败:', error);
    toast.error('加载代理商详情失败');
    agent.value = null;
  } finally {
    loading.value = false;
  }
};

// 格式化函数
const formatDate = (dateString: string | null) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleString('zh-CN');
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '0';
  return amount.toLocaleString();
};

const getStatusLabel = (status: string) => {
  const labels = {
    pending: '待审核',
    active: '活跃',
    suspended: '暂停',
    rejected: '已拒绝'
  };
  return labels[status as keyof typeof labels] || status;
};

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

const getAgentLevelLabel = (level: number | null | undefined) => {
  if (!level) return '-';
  const labels = {
    1: '一级代理商',
    2: '二级代理商',
    3: '三级代理商'
  };
  return labels[level as keyof typeof labels] || `${level}级代理商`;
};

// getEnergyPackageName函数已移除，现在使用price_configs

// 事件处理
const handleClose = () => {
  emit('close');
};

const handleBackdrop = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
};

const handleEdit = () => {
  emit('edit', props.agentId);
};

const handleEditPricing = () => {
  // TODO: 打开价格配置弹窗
  toast.info('价格配置功能开发中...');
};

// 监听弹窗显示状态
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.agentId) {
      loadData();
    }
  },
  { immediate: true }
);
</script>