<template>
  <div class="bg-gray-50 p-4 rounded-lg mb-4">
    <h3 class="font-medium mb-3 flex items-center">
      <Settings class="w-4 h-4 mr-2 text-green-600" />
      连接配置
    </h3>
    
    <el-form-item label="RPC地址" prop="rpc_url">
      <el-input
        :model-value="modelValue.rpc_url"
        @update:model-value="updateField('rpc_url', $event)"
        placeholder="https://api.trongrid.io"
      >
        <template #append>
          <el-button @click="handleTest" :loading="testing" size="small">
            测试
          </el-button>
        </template>
      </el-input>
    </el-form-item>
    
    <el-form-item label="API Key" prop="api_key">
      <el-input
        :model-value="modelValue.api_key"
        @update:model-value="updateField('api_key', $event)"
        type="password"
        placeholder="请输入API Key"
        show-password
      />
    </el-form-item>
    
    <div class="grid grid-cols-3 gap-4">
      <el-form-item label="连接超时(ms)">
        <el-input-number
          :model-value="modelValue.timeout_ms"
          @update:model-value="updateField('timeout_ms', $event)"
          :min="1000"
          :max="60000"
          :step="1000"
          class="w-full"
        />
      </el-form-item>
      
      <el-form-item label="重试次数">
        <el-input-number
          :model-value="modelValue.retry_count"
          @update:model-value="updateField('retry_count', $event)"
          :min="0"
          :max="10"
          class="w-full"
        />
      </el-form-item>
      
      <el-form-item label="优先级">
        <el-input-number
          :model-value="modelValue.priority"
          @update:model-value="updateField('priority', $event)"
          :min="1"
          :max="100"
          class="w-full"
        />
      </el-form-item>
    </div>

    <!-- 测试结果 -->
    <div v-if="testResult" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h4 class="font-medium mb-2 flex items-center">
        <Activity class="w-4 h-4 mr-2 text-blue-600" />
        连接测试结果
      </h4>
      <div class="flex items-center space-x-4">
        <div :class="[
          'w-3 h-3 rounded-full',
          testResult.success ? 'bg-green-500' : 'bg-red-500'
        ]"></div>
        <span>{{ testResult.success ? '连接成功' : '连接失败' }}</span>
        <span v-if="testResult.response_time_ms" class="text-sm text-gray-600">
          延迟: {{ testResult.response_time_ms }}ms
        </span>
      </div>
      <p v-if="testResult.error" class="text-red-600 text-sm mt-2">
        {{ testResult.error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Activity, Settings } from 'lucide-vue-next'
import { ref } from 'vue'

interface ConnectionConfigData {
  rpc_url: string
  api_key: string
  timeout_ms: number
  retry_count: number
  priority: number
}

interface Props {
  modelValue: ConnectionConfigData
  isEdit?: boolean
  networkId?: string
}

interface Emits {
  (e: 'update:modelValue', value: ConnectionConfigData): void
  (e: 'test-connection', data: { rpc_url: string; api_key: string; timeout: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { warning } = useToast()

const testing = ref(false)
const testResult = ref<any>(null)

const updateField = (field: keyof ConnectionConfigData, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

const handleTest = async () => {
  if (!props.modelValue.rpc_url) {
    warning('请先输入RPC地址')
    return
  }

  testing.value = true
  testResult.value = null

  try {
    emit('test-connection', {
      rpc_url: props.modelValue.rpc_url,
      api_key: props.modelValue.api_key,
      timeout: props.modelValue.timeout_ms
    })
  } catch (error) {
    console.error('连接测试失败:', error)
    testResult.value = {
      success: false,
      error: '连接测试失败，请检查网络配置'
    }
  } finally {
    testing.value = false
  }
}

// 暴露方法供父组件调用
defineExpose({
  setTestResult: (result: any) => {
    testResult.value = result
    testing.value = false
  }
})
</script>
