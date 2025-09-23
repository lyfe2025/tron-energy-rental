<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEdit ? '编辑网络' : '添加网络'"
    width="900px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="space-y-4"
    >
      <!-- 基本信息 -->
      <BasicNetworkForm 
        v-model="basicForm"
      />

      <!-- 连接配置 -->
      <ConnectionConfigForm 
        ref="connectionRef"
        v-model="connectionForm"
        :is-edit="isEdit"
        :network-id="networkData?.id"
        @test-connection="handleTestConnection"
      />

      <!-- 合约地址配置 -->
      <ContractAddressManager 
        v-model="contractAddresses"
      />

      <!-- 描述 -->
      <div class="w-full">
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入网络描述（可选）"
            maxlength="200"
            show-word-limit
            class="w-full"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="flex justify-between">
        <div>
          <el-button @click="showAdvanced = !showAdvanced" text>
            <Settings class="w-4 h-4 mr-1" />
            {{ showAdvanced ? '隐藏' : '显示' }}高级选项
          </el-button>
        </div>
        <div class="space-x-3">
          <el-button @click="handleClose">取消</el-button>
          <el-button @click="handleTestClick" :loading="testing">
            <Zap class="w-4 h-4 mr-1" />
            测试连接
          </el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </div>
    </template>

    <!-- 高级配置对话框 -->
    <AdvancedConfigDialog
      v-model:visible="showAdvanced"
      v-model="advancedForm"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { useToast } from '@/composables/useToast'
import { type FormInstance, type FormRules } from 'element-plus'
import { Settings, Zap } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import AdvancedConfigDialog from './AdvancedConfigDialog.vue'
import BasicNetworkForm from './BasicNetworkForm.vue'
import ConnectionConfigForm from './ConnectionConfigForm.vue'
import ContractAddressManager from './ContractAddressManager.vue'

import type {
    AdvancedConfigData,
    BasicNetworkFormData,
    ConnectionConfigData,
    ContractAddress,
    NetworkFormData
} from './types'

interface Props {
  visible: boolean
  networkData?: any | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { success, error } = useToast()

const formRef = ref<FormInstance>()
const connectionRef = ref()
const submitting = ref(false)
const testing = ref(false)
const showAdvanced = ref(false)

// 表单数据分组
const basicForm = ref<BasicNetworkFormData>({
  name: '',
  chain_id: '',
  network_type: 'mainnet',
  is_active: true
})

const connectionForm = ref<ConnectionConfigData>({
  rpc_url: '',
  api_key: '',
  timeout_ms: 30000,
  retry_count: 3,
  priority: 1
})

const advancedForm = ref<AdvancedConfigData>({
  explorer_url: '',
  health_check_url: '',
  rate_limit: 10,
  is_default: false
})

const contractAddresses = ref<ContractAddress[]>([])

// 合并的表单数据（向后兼容）
const form = computed<NetworkFormData>(() => ({
  ...basicForm.value,
  ...connectionForm.value,
  ...advancedForm.value,
  description: description.value
}))

const description = ref('')

const isEdit = computed(() => !!props.networkData)

const rules: FormRules = {
  name: [
    { required: true, message: '请输入网络名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  network_type: [
    { required: true, message: '请选择网络类型', trigger: 'change' }
  ],
  chain_id: [
    { required: true, message: '请输入Chain ID', trigger: 'blur' }
  ],
  rpc_url: [
    { required: true, message: '请输入RPC地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: 'RPC地址必须以http://或https://开头', trigger: 'blur' }
  ],
  api_key: [
    { required: true, message: '请输入API Key', trigger: 'blur' }
  ]
}

// 监听网络数据变化，填充表单
watch(() => props.networkData, (newData) => {
  if (newData && props.visible) {
    // 填充基本信息
    basicForm.value = {
      name: newData.name || '',
      chain_id: String(newData.chain_id || ''),
      network_type: newData.type || newData.network_type || 'mainnet',
      is_active: newData.is_active ?? true
    }
    
    // 填充连接配置
    connectionForm.value = {
      rpc_url: newData.rpc_url || '',
      api_key: newData.api_key || '',
      timeout_ms: newData.timeout_ms || 30000,
      retry_count: newData.retry_count || 3,
      priority: newData.priority || 1
    }
    
    // 填充高级配置
    advancedForm.value = {
      explorer_url: newData.explorer_url || newData.block_explorer_url || '',
      health_check_url: newData.health_check_url || '',
      rate_limit: newData.rate_limit || newData.rate_limit_per_second || 10,
      is_default: newData.is_default || false
    }
    
    description.value = newData.description || ''
    
    // 加载合约地址配置
    loadContractAddresses(newData)
  } else if (!newData) {
    // 重置表单
    resetForm()
  }
}, { immediate: true })

// 重置表单
watch(() => props.visible, (visible) => {
  if (visible && !props.networkData) {
    resetForm()
  }
  if (!visible) {
    showAdvanced.value = false
  }
})

const resetForm = () => {
  basicForm.value = {
    name: '',
    chain_id: '',
    network_type: 'mainnet',
    is_active: true
  }
  
  connectionForm.value = {
    rpc_url: '',
    api_key: '',
    timeout_ms: 30000,
    retry_count: 3,
    priority: 1
  }
  
  advancedForm.value = {
    explorer_url: '',
    health_check_url: '',
    rate_limit: 10,
    is_default: false
  }
  
  description.value = ''
  contractAddresses.value = []
}

// 加载合约地址配置
const loadContractAddresses = (networkData: any) => {
  const contracts: ContractAddress[] = []
  
  if (networkData?.config?.contract_addresses) {
    for (const [symbol, contractData] of Object.entries(networkData.config.contract_addresses)) {
      const data = contractData as any
      contracts.push({
        symbol,
        name: data.name || '',
        address: data.address || '',
        decimals: data.decimals || 6,
        type: data.type || 'TRC20',
        is_active: data.is_active ?? true,
        description: data.description || '',
        source: data.source || ''
      })
    }
  }
  
  contractAddresses.value = contracts
}

// 处理连接测试
const handleTestConnection = async (testData: { rpc_url: string; api_key: string; timeout: number }) => {
  testing.value = true
  
  try {
    let response
    if (isEdit.value && props.networkData) {
      // 编辑模式：测试现有网络
      response = await networkApi.testNetwork(props.networkData.id)
    } else {
      // 添加模式：测试RPC连接
      response = await networkApi.testConnection(testData)
    }

    let testResult
    if (response.success && response.data) {
      testResult = {
        success: response.data.status === 'healthy',
        response_time_ms: response.data.response_time_ms,
        network_name: response.data.network_name,
        status: response.data.status
      }
    } else {
      testResult = {
        success: false,
        error: response.message || '连接测试失败'
      }
    }
    
    // 设置测试结果到连接配置组件
    if (connectionRef.value) {
      connectionRef.value.setTestResult(testResult)
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    if (connectionRef.value) {
      connectionRef.value.setTestResult({
        success: false,
        error: '连接测试失败，请检查网络配置'
      })
    }
  } finally {
    testing.value = false
  }
}

const handleTestClick = () => {
  handleTestConnection({
    rpc_url: connectionForm.value.rpc_url,
    api_key: connectionForm.value.api_key,
    timeout: connectionForm.value.timeout_ms
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    // 准备合约地址配置
    const contractConfig: { [key: string]: any } = {}
    contractAddresses.value.forEach(contract => {
      if (contract.symbol && contract.address) {
        contractConfig[contract.symbol] = {
          address: contract.address,
          symbol: contract.symbol,
          name: contract.name,
          decimals: contract.decimals,
          type: contract.type,
          is_active: contract.is_active,
          description: contract.description,
          source: contract.source,
          added_at: new Date().toISOString()
        }
      }
    })

    const submitData = {
      name: basicForm.value.name,
      network_type: basicForm.value.network_type,
      type: basicForm.value.network_type,
      rpc_url: connectionForm.value.rpc_url,
      api_key: connectionForm.value.api_key,
      chain_id: parseInt(basicForm.value.chain_id),
      description: description.value,
      is_active: basicForm.value.is_active,
      timeout_ms: connectionForm.value.timeout_ms,
      retry_count: connectionForm.value.retry_count,
      priority: connectionForm.value.priority,
      block_explorer_url: advancedForm.value.explorer_url,
      explorer_url: advancedForm.value.explorer_url,
      health_check_url: advancedForm.value.health_check_url,
      rate_limit_per_second: advancedForm.value.rate_limit,
      rate_limit: advancedForm.value.rate_limit,
      is_default: advancedForm.value.is_default,
      config: {
        contract_addresses: contractConfig
      }
    }

    let response
    if (isEdit.value && props.networkData) {
      response = await networkApi.updateNetwork(props.networkData.id, submitData)
    } else {
      response = await networkApi.createNetwork(submitData)
    }

    if (response.success) {
      success(isEdit.value ? '网络更新成功' : '网络创建成功')
      emit('success')
      handleClose()
    } else {
      error(response.message || (isEdit.value ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    console.error('提交失败:', error)
    error(isEdit.value ? '网络更新失败' : '网络创建失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}
</style>
