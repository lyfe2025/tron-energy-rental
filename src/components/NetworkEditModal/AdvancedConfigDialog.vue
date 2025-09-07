<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="高级配置"
    width="600px"
    append-to-body
  >
    <el-form :model="modelValue" label-width="140px">
      <el-form-item label="区块浏览器URL">
        <el-input 
          :model-value="modelValue.explorer_url" 
          @update:model-value="updateField('explorer_url', $event)"
          placeholder="https://tronscan.org" 
        />
      </el-form-item>
      
      <el-form-item label="健康检查URL">
        <el-input 
          :model-value="modelValue.health_check_url" 
          @update:model-value="updateField('health_check_url', $event)"
          placeholder="健康检查地址" 
        />
      </el-form-item>
      
      <el-form-item label="速率限制(/秒)">
        <el-input-number
          :model-value="modelValue.rate_limit"
          @update:model-value="updateField('rate_limit', $event)"
          :min="1"
          :max="1000"
          class="w-full"
        />
      </el-form-item>
      
      <el-form-item label="设为默认网络">
        <el-switch 
          :model-value="modelValue.is_default" 
          @update:model-value="updateField('is_default', $event)"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
interface AdvancedConfigData {
  explorer_url: string
  health_check_url: string
  rate_limit: number
  is_default: boolean
}

interface Props {
  visible: boolean
  modelValue: AdvancedConfigData
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'update:modelValue', value: AdvancedConfigData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateField = (field: keyof AdvancedConfigData, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}
</script>
