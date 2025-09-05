<!--
 * 网络配置表单组件
 * 职责：处理机器人网络的高级配置设置
-->
<template>
  <el-dialog
    :model-value="visible"
    title="网络高级配置"
    width="700px"
    @close="$emit('cancel')"
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="left"
    >
      <!-- 基础配置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">基础配置</h4>
        
        <el-form-item label="目标网络" prop="network_id">
          <el-select
            v-model="formData.network_id"
            placeholder="请选择网络"
            class="w-full"
            :disabled="!!initialConfig"
          >
            <el-option
              v-for="network in availableNetworks"
              :key="network.id"
              :label="network.name"
              :value="network.id"
              :disabled="!network.is_active"
            >
              <div class="flex items-center justify-between w-full">
                <span>{{ network.name }}</span>
                <el-tag 
                  :type="getNetworkTypeColor(network.network_type)" 
                  size="small"
                >
                  {{ getNetworkTypeText(network.network_type) }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </div>

      <!-- API设置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">API设置</h4>
        
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="请求超时(秒)">
              <el-input-number
                v-model="formData.api_settings.timeout"
                :min="1"
                :max="300"
                placeholder="默认30秒"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="重试次数">
              <el-input-number
                v-model="formData.api_settings.retry_count"
                :min="0"
                :max="10"
                placeholder="默认3次"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="重试间隔(毫秒)">
              <el-input-number
                v-model="formData.api_settings.retry_delay"
                :min="100"
                :max="10000"
                :step="100"
                placeholder="默认1000毫秒"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="并发限制">
              <el-input-number
                v-model="formData.api_settings.concurrency_limit"
                :min="1"
                :max="100"
                placeholder="默认10"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- Gas设置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">Gas设置</h4>
        
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Gas价格(sun)">
              <el-input-number
                v-model="formData.gas_settings.gas_price"
                :min="1"
                :max="1000000"
                placeholder="默认使用网络价格"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Gas限制">
              <el-input-number
                v-model="formData.gas_settings.gas_limit"
                :min="21000"
                :max="10000000"
                placeholder="默认自动估算"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="优先级费用">
          <el-radio-group v-model="formData.gas_settings.priority">
            <el-radio label="low">低优先级</el-radio>
            <el-radio label="medium">中等优先级</el-radio>
            <el-radio label="high">高优先级</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <!-- 合约地址配置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">合约地址配置</h4>
        
        <el-form-item label="能量合约地址">
          <el-input
            v-model="formData.contract_addresses.energy_contract"
            placeholder="输入能量合约地址"
          />
        </el-form-item>
        
        <el-form-item label="带宽合约地址">
          <el-input
            v-model="formData.contract_addresses.bandwidth_contract"
            placeholder="输入带宽合约地址"
          />
        </el-form-item>
        
        <el-form-item label="TRX合约地址">
          <el-input
            v-model="formData.contract_addresses.trx_contract"
            placeholder="输入TRX合约地址"
          />
        </el-form-item>
      </div>

      <!-- 监控设置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">监控设置</h4>
        
        <el-form-item label="健康检查间隔">
          <el-select v-model="formData.monitoring_settings.health_check_interval">
            <el-option label="30秒" :value="30" />
            <el-option label="1分钟" :value="60" />
            <el-option label="5分钟" :value="300" />
            <el-option label="10分钟" :value="600" />
            <el-option label="30分钟" :value="1800" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="启用告警">
          <el-switch
            v-model="formData.monitoring_settings.enable_alerts"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        
        <el-form-item 
          v-if="formData.monitoring_settings.enable_alerts"
          label="告警阈值(%)"
        >
          <el-slider
            v-model="formData.monitoring_settings.alert_threshold"
            :min="50"
            :max="100"
            show-stops
            :marks="{ 80: '80%', 90: '90%', 95: '95%' }"
          />
        </el-form-item>
        
        <el-form-item label="日志级别">
          <el-select v-model="formData.monitoring_settings.log_level">
            <el-option label="错误" value="error" />
            <el-option label="警告" value="warn" />
            <el-option label="信息" value="info" />
            <el-option label="调试" value="debug" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 自定义配置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">自定义配置</h4>
        
        <el-form-item label="JSON配置">
          <el-input
            v-model="customConfigJson"
            type="textarea"
            :rows="6"
            placeholder='输入自定义JSON配置，例如: {"custom_field": "value"}'
            @input="validateCustomConfig"
          />
          <div v-if="customConfigError" class="text-red-500 text-sm mt-1">
            {{ customConfigError }}
          </div>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSave"
          :loading="saving"
        >
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'

// Props
interface Props {
  visible: boolean
  networkId?: string
  initialConfig?: any
  availableNetworks: Array<{
    id: string
    name: string
    network_type: string
    is_active: boolean
  }>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  save: [config: any]
  cancel: []
}>()

// 表单引用和状态
const formRef = ref<FormInstance>()
const saving = ref(false)
const customConfigJson = ref('')
const customConfigError = ref('')

// 表单数据
const formData = reactive({
  network_id: props.networkId || '',
  api_settings: {
    timeout: 30,
    retry_count: 3,
    retry_delay: 1000,
    concurrency_limit: 10
  },
  gas_settings: {
    gas_price: undefined as number | undefined,
    gas_limit: undefined as number | undefined,
    priority: 'medium' as 'low' | 'medium' | 'high'
  },
  contract_addresses: {
    energy_contract: '',
    bandwidth_contract: '',
    trx_contract: ''
  },
  monitoring_settings: {
    health_check_interval: 300,
    enable_alerts: true,
    alert_threshold: 90,
    log_level: 'info' as 'error' | 'warn' | 'info' | 'debug'
  },
  config: {} as Record<string, any>
})

// 表单验证规则
const formRules = {
  network_id: [
    { required: true, message: '请选择网络', trigger: 'change' }
  ]
}

// 工具函数
const getNetworkTypeColor = (type: string) => {
  switch (type) {
    case 'mainnet': return 'success'
    case 'testnet': return 'warning'
    case 'devnet': return 'info'
    default: return ''
  }
}

const getNetworkTypeText = (type: string) => {
  switch (type) {
    case 'mainnet': return '主网'
    case 'testnet': return '测试网'
    case 'devnet': return '开发网'
    default: return type
  }
}

// 验证自定义配置JSON
const validateCustomConfig = () => {
  customConfigError.value = ''
  
  if (!customConfigJson.value.trim()) {
    return
  }
  
  try {
    JSON.parse(customConfigJson.value)
  } catch (error) {
    customConfigError.value = 'JSON格式无效，请检查语法'
  }
}

// 初始化表单数据
const initializeFormData = () => {
  if (!props.initialConfig) return
  
  const config = props.initialConfig
  
  // 填充基础信息
  formData.network_id = config.network_id || props.networkId || ''
  
  // 填充API设置
  if (config.api_settings) {
    Object.assign(formData.api_settings, config.api_settings)
  }
  
  // 填充Gas设置
  if (config.gas_settings) {
    Object.assign(formData.gas_settings, config.gas_settings)
  }
  
  // 填充合约地址
  if (config.contract_addresses) {
    Object.assign(formData.contract_addresses, config.contract_addresses)
  }
  
  // 填充监控设置
  if (config.monitoring_settings) {
    Object.assign(formData.monitoring_settings, config.monitoring_settings)
  }
  
  // 填充自定义配置
  if (config.config && typeof config.config === 'object') {
    formData.config = { ...config.config }
    customConfigJson.value = JSON.stringify(config.config, null, 2)
  }
}

// 事件处理
const handleSave = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (customConfigError.value) {
      ElMessage.error('请修正配置错误')
      return
    }
    
    saving.value = true
    
    let customConfig = {}
    if (customConfigJson.value.trim()) {
      try {
        customConfig = JSON.parse(customConfigJson.value)
      } catch (error) {
        customConfig = {}
      }
    }
    
    const finalConfig = {
      api_settings: formData.api_settings,
      gas_settings: formData.gas_settings,
      contract_addresses: formData.contract_addresses,
      monitoring_settings: formData.monitoring_settings,
      config: { ...formData.config, ...customConfig }
    }
    
    emit('save', finalConfig)
  } catch (error) {
    ElMessage.error('请完善表单信息')
  } finally {
    saving.value = false
  }
}

// 监听变化
watch(() => props.visible, (newValue) => {
  if (newValue && props.initialConfig) {
    initializeFormData()
  }
})

watch(() => props.networkId, (newId) => {
  if (newId && !formData.network_id) {
    formData.network_id = newId
  }
})

watch(() => props.initialConfig, () => {
  if (props.visible && props.initialConfig) {
    initializeFormData()
  }
})
</script>
