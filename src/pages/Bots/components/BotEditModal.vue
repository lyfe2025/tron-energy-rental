<!--
 * 编辑机器人弹窗
 * 职责：提供机器人编辑的弹窗表单
-->
<template>
  <el-dialog
    :model-value="visible"
    title="编辑机器人"
    width="600px"
    @close="handleClose"
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="left"
    >
      <!-- 基础信息 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">基础信息</h4>
        
        <el-form-item label="机器人名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="输入机器人名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="输入机器人用户名（不含@符号）"
            maxlength="50"
            disabled
          >
            <template #prepend>@</template>
          </el-input>
          <div class="text-gray-500 text-sm mt-1">用户名创建后不可修改</div>
        </el-form-item>
        
        <el-form-item label="Bot Token" prop="token">
          <el-input
            v-model="formData.token"
            type="password"
            placeholder="输入从 @BotFather 获取的 Bot Token"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="描述信息">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="输入机器人描述信息（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 状态信息 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">状态信息</h4>
        
        <el-form-item label="当前状态">
          <el-switch
            v-model="formData.is_active"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        
        <el-form-item label="健康状态">
          <div class="flex items-center gap-2">
            <el-tag 
              :type="getHealthStatusType(botData?.health_status)"
              size="small"
            >
              {{ getHealthStatusText(botData?.health_status) }}
            </el-tag>
            <span class="text-sm text-gray-500">
              {{ formatTime(botData?.last_health_check) || '未检查' }}
            </span>
          </div>
        </el-form-item>
      </div>

      <!-- 高级设置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">高级设置</h4>
        
        <el-form-item label="Webhook URL">
          <el-input
            v-model="formData.webhook_url"
            placeholder="输入 Webhook URL（可选）"
          />
        </el-form-item>
        
        <el-form-item label="欢迎消息">
          <el-input
            v-model="formData.welcome_message"
            type="textarea"
            :rows="2"
            placeholder="输入用户首次使用机器人时的欢迎消息"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="帮助消息">
          <el-input
            v-model="formData.help_message"
            type="textarea"
            :rows="2"
            placeholder="输入 /help 命令的回复内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </div>

    </el-form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSave"
          :loading="saving"
        >
          保存修改
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'

// Props
interface BotData {
  id: string
  name: string
  username: string
  token?: string
  description?: string
  webhook_url?: string
  welcome_message?: string
  help_message?: string
  status: string
  health_status?: string
  last_health_check?: string
  total_users?: number
  total_orders?: number
  created_at: string
  updated_at: string
}

interface Props {
  visible: boolean
  botData?: BotData | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'save': [data: any]
}>()

// 表单相关
const formRef = ref<FormInstance>()
const saving = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  username: '',
  token: '',
  description: '',
  webhook_url: '',
  welcome_message: '',
  help_message: '',
  is_active: true
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入机器人名称', trigger: 'blur' },
    { min: 2, max: 50, message: '机器人名称长度为 2-50 个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入机器人用户名', trigger: 'blur' },
    { min: 5, max: 32, message: '用户名长度为 5-32 个字符', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入 Bot Token', trigger: 'blur' },
    { pattern: /^\d+:[a-zA-Z0-9_-]+$/, message: 'Token 格式不正确', trigger: 'blur' }
  ]
}

// 工具函数
const getHealthStatusType = (status?: string) => {
  switch (status) {
    case 'healthy': return 'success'
    case 'unhealthy': return 'danger'
    case 'error': return 'danger'
    default: return 'info'
  }
}

const getHealthStatusText = (status?: string) => {
  switch (status) {
    case 'healthy': return '健康'
    case 'unhealthy': return '异常'
    case 'error': return '错误'
    default: return '未知'
  }
}

const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}

// 初始化表单数据
const initializeFormData = () => {
  if (!props.botData) return
  
  const bot = props.botData
  Object.assign(formData, {
    name: bot.name || '',
    username: bot.username || '',
    token: bot.token || '',
    description: bot.description || '',
    webhook_url: bot.webhook_url || '',
    welcome_message: bot.welcome_message || '',
    help_message: bot.help_message || '',
    is_active: bot.status === 'active'
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    username: '',
    token: '',
    description: '',
    webhook_url: '',
    welcome_message: '',
    help_message: '',
    is_active: true
  })
  
  formRef.value?.clearValidate()
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  resetForm()
}

const handleSave = async () => {
  if (!formRef.value || !props.botData) return
  
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    // 提交数据
    emit('save', {
      id: props.botData.id,
      ...formData,
      status: formData.is_active ? 'active' : 'inactive'
    })
  } catch (error) {
    ElMessage.error('请完善表单信息')
  } finally {
    saving.value = false
  }
}

// 监听变化
watch(() => props.visible, (newValue) => {
  if (newValue && props.botData) {
    initializeFormData()
  } else if (!newValue) {
    resetForm()
  }
})

watch(() => props.botData, () => {
  if (props.visible && props.botData) {
    initializeFormData()
  }
})
</script>
