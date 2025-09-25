<template>
  <div class="mt-2 max-w-xs">
    <div class="space-y-1">
      <!-- 使用网格布局显示按钮，匹配配置界面的布局（每行3个按钮） -->
      <div class="grid grid-cols-3 gap-1">
        <template v-for="button in regularButtons" :key="button.id">
          <button
            @click="simulateButtonClick(button)"
            class="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            {{ button.count }}笔
          </button>
        </template>
      </div>
      
      <!-- 特殊按钮（全宽显示） -->
      <div v-for="button in specialButtons" :key="`special-${button.id}`">
        <button
          @click="simulateButtonClick(button)"
          class="w-full bg-blue-50 border border-blue-200 text-blue-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          {{ button.count }}笔
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Button } from '../../../pages/PriceConfig/TransactionPackage/composables/usePackageConfig';

interface Props {
  regularButtons: Button[]
  specialButtons: Button[]
  simulateButtonClick: (button: Button) => void
}

defineProps<Props>()
</script>
