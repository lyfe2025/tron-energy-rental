<template>
  <div class="bandwidth-consumption-config">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- 左侧：配置区域 -->
      <div class="space-y-6">
        <!-- 带宽消耗配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Wifi class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">TRON转账带宽配置</h3>
              <p class="text-sm text-gray-600">配置不同类型转账的带宽消耗参数</p>
            </div>
          </div>

          <!-- TRX转账带宽 -->
          <div class="space-y-4">
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                TRX转账带宽消耗
                <el-tooltip content="TRX原生代币转账消耗的带宽" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.trx_transfer_bandwidth" 
                  :min="200" 
                  :max="1000"
                  :step="10"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">推荐值：268 bytes</p>
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                TRC10转账带宽消耗
                <el-tooltip content="TRC10代币转账消耗的带宽" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.trc10_transfer_bandwidth" 
                  :min="250" 
                  :max="1000"
                  :step="10"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">推荐值：345 bytes</p>
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                TRC20转账带宽消耗
                <el-tooltip content="TRC20代币（如USDT）转账消耗的带宽" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.trc20_transfer_bandwidth" 
                  :min="250" 
                  :max="1000"
                  :step="10"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">推荐值：345 bytes</p>
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                账户创建带宽消耗
                <el-tooltip content="创建新TRON账户消耗的带宽" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.account_create_bandwidth" 
                  :min="500" 
                  :max="2000"
                  :step="50"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">推荐值：1000 bytes</p>
            </div>
          </div>
        </div>

        <!-- 安全配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 bg-green-100 rounded-lg">
              <Shield class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 class="text-lg font-semibold text-gray-900">安全配置</h4>
              <p class="text-sm text-gray-600">带宽消耗的安全参数设置</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                安全缓冲百分比
                <el-tooltip content="为应对网络波动增加的安全缓冲" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.buffer_percentage" 
                  :min="0" 
                  :max="50"
                  :step="5"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[20px]">%</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">实际消耗 = 标准消耗 × (1 + 缓冲百分比)</p>
            </div>

            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                最大带宽上限
                <el-tooltip content="单笔交易的最大带宽限制" placement="top">
                  <HelpCircle class="w-4 h-4 text-gray-400" />
                </el-tooltip>
              </label>
              <div class="flex items-center gap-3">
                <el-input-number 
                  v-model="localConfig.max_bandwidth_limit" 
                  :min="1000" 
                  :max="10000"
                  :step="500"
                  class="flex-1"
                  @change="emitUpdate"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">防止异常情况下的过度消耗</p>
            </div>
          </div>
        </div>

        <!-- 预设值管理 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 bg-orange-100 rounded-lg">
              <Settings class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">预设值管理</h3>
              <p class="text-sm text-gray-600">快速配置常用带宽消耗值</p>
            </div>
          </div>

          <div class="space-y-3 mb-6">
            <div 
              v-for="(preset, index) in localConfig.preset_values" 
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div class="font-medium text-gray-900">{{ preset.name }}</div>
                <div class="text-sm text-gray-600">{{ preset.value }} bytes</div>
              </div>
              <div class="flex gap-2">
                <button 
                  @click="applyPreset(preset.value)"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                >
                  应用
                </button>
                <button 
                  @click="removePreset(index)"
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <el-input 
              v-model="newPreset.name" 
              placeholder="预设名称"
              class="col-span-1"
            />
            <el-input-number 
              v-model="newPreset.value" 
              placeholder="带宽值"
              :min="100"
              :max="5000"
              :step="50"
              class="col-span-1"
            />
            <button 
              @click="addPreset"
              :disabled="!newPreset.name || !newPreset.value"
              class="col-span-2 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
            >
              添加预设
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：成本计算器和优化建议 -->
      <div class="space-y-6">
        <!-- 带宽成本计算器 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 bg-purple-100 rounded-lg">
              <Calculator class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">带宽成本计算器</h3>
              <p class="text-sm text-gray-600">实时计算转账带宽成本</p>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">预估带宽消耗</span>
                <span class="text-lg font-semibold text-gray-900">{{ calculatedBandwidth.toLocaleString() }} bytes</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">TRX成本</span>
                <span class="text-lg font-semibold text-gray-900">{{ calculatedTrxCost.toFixed(6) }} TRX</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">USD成本</span>
                <span class="text-lg font-semibold text-gray-900">${{ calculatedUsdCost.toFixed(6) }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">转账类型</label>
              <el-select v-model="calculatorType" @change="calculateCost" class="w-full">
                <el-option label="TRX转账" value="trx" />
                <el-option label="TRC10转账" value="trc10" />
                <el-option label="TRC20转账" value="trc20" />
                <el-option label="账户创建" value="create" />
              </el-select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">TRX价格 (USD)</label>
              <el-input-number 
                v-model="trxPrice" 
                :min="0.01" 
                :max="10"
                :step="0.001"
                :precision="4"
                @change="calculateCost"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- 优化建议 -->
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <Lightbulb class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h4 class="text-lg font-semibold text-gray-900">优化建议</h4>
              <p class="text-sm text-gray-600">基于当前配置的智能建议</p>
            </div>
          </div>
          <div class="space-y-3">
            <div 
              v-for="suggestion in optimizationSuggestions" 
              :key="suggestion.id"
              class="flex gap-3 p-3 rounded-lg"
              :class="suggestion.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'"
            >
              <div class="flex-shrink-0">
                <component 
                  :is="suggestion.icon" 
                  class="w-5 h-5"
                  :class="suggestion.type === 'warning' ? 'text-yellow-600' : 'text-green-600'"
                />
              </div>
              <div class="flex-1">
                <h5 class="font-medium text-gray-900 mb-1">{{ suggestion.title }}</h5>
                <p class="text-sm text-gray-600">{{ suggestion.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  AlertTriangle,
  Calculator,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  Settings,
  Shield,
  Wifi
} from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import type { BandwidthConfig } from '../../types/resource-consumption.types.js'

// Props
interface Props {
  config: BandwidthConfig
}

const props = defineProps<Props>()

// Emits
const emits = defineEmits<{
  update: [config: Partial<BandwidthConfig>]
}>()

// 本地配置副本
const localConfig = reactive<BandwidthConfig>({ ...props.config })

// 计算器相关
const calculatorType = ref('trc20')
const trxPrice = ref(0.075)
const bandwidthPriceRatio = 1000 // 1000 sun per byte

// 新预设
const newPreset = reactive({
  name: '',
  value: 345
})

// 监听props变化
watch(() => props.config, (newConfig) => {
  Object.assign(localConfig, newConfig)
}, { deep: true })

// 计算预估带宽消耗
const calculatedBandwidth = computed(() => {
  let baseBandwidth = 0
  
  switch (calculatorType.value) {
    case 'trx':
      baseBandwidth = localConfig.trx_transfer_bandwidth
      break
    case 'trc10':
      baseBandwidth = localConfig.trc10_transfer_bandwidth
      break
    case 'trc20':
      baseBandwidth = localConfig.trc20_transfer_bandwidth
      break
    case 'create':
      baseBandwidth = localConfig.account_create_bandwidth
      break
  }
  
  return Math.round(baseBandwidth * (1 + localConfig.buffer_percentage / 100))
})

// 计算TRX成本
const calculatedTrxCost = computed(() => {
  return calculatedBandwidth.value * bandwidthPriceRatio / 1000000 // 转换为TRX
})

// 计算USD成本
const calculatedUsdCost = computed(() => {
  return calculatedTrxCost.value * trxPrice.value
})

// 优化建议
const optimizationSuggestions = computed(() => {
  const suggestions = []
  
  if (localConfig.buffer_percentage < 10) {
    suggestions.push({
      id: 'buffer-too-low',
      type: 'warning',
      icon: AlertTriangle,
      title: '缓冲设置过低',
      description: '建议设置至少15%的安全缓冲以应对网络波动'
    })
  }
  
  if (localConfig.trc20_transfer_bandwidth <= 345 && localConfig.buffer_percentage >= 15) {
    suggestions.push({
      id: 'config-optimal',
      type: 'success',
      icon: CheckCircle,
      title: '配置合理',
      description: '当前带宽设置符合TRON官方建议'
    })
  }
  
  return suggestions
})

// 方法
const emitUpdate = () => {
  emits('update', { ...localConfig })
}

const calculateCost = () => {
  // 触发重新计算
}

const applyPreset = (value: number) => {
  // 根据类型应用到对应字段
  switch (calculatorType.value) {
    case 'trx':
      localConfig.trx_transfer_bandwidth = value
      break
    case 'trc10':
      localConfig.trc10_transfer_bandwidth = value
      break
    case 'trc20':
      localConfig.trc20_transfer_bandwidth = value
      break
    case 'create':
      localConfig.account_create_bandwidth = value
      break
  }
  emitUpdate()
  ElMessage.success(`已应用预设值：${value} bytes`)
}

const addPreset = () => {
  if (!newPreset.name.trim() || !newPreset.value) {
    ElMessage.warning('请填写完整的预设信息')
    return
  }
  
  localConfig.preset_values.push({
    name: newPreset.name.trim(),
    value: newPreset.value
  })
  
  newPreset.name = ''
  newPreset.value = 345
  
  emitUpdate()
  ElMessage.success('预设值添加成功')
}

const removePreset = (index: number) => {
  localConfig.preset_values.splice(index, 1)
  emitUpdate()
  ElMessage.success('预设值删除成功')
}
</script>

<style scoped>
.bandwidth-consumption-config {
  @apply p-0;
}
</style>
