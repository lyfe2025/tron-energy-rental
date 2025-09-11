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
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">套餐副标题模板</label>
          <input
            :value="subtitleTemplate"
            @input="(e) => $emit('update:subtitleTemplate', (e.target as HTMLInputElement).value)"
            type="text"
            placeholder="（24小时不使用，则扣{dailyFee}笔占费）"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            支持变量：{dailyFee} 会被替换为占费笔数
          </p>
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

    <!-- 显示文本配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
      <div class="space-y-3">
        <div v-for="(rule, index) in usageRules" :key="index" class="flex gap-2">
          <input
            v-model="usageRules[index]"
            type="text"
            placeholder="显示文本"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="removeUsageRule(index)"
            class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            删除
          </button>
        </div>
        <button
          @click="addUsageRule"
          class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          添加显示文本
        </button>
      </div>
    </div>

    <!-- 注意事项配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📋 注意事项配置</h3>
      <div class="space-y-3">
        <div v-for="(note, index) in notes" :key="index" class="flex gap-2">
          <input
            v-model="notes[index]"
            type="text"
            placeholder="注意事项"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="removeNote(index)"
            class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            删除
          </button>
        </div>
        <button
          @click="addNote"
          class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          添加注意事项
        </button>
      </div>
    </div>

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
            :value="lineBreaks?.after_title || 0"
            @input="(e) => updateLineBreak('after_title', Number((e.target as HTMLInputElement).value))"
            type="number"
            min="0"
            max="5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            副标题后换行数
            <span class="text-xs text-gray-500">(占费说明后)</span>
          </label>
          <input
            :value="lineBreaks?.after_subtitle || 0"
            @input="(e) => updateLineBreak('after_subtitle', Number((e.target as HTMLInputElement).value))"
            type="number"
            min="0"
            max="5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            套餐列表后换行数
            <span class="text-xs text-gray-500">(套餐按钮后)</span>
          </label>
          <input
            :value="lineBreaks?.after_packages || 0"
            @input="(e) => updateLineBreak('after_packages', Number((e.target as HTMLInputElement).value))"
            type="number"
            min="0"
            max="5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            使用规则前换行数
            <span class="text-xs text-gray-500">(使用规则前)</span>
          </label>
          <input
            :value="lineBreaks?.before_usage_rules || 0"
            @input="(e) => updateLineBreak('before_usage_rules', Number((e.target as HTMLInputElement).value))"
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
            :value="lineBreaks?.before_notes || 0"
            @input="(e) => updateLineBreak('before_notes', Number((e.target as HTMLInputElement).value))"
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
            @click="setLineBreakPreset?.('compact')"
            class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            紧凑(0换行)
          </button>
          <button
            @click="setLineBreakPreset?.('normal')"
            class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
          >
            标准(1换行)
          </button>
          <button
            @click="setLineBreakPreset?.('spacious')"
            class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
          >
            宽松(2换行)
          </button>
          <button
            @click="setLineBreakPreset?.('custom')"
            class="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
          >
            自定义美观
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
  subtitleTemplate: string
  dailyFee: number
  isUnlimited: boolean
  replyMessage: string
  usageRules: string[]
  notes: string[]
  addUsageRule: () => void
  removeUsageRule: (index: number) => void
  addNote: () => void
  removeNote: (index: number) => void
  lineBreaks?: any
  updateLineBreak?: (field: string, value: number) => void
  setLineBreakPreset?: (preset: string) => void
}

const props = defineProps<Props>()
defineEmits<{
  'update:displayTitle': [value: string]
  'update:subtitleTemplate': [value: string]
  'update:dailyFee': [value: number]
  'update:isUnlimited': [value: boolean]
  'update:replyMessage': [value: string]
}>()

// 添加调试日志
console.log('📝 [PackageSettings] Props received:')
console.log('📝 [PackageSettings] usageRules:', props.usageRules)
console.log('📝 [PackageSettings] notes:', props.notes)
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
