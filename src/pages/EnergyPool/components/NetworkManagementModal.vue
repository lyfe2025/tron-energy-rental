<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">网络管理</h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 操作按钮 -->
      <div class="mb-4 flex justify-between items-center">
        <div class="flex space-x-2">
          <button 
            @click="showAddForm = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            添加网络
          </button>
          <button 
            @click="loadNetworks"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            刷新
          </button>
        </div>
      </div>
      
      <!-- 添加/编辑表单 -->
      <div v-if="showAddForm || editingNetwork" class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h4 class="text-md font-medium mb-3">
          {{ editingNetwork ? '编辑网络' : '添加网络' }}
        </h4>
        <form @submit.prevent="handleSubmit">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                网络名称 *
              </label>
              <input 
                v-model="formData.name" 
                type="text" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                显示名称
              </label>
              <input 
                v-model="formData.name" 
                type="text" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="显示名称"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                完整主机地址 *
              </label>
              <input 
                v-model="formData.rpc_url" 
                type="url" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                区块浏览器URL
              </label>
              <input 
                v-model="formData.block_explorer_url" 
                type="url" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                链ID
              </label>
              <input 
                v-model.number="formData.chain_id" 
                type="number" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                网络类型
              </label>
              <select 
                v-model="formData.network_type" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mainnet">主网</option>
                <option value="testnet">测试网</option>
                <option value="private">私有网</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select 
                v-model="formData.is_active" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option :value="true">启用</option>
                <option :value="false">禁用</option>
              </select>
            </div>
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea 
              v-model="formData.description" 
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          <div class="mt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              @click="cancelEdit"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              type="submit" 
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? '保存中...' : (editingNetwork ? '更新' : '添加') }}
            </button>
          </div>
        </form>
      </div>
      
      <!-- 网络列表 -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                网络名称
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RPC URL
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="network in networks" :key="network.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ network.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getNetworkTypeClass(network.network_type)">
                  {{ getNetworkTypeLabel(network.network_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="truncate max-w-xs block" :title="network.rpc_url">
                  {{ network.rpc_url }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="network.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ network.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button 
                  @click="editNetwork(network)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  编辑
                </button>
                <button 
                  @click="toggleNetworkStatus(network)"
                  class="text-yellow-600 hover:text-yellow-900"
                >
                  {{ network.is_active ? '禁用' : '启用' }}
                </button>
                <button 
                  @click="deleteNetwork(network)"
                  class="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="networks.length === 0" class="text-center py-8 text-gray-500">
          暂无网络配置
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { networkApi } from '@/api/network'
import type { TronNetwork } from '@/types/network'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const networks = ref<TronNetwork[]>([])
const loading = ref(false)
const showAddForm = ref(false)
const editingNetwork = ref<TronNetwork | null>(null)

const formData = reactive({
  name: '',
  network_type: 'mainnet' as 'mainnet' | 'testnet' | 'private',
  rpc_url: '',
  block_explorer_url: '',
  chain_id: 0,
  description: '',
  is_active: true,
  timeout_ms: 30000,
  retry_count: 3,
  rate_limit: 10
})

// 监听弹窗显示状态
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await loadNetworks()
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
  cancelEdit()
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    network_type: 'mainnet' as 'mainnet' | 'testnet' | 'private',
    rpc_url: '',
    block_explorer_url: '',
    chain_id: 0,
    description: '',
    is_active: true,
    timeout_ms: 30000,
    retry_count: 3,
    rate_limit: 10
  })
}

// 取消编辑
const cancelEdit = () => {
  showAddForm.value = false
  editingNetwork.value = null
  resetForm()
}

// 编辑网络
const editNetwork = (network: TronNetwork) => {
  editingNetwork.value = network
  showAddForm.value = false
  Object.assign(formData, {
    name: network.name,
    network_type: network.network_type || 'mainnet',
    rpc_url: network.rpc_url,
    block_explorer_url: network.block_explorer_url || '',
    chain_id: network.chain_id || 0,
    description: network.description || '',
    is_active: network.is_active,
    timeout_ms: network.timeout_ms || 30000,
    retry_count: network.retry_count || 3,
    rate_limit: network.rate_limit || 10
  })
}

// 处理提交
const handleSubmit = async () => {
  loading.value = true
  try {
    if (editingNetwork.value) {
      // 更新网络
      await networkApi.updateNetwork(editingNetwork.value.id, formData)
      ElMessage.success('网络更新成功')
    } else {
      // 添加网络
      await networkApi.createNetwork(formData)
      ElMessage.success('网络添加成功')
    }
    
    await loadNetworks()
    cancelEdit()
    emit('success')
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}

// 切换网络状态
const toggleNetworkStatus = async (network: TronNetwork) => {
  try {
    await networkApi.updateNetwork(network.id, {
      is_active: !network.is_active
    })
    ElMessage.success(`网络已${network.is_active ? '禁用' : '启用'}`)
    await loadNetworks()
    emit('success')
  } catch (error) {
    console.error('状态切换失败:', error)
    ElMessage.error('状态切换失败')
  }
}

// 删除网络
const deleteNetwork = async (network: TronNetwork) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除网络 "${network.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await networkApi.deleteNetwork(network.id)
    ElMessage.success('网络删除成功')
    await loadNetworks()
    emit('success')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 获取网络类型样式
const getNetworkTypeClass = (type: string) => {
  const classes = {
    mainnet: 'bg-green-100 text-green-800',
    testnet: 'bg-yellow-100 text-yellow-800',
    shasta: 'bg-blue-100 text-blue-800',
    nile: 'bg-purple-100 text-purple-800'
  }
  return classes[type as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

// 获取网络类型标签
const getNetworkTypeLabel = (type: string) => {
  const labels = {
    mainnet: '主网',
    testnet: '测试网',
    shasta: 'Shasta',
    nile: 'Nile'
  }
  return labels[type as keyof typeof labels] || type
}
</script>

<style scoped>
/* 组件样式 */
</style>