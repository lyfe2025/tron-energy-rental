<!--
 * 添加网络关联模态框组件
 * 职责：搜索和选择可用的网络进行关联
-->
<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleClose"
    title="添加网络关联"
    width="600px"
  >
    <div class="space-y-4">
      <el-input
        v-model="searchQuery"
        placeholder="搜索网络名称或Chain ID"
        clearable
      >
        <template #prefix>
          <Search class="w-4 h-4 text-gray-400" />
        </template>
      </el-input>
      
      <div class="max-h-60 overflow-y-auto">
        <div
          v-for="network in filteredNetworks"
          :key="network.id"
          class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
          @click="handleAddNetwork(network)"
        >
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Network class="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ network.name }}</h4>
              <p class="text-sm text-gray-500">Chain ID: {{ network.chain_id }}</p>
            </div>
          </div>
          <el-button size="small" type="primary">
            添加
          </el-button>
        </div>
        
        <div v-if="filteredNetworks.length === 0" class="text-center py-8 text-gray-500">
          <Network class="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>没有可添加的网络</p>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { Network, Search } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

interface AvailableNetwork {
  id: string
  name: string
  chain_id: string
  rpc_url: string
  is_active: boolean
}

interface Props {
  visible: boolean
  availableNetworks: AvailableNetwork[]
  connectedNetworks: string[] // 已连接网络的ID列表
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'add-network', network: AvailableNetwork): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const searchQuery = ref('')

// 计算属性：过滤可用网络
const filteredNetworks = computed(() => {
  // 排除已连接的网络和未激活的网络
  let networks = props.availableNetworks.filter(n => 
    !props.connectedNetworks.includes(n.id) && n.is_active
  )
  
  // 根据搜索关键词过滤
  if (searchQuery.value) {
    const keyword = searchQuery.value.toLowerCase()
    networks = networks.filter(n => 
      n.name.toLowerCase().includes(keyword) ||
      n.chain_id.includes(keyword)
    )
  }
  
  return networks
})

// 监听弹窗关闭，清理搜索状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    searchQuery.value = ''
  }
})

const handleClose = () => {
  emit('update:visible', false)
}

const handleAddNetwork = (network: AvailableNetwork) => {
  emit('add-network', network)
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
