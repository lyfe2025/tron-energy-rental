<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">设置账户网络</h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600 mb-4">
          为账户 "{{ account?.name }}" 设置网络配置
        </p>
        
        <!-- 网络选择器 -->
        <NetworkSelector
          v-model="selectedNetworkId"
          label="选择网络"
          description="选择该账户要使用的TRON网络"
          :required="true"
        />
        
        <!-- 网络状态显示 -->
        <div v-if="selectedNetworkId" class="mt-3">
          <NetworkStatus
            :network-id="selectedNetworkId"
            :show-details="true"
            :auto-refresh="false"
          />
        </div>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          type="button" 
          @click="handleClose"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button 
          @click="handleSubmit"
          :disabled="!selectedNetworkId || loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import NetworkSelector from '@/components/NetworkSelector.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'
import { energyPoolAPI } from '@/services/api/energy-pool/energyPoolAPI'
import { validateAccountNetworkConfig, formatValidationResult } from '@/utils/networkValidation'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'

interface Props {
  visible: boolean
  account: EnergyPoolAccount | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedNetworkId = ref<string | null>(null)
const loading = ref(false)
const isValidatingNetwork = ref(false)
const networkValidationResult = ref(null)

// 监听弹窗显示状态和账户变化
watch([() => props.visible, () => props.account], async ([newVisible, newAccount]) => {
  if (newVisible && newAccount) {
    // 加载当前账户的网络配置
    await loadAccountNetwork()
  }
})

// 监听网络选择变化并进行验证
watch(selectedNetworkId, async (newNetworkId) => {
  if (newNetworkId && props.account?.id) {
    await validateNetworkSelection(newNetworkId)
  }
})

// 验证网络选择
const validateNetworkSelection = async (networkId: string) => {
  if (!props.account?.id) return
  
  isValidatingNetwork.value = true
  networkValidationResult.value = null
  
  try {
    const result = await validateAccountNetworkConfig(props.account.id, networkId)
    networkValidationResult.value = result
    
    if (!result.isValid) {
      ElMessage.error('网络配置验证失败: ' + result.errors.join('; '))
    } else if (result.warnings.length > 0) {
      ElMessage.warning('网络配置警告: ' + result.warnings.join('; '))
    }
  } catch (error: any) {
    console.error('Network validation error:', error)
    ElMessage.error('网络验证失败: ' + error.message)
  } finally {
    isValidatingNetwork.value = false
  }
}

// 加载账户网络配置
const loadAccountNetwork = async () => {
  if (!props.account) return
  
  try {
    const response = await energyPoolAPI.getAccountNetwork(props.account.id)
    selectedNetworkId.value = response.data?.data?.network_id || null
  } catch (error) {
    console.error('加载账户网络配置失败:', error)
    selectedNetworkId.value = null
  }
}

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
  selectedNetworkId.value = null
}

// 处理提交
const handleSubmit = async () => {
  if (!props.account || !selectedNetworkId.value) {
    ElMessage.warning('请选择网络')
    return
  }
  
  // 进行最终验证
  const validationResult = await validateAccountNetworkConfig(props.account.id, selectedNetworkId.value)
  
  if (!validationResult.isValid) {
    ElMessage.error('网络配置验证失败，无法保存: ' + validationResult.errors.join('; '))
    return
  }
  
  loading.value = true
  try {
    await energyPoolAPI.setAccountNetwork(props.account.id, {
      network_id: selectedNetworkId.value
    })
    
    ElMessage.success('网络设置成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('网络设置失败:', error)
    ElMessage.error('网络设置失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 组件样式 */
</style>