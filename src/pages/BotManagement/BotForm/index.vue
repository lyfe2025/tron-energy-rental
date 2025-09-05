<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div class="flex items-center space-x-4">
        <button
          @click="handleBack"
          class="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          返回
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isEdit ? '编辑机器人' : '创建机器人' }}
          </h1>
          <p class="text-gray-600 mt-1">
            {{ isEdit ? '修改机器人配置信息' : '配置新的Telegram机器人' }}
          </p>
        </div>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="handleBack"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span v-if="submitting" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          {{ isEdit ? '保存修改' : '创建机器人' }}
        </button>
      </div>
    </div>

    <!-- 表单内容 -->
    <div class="max-w-4xl">
      <form class="space-y-6">
        <!-- 基本信息 -->
        <BasicInfoSection
          :form="form"
          :validating-token="validatingToken"
          @update:form="form = $event"
          @validate-token="validateToken"
        />

        <!-- 网络配置 -->
        <NetworkConfigSection
          :form="form"
          @update:form="form = $event"
          @network-change="handleNetworkChange"
        />

        <!-- 高级设置 -->
        <AdvancedSettingsSection
          :form="form"
          :testing-webhook="testingWebhook"
          @update:form="form = $event"
          @test-webhook="testWebhook"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TronNetwork } from '@/types/network'
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 导入组件
import AdvancedSettingsSection from './components/AdvancedSettingsSection.vue'
import BasicInfoSection from './components/BasicInfoSection.vue'
import NetworkConfigSection from './components/NetworkConfigSection.vue'

// 导入组合式函数
import { useBotFormActions } from './composables/useBotFormActions'
import { useBotFormValidation } from './composables/useBotFormValidation'

// 类型定义
interface BotFormData {
  name: string
  username: string
  token: string
  description: string
  is_active: boolean
  auto_reconnect: boolean
  rate_limit: number
  timeout: number
  webhook_url: string
  selectedNetwork: string | null
}

// 路由
const route = useRoute()
const router = useRouter()

// 响应式数据
const form = ref<BotFormData>({
  name: '',
  username: '',
  token: '',
  description: '',
  is_active: true,
  auto_reconnect: true,
  rate_limit: 30,
  timeout: 30,
  webhook_url: '',
  selectedNetwork: null
})

// 计算属性
const isEdit = computed(() => route.params.id !== undefined)

// 使用组合式函数
const { validateForm } = useBotFormValidation(form, isEdit, route)
const {
  submitting,
  validatingToken,
  testingWebhook,
  validateToken,
  testWebhook,
  fetchBotData,
  handleSubmit
} = useBotFormActions(form, isEdit, route, router, validateForm)

// 方法
const handleNetworkChange = (network: TronNetwork) => {
  form.value.selectedNetwork = network.id
}

const handleBack = () => {
  router.push('/config/bots')
}

// 生命周期
onMounted(async () => {
  await fetchBotData()
})
</script>

<style scoped>
.space-y-6 > * + * {
  margin-top: 1.5rem;
}
</style>
