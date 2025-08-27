<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">价格配置</h1>
        <p class="mt-1 text-sm text-gray-500">管理TRON能量租赁的价格策略和定价模板</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="refreshPricing"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新
        </button>
        <button
          @click="showCreateTemplateModal"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus class="h-4 w-4 mr-2" />
          新建模板
        </button>
      </div>
    </div>

    <!-- 价格概览 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div 
        v-for="stat in priceStats" 
        :key="stat.label"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex items-center">
          <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', stat.bgColor]">
            <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
            <p v-if="stat.change" :class="['text-sm', stat.changeColor]">{{ stat.change }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="h-5 w-5 mr-2 inline" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- 价格模板管理 -->
      <div v-if="activeTab === 'templates'" class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">价格模板</h3>
          <div class="flex items-center space-x-3">
            <div class="relative">
              <Search class="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                v-model="templateSearch"
                type="text"
                placeholder="搜索模板"
                class="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <!-- 模板列表 -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          <span class="ml-2 text-gray-600">加载中...</span>
        </div>
        
        <div v-else-if="filteredTemplates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="template in filteredTemplates" 
            :key="template.id"
            class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-lg font-medium text-gray-900">{{ template.name }}</h4>
              <div class="flex items-center space-x-2">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ template.is_active ? '启用' : '禁用' }}
                </span>
                <div class="relative">
                  <button
                    @click="toggleTemplateMenu(template.id)"
                    class="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical class="h-5 w-5" />
                  </button>
                  <div 
                    v-if="showTemplateMenu === template.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                  >
                    <div class="py-1">
                      <button
                        @click="editTemplate(template)"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit class="h-4 w-4 mr-2 inline" />
                        编辑
                      </button>
                      <button
                        @click="toggleTemplateStatus(template)"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Power class="h-4 w-4 mr-2 inline" />
                        {{ template.is_active ? '禁用' : '启用' }}
                      </button>
                      <button
                        @click="deleteTemplate(template)"
                        class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <Trash2 class="h-4 w-4 mr-2 inline" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">基础价格:</span>
                <span class="text-sm font-medium text-gray-900">{{ template.base_price }} TRX</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">最小订单:</span>
                <span class="text-sm font-medium text-gray-900">{{ template.min_amount }} TRX</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">最大订单:</span>
                <span class="text-sm font-medium text-gray-900">{{ template.max_amount }} TRX</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">折扣率:</span>
                <span class="text-sm font-medium text-gray-900">{{ template.discount_rate }}%</span>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-xs text-gray-500">创建时间: {{ formatDateTime(template.created_at) }}</p>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-12">
          <FileText class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无价格模板</h3>
          <p class="text-gray-500 mb-4">创建您的第一个价格模板来开始配置定价策略</p>
          <button
            @click="showCreateTemplateModal"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus class="h-4 w-4 mr-2" />
            创建模板
          </button>
        </div>
      </div>

      <!-- 机器人定价 -->
      <div v-if="activeTab === 'bots'" class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">机器人定价</h3>
          <button
            @click="showBotPricingModal"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Settings class="h-4 w-4 mr-2" />
            配置定价
          </button>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          <span class="ml-2 text-gray-600">加载中...</span>
        </div>
        
        <div v-else-if="botPricing.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  机器人
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  价格模板
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  当前价格
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="bot in botPricing" 
                :key="bot.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot class="h-5 w-5 text-indigo-600" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ bot.bot_name }}</div>
                      <div class="text-sm text-gray-500">ID: {{ bot.bot_id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ bot.template_name || '默认模板' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ bot.current_price }} TRX</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      bot.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ bot.is_active ? '活跃' : '停用' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDateTime(bot.updated_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="editBotPricing(bot)"
                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <button
                    @click="toggleBotStatus(bot)"
                    :class="[
                      'hover:opacity-75',
                      bot.is_active ? 'text-red-600' : 'text-green-600'
                    ]"
                  >
                    <Power class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-else class="text-center py-12">
          <Bot class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无机器人定价</h3>
          <p class="text-gray-500">配置机器人的定价策略</p>
        </div>
      </div>

      <!-- 代理商价格 -->
      <div v-if="activeTab === 'agents'" class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">代理商价格</h3>
          <button
            @click="showAgentPricingModal"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Users class="h-4 w-4 mr-2" />
            设置代理价格
          </button>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
          <span class="ml-2 text-gray-600">加载中...</span>
        </div>
        
        <div v-else-if="agentPricing.length > 0" class="space-y-4">
          <div 
            v-for="agent in agentPricing" 
            :key="agent.id"
            class="border border-gray-200 rounded-lg p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users class="h-6 w-6 text-purple-600" />
                </div>
                <div class="ml-4">
                  <h4 class="text-lg font-medium text-gray-900">{{ agent.agent_name }}</h4>
                  <p class="text-sm text-gray-500">等级: {{ agent.level }} | 折扣: {{ agent.discount_rate }}%</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ agent.is_active ? '启用' : '禁用' }}
                </span>
                <button
                  @click="editAgentPricing(agent)"
                  class="text-indigo-600 hover:text-indigo-900"
                >
                  <Edit class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span class="text-sm text-gray-600">基础价格:</span>
                <p class="text-sm font-medium text-gray-900">{{ agent.base_price }} TRX</p>
              </div>
              <div>
                <span class="text-sm text-gray-600">最小订单:</span>
                <p class="text-sm font-medium text-gray-900">{{ agent.min_amount }} TRX</p>
              </div>
              <div>
                <span class="text-sm text-gray-600">最大订单:</span>
                <p class="text-sm font-medium text-gray-900">{{ agent.max_amount }} TRX</p>
              </div>
              <div>
                <span class="text-sm text-gray-600">佣金率:</span>
                <p class="text-sm font-medium text-gray-900">{{ agent.commission_rate }}%</p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-12">
          <Users class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">暂无代理商价格</h3>
          <p class="text-gray-500">设置代理商的专属价格和佣金</p>
        </div>
      </div>
    </div>

    <!-- 创建/编辑模板模态框 -->
    <div 
      v-if="showTemplateModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closeTemplateModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">
              {{ editingTemplate ? '编辑价格模板' : '创建价格模板' }}
            </h3>
            <button
              @click="closeTemplateModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <form @submit.prevent="saveTemplate">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">模板名称</label>
                <input
                  v-model="templateForm.name"
                  type="text"
                  required
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入模板名称"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">基础价格 (TRX)</label>
                <input
                  v-model.number="templateForm.base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">最小订单 (TRX)</label>
                  <input
                    v-model.number="templateForm.min_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">最大订单 (TRX)</label>
                  <input
                    v-model.number="templateForm.max_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">折扣率 (%)</label>
                <input
                  v-model.number="templateForm.discount_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.0"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  v-model="templateForm.description"
                  rows="3"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="请输入模板描述"
                ></textarea>
              </div>
              
              <div class="flex items-center">
                <input
                  v-model="templateForm.is_active"
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label class="ml-2 block text-sm text-gray-900">
                  启用此模板
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeTemplateModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Loader2 v-if="isSaving" class="animate-spin h-4 w-4 mr-2" />
                {{ isSaving ? '保存中...' : (editingTemplate ? '更新' : '创建') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { pricingAPI } from '@/services/api'
import {
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Power,
  MoreVertical,
  X,
  Loader2,
  FileText,
  Settings,
  Bot,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Percent
} from 'lucide-vue-next'

// 响应式数据
const isLoading = ref(false)
const isSaving = ref(false)
const activeTab = ref('templates')
const templateSearch = ref('')
const showTemplateMenu = ref('')
const showTemplateModal = ref(false)
const editingTemplate = ref<any>(null)

// 数据
const priceTemplates = ref<any[]>([])
const botPricing = ref<any[]>([])
const agentPricing = ref<any[]>([])

// 标签页配置
const tabs = [
  { id: 'templates', name: '价格模板', icon: FileText },
  { id: 'bots', name: '机器人定价', icon: Bot },
  { id: 'agents', name: '代理商价格', icon: Users }
]

// 价格统计
const priceStats = ref([
  {
    label: '活跃模板',
    value: 0,
    icon: Target,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    change: null,
    changeColor: ''
  },
  {
    label: '平均价格',
    value: '0.00',
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    change: null,
    changeColor: ''
  },
  {
    label: '最高折扣',
    value: '0%',
    icon: Percent,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    change: null,
    changeColor: ''
  },
  {
    label: '价格趋势',
    value: '稳定',
    icon: TrendingUp,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    change: null,
    changeColor: ''
  }
])

// 模板表单
const templateForm = reactive({
  name: '',
  base_price: 0,
  min_amount: 0,
  max_amount: 0,
  discount_rate: 0,
  description: '',
  is_active: true
})

// 计算属性
const filteredTemplates = computed(() => {
  if (!templateSearch.value.trim()) {
    return priceTemplates.value
  }
  
  const search = templateSearch.value.toLowerCase()
  return priceTemplates.value.filter(template => 
    template.name.toLowerCase().includes(search) ||
    template.description?.toLowerCase().includes(search)
  )
})

// 方法
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 加载价格数据
const loadPricingData = async () => {
  try {
    isLoading.value = true
    
    // 并行加载所有数据
    const [templatesRes, botsRes, agentsRes] = await Promise.all([
      pricingAPI.getTemplates(),
      pricingAPI.getBotPricing(),
      pricingAPI.getAgentPricing()
    ])
    
    if (templatesRes.data.success) {
      priceTemplates.value = templatesRes.data.data?.items || []
    }
    
    if (botsRes.data.success) {
      botPricing.value = botsRes.data.data?.items || []
    }
    
    if (agentsRes.data.success) {
      agentPricing.value = agentsRes.data.data?.items || []
    }
    
    // 更新统计数据
    updatePriceStats()
  } catch (error) {
    console.error('加载价格数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 更新价格统计
const updatePriceStats = () => {
  const activeTemplates = priceTemplates.value.filter(t => t.is_active)
  const avgPrice = activeTemplates.length > 0 
    ? (activeTemplates.reduce((sum, t) => sum + t.base_price, 0) / activeTemplates.length).toFixed(2)
    : '0.00'
  const maxDiscount = activeTemplates.length > 0
    ? Math.max(...activeTemplates.map(t => t.discount_rate))
    : 0
  
  priceStats.value[0].value = activeTemplates.length
  priceStats.value[1].value = avgPrice
  priceStats.value[2].value = `${maxDiscount}%`
}

// 刷新数据
const refreshPricing = () => {
  loadPricingData()
}

// 模板管理
const showCreateTemplateModal = () => {
  editingTemplate.value = null
  resetTemplateForm()
  showTemplateModal.value = true
}

const editTemplate = (template: any) => {
  editingTemplate.value = template
  Object.assign(templateForm, template)
  showTemplateModal.value = true
  showTemplateMenu.value = ''
}

const closeTemplateModal = () => {
  showTemplateModal.value = false
  editingTemplate.value = null
  resetTemplateForm()
}

const resetTemplateForm = () => {
  Object.assign(templateForm, {
    name: '',
    base_price: 0,
    min_amount: 0,
    max_amount: 0,
    discount_rate: 0,
    description: '',
    is_active: true
  })
}

const saveTemplate = async () => {
  try {
    isSaving.value = true
    
    let response
    if (editingTemplate.value) {
      response = await pricingAPI.updateTemplate(editingTemplate.value.id, templateForm)
    } else {
      response = await pricingAPI.createTemplate(templateForm)
    }
    
    if (response.data.success) {
      await loadPricingData()
      closeTemplateModal()
    }
  } catch (error) {
    console.error('保存模板失败:', error)
  } finally {
    isSaving.value = false
  }
}

const toggleTemplateStatus = async (template: any) => {
  try {
    const response = await pricingAPI.updateTemplate(template.id, {
      is_active: !template.is_active
    })
    
    if (response.data.success) {
      template.is_active = !template.is_active
      updatePriceStats()
    }
  } catch (error) {
    console.error('更新模板状态失败:', error)
  }
  
  showTemplateMenu.value = ''
}

const deleteTemplate = async (template: any) => {
  if (!confirm(`确定要删除模板 "${template.name}" 吗？`)) {
    return
  }
  
  try {
    const response = await pricingAPI.deleteTemplate(template.id)
    
    if (response.data.success) {
      await loadPricingData()
    }
  } catch (error) {
    console.error('删除模板失败:', error)
  }
  
  showTemplateMenu.value = ''
}

const toggleTemplateMenu = (templateId: string) => {
  showTemplateMenu.value = showTemplateMenu.value === templateId ? '' : templateId
}

// 机器人定价管理
const showBotPricingModal = () => {
  // TODO: 实现机器人定价配置模态框
  console.log('显示机器人定价配置')
}

const editBotPricing = (bot: any) => {
  // TODO: 实现编辑机器人定价
  console.log('编辑机器人定价:', bot)
}

const toggleBotStatus = async (bot: any) => {
  try {
    const response = await pricingAPI.updateBotPricing(bot.id, {
      is_active: !bot.is_active
    })
    
    if (response.data.success) {
      bot.is_active = !bot.is_active
    }
  } catch (error) {
    console.error('更新机器人状态失败:', error)
  }
}

// 代理商定价管理
const showAgentPricingModal = () => {
  // TODO: 实现代理商定价配置模态框
  console.log('显示代理商定价配置')
}

const editAgentPricing = (agent: any) => {
  // TODO: 实现编辑代理商定价
  console.log('编辑代理商定价:', agent)
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showTemplateMenu.value = ''
  }
}

// 生命周期
onMounted(() => {
  loadPricingData()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>