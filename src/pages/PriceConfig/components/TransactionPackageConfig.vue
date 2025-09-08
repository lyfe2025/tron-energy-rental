<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">笔数套餐模式</h2>
        <p class="text-gray-600 text-sm mt-1">长期套餐价格配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="config" class="flex flex-col lg:flex-row gap-6">
      <!-- 左侧：Telegram 显示预览 -->
      <div class="lg:w-1/3 lg:min-w-[400px]">
        <div class="bg-gray-100 p-4 rounded-lg sticky top-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📱 Telegram 显示预览</h3>
          <div class="bg-white p-4 rounded-lg border font-mono text-sm shadow-inner">
            <div class="text-green-600">{{ getDisplayText('title', '🔥 笔数套餐 🔥（无时间限制）') }}</div>
            <div class="text-gray-600">{{ getDisplayText('subtitle', '（24小时不使用，则扣一笔占费）') }}</div>
            <br>
            <div v-for="rule in config.config.usage_rules" :key="rule" class="text-red-600">
              🔺 {{ rule }}
            </div>
            <br>
            <div class="text-yellow-600">{{ getDisplayText('usage_title', '💡 笔数开/关按钮，可查询账单，开/关笔数') }}</div>
            <br>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <div 
                v-for="pkg in config.config.packages" 
                :key="pkg.name"
                class="bg-green-100 p-2 text-center rounded"
              >
                <div class="font-bold">{{ pkg.transaction_count }}笔</div>
                <div class="text-sm">{{ pkg.price }} TRX</div>
              </div>
            </div>
            <br>
            <div class="text-gray-600">{{ getDisplayText('address_prompt', '请输入能量接收地址：') }}</div>
            <br>
            <div v-for="note in config.config.notes" :key="note" class="text-red-600">
              ⚠️ {{ note }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：配置表单 -->
      <div class="lg:w-2/3 space-y-6">
        <!-- 基础配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">⚙️ 基础配置</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">24小时不使用扣费</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="config.config.daily_fee"
                  type="number"
                  step="0.1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">TRX</span>
              </div>
            </div>

            <div class="form-group flex items-center space-y-2">
              <div class="flex items-center p-2 bg-blue-50 rounded-md mr-4">
                <input
                  v-model="config.config.transferable"
                  type="checkbox"
                  id="transferable"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="transferable" class="ml-2 text-sm text-gray-700">
                  🔄 支持转移笔数
                </label>
              </div>

              <div class="flex items-center p-2 bg-green-50 rounded-md">
                <input
                  v-model="config.config.proxy_purchase"
                  type="checkbox"
                  id="proxy_purchase"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="proxy_purchase" class="ml-2 text-sm text-gray-700">
                  🛒 支持代购
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 套餐列表 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">🔥 套餐配置</h3>
            <button
              @click="addPackage"
              class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              ➕ 添加套餐
            </button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(pkg, index) in config.config.packages"
              :key="index"
              class="package-item p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-orange-50 to-red-50"
            >
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
                  <input
                    v-model="pkg.name"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">📝 笔数</label>
                  <input
                    v-model.number="pkg.transaction_count"
                    type="number"
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">💰 价格 (TRX)</label>
                  <input
                    v-model.number="pkg.price"
                    type="number"
                    step="0.1"
                    min="0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div class="flex items-end">
                  <button
                    @click="removePackage(index)"
                    class="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 显示文本配置 -->
        <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">主标题</label>
              <input
                :value="config.config.display_texts?.title || ''"
                @input="updateDisplayText('title', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="🔥 笔数套餐 🔥（无时间限制）"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">副标题</label>
              <input
                :value="config.config.display_texts?.subtitle || ''"
                @input="updateDisplayText('subtitle', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="（24小时不使用，则扣一笔占费）"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">使用说明标题</label>
              <input
                :value="config.config.display_texts?.usage_title || ''"
                @input="updateDisplayText('usage_title', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="💡 笔数开/关按钮，可查询账单，开/关笔数"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">地址输入提示</label>
              <input
                :value="config.config.display_texts?.address_prompt || ''"
                @input="updateDisplayText('address_prompt', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="请输入能量接收地址："
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- 使用规则配置 -->
        <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📋 使用规则配置</h3>
          <div class="space-y-3">
            <div
              v-for="(rule, index) in config.config.usage_rules"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.config.usage_rules[index]"
                type="text"
                placeholder="请输入使用规则"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="removeRule(index)"
                class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
              >
                删除
              </button>
            </div>
            <button
              @click="addRule"
              class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              添加使用规则
            </button>
          </div>
        </div>

        <!-- 注意事项配置 -->
        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 class="text-lg font-medium text-gray-900 mb-4">⚠️ 注意事项配置</h3>
          <div class="space-y-3">
            <div
              v-for="(note, index) in config.config.notes"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="config.config.notes[index]"
                type="text"
                placeholder="请输入注意事项"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="removeNote(index)"
                class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
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
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        @click="handleSave"
        :disabled="saving"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConfigCardProps } from '../types';

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()

const handleToggle = () => {
  props.onToggle('transaction_package')
}

const handleSave = () => {
  props.onSave('transaction_package')
}

const addPackage = () => {
  if (props.config?.config.packages) {
    props.config.config.packages.push({
      name: '新套餐',
      transaction_count: 100,
      price: 250,
      currency: 'TRX'
    })
  }
}

const removePackage = (index: number) => {
  if (props.config?.config.packages) {
    props.config.config.packages.splice(index, 1)
  }
}

const addRule = () => {
  if (props.config?.config.usage_rules) {
    props.config.config.usage_rules.push('')
  }
}

const removeRule = (index: number) => {
  if (props.config?.config.usage_rules) {
    props.config.config.usage_rules.splice(index, 1)
  }
}

const addNote = () => {
  if (props.config?.config.notes) {
    props.config.config.notes.push('')
  }
}

const removeNote = (index: number) => {
  if (props.config?.config.notes) {
    props.config.config.notes.splice(index, 1)
  }
}

// 获取显示文本，如果没有配置则使用默认值
const getDisplayText = (key: string, defaultValue: string): string => {
  return props.config?.config.display_texts?.[key] || defaultValue
}

// 安全地更新显示文本
const updateDisplayText = (field: string, value: string) => {
  if (props.config?.config) {
    if (!props.config.config.display_texts) {
      initializeDisplayTexts()
    }
    if (props.config.config.display_texts) {
      props.config.config.display_texts[field] = value
    }
  }
}

// 初始化显示文本配置
const initializeDisplayTexts = () => {
  if (props.config?.config && !props.config.config.display_texts) {
    props.config.config.display_texts = {
      title: '🔥 笔数套餐 🔥（无时间限制）',
      subtitle: '（24小时不使用，则扣一笔占费）',
      usage_title: '💡 笔数开/关按钮，可查询账单，开/关笔数',
      address_prompt: '请输入能量接收地址：'
    }
  }
}

// 初始化使用规则
const initializeUsageRules = () => {
  if (props.config?.config && !props.config.config.usage_rules) {
    props.config.config.usage_rules = [
      '对方有U没U都是扣除一笔转账',
      '转移笔数到其他地址请联系客服',
      '为他人购买，填写他人地址即可'
    ]
  }
}

// 初始化notes数组
const initializeNotes = () => {
  if (props.config?.config && !props.config.config.notes) {
    props.config.config.notes = [
      '暂停后不会自动扣费'
    ]
    // 根据配置动态添加注意事项
    if (props.config.config.transferable) {
      props.config.config.notes.push('支持转移笔数给其他地址')
    }
    if (props.config.config.proxy_purchase) {
      props.config.config.notes.push('支持代购，填写收款地址即可')
    }
  }
}

// 组件挂载时初始化
import { onMounted } from 'vue';
onMounted(() => {
  initializeDisplayTexts()
  initializeUsageRules()
  initializeNotes()
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}

.package-item {
  @apply bg-gray-50;
}
</style>
