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
            代理商价格配置
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            为代理商配置不同能量包的价格和折扣
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

        <!-- 价格配置列表 -->
        <div v-else>
          <!-- 操作按钮 -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-600">
                共 {{ pricingConfigs.length }} 个配置
              </span>
            </div>
            <div class="flex space-x-3">
              <button
                @click="handleAddConfig"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus class="w-4 h-4 mr-2" />
                添加配置
              </button>
              <button
                @click="handleBatchSave"
                :disabled="submitting || !hasChanges"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <Save class="w-4 h-4 mr-2" />
                {{ submitting ? '保存中...' : '批量保存' }}
              </button>
            </div>
          </div>

          <!-- 配置表格 -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    能量包类型
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    基础价格
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    代理商价格
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    折扣率
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    数量折扣
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(config, index) in pricingConfigs" :key="config.id || index">
                  <!-- 价格配置类型 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select
                      v-model="config.price_config_id"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      @change="handleConfigChange(index)"
                    >
                      <option value="">请选择价格配置</option>
                      <!-- 价格配置选项将从price_configs表加载 -->
                    </select>
                  </td>

                  <!-- 基础价格 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      配置价格 TRX
                    </div>
                  </td>

                  <!-- 代理商价格 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input
                      v-model.number="config.agent_price"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      @input="handleConfigChange(index)"
                    />
                  </td>

                  <!-- 折扣率 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <input
                        v-model.number="config.discount_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        class="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        @input="handleConfigChange(index)"
                      />
                      <span class="ml-1 text-sm text-gray-500">%</span>
                    </div>
                  </td>

                  <!-- 数量折扣 -->
                  <td class="px-6 py-4">
                    <div class="space-y-2">
                      <div
                        v-for="(discount, discountIndex) in config.quantity_discounts"
                        :key="discountIndex"
                        class="flex items-center space-x-2"
                      >
                        <input
                          v-model.number="discount.min_quantity"
                          type="number"
                          min="1"
                          placeholder="最小数量"
                          class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          @input="handleConfigChange(index)"
                        />
                        <span class="text-xs text-gray-500">-</span>
                        <input
                          v-model.number="discount.discount_rate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="折扣率"
                          class="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          @input="handleConfigChange(index)"
                        />
                        <span class="text-xs text-gray-500">%</span>
                        <button
                          @click="removeQuantityDiscount(index, discountIndex)"
                          class="text-red-500 hover:text-red-700"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        @click="addQuantityDiscount(index)"
                        class="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <Plus class="w-3 h-3 mr-1" />
                        添加折扣
                      </button>
                    </div>
                  </td>

                  <!-- 状态 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select
                      v-model="config.is_active"
                      class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      @change="handleConfigChange(index)"
                    >
                      <option :value="true">启用</option>
                      <option :value="false">禁用</option>
                    </select>
                  </td>

                  <!-- 操作 -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      @click="removeConfig(index)"
                      class="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 空状态 -->
          <div v-if="pricingConfigs.length === 0" class="text-center py-12">
            <Package class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">暂无价格配置</h3>
            <p class="text-gray-600 mb-4">为代理商添加能量包价格配置</p>
            <button
              @click="handleAddConfig"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加配置
            </button>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
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
import { useToast } from '@/composables/useToast';
import { Package, Plus, Save, Trash2, X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useAgentStore } from '../composables/useAgentStore';
import type { AgentPricingConfig } from '../types';

interface Props {
  visible: boolean;
  agentId: string;
}

interface Emits {
  close: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { success, error } = useToast();

// Store
const agentStore = useAgentStore();

// 响应式状态
const loading = ref(false);
const submitting = ref(false);
const pricingConfigs = ref<AgentPricingConfig[]>([]);
const originalConfigs = ref<AgentPricingConfig[]>([]);
// energyPackages已移除，现在使用price_configs

// 计算属性
const hasChanges = computed(() => {
  return JSON.stringify(pricingConfigs.value) !== JSON.stringify(originalConfigs.value);
});

// getBasePrice函数已移除，现在使用price_configs

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    
    // 加载价格配置
    const configs = await agentStore.fetchAgentPricing(props.agentId);
    
    pricingConfigs.value = configs || [];
    originalConfigs.value = JSON.parse(JSON.stringify(configs || []));
  } catch (error) {
    console.error('加载价格配置失败:', error);
    error('加载价格配置失败');
  } finally {
    loading.value = false;
  }
};

// loadEnergyPackages函数已移除，现在使用price_configs

// 添加配置
const handleAddConfig = () => {
  const newConfig: AgentPricingConfig = {
    id: '',
    agent_id: props.agentId,
    price_config_id: null,
    // energy_package_id已移除，使用price_config_id
    agent_price: 0,
    discount_rate: 0,
    quantity_discounts: [],
    status: 'active',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };
  
  pricingConfigs.value.push(newConfig);
};

// 移除配置
const removeConfig = (index: number) => {
  pricingConfigs.value.splice(index, 1);
};

// 添加数量折扣
const addQuantityDiscount = (configIndex: number) => {
  const config = pricingConfigs.value[configIndex];
  if (!config.quantity_discounts) {
    config.quantity_discounts = [];
  }
  
  config.quantity_discounts.push({
    min_quantity: 1,
    discount_percentage: 0,
    discount_rate: 0
  });
};

// 移除数量折扣
const removeQuantityDiscount = (configIndex: number, discountIndex: number) => {
  const config = pricingConfigs.value[configIndex];
  if (config.quantity_discounts) {
    config.quantity_discounts.splice(discountIndex, 1);
  }
};

// 配置变更处理
const handleConfigChange = (index: number) => {
  // 触发响应式更新
  const config = pricingConfigs.value[index];
  pricingConfigs.value[index] = { ...config };
};

// 批量保存
const handleBatchSave = async () => {
  try {
    submitting.value = true;
    
    // 验证配置
    const validConfigs = pricingConfigs.value.filter(config => {
      return config.price_config_id && config.agent_price > 0;
    });
    
    if (validConfigs.length === 0) {
      error('请至少添加一个有效的价格配置');
      return;
    }
    
    // 保存配置
    await agentStore.batchSetPricingConfigs({ agent_id: props.agentId, configs: validConfigs });
    
    success('保存价格配置成功');
    originalConfigs.value = JSON.parse(JSON.stringify(pricingConfigs.value));
  } catch (error) {
    console.error('保存价格配置失败:', error);
    error('保存价格配置失败');
  } finally {
    submitting.value = false;
  }
};

// 事件处理
const handleClose = () => {
  emit('close');
};

const handleBackdrop = (event: Event) => {
  if (event.target === event.currentTarget) {
    handleClose();
  }
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