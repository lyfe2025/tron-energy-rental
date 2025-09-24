<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <!-- 卡片头部 -->
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">能量闪租模式</h2>
        <p class="text-gray-600 text-sm mt-1">单笔能量闪电租赁配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div v-if="config" class="flex flex-col md:flex-row gap-6" ref="layoutContainer">
      <!-- 左侧：Telegram 显示预览 -->
      <div class="md:w-1/3">
        <TelegramPreview 
          :config="config"
          :mainMessageTemplate="formatMainMessage"
          :singlePrice="singlePrice"
          :expiryHours="expiryHours"
          :maxTransactions="maxTransactions"
          :paymentAddress="paymentAddress"
        />
      </div>

      <!-- 右侧：配置表单 -->
      <div class="md:w-2/3 space-y-6">
        <!-- 图片配置 -->
        <ImageConfig :config="config" />

        <!-- 主消息配置 -->
        <MainMessageConfig
          :singlePrice="singlePrice"
          :expiryHours="expiryHours"
          :maxTransactions="maxTransactions"
          :paymentAddress="paymentAddress"
          :mainMessageTemplate="mainMessageTemplate"
          :applyMainTemplate="applyMainTemplate"
          @update:singlePrice="updateSinglePrice"
          @update:expiryHours="updateExpiryHours"
          @update:maxTransactions="updateMaxTransactions"
          @update:paymentAddress="updatePaymentAddress"
          @update:mainMessageTemplate="updateMainMessageTemplate"
        />

        <!-- 保存按钮 -->
        <div class="mt-4 flex justify-end">
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { ConfigCardProps } from '../types'

// 引入分离出的组件
import ImageConfig from './components/ImageConfig.vue'
import MainMessageConfig from './components/MainMessageConfig.vue'
import TelegramPreview from './components/TelegramPreview.vue'

// 引入配置管理逻辑
import { useEnergyFlashConfig } from './composables/useEnergyFlashConfig'
import { useMainMessageConfig } from './composables/useMainMessageConfig'

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()

// 引用和状态
const saving = ref(false)
const layoutContainer = ref(null)

// 使用配置管理composable
const { initializeConfig } = useEnergyFlashConfig(props.config)

// 使用主消息配置管理
const {
  mainMessageTemplate,
  formatMainMessage,
  singlePrice,
  expiryHours,
  maxTransactions,
  paymentAddress,
  initializeFromConfig,
  saveConfig,
  applyMainTemplate,
  updateSinglePrice,
  updateExpiryHours,
  updateMaxTransactions,
  updatePaymentAddress,
  updateMainMessageTemplate
} = useMainMessageConfig(props.config)

/**
 * 事件处理函数
 */
const handleToggle = () => {
  props.onToggle('energy_flash')
}

const handleSave = () => {
  saving.value = true
  try {
    // 保存主消息配置
    saveConfig()
    props.onSave('energy_flash')
  } finally {
    // 模拟保存过程
    setTimeout(() => {
      saving.value = false
    }, 1000)
  }
}

/**
 * 调试函数 - 保持原有的布局调试功能
 */
const debugLayout = () => {
  if (layoutContainer.value) {
    const element = layoutContainer.value as HTMLElement
    const styles = window.getComputedStyle(element)
    const screenWidth = window.innerWidth
    
    console.log('🐛 EnergyFlash Layout Debug:', {
      screenWidth,
      flexDirection: styles.flexDirection,
      className: element.className,
      isMdBreakpoint: screenWidth >= 768,
      elementWidth: element.offsetWidth
    })
    
    // 检查子元素
    const children = element.children
    console.log(`🐛 EnergyFlash 总共有 ${children.length} 个子元素`)
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      const childStyles = window.getComputedStyle(child)
      console.log(`  子元素 ${i + 1}:`, {
        className: child.className,
        width: childStyles.width,
        height: childStyles.height,
        display: childStyles.display,
        visibility: childStyles.visibility,
        opacity: childStyles.opacity,
        flexBasis: childStyles.flexBasis,
        offsetWidth: child.offsetWidth,
        offsetHeight: child.offsetHeight,
        isVisible: child.offsetWidth > 0 && child.offsetHeight > 0
      })
    }
  }
}

/**
 * 生命周期和监听器
 */
// 监听props变化
watch(() => props.config, () => {
  console.log('🐛 EnergyFlash Config Changed:', props.config?.mode_type)
  initializeConfig() // 初始化配置
  initializeFromConfig() // 初始化主消息配置
  setTimeout(() => {
    if (layoutContainer.value) debugLayout()
  }, 100)
}, { immediate: true })

// 组件挂载
onMounted(() => {
  // 调试当前布局
  nextTick(() => {
    debugLayout()
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      setTimeout(debugLayout, 100)
    })
  })
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}
</style>