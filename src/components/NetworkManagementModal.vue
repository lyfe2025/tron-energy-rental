<template>
  <el-dialog
    v-model="visible"
    title="网络管理"
    width="800px"
    :before-close="handleClose"
  >
    <div class="network-management">
      <!-- 账户信息 -->
      <div class="account-info mb-6">
        <h3 class="text-lg font-semibold mb-2">账户信息</h3>
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-gray-600">账户名称：</span>
              <span class="font-medium">{{ account?.name }}</span>
            </div>
            <div>
              <span class="text-gray-600">TRON地址：</span>
              <span class="font-mono text-sm">{{ account?.tron_address }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 已关联网络 -->
      <div class="associated-networks mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">已关联网络</h3>
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>
            添加网络
          </el-button>
        </div>
        
        <div v-if="associatedNetworks.length === 0" class="text-center py-8 text-gray-500">
          <el-icon size="48" class="mb-2"><Network /></el-icon>
          <p>暂无关联网络</p>
        </div>
        
        <div v-else class="space-y-3">
          <div
            v-for="network in associatedNetworks"
            :key="network.id"
            class="border rounded-lg p-4 flex justify-between items-center"
          >
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <el-tag :type="network.status === 'active' ? 'success' : 'warning'">
                  {{ network.status === 'active' ? '活跃' : '非活跃' }}
                </el-tag>
                <span class="font-medium">{{ network.name }}</span>
              </div>
              <div class="text-sm text-gray-500">
                Chain ID: {{ network.chain_id }}
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <el-switch
                v-model="network.enabled"
                @change="toggleNetwork(network)"
                :loading="network.loading"
              />
              <el-button
                size="small"
                @click="testConnection(network)"
                :loading="network.testing"
              >
                测试连接
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="removeNetwork(network)"
              >
                移除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加网络对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加网络关联"
      width="600px"
      append-to-body
    >
      <div class="add-network">
        <el-form :model="addForm" label-width="100px">
          <el-form-item label="选择网络">
            <el-select
              v-model="addForm.networkId"
              placeholder="请选择要关联的网络"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="network in availableNetworks"
                :key="network.id"
                :label="network.name"
                :value="network.id"
                :disabled="isNetworkAssociated(network.id)"
              >
                <div class="flex justify-between items-center">
                  <span>{{ network.name }}</span>
                  <el-tag v-if="isNetworkAssociated(network.id)" type="info" size="small">
                    已关联
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="启用状态">
            <el-switch v-model="addForm.enabled" />
            <span class="ml-2 text-sm text-gray-500">
              {{ addForm.enabled ? '立即启用' : '暂不启用' }}
            </span>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="addNetwork"
            :loading="adding"
            :disabled="!addForm.networkId"
          >
            添加
          </el-button>
        </div>
      </template>
    </el-dialog>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Link } from '@element-plus/icons-vue'

interface Network {
  id: string
  name: string
  chain_id: string
  status: 'active' | 'inactive'
  enabled: boolean
  loading?: boolean
  testing?: boolean
}

interface Account {
  id: string
  name: string
  tron_address: string
  associated_networks?: Network[]
}

interface Props {
  visible: boolean
  account: Account | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showAddDialog = ref(false)
const adding = ref(false)
const addForm = ref({
  networkId: '',
  enabled: true
})

// 模拟可用网络数据
const availableNetworks = ref([
  { id: '1', name: 'Mainnet', chain_id: '728126428' },
  { id: '2', name: 'Shasta Testnet', chain_id: '2494104990' },
  { id: '3', name: 'Nile Testnet', chain_id: '3448148188' }
])

const associatedNetworks = ref<Network[]>([])

// 计算属性
const isNetworkAssociated = (networkId: string) => {
  return associatedNetworks.value.some(network => network.id === networkId)
}

// 监听账户变化，加载关联网络
watch(() => props.account, (newAccount) => {
  if (newAccount) {
    loadAssociatedNetworks()
  }
}, { immediate: true })

// 方法
const loadAssociatedNetworks = () => {
  if (!props.account) return
  
  // 模拟加载关联网络数据
  associatedNetworks.value = props.account.associated_networks || [
    {
      id: '1',
      name: 'Mainnet',
      chain_id: '728126428',
      status: 'active',
      enabled: true
    }
  ]
}

const toggleNetwork = async (network: Network) => {
  network.loading = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success(`网络${network.enabled ? '启用' : '禁用'}成功`)
    emit('updated')
  } catch (error) {
    ElMessage.error('操作失败')
    network.enabled = !network.enabled // 回滚状态
  } finally {
    network.loading = false
  }
}

const testConnection = async (network: Network) => {
  network.testing = true
  try {
    // 模拟连接测试
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success(`${network.name} 连接测试成功`)
  } catch (error) {
    ElMessage.error(`${network.name} 连接测试失败`)
  } finally {
    network.testing = false
  }
}

const removeNetwork = async (network: Network) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    const index = associatedNetworks.value.findIndex(n => n.id === network.id)
    if (index > -1) {
      associatedNetworks.value.splice(index, 1)
    }
    ElMessage.success('网络关联已移除')
    emit('updated')
  } catch (error) {
    ElMessage.error('移除失败')
  }
}

const addNetwork = async () => {
  if (!addForm.value.networkId) return
  
  adding.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const selectedNetwork = availableNetworks.value.find(n => n.id === addForm.value.networkId)
    if (selectedNetwork) {
      associatedNetworks.value.push({
        ...selectedNetwork,
        status: 'active',
        enabled: addForm.value.enabled
      })
    }
    
    ElMessage.success('网络关联添加成功')
    showAddDialog.value = false
    addForm.value = { networkId: '', enabled: true }
    emit('updated')
  } catch (error) {
    ElMessage.error('添加失败')
  } finally {
    adding.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.network-management {
  max-height: 600px;
  overflow-y: auto;
}

.account-info {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 1rem;
}
</style>