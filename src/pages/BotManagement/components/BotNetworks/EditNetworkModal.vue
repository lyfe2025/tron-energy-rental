<!--
 * 编辑网络配置模态框组件
 * 职责：编辑已关联网络的配置信息
-->
<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleClose"
    title="编辑网络配置"
    width="500px"
  >
    <el-form
      v-if="editingNetwork"
      :model="editingNetwork"
      label-width="100px"
    >
      <el-form-item label="网络名称">
        <el-input v-model="editingNetwork.name" disabled />
      </el-form-item>
      
      <el-form-item label="Chain ID">
        <el-input v-model="editingNetwork.chain_id" disabled />
      </el-form-item>
      
      <el-form-item label="RPC地址">
        <el-input v-model="editingNetwork.rpc_url" />
      </el-form-item>
      
      <el-form-item label="状态">
        <el-switch
          v-model="editingNetwork.is_active"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
      
      <el-form-item label="优先级">
        <el-input-number
          v-model="editingNetwork.priority"
          :min="1"
          :max="100"
          controls-position="right"
          class="w-full"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="flex justify-end space-x-3">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface BotNetwork {
  id: string
  name: string
  chain_id: string
  rpc_url: string
  is_active: boolean
  connection_status: 'connected' | 'connecting' | 'disconnected'
  last_check_at: string
  priority: number
  updating?: boolean
}

interface Props {
  visible: boolean
  network: BotNetwork | null
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'save', network: BotNetwork): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const editingNetwork = ref<BotNetwork | null>(null)

// 监听网络数据变化，创建编辑副本
watch(() => props.network, (newNetwork) => {
  if (newNetwork) {
    editingNetwork.value = { ...newNetwork }
  } else {
    editingNetwork.value = null
  }
})

const handleClose = () => {
  emit('update:visible', false)
  editingNetwork.value = null
}

const handleSave = () => {
  if (editingNetwork.value) {
    emit('save', editingNetwork.value)
  }
}
</script>

<style scoped>
.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}

.w-full {
  width: 100%;
}
</style>
