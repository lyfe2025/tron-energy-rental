<template>
  <div class="resource-consumption-config">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">资源消耗配置</h1>
      <p class="text-gray-600 mt-2">配置TRON网络的能量和带宽消耗参数</p>
      <div class="flex gap-3 mt-4">
        <button 
          @click="refreshData" 
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          <RefreshCw :size="16" class="mr-2" :class="{ 'animate-spin': loading }" />
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 标签页导航 -->
    <div class="mt-6">
      <nav class="flex space-x-8 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <component :is="tab.icon" class="w-5 h-5 mr-2" />
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- 标签页内容 -->
    <div class="mt-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">正在加载配置...</span>
      </div>
      
      <!-- 能量消耗配置 -->
      <EnergyConsumptionConfig 
        v-else-if="activeTab === 'energy'"
        :config="energyConfig"
        @update="updateEnergyConfig"
      />
      
      <!-- 带宽消耗配置 -->
      <BandwidthConsumptionConfig 
        v-else-if="activeTab === 'bandwidth'"
        :config="bandwidthConfig"
        @update="updateBandwidthConfig"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
    RefreshCw,
    Wifi,
    Zap
} from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

// 组件导入
import BandwidthConsumptionConfig from './components/BandwidthConsumption/index.vue'
import EnergyConsumptionConfig from './components/EnergyConsumption/index.vue'

// 类型导入
import type {
    BandwidthConfig,
    EnergyConfig
} from './types/resource-consumption.types.js'

// 响应式数据
const activeTab = ref('energy')
const loading = ref(false)

// 标签页配置
const tabs = [
  {
    id: 'energy',
    name: '能量消耗',
    icon: Zap
  },
  {
    id: 'bandwidth',
    name: '带宽消耗',
    icon: Wifi
  }
]

// 配置数据
const energyConfig = reactive<EnergyConfig>({
  usdt_standard_energy: 15000,
  usdt_buffer_percentage: 20,
  usdt_max_energy: 30000,
  energy_price_trx_ratio: 0.00021,
  auto_optimize: true,
  preset_values: [
    { name: '保守', value: 32000 },
    { name: '标准', value: 15000 },
    { name: '激进', value: 13000 }
  ]
})

// 带宽配置数据
const bandwidthConfig = reactive<BandwidthConfig>({
  trx_transfer_bandwidth: 268,
  trc10_transfer_bandwidth: 345,
  trc20_transfer_bandwidth: 345,
  account_create_bandwidth: 1000,
  buffer_percentage: 15,
  max_bandwidth_limit: 5000,
  preset_values: [
    { name: '保守', value: 500 },
    { name: '标准', value: 345 },
    { name: '激进', value: 268 }
  ]
})

// 方法
const refreshData = async () => {
  loading.value = true
  try {
    // TODO: 调用API刷新数据
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
    console.error('Refresh data error:', error)
  } finally {
    loading.value = false
  }
}

const updateEnergyConfig = async (newConfig: Partial<EnergyConfig>) => {
  try {
    Object.assign(energyConfig, newConfig)
    // TODO: 调用API保存配置
    ElMessage.success('能量配置更新成功')
  } catch (error) {
    ElMessage.error('能量配置更新失败')
    console.error('Update energy config error:', error)
  }
}

const updateBandwidthConfig = async (newConfig: Partial<BandwidthConfig>) => {
  try {
    Object.assign(bandwidthConfig, newConfig)
    // TODO: 调用API保存配置
    ElMessage.success('带宽配置更新成功')
  } catch (error) {
    ElMessage.error('带宽配置更新失败')
    console.error('Update bandwidth config error:', error)
  }
}


// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.resource-consumption-config {
  @apply p-6;
}
</style>
