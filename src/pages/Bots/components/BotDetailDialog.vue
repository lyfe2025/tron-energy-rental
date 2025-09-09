<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="$emit('close')"></div>

      <!-- 弹窗内容 -->
      <div class="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">机器人详情</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- 详情内容 -->
        <div v-if="botDetail" class="space-y-6">
          <!-- 基本信息 -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-md font-medium text-gray-900 mb-3">基本信息</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">机器人名称</label>
                <p class="text-sm text-gray-900">{{ botDetail.name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <p class="text-sm text-gray-900">@{{ botDetail.username }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  botDetail.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                ]">
                  {{ botDetail.is_active ? '运行中' : '已停止' }}
                </span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                <p class="text-sm text-gray-900">{{ formatDate(botDetail.created_at) }}</p>
              </div>
            </div>
          </div>

          <!-- 描述信息 -->
          <div v-if="botDetail.description" class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-md font-medium text-gray-900 mb-3">描述</h4>
            <p class="text-sm text-gray-700">{{ botDetail.description }}</p>
          </div>

          <!-- 配置信息 -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-md font-medium text-gray-900 mb-3">配置信息</h4>
            <div class="grid grid-cols-1 gap-4">
              <div v-if="botDetail.webhook_url">
                <label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <p class="text-sm text-gray-900 break-all">{{ botDetail.webhook_url }}</p>
              </div>
              <div v-if="botDetail.welcome_message">
                <label class="block text-sm font-medium text-gray-700 mb-1">欢迎消息</label>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ botDetail.welcome_message }}</p>
              </div>
              <div v-if="botDetail.help_message">
                <label class="block text-sm font-medium text-gray-700 mb-1">帮助消息</label>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ botDetail.help_message }}</p>
              </div>
            </div>
          </div>

          <!-- 网络配置 -->
          <div v-if="botDetail.networks && botDetail.networks.length > 0" class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-md font-medium text-gray-900 mb-3">网络配置</h4>
            <div class="space-y-3">
              <div v-for="network in botDetail.networks" :key="network.id" class="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <p class="font-medium text-gray-900">{{ network.name }}</p>
                  <p class="text-sm text-gray-500">{{ network.rpc_url }}</p>
                </div>
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  network.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                ]">
                  {{ network.is_active ? '活跃' : '非活跃' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 统计信息 -->
          <div v-if="botDetail.stats" class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-md font-medium text-gray-900 mb-3">统计信息</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <p class="text-2xl font-bold text-blue-600">{{ botDetail.stats.total_users || 0 }}</p>
                <p class="text-sm text-gray-500">总用户数</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-green-600">{{ botDetail.stats.active_users || 0 }}</p>
                <p class="text-sm text-gray-500">活跃用户</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-purple-600">{{ botDetail.stats.total_messages || 0 }}</p>
                <p class="text-sm text-gray-500">消息总数</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-orange-600">{{ botDetail.stats.total_orders || 0 }}</p>
                <p class="text-sm text-gray-500">订单总数</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-else class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">加载中...</span>
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  visible: boolean
  botDetail: any
}

defineProps<Props>()
defineEmits<{
  close: []
}>()

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}
</style>