<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">价格配置</h1>
        <p class="text-gray-600 mt-1">管理TRON能量租赁的价格策略和定价模板</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshPricing"
          :disabled="isLoading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="showCreateTemplateModal"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          新建模板
        </button>
      </div>
    </div>

    <!-- Price Overview -->
    <PriceOverview :price-stats="priceStats" class="mb-6" />

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow-sm mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- 模板管理 -->
        <div v-if="activeTab === 'templates'">
          <TemplateList
            :filtered-templates="filteredTemplates"
            :filters="filters"
            :is-loading="isLoading"
            :format-currency="formatCurrency"
            :format-number="formatNumber"
            :format-date="formatDate"
            @update-filters="updateFilters"
            @create-template="showCreateTemplateModal"
            @view-template="showViewTemplateModal"
            @edit-template="showEditTemplateModal"
            @duplicate-template="duplicateTemplate"
            @toggle-status="toggleTemplateStatus"
            @delete-template="deleteTemplate"
          />
        </div>

        <!-- 价格计算器 -->
        <div v-if="activeTab === 'calculator'">
          <PriceCalculator
            :templates="templates"
            :calculate-price="calculatePrice"
            :format-currency="formatCurrency"
            :format-number="formatNumber"
            @save-calculation="handleSaveCalculation"
            @create-order="handleCreateOrder"
          />
        </div>

        <!-- 价格历史 -->
        <div v-if="activeTab === 'history'">
          <div class="bg-white rounded-lg">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-medium text-gray-900">价格变更历史</h3>
              <button
                @click="exportHistory"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                导出历史
              </button>
            </div>

            <div v-if="isLoading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>

            <div v-else-if="priceHistory.length === 0" class="text-center py-12">
              <Clock class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">暂无价格变更记录</h3>
              <p class="text-gray-500">价格变更记录将在这里显示</p>
            </div>

            <div v-else class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      模板名称
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      价格变更
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      变更原因
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作人
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      变更时间
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="record in priceHistory"
                    :key="record.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ record.templateName }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div class="flex items-center space-x-2">
                        <span class="text-red-600">{{ formatCurrency(record.oldPrice, 'TRX') }}</span>
                        <ArrowRight class="w-4 h-4 text-gray-400" />
                        <span class="text-green-600">{{ formatCurrency(record.newPrice, 'TRX') }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ record.changeReason }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ record.changedBy }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDate(record.changedAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Modal -->
    <div v-if="showTemplateModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeTemplateModal"></div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white px-6 pt-6 pb-4">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-medium text-gray-900">
                {{ modalMode === 'create' ? '创建模板' : modalMode === 'edit' ? '编辑模板' : '查看模板' }}
              </h3>
              <button
                @click="closeTemplateModal"
                class="text-gray-400 hover:text-gray-600"
              >
                <X class="w-6 h-6" />
              </button>
            </div>

            <!-- Template Form -->
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">模板名称</label>
                  <input
                    v-model="templateForm.name"
                    :disabled="modalMode === 'view'"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="请输入模板名称"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
                  <select
                    v-model="templateForm.type"
                    :disabled="modalMode === 'view'"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="energy">能量</option>
                    <option value="bandwidth">带宽</option>
                    <option value="mixed">混合</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">基础价格</label>
                  <input
                    v-model.number="templateForm.basePrice"
                    :disabled="modalMode === 'view'"
                    type="number"
                    step="0.001"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">货币</label>
                  <select
                    v-model="templateForm.currency"
                    :disabled="modalMode === 'view'"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="TRX">TRX</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">模板描述</label>
                <textarea
                  v-model="templateForm.description"
                  :disabled="modalMode === 'view'"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  placeholder="请输入模板描述"
                />
              </div>
            </div>
          </div>

          <div v-if="modalMode !== 'view'" class="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              @click="closeTemplateModal"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              @click="saveTemplate"
              :disabled="isSaving"
              class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  RotateCcw, 
  Plus, 
  FileText, 
  Calculator, 
  Clock, 
  ArrowRight, 
  X 
} from 'lucide-vue-next'
import PriceOverview from './Pricing/components/PriceOverview.vue'
import TemplateList from './Pricing/components/TemplateList.vue'
import PriceCalculator from './Pricing/components/PriceCalculator.vue'
import { usePricing } from './Pricing/composables/usePricing'
import type { PriceCalculation, PriceCalculatorInput } from './Pricing/types/pricing.types'

// Tab配置
const tabs = [
  { id: 'templates', name: '模板管理', icon: FileText },
  { id: 'calculator', name: '价格计算器', icon: Calculator },
  { id: 'history', name: '价格历史', icon: Clock }
]

const activeTab = ref('templates')

const {
  // 响应式数据
  templates,
  priceHistory,
  stats,
  filters,
  isLoading,
  isSaving,
  showTemplateModal,
  selectedTemplate,
  modalMode,
  templateForm,
  
  // 计算属性
  priceStats,
  filteredTemplates,
  
  // 方法
  loadTemplates,
  refreshPricing,
  updateFilters,
  showCreateTemplateModal,
  showEditTemplateModal,
  showViewTemplateModal,
  closeTemplateModal,
  saveTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  duplicateTemplate,
  calculatePrice,
  formatCurrency,
  formatDate
} = usePricing()

// 格式化数字
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('zh-CN').format(value)
}

// 事件处理
const handleSaveCalculation = (calculation: PriceCalculation) => {
  console.log('Save calculation:', calculation)
  // 可以保存到本地存储或发送到服务器
}

const handleCreateOrder = (input: PriceCalculatorInput) => {
  console.log('Create order:', input)
  // 跳转到订单创建页面
}

const exportHistory = () => {
  console.log('Export price history')
  // 导出价格历史
}
</script>
