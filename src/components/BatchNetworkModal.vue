<template>
  <el-dialog
    v-model="visible"
    title="批量网络关联"
    width="700px"
    :before-close="handleClose"
  >
    <div class="batch-network">
      <!-- 选中账户信息 -->
      <div class="selected-accounts mb-6">
        <h3 class="text-lg font-semibold mb-3">选中账户 ({{ selectedAccountIds.length }})</h3>
        <div class="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto">
          <div class="flex flex-wrap gap-2">
            <el-tag
              v-for="account in selectedAccountsInfo"
              :key="account.id"
              type="info"
              size="small"
            >
              {{ account.name }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 操作选择 -->
      <div class="operation-type mb-6">
        <h3 class="text-lg font-semibold mb-3">操作类型</h3>
        <el-radio-group v-model="operationType">
          <el-radio label="add">添加网络关联</el-radio>
          <el-radio label="remove">移除网络关联</el-radio>
          <el-radio label="replace">替换网络关联</el-radio>
        </el-radio-group>
        <div class="text-sm text-gray-500 mt-2">
          <span v-if="operationType === 'add'">为选中账户添加新的网络关联</span>
          <span v-else-if="operationType === 'remove'">从选中账户移除指定的网络关联</span>
          <span v-else-if="operationType === 'replace'">替换选中账户的所有网络关联</span>
        </div>
      </div>

      <!-- 网络选择 -->
      <div class="network-selection mb-6">
        <h3 class="text-lg font-semibold mb-3">网络选择</h3>
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="network in availableNetworks"
            :key="network.id"
            class="border rounded-lg p-4 cursor-pointer transition-colors"
            :class="{
              'border-blue-500 bg-blue-50': selectedNetworks.includes(network.id),
              'border-gray-200 hover:border-gray-300': !selectedNetworks.includes(network.id)
            }"
            @click="toggleNetworkSelection(network.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <el-checkbox
                  :model-value="selectedNetworks.includes(network.id)"
                  @change="toggleNetworkSelection(network.id)"
                />
                <div>
                  <div class="font-medium">{{ network.name }}</div>
                  <div class="text-sm text-gray-500">Chain ID: {{ network.chain_id }}</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <el-tag :type="network.status === 'active' ? 'success' : 'warning'" size="small">
                  {{ network.status === 'active' ? '活跃' : '非活跃' }}
                </el-tag>
                <el-tag type="info" size="small">
                  {{ network.type }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="advanced-options" v-if="operationType === 'add' || operationType === 'replace'">
        <h3 class="text-lg font-semibold mb-3">高级选项</h3>
        <div class="space-y-4">
          <div class="flex items-center space-x-4">
            <el-checkbox v-model="enableNetworks">
              立即启用关联的网络
            </el-checkbox>
          </div>
          <div class="flex items-center space-x-4">
            <el-checkbox v-model="testConnections">
              关联后测试网络连接
            </el-checkbox>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="processing"
          :disabled="selectedNetworks.length === 0"
        >
          {{ getSubmitButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Network {
  id: string
  name: string
  chain_id: string
  status: 'active' | 'inactive'
  type: string
}

interface Account {
  id: string
  name: string
  tron_address: string
}

interface Props {
  visible: boolean
  selectedAccountIds: string[]
  accounts: Account[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const operationType = ref<'add' | 'remove' | 'replace'>('add')
const selectedNetworks = ref<string[]>([])
const enableNetworks = ref(true)
const testConnections = ref(false)
const processing = ref(false)

// 模拟可用网络数据
const availableNetworks = ref<Network[]>([
  {
    id: '1',
    name: 'Mainnet',
    chain_id: '728126428',
    status: 'active',
    type: '主网'
  },
  {
    id: '2',
    name: 'Shasta Testnet',
    chain_id: '2494104990',
    status: 'active',
    type: '测试网'
  },
  {
    id: '3',
    name: 'Nile Testnet',
    chain_id: '3448148188',
    status: 'inactive',
    type: '测试网'
  }
])

// 计算属性
const selectedAccountsInfo = computed(() => {
  return props.accounts.filter(account => 
    props.selectedAccountIds.includes(account.id)
  )
})

// 监听对话框显示状态，重置表单
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetForm()
  }
})

// 方法
const resetForm = () => {
  operationType.value = 'add'
  selectedNetworks.value = []
  enableNetworks.value = true
  testConnections.value = false
}

const toggleNetworkSelection = (networkId: string) => {
  const index = selectedNetworks.value.indexOf(networkId)
  if (index > -1) {
    selectedNetworks.value.splice(index, 1)
  } else {
    selectedNetworks.value.push(networkId)
  }
}

const getSubmitButtonText = () => {
  switch (operationType.value) {
    case 'add':
      return '添加关联'
    case 'remove':
      return '移除关联'
    case 'replace':
      return '替换关联'
    default:
      return '确定'
  }
}

const handleSubmit = async () => {
  if (selectedNetworks.value.length === 0) {
    ElMessage.warning('请选择至少一个网络')
    return
  }

  // 确认操作
  const confirmMessage = getConfirmMessage()
  try {
    await ElMessageBox.confirm(confirmMessage, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  processing.value = true
  try {
    // 模拟批量操作
    await performBatchOperation()
    
    ElMessage.success('批量操作完成')
    emit('updated')
    handleClose()
  } catch (error) {
    ElMessage.error('批量操作失败')
  } finally {
    processing.value = false
  }
}

const getConfirmMessage = () => {
  const accountCount = props.selectedAccountIds.length
  const networkCount = selectedNetworks.value.length
  const networkNames = selectedNetworks.value
    .map(id => availableNetworks.value.find(n => n.id === id)?.name)
    .join('、')

  switch (operationType.value) {
    case 'add':
      return `确定为 ${accountCount} 个账户添加 ${networkCount} 个网络关联（${networkNames}）吗？`
    case 'remove':
      return `确定从 ${accountCount} 个账户移除 ${networkCount} 个网络关联（${networkNames}）吗？`
    case 'replace':
      return `确定替换 ${accountCount} 个账户的网络关联为 ${networkCount} 个网络（${networkNames}）吗？这将移除现有的所有关联。`
    default:
      return '确定执行此操作吗？'
  }
}

const performBatchOperation = async () => {
  const totalSteps = props.selectedAccountIds.length
  let completedSteps = 0

  for (const accountId of props.selectedAccountIds) {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 这里应该调用实际的API
    switch (operationType.value) {
      case 'add':
        await addNetworksToAccount(accountId)
        break
      case 'remove':
        await removeNetworksFromAccount(accountId)
        break
      case 'replace':
        await replaceAccountNetworks(accountId)
        break
    }
    
    completedSteps++
    
    // 可以在这里更新进度
    console.log(`Progress: ${completedSteps}/${totalSteps}`)
  }

  // 如果启用了连接测试
  if (testConnections.value && (operationType.value === 'add' || operationType.value === 'replace')) {
    await testNetworkConnections()
  }
}

const addNetworksToAccount = async (accountId: string) => {
  // 模拟添加网络关联
  console.log(`Adding networks ${selectedNetworks.value} to account ${accountId}`)
}

const removeNetworksFromAccount = async (accountId: string) => {
  // 模拟移除网络关联
  console.log(`Removing networks ${selectedNetworks.value} from account ${accountId}`)
}

const replaceAccountNetworks = async (accountId: string) => {
  // 模拟替换网络关联
  console.log(`Replacing networks for account ${accountId} with ${selectedNetworks.value}`)
}

const testNetworkConnections = async () => {
  // 模拟测试网络连接
  console.log('Testing network connections...')
  await new Promise(resolve => setTimeout(resolve, 2000))
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.batch-network {
  max-height: 600px;
  overflow-y: auto;
}

.selected-accounts {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 1rem;
}

.network-selection .border {
  transition: all 0.2s ease;
}

.network-selection .border:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>