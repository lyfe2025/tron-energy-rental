<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">
          {{ entityType === 'bot' ? '设置机器人网络' : '设置账户网络' }}
        </h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="mb-4">
        <p class="text-sm text-gray-600 mb-4">
          为{{ entityType === 'bot' ? '机器人' : '账户' }} "{{ entityName }}" 设置网络配置
        </p>
        
        <!-- 网络选择器 -->
        <NetworkSelector
          v-model="selectedNetworkId"
          label="选择网络"
          :description="entityType === 'bot' ? '选择该机器人要使用的TRON网络' : '选择该账户要使用的TRON网络'"
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
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :type="confirmDialogConfig.type"
      @close="handleConfirmDialogClose"
      @confirm="confirmDialogConfig.onConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NetworkSelector from '@/components/NetworkSelector.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { validateAccountNetworkConfig } from '@/utils/networkValidation'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'

// 实体类型定义
type EntityType = 'bot' | 'account'

// 实体数据接口
interface EntityData {
  id: string
  name: string
}

interface Props {
  visible: boolean
  entityType: EntityType
  entityData: EntityData | null
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

// 确认对话框状态
const showConfirmDialog = ref(false)
const confirmDialogConfig = ref({
  title: '',
  message: '',
  type: 'warning' as 'warning' | 'danger' | 'info',
  onConfirm: () => {}
})

// 计算属性
const entityName = computed(() => props.entityData?.name || '')

// 监听弹窗显示状态和实体数据变化
watch([() => props.visible, () => props.entityData], async ([newVisible, newEntityData]) => {
  if (newVisible && newEntityData) {
    // 加载当前实体的网络配置
    await loadEntityNetwork()
  }
})

// 监听网络选择变化并进行验证
watch(selectedNetworkId, async (newNetworkId) => {
  if (newNetworkId && props.entityData?.id) {
    await validateNetworkSelection(newNetworkId)
  }
})

// 验证网络选择
const validateNetworkSelection = async (networkId: string) => {
  if (!props.entityData?.id) return
  
  // 只对账户类型进行网络验证，机器人类型暂时跳过验证
  if (props.entityType !== 'account') return
  
  isValidatingNetwork.value = true
  networkValidationResult.value = null
  
  try {
    const result = await validateAccountNetworkConfig(props.entityData.id, networkId)
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

// 加载实体网络配置
const loadEntityNetwork = async () => {
  if (!props.entityData) return
  
  try {
    let response
    
    if (props.entityType === 'account') {
      // 由于energy_pools表已移除network_id字段，账户不再有网络配置
      // 直接设置为null，表示无网络绑定
      selectedNetworkId.value = null
    } else if (props.entityType === 'bot') {
      // 机器人网络配置获取逻辑
      response = await botsAPI.getBotNetwork(props.entityData.id)
      selectedNetworkId.value = response.data?.data?.network?.network_id || null
    }
  } catch (error: any) {
    console.error('加载实体网络配置失败:', error)
    selectedNetworkId.value = null
    
    // 根据错误类型显示不同的提示信息
    let errorMessage = `加载${props.entityType === 'bot' ? '机器人' : '账户'}网络配置失败`
    
    if (error.response?.status === 500) {
      const serverMessage = error.response?.data?.message || '服务器内部错误'
      errorMessage = `服务器错误: ${serverMessage}`
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 404) {
      errorMessage = `${props.entityType === 'bot' ? '机器人' : '账户'}不存在或已被删除`
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录'
      ElMessage.error(errorMessage)
    } else if (error.response?.status === 403) {
      errorMessage = `权限不足，无法访问${props.entityType === 'bot' ? '机器人' : '账户'}网络配置`
      ElMessage.error(errorMessage)
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      errorMessage = '网络连接失败，请检查网络设置'
      ElMessage.error(errorMessage)
    } else if (error.friendlyMessage) {
      ElMessage.error(error.friendlyMessage)
    } else {
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
  if (!props.entityData || !selectedNetworkId.value) {
    ElMessage.warning('请选择网络')
    return
  }
  
  // 对账户类型进行最终验证
  if (props.entityType === 'account') {
    const validationResult = await validateAccountNetworkConfig(props.entityData.id, selectedNetworkId.value)
    
    if (!validationResult.isValid) {
      const errorMessage = '网络配置验证失败: ' + validationResult.errors.join('; ')
      console.warn('[NetworkConfig] 验证失败:', errorMessage)
      
      // 使用ConfirmDialog替代原生confirm
      confirmDialogConfig.value = {
        title: '网络配置验证失败',
        message: errorMessage + '\n\n检测到网络配置可能存在问题，是否仍要保存此配置？\n\n选择"确定"将强制保存配置，选择"取消"将中止操作。',
        type: 'warning',
        onConfirm: async () => {
          showConfirmDialog.value = false
          ElMessage.warning('正在强制保存网络配置，请确保网络设置正确')
          await performNetworkSave()
        }
      }
      showConfirmDialog.value = true
      return
    } else if (validationResult.warnings.length > 0) {
      ElMessage.warning('网络配置警告: ' + validationResult.warnings.join('; '))
    }
  }
  
  loading.value = true
  try {
    await performNetworkSave()
  } catch (error) {
    console.error('[NetworkConfig] 提交过程出错:', error)
    ElMessage.error('操作失败，请重试')
    loading.value = false
  }
}

// 执行网络配置保存的独立函数
const performNetworkSave = async () => {
  try {
    if (props.entityType === 'account') {
      // 由于energy_pools表已移除network_id字段，此功能不再需要
      // 直接返回成功，因为账户不再需要绑定特定网络
      console.log('账户网络设置已跳过，因为不再需要network_id字段')
    } else if (props.entityType === 'bot') {
      await botsAPI.setBotNetwork(props.entityData.id, {
        network_id: selectedNetworkId.value
      })
    }
    
    console.log('✅ [NetworkConfig] 网络设置成功，准备触发success事件')
    ElMessage.success('网络设置成功')
    emit('success')
    handleClose()
    console.log('🔔 [NetworkConfig] success事件已触发，弹窗已关闭')
  } catch (error) {
    console.error('[NetworkConfig] 保存失败:', error)
    ElMessage.error('保存网络配置失败，请重试')
  } finally {
    loading.value = false
  }
}

// 确认对话框关闭处理
const handleConfirmDialogClose = () => {
  showConfirmDialog.value = false
  ElMessage.info('已取消保存操作')
}
</script>

<style scoped>
/* 组件样式 */
</style>