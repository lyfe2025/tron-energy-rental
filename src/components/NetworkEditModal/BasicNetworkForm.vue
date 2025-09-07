<template>
  <div class="bg-gray-50 p-4 rounded-lg mb-4">
    <h3 class="font-medium mb-3 flex items-center">
      <Network class="w-4 h-4 mr-2 text-blue-600" />
      基本信息
    </h3>
    <div class="grid grid-cols-2 gap-4">
      <el-form-item label="网络名称" prop="name">
        <el-input
          :model-value="modelValue.name"
          @update:model-value="updateField('name', $event)"
          placeholder="请输入网络名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="网络类型" prop="network_type">
        <el-select 
          :model-value="modelValue.network_type" 
          @update:model-value="updateField('network_type', $event)"
          placeholder="请选择网络类型" 
          class="w-full"
        >
          <el-option label="主网" value="mainnet" />
          <el-option label="测试网" value="testnet" />
          <el-option label="私有网" value="private" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="Chain ID" prop="chain_id">
        <el-input
          :model-value="modelValue.chain_id"
          @update:model-value="updateField('chain_id', $event)"
          placeholder="如: 728126428"
        />
      </el-form-item>
      
      <el-form-item label="状态">
        <el-switch
          :model-value="modelValue.is_active"
          @update:model-value="updateField('is_active', $event)"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Network } from 'lucide-vue-next'

interface BasicNetworkFormData {
  name: string
  chain_id: string
  network_type: 'mainnet' | 'testnet' | 'private'
  is_active: boolean
}

interface Props {
  modelValue: BasicNetworkFormData
}

interface Emits {
  (e: 'update:modelValue', value: BasicNetworkFormData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateField = (field: keyof BasicNetworkFormData, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}
</script>
