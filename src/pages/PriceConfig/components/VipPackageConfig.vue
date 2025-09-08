<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">VIP套餐模式</h2>
        <p class="text-gray-600 text-sm mt-1">VIP会员套餐配置</p>
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
            <div class="text-green-600">{{ getDisplayText('title', '💎 VIP套餐 会员专享 💎') }}</div>
            <div class="text-gray-600">{{ getDisplayText('subtitle', '（无限交易，优先客服，免日常扣费）') }}</div>
            <br>
            <div v-for="pkg in config.config.packages" :key="pkg.name" class="mb-2">
              <div class="text-orange-600">🔸{{ pkg.name }}</div>
              <div class="text-blue-600">{{ pkg.price }} TRX / {{ pkg.duration_days }}天</div>
              <div class="text-gray-600">
                权益: 
                <span v-if="pkg.benefits.unlimited_transactions">无限交易 </span>
                <span v-if="pkg.benefits.priority_support">优先支持 </span>
                <span v-if="pkg.benefits.no_daily_fee">免日常扣费</span>
              </div>
            </div>
            <br>
            <div v-for="note in config.config.notes" :key="note" class="text-red-600">
              ⚠️ {{ note }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：配置表单 -->
      <div class="lg:w-2/3 space-y-6">
        <!-- VIP套餐列表 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">💎 VIP套餐配置</h3>
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
              class="package-item p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50"
            >
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
                  <input
                    v-model="pkg.name"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">有效期（天）</label>
                  <input
                    v-model.number="pkg.duration_days"
                    type="number"
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">价格 (TRX)</label>
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

              <!-- VIP权益配置 -->
              <div class="benefits-section">
                <h4 class="text-sm font-medium text-gray-700 mb-3">🎯 VIP权益配置</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="flex items-center p-2 bg-white/60 rounded-md">
                    <input
                      v-model="pkg.benefits.unlimited_transactions"
                      type="checkbox"
                      :id="`unlimited_${index}`"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label :for="`unlimited_${index}`" class="ml-2 text-sm text-gray-700">
                      ♾️ 无限交易次数
                    </label>
                  </div>
                  <div class="flex items-center p-2 bg-white/60 rounded-md">
                    <input
                      v-model="pkg.benefits.priority_support"
                      type="checkbox"
                      :id="`priority_${index}`"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label :for="`priority_${index}`" class="ml-2 text-sm text-gray-700">
                      🚀 优先客服支持
                    </label>
                  </div>
                  <div class="flex items-center p-2 bg-white/60 rounded-md">
                    <input
                      v-model="pkg.benefits.no_daily_fee"
                      type="checkbox"
                      :id="`no_fee_${index}`"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label :for="`no_fee_${index}`" class="ml-2 text-sm text-gray-700">
                      💰 免日常扣费
                    </label>
                  </div>
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
                placeholder="💎 VIP套餐 会员专享 💎"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="form-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">副标题</label>
              <input
                :value="config.config.display_texts?.subtitle || ''"
                @input="updateDisplayText('subtitle', ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="（无限交易，优先客服，免日常扣费）"
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
  props.onToggle('vip_package')
}

const handleSave = () => {
  props.onSave('vip_package')
}

const addPackage = () => {
  if (props.config?.config.packages) {
    props.config.config.packages.push({
      name: '新VIP套餐',
      duration_days: 30,
      price: 500,
      currency: 'TRX',
      benefits: {
        unlimited_transactions: true,
        priority_support: true,
        no_daily_fee: true
      }
    })
  }
}

const removePackage = (index: number) => {
  if (props.config?.config.packages) {
    props.config.config.packages.splice(index, 1)
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
      title: '💎 VIP套餐 会员专享 💎',
      subtitle: '（无限交易，优先客服，免日常扣费）'
    }
  }
}

// 初始化notes数组
const initializeNotes = () => {
  if (props.config?.config && !props.config.config.notes) {
    props.config.config.notes = [
      'VIP权益激活后立即生效',
      '有效期内不可转让他人',
      '到期前24小时会自动提醒续费'
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

.package-item {
  @apply bg-gray-50;
}

.benefits-section {
  @apply pt-3 border-t border-gray-200;
}
</style>
