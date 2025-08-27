<template>
  <!-- 批量操作浮动按钮 -->
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="selectedPackages.length > 0"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-4 z-40"
    >
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">
          已选择 {{ selectedPackages.length }} 个能量包
        </span>
        
        <div class="flex items-center space-x-2">
          <button
            @click="$emit('batch-enable')"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
          >
            <Power class="h-3 w-3 mr-1" />
            批量启用
          </button>
          
          <button
            @click="$emit('batch-disable')"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <PowerOff class="h-3 w-3 mr-1" />
            批量禁用
          </button>
          
          <button
            @click="$emit('batch-delete')"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 class="h-3 w-3 mr-1" />
            批量删除
          </button>
          
          <button
            @click="$emit('clear-selection')"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <X class="h-3 w-3 mr-1" />
            取消选择
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Power, PowerOff, Trash2, X } from 'lucide-vue-next'

interface Props {
  selectedPackages: string[]
}

interface Emits {
  'batch-enable': []
  'batch-disable': []
  'batch-delete': []
  'clear-selection': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>