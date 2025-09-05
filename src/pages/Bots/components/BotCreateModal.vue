<!--
 * 创建机器人弹窗
 * 职责：提供机器人创建的弹窗表单
-->
<template>
  <el-dialog
    :model-value="visible"
    title="创建机器人"
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
          >
            <template #prepend>@</template>
          </el-input>
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

      <!-- 网络配置 -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">网络配置</h4>
        
        <el-form-item label="选择网络">
          <el-select
            v-model="formData.network_id"
            placeholder="请选择网络（创建后可修改）"
            class="w-full"
          >
            <el-option
              v-for="network in availableNetworks"
              :key="network.id"
              :label="network.name"
              :value="network.id"
              :disabled="!network.is_active"
            >
              <div class="flex items-center justify-between w-full">
                <span>{{ network.name }}</span>
                <el-tag 
                  :type="getNetworkTypeColor(network.network_type)" 
                  size="small"
                >
                  {{ getNetworkTypeText(network.network_type) }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div class="text-gray-500 text-sm mt-1">
            每个机器人只能配置一个网络，创建后可以在机器人列表中修改
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
        
        <el-form-item label="启用状态">
          <el-switch
            v-model="formData.is_active"
            active-text="启用"
            inactive-text="禁用"
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
          创建机器人
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
interface Props {
  visible: boolean
  availableNetworks: Array<{
    id: string
    name: string
    network_type: string
    is_active: boolean
  }>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'create': [data: any]
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
  network_id: '',
  webhook_url: '',
  welcome_message: '欢迎使用TRON能量租赁机器人！🚀',
  help_message: '这里是帮助信息，您可以通过以下命令使用机器人...',
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
    { min: 5, max: 32, message: '用户名长度为 5-32 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/, message: '用户名只能包含字母、数字和下划线，且必须以字母开头、字母或数字结尾', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入 Bot Token', trigger: 'blur' },
    { pattern: /^\d+:[a-zA-Z0-9_-]+$/, message: 'Token 格式不正确', trigger: 'blur' }
  ]
}

// 工具函数
const getNetworkTypeColor = (type: string) => {
  switch (type) {
    case 'mainnet': return 'success'
    case 'testnet': return 'warning'
    case 'devnet': return 'info'
    default: return ''
  }
}

const getNetworkTypeText = (type: string) => {
  switch (type) {
    case 'mainnet': return '主网'
    case 'testnet': return '测试网'
    case 'devnet': return '开发网'
    default: return type
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    username: '',
    token: '',
    description: '',
    network_id: '',
    webhook_url: '',
    welcome_message: '欢迎使用TRON能量租赁机器人！🚀',
    help_message: '这里是帮助信息，您可以通过以下命令使用机器人...',
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
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    // 提交数据
    emit('create', { ...formData })
  } catch (error) {
    ElMessage.error('请完善表单信息')
  } finally {
    saving.value = false
  }
}

// 监听 visible 变化
watch(() => props.visible, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>
