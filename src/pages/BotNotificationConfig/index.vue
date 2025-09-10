<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft class="w-4 h-4" />
            返回机器人列表
          </button>
          <div class="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">通知配置管理</h1>
            <p class="text-gray-600 mt-1" v-if="botInfo">
              机器人: {{ botInfo.name }} (@{{ botInfo.username }})
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4 sm:mt-0">
          <div class="flex items-center gap-2" v-if="botInfo">
            <div 
              class="w-3 h-3 rounded-full"
              :class="botInfo.is_active ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-sm font-medium text-gray-700">
              {{ botInfo.is_active ? '运行中' : '已停用' }}
            </span>
          </div>
          <button
            @click="refreshConfig"
            :disabled="loading"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="p-6">

      <!-- 加载状态 -->
      <div v-if="loading && !botInfo" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">正在加载机器人信息...</p>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div class="text-red-600 mb-4">
          <AlertCircle class="w-12 h-12 mx-auto mb-2" />
          <h3 class="text-lg font-semibold">加载失败</h3>
          <p class="text-sm">{{ error }}</p>
        </div>
        <button
          @click="loadBotInfo"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>

      <!-- 机器人信息卡片 -->
      <div v-else-if="botInfo" class="space-y-6">
        <!-- 机器人基础信息 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <div class="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <span class="text-blue-600 font-semibold text-lg">🤖</span>
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ botInfo.name }}</h2>
                <p class="text-gray-600">@{{ botInfo.username }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="text-sm text-gray-500">状态</p>
                <div class="flex items-center gap-2 mt-1">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="botInfo.is_active ? 'bg-green-500' : 'bg-red-500'"
                  ></div>
                  <span class="text-sm font-medium" :class="botInfo.is_active ? 'text-green-700' : 'text-red-700'">
                    {{ botInfo.is_active ? '运行中' : '已停用' }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">工作模式</p>
                <p class="text-sm font-medium text-gray-900 mt-1">{{ botInfo.work_mode === 'webhook' ? 'Webhook' : 'Polling' }}</p>
              </div>
            </div>
          </div>
          
          <!-- 描述信息 -->
          <div v-if="botInfo.description" class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-700">{{ botInfo.description }}</p>
          </div>
        </div>

        <!-- 通知配置面板 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <NotificationConfigPanel 
            :bot-id="botId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NotificationConfigPanel from '@/components/BotManagement/NotificationConfigPanel.vue'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 路由相关
const route = useRoute()
const router = useRouter()
const botId = ref(route.params.botId as string)

// 响应式数据
const loading = ref(false)
const error = ref('')
const botInfo = ref<any>(null)

// 方法定义
const goBack = () => {
  router.push('/bots')
}

const loadBotInfo = async () => {
  loading.value = true
  error.value = ''
  
  try {
    console.log('🔍 Loading bot info for ID:', botId.value)
    
    // 直接通过ID获取单个机器人信息
    const response = await botsAPI.getBotById(botId.value)
    
    console.log('📡 API Response:', response)
    
    if (response.data) {
      const apiResponse = response.data as any
      console.log('📊 API Response structure:', apiResponse)
      
      // 检查API响应结构：{success: true, message: '...', data: {...}}
      if (apiResponse.success && apiResponse.data && apiResponse.data.bot) {
        botInfo.value = apiResponse.data.bot
        console.log('✅ Bot loaded successfully:', apiResponse.data.bot.name)
      } else {
        console.error('❌ Unexpected API response structure:', apiResponse)
        console.error('❌ Expected: response.data.success = true, response.data.data.bot = {...}')
        error.value = '机器人不存在或已被删除'
      }
    } else {
      console.error('❌ No data in response')
      error.value = '获取机器人信息失败'
    }
  } catch (err: any) {
    console.error('❌ Load bot info error:', err)
    if (err.response?.status === 404) {
      error.value = '机器人不存在或已被删除'
    } else {
      error.value = '网络错误，请检查连接'
    }
  } finally {
    loading.value = false
  }
}

const refreshConfig = () => {
  loadBotInfo()
}

// 生命周期
onMounted(() => {
  if (!botId.value) {
    error.value = '缺少机器人ID参数'
    return
  }
  loadBotInfo()
})
</script>

<style scoped>
/* 确保与整体风格保持一致 */
.bg-gray-50 {
  background-color: #f9fafb;
}

/* 自定义滚动条样式，保持与系统一致 */
:deep(.notification-config-panel) {
  min-height: auto;
  background: transparent;
  padding: 0;
}

/* 覆盖NotificationConfigPanel的背景色，使其适应页面 */
:deep(.notification-config-panel > *) {
  background-color: transparent !important;
}

/* 保持卡片风格的一致性 */
:deep(.el-card) {
  border: 1px solid #e5e7eb !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
}

:deep(.el-card__header) {
  background-color: #f9fafb !important;
  border-bottom: 1px solid #e5e7eb !important;
  padding: 1.5rem !important;
}

:deep(.el-card__body) {
  padding: 1.5rem !important;
}

/* 标签页样式调整 */
:deep(.el-tabs) {
  background: white !important;
}

:deep(.el-tabs__header) {
  background: #f9fafb !important;
  margin: 0 !important;
  border-bottom: 1px solid #e5e7eb !important;
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 1.5rem !important;
}

:deep(.el-tabs__item) {
  color: #6b7280 !important;
  border: none !important;
  padding: 1rem 1.5rem !important;
  font-weight: 500 !important;
}

:deep(.el-tabs__item.is-active) {
  color: #3b82f6 !important;
  background: white !important;
}

:deep(.el-tabs__content) {
  padding: 1.5rem !important;
  background: white !important;
}

/* 按钮样式统一 */
:deep(.el-button) {
  border-radius: 0.5rem !important;
  font-weight: 500 !important;
  transition: all 0.2s !important;
}

:deep(.el-button--primary) {
  background-color: #3b82f6 !important;
  border-color: #3b82f6 !important;
}

:deep(.el-button--primary:hover) {
  background-color: #2563eb !important;
  border-color: #2563eb !important;
}

/* 表单样式调整 */
:deep(.el-form-item__label) {
  color: #374151 !important;
  font-weight: 500 !important;
}

:deep(.el-input__inner) {
  border-radius: 0.5rem !important;
  border-color: #d1d5db !important;
}

:deep(.el-input__inner:focus) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

/* 开关样式 */
:deep(.el-switch) {
  --el-switch-on-color: #10b981 !important;
}

/* 选择器样式 */
:deep(.el-select) {
  width: 100% !important;
}

:deep(.el-select .el-input__inner) {
  border-radius: 0.5rem !important;
}
</style>
