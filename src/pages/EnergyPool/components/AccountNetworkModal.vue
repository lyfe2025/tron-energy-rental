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
          :direct-selection="true"
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
import NetworkSelector from '@/components/NetworkSelector.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'
import { energyPoolAPI } from '@/services/api/energy-pool/energyPoolAPI'
import { validateAccountNetworkConfig } from '@/utils/networkValidation'
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
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
  } catch (error: any) {
    console.error('加载账户网络配置失败:', error)
    selectedNetworkId.value = null
    
    // 根据错误类型显示不同的提示信息
    let errorMessage = '加载账户网络配置失败'
    
    if (error.response?.status === 500) {
      // 服务器内部错误
      const serverMessage = error.response?.data?.message || '服务器内部错误'
      errorMessage = `服务器错误: ${serverMessage}`
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 404) {
      // 账户不存在
      errorMessage = '账户不存在或已被删除'
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 401) {
      // 认证失败
      errorMessage = '登录已过期，请重新登录'
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 403) {
      // 权限不足
      errorMessage = '权限不足，无法访问账户网络配置'
      ElMessage.error(errorMessage)
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      // 网络连接错误
      errorMessage = '网络连接失败，请检查网络设置'
      ElMessage.error(errorMessage)
    } else if (error.friendlyMessage) {
      // 使用API客户端提供的友好错误信息
      ElMessage.error(error.friendlyMessage)
    } else {
      // 其他未知错误
      errorMessage = `加载失败: ${error.message || '未知错误'}`
      ElMessage.error(errorMessage)
    }
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
    // 显示验证失败消息，但允许用户选择是否继续
    const errorMessage = '网络配置验证失败: ' + validationResult.errors.join('; ')
    console.warn('[AccountNetwork] 验证失败:', errorMessage)
    
    // 使用浏览器原生确认对话框
    const shouldContinue = confirm(
      errorMessage + '\n\n检测到网络配置可能存在问题，是否仍要保存此配置？\n\n' +
      '选择"确定"将强制保存配置，选择"取消"将中止操作。'
    )
    
    if (!shouldContinue) {
      ElMessage.info('已取消保存操作')
      return
    }
    
    ElMessage.warning('正在强制保存网络配置，请确保网络设置正确')
  } else if (validationResult.warnings.length > 0) {
    // 如果有警告，显示但不阻止保存
    ElMessage.warning('网络配置警告: ' + validationResult.warnings.join('; '))
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