<template>
  <div class="space-y-4">
    <!-- 主消息配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📱 主消息配置</h3>
      
      <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p class="text-sm text-green-800 font-medium mb-1">💱 TRX闪兑流程：</p>
        <p class="text-xs text-green-700 leading-relaxed">
          1. 用户在Telegram点击TRX闪兑 → 2. <strong>机器人自动回复主消息（包含兑换信息）</strong> → 3. 用户支付USDT → 4. <strong>系统根据支付金额自动兑换TRX</strong>
        </p>
      </div>
      
      <div class="space-y-4">        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">USDT转TRX汇率</label>
            <input
              :value="usdtToTrxRate"
              @input="(e) => $emit('update:usdtToTrxRate', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0"
              step="0.000001"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {usdtToTrxRate} 占位符替换
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">TRX转USDT汇率</label>
            <input
              :value="trxToUsdtRate"
              @input="(e) => $emit('update:trxToUsdtRate', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0"
              step="0.000001"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {trxToUsdtRate} 占位符替换
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">最小兑换金额(USDT)</label>
            <input
              :value="minAmount"
              @input="(e) => $emit('update:minAmount', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0.1"
              step="0.1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {minAmount} 占位符替换
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">最大兑换金额(USDT)</label>
            <input
              :value="maxAmount"
              @input="(e) => $emit('update:maxAmount', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="1"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              用于主消息模板中的 {maxAmount} 占位符替换
            </p>
          </div>
          
          <div class="md:col-span-2">
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
              <div><code class="bg-blue-100 px-1 rounded">{usdtToTrxRate}</code> - USDT转TRX汇率</div>
              <div><code class="bg-blue-100 px-1 rounded">{trxToUsdtRate}</code> - TRX转USDT汇率</div>
              <div><code class="bg-blue-100 px-1 rounded">{minAmount}</code> - 最小兑换金额</div>
              <div><code class="bg-blue-100 px-1 rounded">{maxAmount}</code> - 最大兑换金额</div>
              <div><code class="bg-blue-100 px-1 rounded">{paymentAddress}</code> - 支付地址</div>
            </div>
            <p class="text-xs text-blue-600 mt-2">
              💡 系统会自动将占位符替换为实际数据，支持多行文本和自由排版
            </p>
            <p class="text-xs text-blue-600 mt-1">
              💱 支持数学运算：如 {usdtToTrxRate*100} 表示汇率乘以100
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
  usdtToTrxRate: number
  trxToUsdtRate: number
  minAmount: number
  maxAmount: number
  paymentAddress: string
  mainMessageTemplate: string
  applyMainTemplate: (templateType: string) => void
}

const props = defineProps<Props>()

defineEmits<{
  'update:usdtToTrxRate': [value: number]
  'update:trxToUsdtRate': [value: number]
  'update:minAmount': [value: number]
  'update:maxAmount': [value: number]
  'update:paymentAddress': [value: string]
  'update:mainMessageTemplate': [value: string]
}>()
</script>
