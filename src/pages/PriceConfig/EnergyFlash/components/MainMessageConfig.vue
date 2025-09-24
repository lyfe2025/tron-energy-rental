<template>
  <div class="space-y-4">
    <!-- 主消息配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📱 主消息配置</h3>
      
      <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p class="text-sm text-amber-800 font-medium mb-1">⚡ 能量闪租流程：</p>
        <p class="text-xs text-amber-700 leading-relaxed">
          1. 用户触发机器人 → 2. <strong>显示主消息（包含价格信息）</strong> → 3. 用户支付TRX → 4. 系统根据支付金额自动分配对应笔数
        </p>
      </div>
      
      <div class="space-y-4">        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格(TRX)</label>
            <input
              :value="singlePrice"
              @input="(e) => $emit('update:singlePrice', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0.1"
              step="0.1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {price} 占位符替换
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">租赁时长(小时)</label>
            <input
              :value="expiryHours"
              @input="(e) => $emit('update:expiryHours', Math.floor(Number((e.target as HTMLInputElement).value)) || 1)"
              type="number"
              min="1"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {hours} 占位符替换
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">最大笔数</label>
            <input
              :value="maxTransactions"
              @input="(e) => $emit('update:maxTransactions', Math.floor(Number((e.target as HTMLInputElement).value)) || 100)"
              type="number"
              min="1"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              单次租赁的最大交易笔数限制
            </p>
          </div>
          
          <div class="md:col-span-3">
            <label class="block text-sm font-medium text-gray-700 mb-2">支付地址</label>
            <input
              :value="paymentAddress"
              @input="(e) => $emit('update:paymentAddress', (e.target as HTMLInputElement).value)"
              type="text"
              placeholder="请输入TRON支付地址"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {paymentAddress} 占位符替换
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
            rows="18"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical font-mono text-sm"
          />
          
          <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-800 font-medium mb-1">📝 支持的占位符：</p>
            <div class="grid grid-cols-2 gap-2 text-xs text-blue-700">
              <div><code class="bg-blue-100 px-1 rounded">{price}</code> - 单笔价格</div>
              <div><code class="bg-blue-100 px-1 rounded">{hours}</code> - 租赁时长</div>
              <div><code class="bg-blue-100 px-1 rounded">{maxTransactions}</code> - 最大笔数</div>
              <div><code class="bg-blue-100 px-1 rounded">{paymentAddress}</code> - 支付地址</div>
            </div>
            <p class="text-xs text-blue-600 mt-2">
              💡 系统会自动将占位符替换为实际数据，支持多行文本和自由排版
            </p>
            <p class="text-xs text-blue-600 mt-1">
              ⚡ 支持数学运算：如 {price*2} 表示价格乘以2
            </p>
            <p class="text-xs text-blue-600 mt-1">
              📝 用户支付后系统自动分配笔数，无需配置最大数量
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
  singlePrice: number
  expiryHours: number
  maxTransactions: number
  paymentAddress: string
  mainMessageTemplate: string
  applyMainTemplate: (templateType: string) => void
}

const props = defineProps<Props>()

defineEmits<{
  'update:singlePrice': [value: number]
  'update:expiryHours': [value: number]
  'update:maxTransactions': [value: number]
  'update:paymentAddress': [value: string]
  'update:mainMessageTemplate': [value: string]
}>()
</script>
