<template>
  <div class="space-y-4">

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

      <!-- 汇率配置 -->
      <div class="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-lg">💱</span>
          <h4 class="text-sm font-medium text-gray-700">汇率配置</h4>
          <span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">实时换算</span>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-600">USDT → TRX 汇率：</label>
          <div class="flex items-center gap-1">
            <span class="text-sm text-gray-600">1 USDT =</span>
            <input
              :value="usdtToTrxRate"
              @input="(e) => $emit('update:usdtToTrxRate', Number((e.target as HTMLInputElement).value))"
              type="number"
              min="0"
              step="0.1"
              placeholder="3.02"
              class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <span class="text-sm text-gray-600">TRX</span>
          </div>
          <div class="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
            修改汇率将自动更新所有套餐的TRX价格
          </div>
        </div>
      </div>
      
      <!-- 按钮列表 -->
      <div class="max-h-96 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(button, index) in buttons"
            :key="button.id"
            :class="[
              'p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all hover:bg-gray-100',
              button.isSpecial ? 'md:col-span-2 lg:col-span-3' : ''
            ]"
          >
            <!-- 按钮配置项标题 -->
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-semibold text-gray-800">{{ button.count }}笔套餐</span>
              <button
                @click="removeButton(index)"
                class="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50"
                title="删除此套餐"
              >
                🗑️
              </button>
            </div>
            
            <!-- 笔数配置 -->
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-600 mb-1">笔数</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="button.count"
                  type="number"
                  min="1"
                  placeholder="10"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span class="text-sm text-gray-500">笔</span>
              </div>
            </div>
            
            <!-- 每笔单价配置 -->
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-600 mb-1">每笔单价 (USDT)</label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="button.unitPrice"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="1.1438"
                  :class="[
                    'flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    isNaN(button.unitPrice) || button.unitPrice <= 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300 bg-white text-gray-900'
                  ]"
                />
                <span class="text-sm text-gray-500">USDT</span>
              </div>
              <!-- TRX价格显示 -->
              <div class="mt-1 text-xs text-blue-600">
                ≈ {{ (button.trxUnitPrice || 0).toFixed(4) }} TRX ({{ usdtToTrxRate }}x)
              </div>
              <!-- 验证提示 -->
              <div v-if="isNaN(button.unitPrice) || button.unitPrice <= 0" class="text-xs text-red-600 mt-1">
                请输入有效的单价 (大于0的数字)
              </div>
            </div>
            
            <!-- 双货币总价显示 -->
            <div class="mb-3 space-y-1">
              <div class="p-2 bg-green-50 border border-green-200 rounded-md">
                <div class="text-xs text-green-700 font-medium">
                  💰 USDT: <span class="text-green-800 font-bold">{{ calculateTotalPrice(button.count, button.unitPrice) }}</span>
                </div>
              </div>
              <div class="p-2 bg-orange-50 border border-orange-200 rounded-md">
                <div class="text-xs text-orange-700 font-medium">
                  🪙 TRX: <span class="text-orange-800 font-bold">{{ (button.trxPrice || 0).toFixed(2) }}</span>
                </div>
              </div>
            </div>
            
            <!-- 特殊按钮选项 -->
            <div class="flex items-center justify-between">
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="button.isSpecial"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-sm text-gray-700">全宽显示</span>
              </label>
              <div class="text-xs text-gray-500">
                {{ button.isSpecial ? '全宽按钮' : '标准按钮' }}
              </div>
            </div>
          </div>
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





    <!-- 订单配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">💰 订单确认信息配置</h3>
      
      <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p class="text-sm text-amber-800 font-medium mb-1">⚡ 订单生成流程：</p>
        <p class="text-xs text-amber-700 leading-relaxed">
          1. 用户选择套餐（每笔单价在按钮配置中设定）→ 2. 机器人要求输入地址 → 3. 用户输入地址 → 4. <strong>系统自动计算：收款金额 = 笔数 × 每笔单价</strong>
        </p>
      </div>
      
          <div class="space-y-4">        
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">支付地址</label>
                <div class="flex">
                  <input
                    :value="paymentAddress"
                    @input="(e) => $emit('update:paymentAddress', (e.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="TWdcgk9NEsV1nt5yPrNfSYktbA12345678"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    @click="copyToClipboard(paymentAddress)"
                    class="px-3 py-2 bg-green-600 text-white text-sm rounded-r-md hover:bg-green-700"
                    title="点击复制地址"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">订单过期时间 (分钟)</label>
                <input
                  :value="orderExpireMinutes"
                  @input="(e) => $emit('update:orderExpireMinutes', Number((e.target as HTMLInputElement).value))"
                  type="number"
                  min="1"
                  placeholder="30"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">
                  订单将于 <span class="font-semibold">{{ calculateExpireTime() }}</span> 过期
                </p>
              </div>
            </div>

            <!-- 订单确认文案模板配置 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">订单确认文案模板 (USDT版本)</label>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-gray-500">快速模板:</span>
                  <button
                    @click="applyOrderTemplate('basic')"
                    class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                  >
                    基础版
                  </button>
                  <button
                    @click="applyOrderTemplate('detailed')"
                    class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                  >
                    详细版
                  </button>
                  <button
                    @click="applyOrderTemplate('simple')"
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    简洁版
                  </button>
                  <button
                    @click="applyOrderTemplate('professional')"
                    class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 transition-colors"
                  >
                    专业版
                  </button>
                  <button
                    @click="applyOrderTemplate('friendly')"
                    class="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded hover:bg-pink-200 transition-colors"
                  >
                    亲和版
                  </button>
                </div>
              </div>
              
              <textarea
                :value="orderConfirmationTemplate"
                @input="(e) => $emit('update:orderConfirmationTemplate', (e.target as HTMLTextAreaElement).value)"
                placeholder="请输入订单确认的完整文案模板..."
                rows="15"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical font-mono text-sm"
              />
              
              <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-sm text-blue-800 font-medium mb-1">🔄 智能占位符（自动替换USDT价格）：</p>
                <div class="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div><code class="bg-blue-100 px-1 rounded">{unitPrice}</code> - 每笔单价</div>
                  <div><code class="bg-blue-100 px-1 rounded">{totalAmount}</code> - 收款金额</div>
                  <div><code class="bg-blue-100 px-1 rounded">{transactionCount}</code> - 使用笔数</div>
                  <div><code class="bg-blue-100 px-1 rounded">{userAddress}</code> - 用户输入地址</div>
                  <div><code class="bg-blue-100 px-1 rounded">{paymentAddress}</code> - 支付地址</div>
                  <div><code class="bg-blue-100 px-1 rounded">{expireTime}</code> - 过期时间</div>
                </div>
                <p class="text-xs text-blue-600 mt-2">
                  💡 USDT模板价格从按钮配置中的USDT价格获取，支持多行文本和自由排版
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

            <!-- TRX版订单确认文案模板配置 -->
            <div class="mt-6">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">订单确认文案模板 (TRX版本)</label>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-gray-500">TRX快速模板:</span>
                  <button
                    @click="applyOrderTemplateTrx('basic')"
                    class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 transition-colors"
                  >
                    基础版
                  </button>
                  <button
                    @click="applyOrderTemplateTrx('detailed')"
                    class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors"
                  >
                    详细版
                  </button>
                  <button
                    @click="applyOrderTemplateTrx('simple')"
                    class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded hover:bg-yellow-200 transition-colors"
                  >
                    简洁版
                  </button>
                </div>
              </div>
              
              <textarea
                :value="orderConfirmationTemplateTrx"
                @input="(e) => $emit('update:orderConfirmationTemplateTrx', (e.target as HTMLTextAreaElement).value)"
                placeholder="请输入TRX版订单确认的完整文案模板..."
                rows="15"
                class="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-vertical font-mono text-sm"
              />
              
              <div class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p class="text-sm text-orange-800 font-medium mb-1">🔄 智能占位符（自动替换TRX价格）：</p>
                <div class="grid grid-cols-2 gap-2 text-xs text-orange-700">
                  <div><code class="bg-orange-100 px-1 rounded">{unitPrice}</code> - 每笔单价</div>
                  <div><code class="bg-orange-100 px-1 rounded">{totalAmount}</code> - 收款金额</div>
                  <div><code class="bg-orange-100 px-1 rounded">{transactionCount}</code> - 使用笔数</div>
                  <div><code class="bg-orange-100 px-1 rounded">{userAddress}</code> - 用户输入地址</div>
                  <div><code class="bg-orange-100 px-1 rounded">{paymentAddress}</code> - 支付地址</div>
                  <div><code class="bg-orange-100 px-1 rounded">{expireTime}</code> - 过期时间</div>
                </div>
                <p class="text-xs text-orange-600 mt-2">
                  💡 TRX模板价格从按钮配置中的预计算TRX价格获取，无需在模板中考虑汇率
                </p>
              </div>
            </div>
            
            <!-- 内嵌键盘配置 -->
            <div class="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg">⌨️</span>
                  <h5 class="text-sm font-medium text-gray-700">内嵌键盘配置</h5>
                </div>
                <label class="flex items-center cursor-pointer">
                  <input
                    :checked="inlineKeyboardEnabled"
                    @change="(e) => $emit('update:inlineKeyboardEnabled', (e.target as HTMLInputElement).checked)"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-xs text-gray-700">启用内嵌键盘</span>
                </label>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3" v-show="inlineKeyboardEnabled">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">每行按钮数</label>
                  <select
                    :value="keyboardButtonsPerRow"
                    @change="(e) => $emit('update:keyboardButtonsPerRow', Number((e.target as HTMLSelectElement).value))"
                    class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1">1个/行</option>
                    <option value="2">2个/行</option>
                    <option value="3">3个/行</option>
                  </select>
                </div>
                
                <div class="flex items-end">
                  <div class="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    🔄 切换TRX支付 / ❌ 取消订单
                  </div>
                </div>
              </div>
              
              <div class="mt-3 p-2 bg-white border border-blue-200 rounded text-xs text-gray-600" v-show="inlineKeyboardEnabled">
                <span class="font-medium">⌨️ 内嵌键盘功能：</span>
                用户确认订单后可切换支付方式或取消订单
              </div>
            </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import type { Button } from '../composables/usePackageConfig'

interface Props {
  // 按钮配置
  buttons: Button[]
  addButton: () => void
  removeButton: (index: number) => void
  applyTemplate: (templateType: string) => void
  
  // 订单配置字段
  paymentAddress: string
  orderExpireMinutes: number
  orderConfirmationTemplate: string
  orderConfirmationTemplateTrx: string
  usdtToTrxRate: number
  inlineKeyboardEnabled: boolean
  keyboardButtonsPerRow: number
  applyOrderTemplate: (templateType: string) => void
  applyOrderTemplateTrx: (templateType: string) => void
}

const props = defineProps<Props>()
defineEmits<{
  // 订单配置字段的emit事件
  'update:paymentAddress': [value: string]
  'update:orderExpireMinutes': [value: number]
  'update:orderConfirmationTemplate': [value: string]
  'update:orderConfirmationTemplateTrx': [value: string]
  'update:usdtToTrxRate': [value: number]
  'update:inlineKeyboardEnabled': [value: boolean]
  'update:keyboardButtonsPerRow': [value: number]
}>()

// 安全计算总价，防止NaN
const calculateTotalPrice = (count: number, unitPrice: number): string => {
  const safeCount = Number(count) || 0
  const safeUnitPrice = Number(unitPrice) || 0
  
  if (safeCount <= 0 || safeUnitPrice <= 0) {
    return '0.0000'
  }
  
  const totalPrice = safeCount * safeUnitPrice
  if (isNaN(totalPrice)) {
    return '0.0000'
  }
  
  return totalPrice.toFixed(4)
}

// 复制到剪贴板功能
const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 备用方案
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
    
    // 使用toast提示成功
    const { success } = useToast()
    success(`已复制：${text}`, {
      duration: 2000
    })
  } catch (err) {
    console.error('复制失败:', err)
    // 使用toast提示失败
    const { error } = useToast()
    error('复制失败，请手动复制', {
      duration: 3000
    })
  }
}

// 计算过期时间
const calculateExpireTime = () => {
  const now = new Date()
  const expireTime = new Date(now.getTime() + props.orderExpireMinutes * 60 * 1000)
  return expireTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 添加调试日志
console.log('📝 [PackageSettings] Props received:')
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
