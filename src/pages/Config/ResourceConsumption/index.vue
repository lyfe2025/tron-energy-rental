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
             <div v-else-if="activeTab === 'energy'" class="space-y-6">
               <EnergyConsumptionConfig 
                 :config="energyConfig"
                 @update="updateEnergyConfig"
                 @save="saveEnergyConfig"
               />
             </div>
      
      <!-- 带宽消耗配置 -->
      <div v-else-if="activeTab === 'bandwidth'" class="space-y-6">
        <BandwidthConsumptionConfig 
          :config="bandwidthConfig"
          @update="updateBandwidthConfig"
          @save="saveBandwidthConfig"
        />
      </div>
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

// 服务导入
import { SimpleResourceConsumptionApi } from './services/simpleApi.js'

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
  preset_values: [
    { name: '保守', value: 32000 },
    { name: '标准', value: 15000 },
    { name: '激进', value: 13000 }
  ]
})

// 带宽配置数据
const bandwidthConfig = reactive<BandwidthConfig>({
  trx_transfer_bandwidth: 268,
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
    // 并行获取能量和带宽配置
    const [newEnergyConfig, newBandwidthConfig] = await Promise.all([
      SimpleResourceConsumptionApi.getEnergyConfig(),
      SimpleResourceConsumptionApi.getBandwidthConfig()
    ])
    
    // 更新本地状态
    Object.assign(energyConfig, newEnergyConfig)
    Object.assign(bandwidthConfig, newBandwidthConfig)
    
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const updateEnergyConfig = async (newConfig: Partial<EnergyConfig>) => {
  try {
    // 更新本地状态（实时预览）
    Object.assign(energyConfig, newConfig)
  } catch (error) {
    console.error('更新能量配置失败:', error)
    ElMessage.error('更新能量配置失败，请稍后重试')
  }
}

const saveEnergyConfig = async () => {
  try {
    await SimpleResourceConsumptionApi.saveEnergyConfig(energyConfig)
    ElMessage.success('能量配置保存成功')
  } catch (error) {
    console.error('保存能量配置失败:', error)
    ElMessage.error('保存能量配置失败，请稍后重试')
  }
}

const updateBandwidthConfig = async (newConfig: Partial<BandwidthConfig>) => {
  try {
    // 更新本地状态（实时预览）
    Object.assign(bandwidthConfig, newConfig)
  } catch (error) {
    console.error('更新带宽配置失败:', error)
    ElMessage.error('更新带宽配置失败，请稍后重试')
  }
}

const saveBandwidthConfig = async () => {
  try {
    await SimpleResourceConsumptionApi.saveBandwidthConfig(bandwidthConfig)
    ElMessage.success('带宽配置保存成功')
  } catch (error) {
    console.error('保存带宽配置失败:', error)
    ElMessage.error('保存带宽配置失败，请稍后重试')
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
