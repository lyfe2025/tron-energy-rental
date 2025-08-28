<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">价格管理</h1>
        <p class="text-gray-600 mt-1">管理价格策略、定价模式和模板配置</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="showCreateModal"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          新建策略
        </button>
      </div>
    </div>

    <!-- Price Overview -->
    <PriceOverview 
      :strategies="strategies"
      :pricing-modes="pricingModes"
      :templates="templates"
      :price-history="priceHistory"
      class="mb-6" 
    />

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow-sm mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2',
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 价格策略管理 -->
        <div v-if="activeTab === 'strategies'" class="p-6">
          <TemplateList
            :filtered-strategies="strategies"
            :filters="filters"
            :is-loading="isLoading"
            :format-currency="formatCurrency"
            :format-number="formatNumber"
            :format-date="formatDate"
            @update-filters="updateFilters"
            @create-strategy="showCreateModal"
            @view-strategy="showViewStrategy"
            @edit-strategy="showEditStrategy"
            @duplicate-strategy="duplicateStrategy"
            @toggle-status="toggleStrategyStatus"
            @delete-strategy="deleteStrategy"
          />
        </div>

        <!-- 定价模式配置 -->
        <div v-if="activeTab === 'modes'" class="p-6">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">定价模式配置</h3>
            <div class="space-y-4">
              <div v-for="mode in pricingModes" :key="mode.id" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ mode.name }}</h4>
                    <p class="text-sm text-gray-500">{{ mode.description }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span :class="[
                      'px-2 py-1 text-xs rounded-full',
                      mode.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    ]">
                      {{ mode.isEnabled ? '启用' : '禁用' }}
                    </span>
                    <button
                      @click="updatePricingMode(mode.id, { isEnabled: !mode.isEnabled })"
                      class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {{ mode.isEnabled ? '禁用' : '启用' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 模板管理 -->
        <div v-if="activeTab === 'templates'" class="p-6">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">价格模板</h3>
              <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <Plus class="w-4 h-4" />
                新建模板
              </button>
            </div>
            <div class="space-y-4">
              <div v-for="template in templates" :key="template.id" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ template.name }}</h4>
                    <p class="text-sm text-gray-500">{{ template.description }}</p>
                    <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>类型: {{ template.type }}</span>
                      <span>基础价格: {{ formatCurrency(template.basePrice, template.currency) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span :class="[
                      'px-2 py-1 text-xs rounded-full',
                      template.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    ]">
                      {{ template.status === 'active' ? '活跃' : '禁用' }}
                    </span>
                    <button
                      @click="toggleTemplateStatus(template.id)"
                      class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {{ template.status === 'active' ? '禁用' : '启用' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 价格历史 -->
        <div v-if="activeTab === 'history'" class="p-6">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">价格历史</h3>
            <div class="space-y-4">
              <div v-for="record in priceHistory" :key="record.id" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ record.resourceType }} - {{ record.action }}</h4>
                    <p class="text-sm text-gray-500">{{ formatDate(record.createdAt) }}</p>
                  </div>
                  <div class="text-right">
                    <div class="font-medium">{{ formatCurrency(record.price, record.currency) }}</div>
                    <div class="text-sm text-gray-500">数量: {{ formatNumber(record.amount) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import {
    FileText,
    History,
    Layers,
    Plus,
    RefreshCw,
    Settings
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import PriceOverview from './Pricing/components/PriceOverview.vue'
import TemplateList from './Pricing/components/TemplateList.vue'
import { usePricing } from './Pricing/composables/usePricing'

// 标签页配置
const tabs = [
  { key: 'strategies', label: '价格策略', icon: Settings },
  { key: 'modes', label: '定价模式', icon: Layers },
  { key: 'templates', label: '模板管理', icon: FileText },
  { key: 'history', label: '价格历史', icon: History }
]

const activeTab = ref('strategies')

// 筛选条件
const filters = ref({
  search: '',
  type: '',
  status: '',
  sortBy: 'updated_at'
})

const {
  // 状态
  strategies,
  pricingModes,
  templates,
  priceHistory,
  isLoading,
  
  // 方法
  refreshData,
  
  // 策略相关方法
  showEditStrategy,
  showViewStrategy,
  deleteStrategy,
  toggleStrategyStatus,
  duplicateStrategy,
  
  // 模式相关方法
  updatePricingMode,
  
  // 模板相关方法
  showEditTemplate,
  showViewTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  duplicateTemplate,
  
  // 历史相关方法
  loadPriceHistoryByFilters,
  
  // 工具方法
  formatCurrency,
  formatNumber,
  formatDate
} = usePricing()

// 页面方法
const showCreateModal = () => {
  console.log('显示创建策略模态框')
}

// 筛选条件更新
const updateFilters = (newFilters: any) => {
  filters.value = { ...filters.value, ...newFilters }
}

// 初始化
onMounted(() => {
  refreshData()
})
</script>
