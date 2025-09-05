<!--
 * 机器人网络配置弹窗
 * 职责：提供机器人网络配置的弹窗界面（参考能量池账户管理方式）
-->
<template>
  <el-dialog
    :model-value="visible"
    :title="`${botData?.name} - 网络配置`"
    width="700px"
    @close="handleClose"
    append-to-body
  >
    <div v-if="loading" class="text-center py-8">
      <el-icon class="is-loading" :size="20">
        <Loading />
      </el-icon>
      <p class="text-gray-500 mt-2">正在加载网络配置...</p>
    </div>
    
    <div v-else>
      <!-- 机器人信息 -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Connection class="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 class="font-medium text-gray-900">{{ botData?.name }}</h3>
            <p class="text-sm text-gray-500">@{{ botData?.username }}</p>
          </div>
          <div class="ml-auto">
            <el-tag :type="botData?.status === 'active' ? 'success' : 'danger'" size="small">
              {{ botData?.status === 'active' ? '运行中' : '已停止' }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 当前网络配置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">当前网络配置</h4>
        
        <div v-if="currentNetwork" class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h5 class="font-medium text-gray-900">{{ currentNetwork.network_name }}</h5>
              <el-tag 
                :type="getNetworkTypeColor(currentNetwork.network_type)" 
                size="small"
              >
                {{ getNetworkTypeText(currentNetwork.network_type) }}
              </el-tag>
              <el-tag 
                :type="currentNetwork.is_active ? 'success' : 'warning'" 
                size="small"
              >
                {{ currentNetwork.is_active ? '已激活' : '已禁用' }}
              </el-tag>
            </div>
            <div class="flex gap-2">
              <el-button 
                type="primary" 
                size="small"
                @click="showAdvancedConfig = true"
              >
                修改配置
              </el-button>
              <el-button 
                type="danger" 
                size="small"
                @click="handleRemoveNetwork"
                :loading="saving"
              >
                移除网络
              </el-button>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">RPC地址：</span>
              <span class="text-gray-900 break-all">{{ currentNetwork.rpc_url }}</span>
            </div>
            <div>
              <span class="text-gray-500">优先级：</span>
              <span class="text-gray-900">{{ currentNetwork.priority }}</span>
            </div>
            <div>
              <span class="text-gray-500">配置时间：</span>
              <span class="text-gray-900">{{ formatTime(currentNetwork.created_at) }}</span>
            </div>
            <div>
              <span class="text-gray-500">更新时间：</span>
              <span class="text-gray-900">{{ formatTime(currentNetwork.updated_at) }}</span>
            </div>
          </div>

          <!-- 测试连接 -->
          <div class="mt-4 pt-3 border-t border-gray-100">
            <el-button 
              type="success" 
              size="small"
              :icon="Connection"
              @click="handleTestConnection"
              :loading="testing"
            >
              测试连接
            </el-button>
          </div>
        </div>

        <!-- 无网络配置时 -->
        <div v-else class="border border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div class="text-gray-400 mb-3">
            <Connection :size="32" />
          </div>
          <h5 class="font-medium text-gray-900 mb-2">未配置网络</h5>
          <p class="text-gray-500 mb-4">该机器人尚未配置网络连接</p>
          <el-button 
            type="primary"
            @click="showNetworkSelection = true"
          >
            配置网络
          </el-button>
        </div>
      </div>

      <!-- 快速网络切换 -->
      <div v-if="currentNetwork" class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">快速切换网络</h4>
        <div class="grid grid-cols-1 gap-2">
          <div 
            v-for="network in availableNetworks.filter(n => n.is_active && n.id !== currentNetwork?.network_id)"
            :key="network.id"
            class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
            @click="handleQuickSwitch(network.id)"
          >
            <div class="flex items-center gap-3">
              <span class="font-medium">{{ network.name }}</span>
              <el-tag 
                :type="getNetworkTypeColor(network.network_type)" 
                size="small"
              >
                {{ getNetworkTypeText(network.network_type) }}
              </el-tag>
            </div>
            <el-button type="primary" size="small" :loading="saving">
              切换
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>

    <!-- 网络选择弹窗 -->
    <el-dialog
      :model-value="showNetworkSelection"
      title="选择网络"
      width="500px"
      @close="showNetworkSelection = false"
      append-to-body
    >
      <div class="space-y-3">
        <p class="text-gray-600">请选择要配置的网络：</p>
        
        <div class="grid gap-2">
          <div 
            v-for="network in availableNetworks.filter(n => n.is_active)"
            :key="network.id"
            class="border rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': selectedNetworkId === network.id }"
            @click="selectedNetworkId = network.id"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-900">{{ network.name }}</h4>
                <p class="text-sm text-gray-600 mt-1">{{ network.description || network.rpc_url }}</p>
              </div>
              <el-tag 
                :type="getNetworkTypeColor(network.network_type)" 
                size="small"
              >
                {{ getNetworkTypeText(network.network_type) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <el-button @click="showNetworkSelection = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSetNetwork"
            :disabled="!selectedNetworkId"
            :loading="saving"
          >
            确定配置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 高级配置弹窗 -->
    <NetworkConfigForm
      v-if="showAdvancedConfig && currentNetwork"
      :visible="showAdvancedConfig"
      :network-id="currentNetwork.network_id"
      :initial-config="currentNetwork"
      :available-networks="availableNetworks"
      @save="handleSaveAdvancedConfig"
      @cancel="showAdvancedConfig = false"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { Connection, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, watch } from 'vue'
import NetworkConfigForm from './NetworkConfigForm.vue'
import { useSingleNetworkConfig } from './useSingleNetworkConfig'

// Props
interface BotData {
  id: string
  name: string
  username: string
  status: string
}

interface Props {
  visible: boolean
  botData?: BotData | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'network-updated': []
}>()

// 本地状态
const showNetworkSelection = ref(false)
const showAdvancedConfig = ref(false)
const selectedNetworkId = ref('')

// 使用单网络配置逻辑
const {
  loading,
  saving,
  testing,
  currentNetwork,
  availableNetworks,
  refreshData,
  removeNetworkConfig,
  testNetworkConnection,
  quickSetNetwork,
  advancedSetNetwork
} = useSingleNetworkConfig(props.botData?.id || '')

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

const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
}

const handleSetNetwork = async () => {
  if (!selectedNetworkId.value) return
  
  try {
    await quickSetNetwork(selectedNetworkId.value)
    showNetworkSelection.value = false
    selectedNetworkId.value = ''
    emit('network-updated')
    ElMessage.success('网络配置成功')
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleQuickSwitch = async (networkId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要切换到这个网络吗？这将替换当前的网络配置。',
      '确认切换网络',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await quickSetNetwork(networkId)
    emit('network-updated')
    ElMessage.success('网络切换成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      // 错误已在composable中处理
    }
  }
}

const handleRemoveNetwork = async () => {
  try {
    await removeNetworkConfig()
    emit('network-updated')
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleTestConnection = async () => {
  try {
    await testNetworkConnection()
  } catch (error) {
    // 错误已在composable中处理
  }
}

const handleSaveAdvancedConfig = async (config: any) => {
  try {
    const networkId = currentNetwork.value?.network_id
    if (!networkId) return
    
    await advancedSetNetwork(networkId, config)
    showAdvancedConfig.value = false
    emit('network-updated')
    ElMessage.success('网络配置保存成功')
  } catch (error) {
    // 错误已在composable中处理
  }
}

// 监听 visible 变化
watch(() => props.visible, (newValue) => {
  if (newValue && props.botData) {
    refreshData()
  }
})

watch(() => props.botData, () => {
  if (props.visible && props.botData) {
    refreshData()
  }
})
</script>

<style scoped>
.border-blue-300 {
  border-color: #93c5fd;
}

.border-blue-500 {
  border-color: #3b82f6;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.hover\:border-blue-300:hover {
  border-color: #93c5fd;
}

.hover\:bg-blue-50:hover {
  background-color: #eff6ff;
}
</style>
