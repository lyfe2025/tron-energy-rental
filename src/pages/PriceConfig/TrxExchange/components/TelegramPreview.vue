<template>
  <div class="md:w-1/3">
    <!-- Telegram风格预览 -->
    <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4">
      <!-- 机器人头部 -->
      <div class="bg-blue-500 text-white px-4 py-3 rounded-t-lg">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <span class="text-xs">🤖</span>
          </div>
          <div>
            <div class="text-sm font-medium">TRON能量租赁机器人</div>
            <div class="text-xs text-blue-100">在线</div>
          </div>
        </div>
      </div>
        
      <!-- 消息内容 -->
      <div class="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        <!-- 机器人消息 -->
        <div class="flex gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
              <!-- 图片显示（如果启用） -->
              <div v-if="config.enable_image && config.image_url" class="mb-3">
                <img 
                  :src="config.image_url" 
                  :alt="config.image_alt || 'TRX闪兑配置图片'" 
                  class="w-full rounded-lg border"
                  @error="handleImageError"
                />
                <div v-if="config.image_alt" class="text-xs text-gray-500 mt-1 text-center">
                  {{ config.image_alt }}
                </div>
              </div>
              
              <!-- 标题 -->
              <div class="font-bold text-sm mb-1 text-green-600">
                {{ getDisplayText('title', '🟢USDT自动兑换TRX🔴') }}
              </div>
              
              <!-- 副标题 -->
              <div class="text-xs text-gray-600 mb-2">
                {{ formatSubtitle() }}
              </div>
              
              <!-- 汇率信息 -->
              <div class="text-xs space-y-1">
                <div class="font-medium">{{ getDisplayText('rate_title', '📊 当前汇率') }}</div>
                <div>USDT → TRX: {{ config.config.usdt_to_trx_rate || '0' }}</div>
                <div>TRX → USDT: {{ config.config.trx_to_usdt_rate || '0' }}</div>
                <div class="pt-1 border-t border-gray-200">{{ getDisplayText('address_label', '📍 兑换地址') }}</div>
                <div class="font-mono text-xs text-blue-600 break-all">{{ config.config.exchange_address || 'TExample...' }}</div>
                
                <!-- 兑换描述 -->
                <div class="text-xs text-gray-600 mt-2">
                  {{ getDisplayText('rate_description', '当前汇率仅供参考') }}
                </div>
                
                <!-- 注意事项 -->
                <div v-if="config.config.notes && config.config.notes.length > 0" class="mt-2 pt-2 border-t border-gray-200">
                  <div class="text-xs font-medium text-gray-700 mb-1">注意事项：</div>
                  <div v-for="(note, index) in config.config.notes" :key="index" class="text-xs text-gray-600">
                    {{ note }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 消息发送时间 -->
            <div class="text-xs text-gray-400 mt-1">
              刚刚
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  config: any
  getDisplayText: (key: string, defaultValue: string) => string
  formatSubtitle: () => string
  handleImageError: (event: Event) => void
}

defineProps<Props>()
</script>
