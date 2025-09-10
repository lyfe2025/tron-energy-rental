<template>
  <div class="space-y-4">
    <!-- 基础设置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📝 基础设置</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">套餐标题</label>
          <input
            :value="displayTitle"
            @input="(e) => $emit('update:displayTitle', (e.target as HTMLInputElement).value)"
            type="text"
            placeholder="笔数套餐"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">占费(笔/24h)</label>
              <input
                :value="dailyFee"
                @input="(e) => $emit('update:dailyFee', Number((e.target as HTMLInputElement).value))"
                type="number"
                min="0"
                step="0.1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
          </div>
          <div class="flex items-center pt-6">
            <label class="flex items-center">
              <input
                :checked="isUnlimited"
                @change="(e) => $emit('update:isUnlimited', (e.target as HTMLInputElement).checked)"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">无时间限制</span>
            </label>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">选择后回复消息</label>
          <input
            :value="replyMessage"
            @input="(e) => $emit('update:replyMessage', (e.target as HTMLInputElement).value)"
            type="text"
            placeholder="请输入能量接收地址:"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- 按钮配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">🔘 按钮配置</h3>
        <button
          @click="addButton"
          class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          ➕ 添加按钮
        </button>
      </div>
      
      <!-- 按钮列表 -->
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="(button, index) in buttons"
          :key="button.id"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <input
            v-model.number="button.count"
            type="number"
            min="1"
            placeholder="笔数"
            class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-500">笔</span>
          
          <input
            v-model.number="button.price"
            type="number"
            min="0"
            step="0.1"
            placeholder="价格"
            class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-500">TRX</span>
          
          <div class="flex items-center gap-1">
            <label class="flex items-center">
              <input
                v-model="button.isSpecial"
                type="checkbox"
                class="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span class="ml-1 text-xs text-gray-600">全宽</span>
            </label>
          </div>
          
          <button
            @click="removeButton(index)"
            class="ml-auto text-red-600 hover:text-red-800 text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <!-- 快速模板 -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-medium text-gray-700">快速模板:</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button
            @click="applyTemplate('basic')"
            class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
          >
            基础套餐
          </button>
          <button
            @click="applyTemplate('popular')"
            class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
          >
            热门套餐
          </button>
          <button
            @click="applyTemplate('enterprise')"
            class="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
          >
            企业套餐
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Button } from '../composables/usePackageConfig'

interface Props {
  buttons: Button[]
  addButton: () => void
  removeButton: (index: number) => void
  applyTemplate: (templateType: string) => void
  displayTitle: string
  dailyFee: number
  isUnlimited: boolean
  replyMessage: string
}

defineProps<Props>()
defineEmits<{
  'update:displayTitle': [value: string]
  'update:dailyFee': [value: number]
  'update:isUnlimited': [value: boolean]
  'update:replyMessage': [value: string]
}>()
</script>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
