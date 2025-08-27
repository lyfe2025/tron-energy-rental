<template>
  <!-- Batch Actions Floating Button -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="selectedBots.length > 0"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">
          已选择 {{ selectedBots.length }} 个机器人
        </span>
        
        <div class="flex gap-2">
          <button
            @click="$emit('batch-start')"
            class="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
          >
            <Play class="w-4 h-4" />
            批量启动
          </button>
          
          <button
            @click="$emit('batch-stop')"
            class="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
          >
            <Square class="w-4 h-4" />
            批量停止
          </button>
          
          <button
            @click="$emit('batch-test')"
            class="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
          >
            <Zap class="w-4 h-4" />
            批量测试
          </button>
          
          <button
            @click="$emit('clear-selection')"
            class="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-1"
          >
            <X class="w-4 h-4" />
            取消选择
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Play, Square, Zap, X } from 'lucide-vue-next'

interface Props {
  selectedBots: string[]
}

interface Emits {
  'batch-start': []
  'batch-stop': []
  'batch-test': []
  'clear-selection': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>