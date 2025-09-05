<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">批量网络设置</h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            选择网络
          </label>
          <select 
            v-model="selectedNetworkId" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">请选择网络</option>
            <option 
              v-for="network in networks" 
              :key="network.id" 
              :value="network.id"
            >
              {{ network.network_name }} ({{ network.display_name }})
            </option>
          </select>
          
          <!-- 网络验证状态 -->
          <div v-if="isValidatingNetwork" class="mt-2 text-sm text-gray-600">
            <i class="el-icon-loading"></i> 正在验证网络配置...
          </div>
          
          <!-- 验证结果摘要 -->
          <div v-if="validationResults.length > 0 && !isValidatingNetwork" class="mt-2">
            <div class="text-sm">
              <div v-if="validationResults.filter(r => !r.isValid).length > 0" class="text-red-600 mb-1">
                ❌ {{ validationResults.filter(r => !r.isValid).length }} 个账户验证失败
              </div>
              <div v-if="validationResults.filter(r => r.isValid && r.warnings.length > 0).length > 0" class="text-yellow-600 mb-1">
                ⚠️ {{ validationResults.filter(r => r.isValid && r.warnings.length > 0).length }} 个账户有警告
              </div>
              <div v-if="validationResults.filter(r => r.isValid && r.warnings.length === 0).length > 0" class="text-green-600">
                ✅ {{ validationResults.filter(r => r.isValid && r.warnings.length === 0).length }} 个账户验证通过
              </div>
            </div>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            选择的账户数量: {{ selectedAccounts.length }}
          </label>
          <div class="text-sm text-gray-600">
            将为选中的 {{ selectedAccounts.length }} 个账户设置为所选网络
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
            type="submit" 
            :disabled="!selectedNetworkId || loading || isValidatingNetwork || validationResults.filter(r => !r.isValid).length > 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading || isValidatingNetwork ? '处理中...' : '确认设置' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { networkApi } from '@/api/network'
import { energyPoolAPI } from '@/services/api/energy-pool/energyPoolAPI'
import { batchValidateNetworkConfig, formatValidationResult } from '@/utils/networkValidation'
import type { TronNetwork } from '@/types/network'

interface Props {
  visible: boolean
  selectedAccounts: any[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedNetworkId = ref('')
const networks = ref<TronNetwork[]>([])
const loading = ref(false)
const isValidatingNetwork = ref(false)
const validationResults = ref([])

// 监听弹窗显示状态，加载网络列表
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await loadNetworks()
    selectedNetworkId.value = ''
  }
})

// 加载网络列表
const loadNetworks = async () => {
  try {
    const response = await networkApi.getNetworks()
    // 处理API响应数据结构
    if (response.data && Array.isArray(response.data)) {
      networks.value = response.data
    } else if (response.data && response.data.networks) {
      networks.value = response.data.networks
    } else {
      networks.value = []
    }
  } catch (error) {
    console.error('加载网络列表失败:', error)
    ElMessage.error('加载网络列表失败')
  }
}

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
}

// 监听网络选择变化并进行验证
watch(selectedNetworkId, async (newNetworkId) => {
  if (newNetworkId && props.selectedAccounts && props.selectedAccounts.length > 0) {
    await validateBatchNetworkSelection(newNetworkId)
  }
})

// 验证批量网络选择
const validateBatchNetworkSelection = async (networkId: string) => {
  if (!props.selectedAccounts || props.selectedAccounts.length === 0) return
  
  isValidatingNetwork.value = true
  validationResults.value = []
  
  try {
    const validations = props.selectedAccounts.map(account => ({
      type: 'account' as const,
      id: account.id,
      networkId: networkId
    }))
    
    const results = await batchValidateNetworkConfig(validations)
    validationResults.value = results
    
    const failedCount = results.filter(r => !r.isValid).length
    const warningCount = results.filter(r => r.isValid && r.warnings.length > 0).length
    
    if (failedCount > 0) {
      ElMessage.error(`${failedCount} 个账户的网络配置验证失败`)
    } else if (warningCount > 0) {
      ElMessage.warning(`${warningCount} 个账户的网络配置存在警告`)
    }
  } catch (error: any) {
    console.error('Batch network validation error:', error)
    ElMessage.error('批量网络验证失败')
  } finally {
    isValidatingNetwork.value = false
  }
}

// 处理提交
const handleSubmit = async () => {
  if (!selectedNetworkId.value || props.selectedAccounts.length === 0) {
    ElMessage.warning('请选择网络和账户')
    return
  }
  
  // 进行最终验证
  await validateBatchNetworkSelection(selectedNetworkId.value)
  
  const failedValidations = validationResults.value.filter(r => !r.isValid)
  if (failedValidations.length > 0) {
    ElMessage.error(`部分账户网络配置验证失败，无法继续。${failedValidations.length} 个账户验证失败`)
    return
  }
  
  loading.value = true
  try {
    // 批量设置账户网络
    const accountIds = props.selectedAccounts.map(account => account.id)
    await energyPoolAPI.batchSetAccountNetwork({
      networkId: selectedNetworkId.value,
      accountIds
    })
    
    ElMessage.success(`成功为 ${props.selectedAccounts.length} 个账户设置网络`)
    emit('success')
    handleClose()
  } catch (error) {
    console.error('批量设置失败:', error)
    ElMessage.error('批量设置失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 组件样式 */
</style>