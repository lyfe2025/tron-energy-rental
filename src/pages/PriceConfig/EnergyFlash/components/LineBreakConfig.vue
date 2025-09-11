<template>
  <!-- 换行配置 -->
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📐 换行设置</h3>
    <p class="text-sm text-gray-600 mb-4">
      配置在不同位置添加额外的换行，让消息显示更美观。数值为0表示不添加额外换行。
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          标题后换行数
          <span class="text-xs text-gray-500">(标题与副标题之间)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_title"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          副标题后换行数
          <span class="text-xs text-gray-500">(价格列表后)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_subtitle"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          基本信息后换行数
          <span class="text-xs text-gray-500">(租期、价格、地址后)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_details"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          警告信息前换行数
          <span class="text-xs text-gray-500">(双倍能量警告前)</span>
        </label>
        <input
          v-model.number="lineBreaks.before_warning"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          注意事项前换行数
          <span class="text-xs text-gray-500">(注意事项列表前)</span>
        </label>
        <input
          v-model.number="lineBreaks.before_notes"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    
    <!-- 快速预设 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">快速预设</label>
      <div class="flex gap-2 flex-wrap">
        <button
          @click="setLineBreakPreset('compact')"
          class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          紧凑(0换行)
        </button>
        <button
          @click="setLineBreakPreset('normal')"
          class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
        >
          标准(1换行)
        </button>
        <button
          @click="setLineBreakPreset('spacious')"
          class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
        >
          宽松(2换行)
        </button>
        <button
          @click="setLineBreakPreset('custom')"
          class="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
        >
          自定义美观
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEnergyFlashConfig } from '../composables/useEnergyFlashConfig';
import type { EnergyFlashConfig } from '../types/energy-flash.types';

interface Props {
  config: EnergyFlashConfig
}

const props = defineProps<Props>()

// 使用配置管理composable
const { lineBreaks, setLineBreakPreset } = useEnergyFlashConfig(props.config)
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
