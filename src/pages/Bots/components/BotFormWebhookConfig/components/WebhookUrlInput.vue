<!--
 * Webhook URL输入组件
 * 职责：提供URL输入、格式说明和预览功能
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Webhook 基础URL <span class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :value="displayUrl"
        @input="handleUrlInput"
        type="url"
        :required="workMode === 'webhook'"
        class="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="https://your-domain.com/api/telegram/webhook （路径固定，不可修改）"
      />
      <div class="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-gray-500 bg-gray-50 rounded-r-lg border-l">
        /bot_username
      </div>
    </div>
    
    <div class="mt-2 space-y-2">
      <!-- 简洁提示和详情按钮 -->
      <div class="p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-xs text-blue-700 flex items-center gap-2">
            <span>🔧 仅域名可自定义 • 路径必须是 /api/telegram/webhook • 系统自动添加机器人用户名</span>
          </div>
          <button
            type="button"
            @click="showExplanation = !showExplanation"
            class="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <Info class="w-3 h-3" />
            {{ showExplanation ? '收起' : '详情' }}
          </button>
        </div>
      </div>

      <!-- 折叠的详细说明 -->
      <div v-if="showExplanation" class="space-y-2">
        <!-- URL格式要求 -->
        <div class="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 class="text-sm font-medium text-purple-800 mb-2">📐 URL格式要求</h5>
          <div class="text-xs text-purple-700 space-y-2">
            <div class="font-medium">标准格式：</div>
            <div class="bg-white p-2 rounded border font-mono text-xs">
              <span class="text-green-600">https://您的域名.com</span><span class="text-red-600">/api/telegram/webhook</span><span class="text-blue-600">/bot_username</span>
            </div>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex items-start gap-2">
                <span class="text-green-600 font-medium">✅ 可自定义部分：</span>
                <div class="flex-1">
                  <div>• 域名：your-domain.com, api.example.com</div>
                  <div>• 子域名：bot.domain.com, webhook.site.com</div>
                  <div>• ngrok地址：abc123.ngrok-free.app</div>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-red-600 font-medium">❌ 固定不可变：</span>
                <div class="flex-1">
                  <div>• API路径：必须是 /api/telegram/webhook</div>
                  <div>• 机器人用户名：系统自动添加，不可手动指定</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 配置示例 -->
        <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h5 class="text-sm font-medium text-green-800 mb-2">💡 配置示例</h5>
          <div class="text-xs text-green-700 space-y-2">
            <div class="space-y-1">
              <div class="font-medium">正确示例：</div>
              <div class="bg-white p-2 rounded border space-y-1 font-mono text-xs">
                <div><span class="text-gray-500">您输入：</span> https://your-domain.com/api/telegram/webhook</div>
                <div><span class="text-gray-500">系统生成：</span> https://your-domain.com/api/telegram/webhook/<span class="text-blue-600">your_bot_username</span></div>
              </div>
            </div>
            <div class="space-y-1">
              <div class="font-medium text-red-600">错误示例：</div>
              <div class="bg-red-50 p-2 rounded border space-y-1 font-mono text-xs text-red-600">
                <div>❌ https://domain.com/my-webhook-path</div>
                <div>❌ https://domain.com/api/bot/webhook</div>
                <div>❌ https://domain.com/webhook</div>
              </div>
            </div>
          </div>
        </div>

        <!-- URL自动处理机制 -->
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 URL自动处理机制</h5>
          <div class="text-xs text-blue-700 space-y-1">
            <p>• <strong>您只需填写基础URL</strong>：系统会自动添加机器人用户名避免冲突</p>
            <p>• <strong>防止多机器人冲突</strong>：每个机器人都有独立的接收地址</p>
            <p>• <strong>无需手动管理</strong>：创建后系统自动生成最终URL</p>
            <p>• <strong>路由自动识别</strong>：消息自动路由到对应的机器人实例</p>
          </div>
        </div>

        <!-- Telegram技术要求 -->
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h5 class="text-sm font-medium text-amber-800 mb-2">⚠️ Telegram技术要求</h5>
          <div class="text-xs text-amber-700 space-y-1">
            <p>• <strong>HTTPS协议</strong>：必须使用SSL加密连接</p>
            <p>• <strong>SSL证书</strong>：必须有效且未过期</p>
            <p>• <strong>指定端口</strong>：443、80、88、8443之一</p>
            <p>• <strong>响应时间</strong>：必须在30秒内响应</p>
            <p>• <strong>公网访问</strong>：URL必须能从互联网访问</p>
          </div>
        </div>
      </div>

      <!-- URL预览（始终显示） -->
      <div v-if="displayUrl" class="p-3 bg-green-50 border border-green-200 rounded-lg">
        <h5 class="text-sm font-medium text-green-800 mb-2">🎯 最终URL预览</h5>
        <div class="space-y-2">
          <div class="text-xs">
            <span class="text-gray-600">您的基础URL：</span>
            <code class="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">{{ baseUrl }}</code>
          </div>
          <div class="text-xs">
            <span class="text-gray-600">系统生成的最终URL：</span>
            <code class="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">{{ finalUrl }}</code>
          </div>
          <p class="text-xs text-green-600">
            💡 Telegram将向最终URL发送所有消息更新
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { ref } from 'vue'

interface Props {
  displayUrl: string
  baseUrl: string
  finalUrl: string
  workMode: 'polling' | 'webhook'
}

interface Emits {
  urlUpdate: [url: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showExplanation = ref(false)

const handleUrlInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('urlUpdate', value)
}
</script>
