<!--
 * Bot表单命令配置组件
 * 职责：提供机器人基础命令配置（/start、/help等消息内容和启用状态）
-->
<template>
  <div class="space-y-6">
    <!-- 命令配置标题 -->
    <div class="flex items-center gap-2 mb-4">
      <Terminal class="w-5 h-5 text-blue-600" />
      <h4 class="text-lg font-semibold text-gray-900">⚡ 命令配置</h4>
    </div>
    
    <!-- 命令消息配置 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          /start 欢迎消息 <span class="text-red-500">*</span>
        </label>
        <textarea
          :value="modelValue.welcome_message"
          @input="updateField('welcome_message', ($event.target as HTMLTextAreaElement).value)"
          rows="4"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="🎉 欢迎使用TRON能量租赁机器人！

👋 你好，{first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助

💡 支持占位符：{first_name} {last_name} {username} {full_name}"
          maxlength="1000"
        ></textarea>
        <div class="text-right text-xs text-gray-500 mt-1">{{ modelValue.welcome_message.length }}/1000</div>
        <p class="text-xs text-gray-500 mt-1">用户首次使用 /start 命令时显示的消息</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          /help 帮助消息 <span class="text-red-500">*</span>
        </label>
        <textarea
          :value="modelValue.help_message"
          @input="updateField('help_message', ($event.target as HTMLTextAreaElement).value)"
          rows="4"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="📖 TRON能量租赁机器人使用指南

🤖 基础命令：
• /start - 启动机器人
• /menu - 显示主菜单
• /help - 显示帮助信息
• /balance - 查询账户余额
• /orders - 查看订单历史

🔋 能量租赁流程：
1️⃣ 选择能量套餐
2️⃣ 输入接收地址
3️⃣ 确认订单信息
4️⃣ 完成支付
5️⃣ 等待能量到账

💡 注意事项：
• 请确保TRON地址正确
• 支付后请耐心等待确认
• 能量有效期为24小时

🆘 如需帮助，请联系客服"
          maxlength="1000"
        ></textarea>
        <div class="text-right text-xs text-gray-500 mt-1">{{ modelValue.help_message.length }}/1000</div>
        <p class="text-xs text-gray-500 mt-1">用户使用 /help 命令时显示的消息</p>
      </div>
    </div>
    
    <!-- 其他命令配置 -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-gray-700">
          其他命令配置
        </label>
        <button
          type="button"
          @click="addCustomCommand"
          class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          + 添加命令
        </button>
      </div>
      
      <div v-if="modelValue.custom_commands.length === 0" class="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
        暂无自定义命令
      </div>
      
      <div 
        v-for="(command, index) in modelValue.custom_commands" 
        :key="index"
        class="bg-gray-50 p-3 rounded-lg border border-gray-200"
      >
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">命令名称</label>
            <div class="flex">
              <span class="inline-flex items-center px-2 text-xs text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">/</span>
              <input
                v-model="command.command"
                type="text"
                placeholder="balance"
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-r focus:ring-1 focus:ring-blue-500"
                maxlength="32"
              />
            </div>
          </div>
          
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">回复消息</label>
            <input
              v-model="command.response_message"
              type="text"
              placeholder="您的账户余额为：{balance} USDT"
              class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              maxlength="500"
            />
          </div>
          
          <div class="flex items-end gap-2">
            <label class="flex items-center text-xs text-gray-600">
              <input
                v-model="command.is_enabled"
                type="checkbox"
                class="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-1"
              />
              启用
            </label>
            <button
              type="button"
              @click="removeCustomCommand(index)"
              class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 启用状态（仅在创建模式显示） -->
    <div v-if="mode === 'create'" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        机器人启用状态
      </label>
      <div class="flex items-center">
        <button
          type="button"
          @click="updateField('is_active', !modelValue.is_active)"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            modelValue.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              modelValue.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
        <span class="ml-3 text-sm text-gray-700">
          {{ modelValue.is_active ? '启用' : '禁用' }}
        </span>
      </div>
      <p class="text-xs text-gray-500 mt-2">创建后机器人是否立即启用</p>
    </div>

    <!-- 命令配置说明 -->
    <div class="space-y-2">
      <!-- 简洁提示 -->
      <div class="p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-xs text-blue-700 flex items-center gap-2">
            <Terminal class="w-3 h-3" />
            <span>基础命令配置 • 用户交互入口 • 支持变量替换</span>
          </div>
          <button
            type="button"
            @click="showCommandDetails = !showCommandDetails"
            class="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <Info class="w-3 h-3" />
            {{ showCommandDetails ? '收起' : '详情' }}
          </button>
        </div>
      </div>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showCommandDetails" class="p-3 bg-amber-50 border border-amber-200 rounded-lg transition-all">
        <div class="flex items-start gap-2">
          <Info class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-amber-800">
            <div class="font-medium mb-2">命令配置功能说明：</div>
            <div class="text-amber-700 space-y-1 text-xs">
              <div>• <strong>/start 命令</strong>：用户首次使用机器人的欢迎界面</div>
              <div>• <strong>/help 命令</strong>：提供帮助信息和使用指南</div>
              <div>• <strong>自定义命令</strong>：根据业务需要添加特殊命令</div>
              <div>• <strong>变量支持</strong>：消息中可使用 {balance}、{username} 等变量</div>
            </div>
            <div class="mt-3 pt-2 border-t border-amber-300">
              <div class="font-medium text-amber-800 mb-1">配置建议：</div>
              <div class="text-amber-700 text-xs space-y-1">
                <div>• 欢迎消息要简洁明了，突出核心功能</div>
                <div>• 帮助消息包含常用命令和联系方式</div>
                <div>• 自定义命令名称要简短易记</div>
                <div>• 善用Emoji和排版提升视觉效果</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info, Terminal } from 'lucide-vue-next'
import { ref } from 'vue'

// 自定义命令接口
interface CustomCommand {
  command: string
  response_message: string
  is_enabled: boolean
}

// Props
interface MessageConfig {
  welcome_message: string
  help_message: string
  is_active?: boolean
  custom_commands: CustomCommand[]
}

interface Props {
  modelValue: MessageConfig
  mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: MessageConfig]
}>()

// 响应式数据
const showCommandDetails = ref(false)

// 更新字段值
const updateField = <K extends keyof MessageConfig>(field: K, value: MessageConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

// 添加自定义命令
const addCustomCommand = () => {
  const newCommand: CustomCommand = {
    command: '',
    response_message: '',
    is_enabled: true
  }
  
  const updatedCommands = [...props.modelValue.custom_commands, newCommand]
  updateField('custom_commands', updatedCommands)
}

// 删除自定义命令
const removeCustomCommand = (index: number) => {
  const updatedCommands = props.modelValue.custom_commands.filter((_, i) => i !== index)
  updateField('custom_commands', updatedCommands)
}

// 确保 custom_commands 数组存在
if (!props.modelValue.custom_commands) {
  updateField('custom_commands', [])
}
</script>
