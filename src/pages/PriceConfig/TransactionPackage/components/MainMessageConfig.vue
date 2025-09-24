<template>
  <div class="space-y-4">
    <!-- 主消息配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📱 主消息配置</h3>
      
      <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="text-sm text-blue-800 font-medium mb-1">💬 主消息展示流程：</p>
        <p class="text-xs text-blue-700 leading-relaxed">
          1. 用户触发机器人 → 2. <strong>显示主消息（包含套餐按钮）</strong> → 3. 用户选择套餐 → 4. 机器人要求输入地址
        </p>
      </div>
      
      <div class="space-y-4">        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">占用费(笔/24h)</label>
            <input
              :value="dailyFee"
              @input="(e) => $emit('update:dailyFee', Math.floor(Number((e.target as HTMLInputElement).value)) || 0)"
              type="number"
              min="0"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {dailyFee} 占位符替换，必须为整数
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">地址收集提示</label>
            <input
              :value="replyMessage"
              @input="(e) => $emit('update:replyMessage', (e.target as HTMLInputElement).value)"
              type="text"
              placeholder="请输入能量接收地址:"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用户选择套餐后显示的地址收集提示消息
            </p>
          </div>
        </div>

        <!-- 主消息文案模板配置 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">主消息文案模板</label>
            <div class="flex items-center gap-2 text-xs">
              <span class="text-gray-500">快速模板:</span>
              <button
                @click="applyMainTemplate('basic')"
                class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
              >
                基础版
              </button>
              <button
                @click="applyMainTemplate('detailed')"
                class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
              >
                详细版
              </button>
              <button
                @click="applyMainTemplate('simple')"
                class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
              >
                简洁版
              </button>
              <button
                @click="applyMainTemplate('professional')"
                class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 transition-colors"
              >
                专业版
              </button>
              <button
                @click="applyMainTemplate('friendly')"
                class="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded hover:bg-pink-200 transition-colors"
              >
                亲和版
              </button>
            </div>
          </div>
          
          <textarea
            :value="mainMessageTemplate"
            @input="(e) => $emit('update:mainMessageTemplate', (e.target as HTMLTextAreaElement).value)"
            placeholder="请输入主消息的完整文案模板..."
            rows="20"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical font-mono text-sm"
          />
          
          <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-800 font-medium mb-1">📝 支持的占位符：</p>
            <div class="text-xs text-blue-700">
              <div><code class="bg-blue-100 px-1 rounded">{dailyFee}</code> - 每日占用费数量</div>
            </div>
            <p class="text-xs text-blue-600 mt-2">
              💡 系统会自动将占位符替换为实际数据，支持多行文本和自由排版
            </p>
            <p class="text-xs text-blue-600 mt-1">
              📝 套餐按钮会自动显示在消息文本下方，无需在模板中包含
            </p>
          </div>
          
          <!-- 模板说明 -->
          <div class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
            <p class="text-xs font-medium text-gray-700 mb-1">🎨 模板风格说明：</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-gray-600">
              <div><span class="font-medium text-green-700">基础版：</span>简单清晰，信息完整</div>
              <div><span class="font-medium text-blue-700">详细版：</span>信息丰富，格式美观</div>
              <div><span class="font-medium text-gray-700">简洁版：</span>极简风格，一目了然</div>
              <div><span class="font-medium text-purple-700">专业版：</span>正式规范，适合企业</div>
              <div><span class="font-medium text-pink-700">亲和版：</span>温馨友好，用户体验佳</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  mainMessageTemplate: string
  dailyFee: number
  replyMessage: string
  applyMainTemplate: (templateType: string) => void
}

interface Emits {
  (e: 'update:mainMessageTemplate', value: string): void
  (e: 'update:dailyFee', value: number): void
  (e: 'update:replyMessage', value: string): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
