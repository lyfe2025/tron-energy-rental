<!--
 * Webhook信息面板组件
 * 职责：显示Webhook模式的说明和技术要求
-->
<template>
  <div class="space-y-2">
    <!-- 简洁提示 -->
    <div class="p-2 bg-purple-50 border border-purple-200 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="text-xs text-purple-700 flex items-center gap-2">
          <Globe class="w-3 h-3" />
          <span>需要HTTPS域名和SSL证书 • 实时推送 • 高性能</span>
        </div>
        <button
          type="button"
          @click="showDetails = !showDetails"
          class="text-xs text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
        >
          <Info class="w-3 h-3" />
          {{ showDetails ? '收起' : '详情' }}
        </button>
      </div>
    </div>
    
    <!-- 折叠的详细说明 -->
    <div v-if="showDetails" class="p-3 bg-amber-50 border border-amber-200 rounded-lg transition-all">
      <div class="flex items-start gap-2">
        <AlertTriangle class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-amber-800">
          <div class="font-medium mb-2">Webhook 模式技术要求：</div>
          <ul class="list-disc list-inside space-y-1 text-amber-700 text-xs">
            <li>服务器必须具有有效的SSL证书</li>
            <li>URL必须使用HTTPS协议</li>
            <li>端口必须是 443、80、88、8443 之一</li>
            <li>服务器必须在30秒内响应Telegram请求</li>
          </ul>
          <div class="mt-3 pt-2 border-t border-amber-300">
            <div class="font-medium text-amber-800 mb-1">
              {{ mode === 'create' ? '性能优势：' : '使用步骤：' }}
            </div>
            <div v-if="mode === 'create'" class="text-amber-700 text-xs space-y-1">
              <div>• 实时消息推送，无延迟</div>
              <div>• 节省服务器资源，无需轮询</div>
              <div>• 适合生产环境和高并发场景</div>
            </div>
            <div v-else class="text-amber-700 text-xs space-y-1">
              <div>1. 配置Webhook URL和密钥</div>
              <div>2. 点击"应用设置"将配置同步到Telegram</div>
              <div>3. 点击"检查状态"验证设置是否生效</div>
              <div class="text-amber-600 mt-2">💡 只有应用设置后，Telegram才能向您的服务器发送消息</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Globe, Info } from 'lucide-vue-next'
import { ref } from 'vue'

interface Props {
  mode?: 'create' | 'edit'
}

withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const showDetails = ref(false)
</script>
