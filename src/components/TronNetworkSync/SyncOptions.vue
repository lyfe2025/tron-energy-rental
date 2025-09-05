<!--
 * 同步选项配置组件
 * 职责：管理同步选项的选择状态
-->
<template>
  <div class="sync-options mb-4">
    <h4 class="text-lg font-medium mb-2">同步选项</h4>
    <div class="space-y-2">
      <el-checkbox 
        :model-value="options.networkParams" 
        @update:model-value="updateOption('networkParams', $event)"
        :disabled="disabled"
      >
        同步网络参数 (链ID、区块时间等)
      </el-checkbox>
      <el-checkbox 
        :model-value="options.nodeInfo" 
        @update:model-value="updateOption('nodeInfo', $event)"
        :disabled="disabled"
      >
        同步节点信息 (版本、状态等)
      </el-checkbox>
      <el-checkbox 
        :model-value="options.blockInfo" 
        @update:model-value="updateOption('blockInfo', $event)"
        :disabled="disabled"
      >
        同步区块信息 (最新区块、确认数等)
      </el-checkbox>
      <el-checkbox 
        :model-value="options.healthCheck" 
        @update:model-value="updateOption('healthCheck', $event)"
        :disabled="disabled"
      >
        执行健康检查
      </el-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SyncOptions {
  networkParams: boolean
  nodeInfo: boolean
  blockInfo: boolean
  healthCheck: boolean
}

interface Props {
  options: SyncOptions
  disabled?: boolean
}

interface Emits {
  (e: 'update:options', options: SyncOptions): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateOption = (key: keyof SyncOptions, value: boolean) => {
  const newOptions = { ...props.options }
  newOptions[key] = value
  emit('update:options', newOptions)
}
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
