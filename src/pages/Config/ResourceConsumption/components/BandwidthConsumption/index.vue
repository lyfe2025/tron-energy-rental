<template>
  <div class="bandwidth-consumption-config">
    <div class="max-w-6xl">
      
      <!-- 左右分栏布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <!-- 左侧：带宽消耗配置 -->
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
                  :min="getFieldMin('trx_transfer_bandwidth', config.validation_rules) || 200" 
                  :max="getFieldMax('trx_transfer_bandwidth', config.validation_rules) || 500"
                  :step="getFieldStep('trx_transfer_bandwidth')"
                  class="flex-1"
                  :class="{ 'is-error': fieldErrors.trx_transfer_bandwidth }"
                  @change="() => { validateField('trx_transfer_bandwidth'); emitUpdate(); }"
                  @blur="() => validateField('trx_transfer_bandwidth')"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.trx_transfer_bandwidth">
                {{ fieldErrors.trx_transfer_bandwidth }}
              </p>
              <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('trx_transfer_bandwidth', config.validation_rules)">
                {{ formatConfigRange('trx_transfer_bandwidth', config.validation_rules) }}
              </p>
              <p class="text-xs text-gray-500 mt-1" v-else>
                TRX原生代币转账消耗的带宽
              </p>
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
                  :min="getFieldMin('trc20_transfer_bandwidth', config.validation_rules) || 300" 
                  :max="getFieldMax('trc20_transfer_bandwidth', config.validation_rules) || 600"
                  :step="getFieldStep('trc20_transfer_bandwidth')"
                  class="flex-1"
                  :class="{ 'is-error': fieldErrors.trc20_transfer_bandwidth }"
                  @change="() => { validateField('trc20_transfer_bandwidth'); emitUpdate(); }"
                  @blur="() => validateField('trc20_transfer_bandwidth')"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.trc20_transfer_bandwidth">
                {{ fieldErrors.trc20_transfer_bandwidth }}
              </p>
              <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('trc20_transfer_bandwidth', config.validation_rules)">
                {{ formatConfigRange('trc20_transfer_bandwidth', config.validation_rules) }}
              </p>
              <p class="text-xs text-gray-500 mt-1" v-else>
                TRC20代币（如USDT）转账消耗的带宽
              </p>
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
                  :min="getFieldMin('account_create_bandwidth', config.validation_rules) || 500"
                  :max="getFieldMax('account_create_bandwidth', config.validation_rules) || 5000"
                  :step="getFieldStep('account_create_bandwidth')"
                  class="flex-1"
                  :class="{ 'is-error': fieldErrors.account_create_bandwidth }"
                  @change="() => { validateField('account_create_bandwidth'); emitUpdate(); }"
                  @blur="() => validateField('account_create_bandwidth')"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.account_create_bandwidth">
                {{ fieldErrors.account_create_bandwidth }}
              </p>
              <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('account_create_bandwidth', config.validation_rules)">
                {{ formatConfigRange('account_create_bandwidth', config.validation_rules) }}
              </p>
              <p class="text-xs text-gray-500 mt-1" v-else>
                创建新账户时消耗的带宽
              </p>
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
                  :min="getFieldMin('buffer_percentage', config.validation_rules) || 5"
                  :max="getFieldMax('buffer_percentage', config.validation_rules) || 50"
                  :step="getFieldStep('buffer_percentage')"
                  class="flex-1"
                  :class="{ 'is-error': fieldErrors.buffer_percentage }"
                  @change="() => { validateField('buffer_percentage'); emitUpdate(); }"
                  @blur="() => validateField('buffer_percentage')"
                />
                <span class="text-sm text-gray-500 min-w-[20px]">%</span>
              </div>
              <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.buffer_percentage">
                {{ fieldErrors.buffer_percentage }}
              </p>
              <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('buffer_percentage', config.validation_rules)">
                {{ formatConfigRange('buffer_percentage', config.validation_rules) }}
              </p>
              <p class="text-xs text-gray-500 mt-1" v-else>
                实际消耗 = 标准消耗 × (1 + 缓冲百分比)
              </p>
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
                  :min="getFieldMin('max_bandwidth_limit', config.validation_rules) || 1000"
                  :max="getFieldMax('max_bandwidth_limit', config.validation_rules) || 20000"
                  :step="getFieldStep('max_bandwidth_limit')"
                  class="flex-1"
                  :class="{ 'is-error': fieldErrors.max_bandwidth_limit }"
                  @change="() => { validateField('max_bandwidth_limit'); emitUpdate(); }"
                  @blur="() => validateField('max_bandwidth_limit')"
                />
                <span class="text-sm text-gray-500 min-w-[50px]">bytes</span>
              </div>
              <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.max_bandwidth_limit">
                {{ fieldErrors.max_bandwidth_limit }}
              </p>
              <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('max_bandwidth_limit', config.validation_rules)">
                {{ formatConfigRange('max_bandwidth_limit', config.validation_rules) }}
              </p>
              <p class="text-xs text-gray-500 mt-1" v-else>
                防止异常情况下的过度消耗
              </p>
            </div>
          </div>
        </div>
        </div>
        
        <!-- 右侧：预设值管理 -->
        <div class="space-y-6">
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
      </div>
      
      <!-- 保存按钮 -->
      <div class="flex justify-center">
        <button 
          @click="$emit('save')"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors min-w-[200px]"
        >
          保存带宽配置
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import {
    HelpCircle,
    Settings,
    Shield,
    Wifi
} from 'lucide-vue-next'
import { reactive, ref, watch } from 'vue'
import type { BandwidthConfig } from '../../types/resource-consumption.types.js'
import { formatConfigRange, getFieldMax, getFieldMin, getFieldStep } from '../../utils/rangeDisplay.js'
import { ResourceConsumptionValidator } from '../../utils/validation.js'

// Props
interface Props {
  config: BandwidthConfig
}

const props = defineProps<Props>()

// Emits
const emits = defineEmits<{
  update: [config: Partial<BandwidthConfig>]
  save: []
}>()

// Toast 通知
const { success, error, warning } = useToast()

// 本地配置副本
const localConfig = reactive<BandwidthConfig>({ ...props.config })

// 验证相关
const validator = new ResourceConsumptionValidator()
const fieldErrors = reactive<Record<string, string>>({})
const isValidating = ref(false)

// 新预设
const newPreset = reactive({
  name: '',
  value: 345
})

// 监听props变化
watch(() => props.config, (newConfig) => {
  Object.assign(localConfig, newConfig)
}, { deep: true })

// 验证方法
const validateConfig = async (): Promise<boolean> => {
  isValidating.value = true
  const result = await ResourceConsumptionValidator.validateBandwidthConfig(
    localConfig, 
    props.config.validation_rules
  )
  
  // 清空之前的错误
  Object.keys(fieldErrors).forEach(key => {
    delete fieldErrors[key]
  })
  
  // 设置新的错误信息
  if (!result.isValid && result.errors) {
    Object.assign(fieldErrors, result.errors)
  }
  
  isValidating.value = false
  return result.isValid
}

const validateField = async (fieldName: string) => {
  const value = localConfig[fieldName as keyof BandwidthConfig]
  const result = await ResourceConsumptionValidator.validateField(
    'bandwidth', 
    fieldName, 
    value, 
    props.config.validation_rules
  )
  
  if (result.isValid) {
    delete fieldErrors[fieldName]
  } else {
    fieldErrors[fieldName] = result.errors.length > 0 ? result.errors[0].message : '验证失败'
  }
}

// 方法
const emitUpdate = async () => {
  const isValid = await validateConfig()
  if (isValid) {
    emits('update', { ...localConfig })
  }
}

const applyPreset = (value: number) => {
  // 默认应用到TRC20转账带宽
  localConfig.trc20_transfer_bandwidth = value
  emitUpdate()
  success(`已应用预设值：${value} bytes`)
}

const addPreset = async () => {
  if (!newPreset.name.trim() || !newPreset.value) {
    warning('请填写完整的预设信息')
    return
  }
  
  // 验证预设值
  const rule = ResourceConsumptionValidator.getFieldRule('bandwidth', 'trc20_transfer_bandwidth')
  if (rule && rule.min !== undefined && rule.max !== undefined && (newPreset.value < rule.min || newPreset.value > rule.max)) {
    error(`预设值必须在 ${rule.min} - ${rule.max} 之间`)
    return
  }
  
  // 检查重复
  const exists = localConfig.preset_values.some(preset => 
    preset.name === newPreset.name.trim() || preset.value === newPreset.value
  )
  
  if (exists) {
    warning('预设名称或数值已存在')
    return
  }
  
  localConfig.preset_values.push({
    name: newPreset.name.trim(),
    value: newPreset.value
  })
  
  newPreset.name = ''
  newPreset.value = 345
  
  emitUpdate()
  success('预设值添加成功')
}

const removePreset = (index: number) => {
  localConfig.preset_values.splice(index, 1)
  emitUpdate()
  success('预设值删除成功')
}
</script>

<style scoped>
.bandwidth-consumption-config {
  @apply p-0;
}

/* 验证错误样式 */
:deep(.el-input-number.is-error .el-input__wrapper) {
  border-color: #f56565 !important;
  box-shadow: 0 0 0 1px #f56565 !important;
}

:deep(.el-input-number.is-error .el-input__wrapper:hover) {
  border-color: #e53e3e !important;
}

:deep(.el-input-number.is-error .el-input__wrapper.is-focus) {
  border-color: #f56565 !important;
  box-shadow: 0 0 0 1px #f56565 !important;
}
</style>
