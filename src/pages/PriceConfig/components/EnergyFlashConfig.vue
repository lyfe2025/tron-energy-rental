<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">能量闪租模式</h2>
        <p class="text-gray-600 text-sm mt-1">单笔能量闪租价格配置</p>
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
            <div class="text-green-600">{{ getDisplayText('title', '⚡ 能量闪租 ⚡ 立即到账') }}</div>
            <div class="text-gray-600">{{ formatSubtitle() }}</div>
            <br>
            <div class="text-blue-600">{{ getDisplayText('duration_label', '⏰ 租用时效：') }}{{ config.config.expiry_hours }}小时</div>
            <div class="text-orange-600">{{ getDisplayText('price_label', '💰 单笔价格：') }}{{ config.config.single_price }} TRX</div>
            <div class="text-purple-600">{{ getDisplayText('max_label', '📊 最大租用：') }}{{ config.config.max_transactions }}笔</div>
            <br>
            <div class="text-gray-600">{{ getDisplayText('address_label', '💳 收款地址：') }}</div>
            <div class="text-blue-600">{{ config.config.payment_address }} (点击地址自动复制)</div>
            <br>
            <div v-if="config.config.double_energy_for_no_usdt" class="text-red-600">
              {{ getDisplayText('double_energy_warning', '🔺 向无U地址转账需双倍能量') }}
            </div>
            <div v-for="note in config.config.notes" :key="note" class="text-red-600">
              🔺 {{ note }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：配置表单 -->
      <div class="lg:w-2/3 space-y-6">
        <!-- 价格配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">💰 价格配置</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="config.config.single_price"
                  type="number"
                  step="0.1"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500">TRX</span>
              </div>
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">最大购买笔数</label>
              <input
                v-model.number="config.config.max_transactions"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">时效限制（小时）</label>
              <input
                v-model.number="config.config.expiry_hours"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">收款地址</label>
              <input
                v-model="config.config.payment_address"
                type="text"
                placeholder="请输入收款地址"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- 功能配置 -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">🔧 功能配置</h3>
          <div class="flex items-center p-2 bg-white/60 rounded-md">
            <input
              v-model="config.config.double_energy_for_no_usdt"
              type="checkbox"
              id="double_energy"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="double_energy" class="ml-2 text-sm text-gray-700">
              ⚠️ 向无U地址转账需双倍能量
            </label>
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
                placeholder="⚡ 能量闪租 ⚡ 立即到账"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">副标题模板</label>
              <input
                :value="config.config.display_texts?.subtitle_template || ''"
                @input="updateDisplayText('subtitle_template', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="（{price} TRX/笔，最高{max}笔）"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">时效标签</label>
              <input
                :value="config.config.display_texts?.duration_label || ''"
                @input="updateDisplayText('duration_label', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="⏰ 租用时效："
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">价格标签</label>
              <input
                :value="config.config.display_texts?.price_label || ''"
                @input="updateDisplayText('price_label', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="💰 单笔价格："
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">最大租用标签</label>
              <input
                :value="config.config.display_texts?.max_label || ''"
                @input="updateDisplayText('max_label', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="📊 最大租用："
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">地址标签</label>
              <input
                :value="config.config.display_texts?.address_label || ''"
                @input="updateDisplayText('address_label', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="💳 收款地址："
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">双倍能量警告</label>
              <input
                :value="config.config.display_texts?.double_energy_warning || ''"
                @input="updateDisplayText('double_energy_warning', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="🔺 向无U地址转账需双倍能量"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
  props.onToggle('energy_flash')
}

const handleSave = () => {
  props.onSave('energy_flash')
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

// 格式化副标题，替换占位符
const formatSubtitle = (): string => {
  const template = getDisplayText('subtitle_template', '（{price} TRX/笔，最高{max}笔）')
  return template
    .replace('{price}', props.config?.config.single_price?.toString() || '0')
    .replace('{max}', props.config?.config.max_transactions?.toString() || '0')
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
      title: '⚡ 能量闪租 ⚡ 立即到账',
      subtitle_template: '（{price} TRX/笔，最高{max}笔）',
      duration_label: '⏰ 租用时效：',
      price_label: '💰 单笔价格：',
      max_label: '📊 最大租用：',
      address_label: '💳 收款地址：',
      double_energy_warning: '🔺 向无U地址转账需双倍能量'
    }
  }
}

// 初始化notes数组
const initializeNotes = () => {
  if (props.config?.config && !props.config.config.notes) {
    props.config.config.notes = [
      `租用后立即生效，${props.config.config.expiry_hours || 24}小时内有效`,
      '过期前30分钟会自动提醒续租',
      '请确保收款地址准确无误'
    ]
  }
}

// 组件挂载时初始化
import { onMounted } from 'vue';
onMounted(() => {
  initializeDisplayTexts()
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
</style>
