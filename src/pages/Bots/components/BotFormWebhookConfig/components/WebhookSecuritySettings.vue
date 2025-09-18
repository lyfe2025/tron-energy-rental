<!--
 * Webhook安全设置组件
 * 职责：Secret Token管理和最大连接数配置
-->
<template>
  <div class="space-y-4">
    <!-- Secret Token -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">
          Secret Token
        </label>
        <button
          type="button"
          @click="handleGenerateSecret"
          class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
          title="生成32位随机密钥"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          生成密钥
        </button>
      </div>
      <div class="relative">
        <input
          :value="secret"
          @input="handleSecretInput"
          :type="secretVisible ? 'text' : 'password'"
          class="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="可选的安全验证Token (建议点击生成)"
          maxlength="256"
        />
        <button
          v-if="secret"
          type="button"
          @click="toggleSecretVisibility"
          class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
          :title="secretVisible ? '隐藏密钥' : '显示密钥'"
        >
          <svg v-if="secretVisible" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m6.878-2.122L21 21m-4.858-9.122a3 3 0 00-4.243-4.243m0 0L9 3m4.878 6.878L21 3"></path>
          </svg>
        </button>
      </div>
      <div class="mt-2 space-y-1">
        <p class="text-xs text-gray-500">
          用于验证请求来源的密钥，建议填写以增强安全性
        </p>
        <div v-if="secretGenerated" class="flex items-center gap-2 text-xs text-green-600">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>已生成32位随机密钥，请妥善保存</span>
        </div>
      </div>
    </div>

    <!-- 最大并发连接数 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">
          最大并发连接数
        </label>
        <button
          type="button"
          @click="showConnectionsHelp = !showConnectionsHelp"
          class="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          <Info class="w-3 h-3" />
          {{ showConnectionsHelp ? '收起' : '说明' }}
        </button>
      </div>
      
      <select
        :value="maxConnections"
        @change="handleConnectionsChange"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="10">10 - 测试环境</option>
        <option value="20">20 - 小型应用</option>
        <option value="40" selected>40 - 推荐配置</option>
        <option value="60">60 - 活跃机器人</option>
        <option value="80">80 - 大型应用</option>
        <option value="100">100 - 最大值</option>
      </select>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showConnectionsHelp" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all">
        <div class="text-sm text-blue-800">
          <div class="font-medium mb-2">什么是并发连接数？</div>
          <div class="text-blue-700 space-y-1 text-xs">
            <div>• <strong>不是用户数量限制</strong>：机器人可以服务无限数量的用户</div>
            <div>• <strong>是技术连接数</strong>：Telegram服务器同时向您服务器发送HTTP请求的数量</div>
            <div>• <strong>影响响应速度</strong>：连接数越高，处理消息越快，但消耗服务器资源更多</div>
            <div>• <strong>可随时调整</strong>：根据机器人使用情况和服务器性能优化</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { ref } from 'vue'

interface Props {
  secret: string
  maxConnections: number
  secretVisible: boolean
  secretGenerated: boolean
}

interface Emits {
  secretUpdate: [secret: string]
  connectionsUpdate: [connections: number]
  generateSecret: []
  toggleVisibility: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showConnectionsHelp = ref(false)

const handleSecretInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('secretUpdate', value)
}

const handleConnectionsChange = (event: Event) => {
  const value = parseInt((event.target as HTMLSelectElement).value)
  emit('connectionsUpdate', value)
}

const handleGenerateSecret = () => {
  emit('generateSecret')
}

const toggleSecretVisibility = () => {
  emit('toggleVisibility')
}
</script>
