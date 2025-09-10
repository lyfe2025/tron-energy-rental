<template>
  <div class="price-notification-panel">
    <div class="panel-header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-gray-900">💰 价格通知配置</h3>
          <p class="text-gray-400 text-sm mt-1">配置价格变动、新套餐、优惠活动等价格相关通知</p>
        </div>
        <el-switch 
          v-model="config.enabled"
          active-text="已启用"
          inactive-text="已禁用"
          size="large"
          active-color="#3B82F6"
          inactive-color="#E5E7EB"
          @change="$emit('save')"
        />
      </div>
    </div>

    <!-- 价格通知配置 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
      <!-- 价格变动通知 -->
      <PriceChangeNotification
        v-model="config"
        @save="$emit('save')"
      />

      <!-- 套餐通知 -->
      <PackageNotification
        v-model="config"
        @save="$emit('save')"
      />

      <!-- 库存通知 -->
      <StockNotification
        v-model="config"
        @save="$emit('save')"
      />

    </el-collapse>

    <!-- 价格监控设置 -->
    <div class="mt-6">
      <PriceMonitoringConfig />
    </div>

    <!-- 配置预览 -->
    <div class="mt-6">
      <PriceConfigPreview :model-value="config" />
    </div>

  </div>
</template>

<script setup lang="ts">
import type { PriceNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

// 导入分离的子组件
import PackageNotification from './price-notifications/PackageNotification.vue'
import PriceChangeNotification from './price-notifications/PriceChangeNotification.vue'
import PriceConfigPreview from './price-notifications/PriceConfigPreview.vue'
import PriceMonitoringConfig from './price-notifications/PriceMonitoringConfig.vue'
import StockNotification from './price-notifications/StockNotification.vue'

interface Props {
  modelValue: PriceNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: PriceNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const activeNames = ref(['price_change', 'package', 'stock'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.price-notification-panel {
  @apply min-h-full;
}

:deep(.notification-collapse) {
  @apply bg-transparent border-0;
}

:deep(.notification-collapse .el-collapse-item) {
  @apply bg-white border border-gray-200 rounded-lg mb-4 shadow-sm;
}

:deep(.notification-collapse .el-collapse-item__header) {
  @apply bg-gray-50 text-gray-900 px-6 py-4 text-lg font-semibold border-0 rounded-t-lg hover:bg-gray-100 transition-colors;
}

:deep(.notification-collapse .el-collapse-item__content) {
  @apply bg-white border-0 px-6 pb-6;
}

:deep(.notification-collapse .el-collapse-item.is-active .el-collapse-item__header) {
  @apply border-b border-gray-700;
}
</style>
