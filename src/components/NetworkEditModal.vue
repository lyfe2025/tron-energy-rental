<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEdit ? '编辑网络' : '添加网络'"
    width="900px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="space-y-4"
    >
      <!-- 基本信息 -->
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 class="font-medium mb-3 flex items-center">
          <Network class="w-4 h-4 mr-2 text-blue-600" />
          基本信息
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="网络名称" prop="name">
            <el-input
              v-model="form.name"
              placeholder="请输入网络名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          
          <el-form-item label="网络类型" prop="network_type">
            <el-select v-model="form.network_type" placeholder="请选择网络类型" class="w-full">
              <el-option label="主网" value="mainnet" />
              <el-option label="测试网" value="testnet" />
              <el-option label="私有网" value="private" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="Chain ID" prop="chain_id">
            <el-input
              v-model="form.chain_id"
              placeholder="如: 728126428"
            />
          </el-form-item>
          
          <el-form-item label="状态">
            <el-switch
              v-model="form.is_active"
              active-text="启用"
              inactive-text="禁用"
            />
          </el-form-item>
        </div>
      </div>

      <!-- 连接配置 -->
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 class="font-medium mb-3 flex items-center">
          <Settings class="w-4 h-4 mr-2 text-green-600" />
          连接配置
        </h3>
        
        <el-form-item label="RPC地址" prop="rpc_url">
          <el-input
            v-model="form.rpc_url"
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
            v-model="form.api_key"
            type="password"
            placeholder="请输入API Key"
            show-password
          />
        </el-form-item>
        
        <div class="grid grid-cols-3 gap-4">
          <el-form-item label="连接超时(ms)">
            <el-input-number
              v-model="form.timeout_ms"
              :min="1000"
              :max="60000"
              :step="1000"
              class="w-full"
            />
          </el-form-item>
          
          <el-form-item label="重试次数">
            <el-input-number
              v-model="form.retry_count"
              :min="0"
              :max="10"
              class="w-full"
            />
          </el-form-item>
          
          <el-form-item label="优先级">
            <el-input-number
              v-model="form.priority"
              :min="1"
              :max="100"
              class="w-full"
            />
          </el-form-item>
        </div>
      </div>

      <!-- 描述 -->
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入网络描述（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 测试结果 -->
      <div v-if="testResult" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
    </el-form>

    <template #footer>
      <div class="flex justify-between">
        <div>
          <el-button @click="showAdvanced = !showAdvanced" text>
            <Settings class="w-4 h-4 mr-1" />
            {{ showAdvanced ? '隐藏' : '显示' }}高级选项
          </el-button>
        </div>
        <div class="space-x-3">
          <el-button @click="handleClose">取消</el-button>
          <el-button @click="handleTest" :loading="testing">
            <Zap class="w-4 h-4 mr-1" />
            测试连接
          </el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </div>
    </template>

    <!-- 高级配置对话框 -->
    <el-dialog
      :model-value="showAdvanced"
      @update:model-value="showAdvanced = $event"
      title="高级配置"
      width="600px"
      append-to-body
    >
      <el-form :model="form" label-width="140px">
        <el-form-item label="区块浏览器URL">
          <el-input v-model="form.explorer_url" placeholder="https://tronscan.org" />
        </el-form-item>
        
        <el-form-item label="健康检查URL">
          <el-input v-model="form.health_check_url" placeholder="健康检查地址" />
        </el-form-item>
        
        <el-form-item label="速率限制(/秒)">
          <el-input-number
            v-model="form.rate_limit"
            :min="1"
            :max="1000"
            class="w-full"
          />
        </el-form-item>
        
        <el-form-item label="设为默认网络">
          <el-switch v-model="form.is_default" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAdvanced = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Activity, Network, Settings, Zap } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

interface Props {
  visible: boolean
  networkData?: any | null  // 使用any类型以兼容不同的网络数据结构
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const testing = ref(false)
const showAdvanced = ref(false)
const testResult = ref<any>(null)

const form = ref({
  name: '',
  chain_id: '',
  network_type: 'mainnet' as 'mainnet' | 'testnet' | 'private',
  is_active: true,
  rpc_url: '',
  api_key: '',
  timeout_ms: 30000,
  retry_count: 3,
  priority: 1,
  description: '',
  explorer_url: '',
  health_check_url: '',
  rate_limit: 10,
  is_default: false
})

const isEdit = computed(() => !!props.networkData)

const rules: FormRules = {
  name: [
    { required: true, message: '请输入网络名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  network_type: [
    { required: true, message: '请选择网络类型', trigger: 'change' }
  ],
  chain_id: [
    { required: true, message: '请输入Chain ID', trigger: 'blur' }
  ],
  rpc_url: [
    { required: true, message: '请输入RPC地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: 'RPC地址必须以http://或https://开头', trigger: 'blur' }
  ],
  api_key: [
    { required: true, message: '请输入API Key', trigger: 'blur' }
  ]
}

// 监听网络数据变化，填充表单
watch(() => props.networkData, (newData) => {
  if (newData && props.visible) {
    Object.assign(form.value, {
      name: newData.name || '',
      chain_id: String(newData.chain_id || ''),
      network_type: newData.type || newData.network_type || 'mainnet',
      is_active: newData.is_active ?? true,
      rpc_url: newData.rpc_url || '',
      api_key: newData.api_key || '',
      timeout_ms: newData.timeout_ms || 30000,
      retry_count: newData.retry_count || 3,
      priority: newData.priority || 1,
      description: newData.description || '',
      explorer_url: newData.explorer_url || newData.block_explorer_url || '',
      health_check_url: newData.health_check_url || '',
      rate_limit: newData.rate_limit || newData.rate_limit_per_second || 10,
      is_default: newData.is_default || false
    })
  }
}, { immediate: true })

// 重置表单
watch(() => props.visible, (visible) => {
  if (visible && !props.networkData) {
    // 添加模式，重置表单
    Object.assign(form.value, {
      name: '',
      chain_id: '',
      network_type: 'mainnet',
      is_active: true,
      rpc_url: '',
      api_key: '',
      timeout_ms: 30000,
      retry_count: 3,
      priority: 1,
      description: '',
      explorer_url: '',
      health_check_url: '',
      rate_limit: 10,
      is_default: false
    })
  }
  if (!visible) {
    testResult.value = null
    showAdvanced.value = false
  }
})

const handleTest = async () => {
  if (!form.value.rpc_url) {
    ElMessage.warning('请先输入RPC地址')
    return
  }

  testing.value = true
  testResult.value = null

  try {
    let response
    if (isEdit.value && props.networkData) {
      // 编辑模式：测试现有网络
      response = await networkApi.testNetwork(props.networkData.id)
    } else {
      // 添加模式：测试RPC连接
      response = await networkApi.testConnection({
        rpc_url: form.value.rpc_url,
        api_key: form.value.api_key,
        timeout: form.value.timeout_ms
      })
    }

    if (response.success && response.data) {
      testResult.value = {
        success: response.data.status === 'healthy',
        response_time_ms: response.data.response_time_ms,
        network_name: response.data.network_name,
        status: response.data.status
      }
    } else {
      testResult.value = {
        success: false,
        error: response.message || '连接测试失败'
      }
    }
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

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const submitData = {
      name: form.value.name,
      network_type: form.value.network_type,
      type: form.value.network_type,
      rpc_url: form.value.rpc_url,
      api_key: form.value.api_key,
      chain_id: parseInt(form.value.chain_id),
      description: form.value.description,
      is_active: form.value.is_active,
      timeout_ms: form.value.timeout_ms,
      retry_count: form.value.retry_count,
      priority: form.value.priority,
      block_explorer_url: form.value.explorer_url,
      explorer_url: form.value.explorer_url,
      health_check_url: form.value.health_check_url,
      rate_limit_per_second: form.value.rate_limit,
      rate_limit: form.value.rate_limit,
      is_default: form.value.is_default
    }

    let response
    if (isEdit.value && props.networkData) {
      response = await networkApi.updateNetwork(props.networkData.id, submitData)
    } else {
      response = await networkApi.createNetwork(submitData)
    }

    if (response.success) {
      ElMessage.success(isEdit.value ? '网络更新成功' : '网络创建成功')
      emit('success')
      handleClose()
    } else {
      ElMessage.error(response.message || (isEdit.value ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(isEdit.value ? '网络更新失败' : '网络创建失败')
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  emit('update:visible', false)
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
