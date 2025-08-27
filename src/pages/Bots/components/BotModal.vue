<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ modalTitle }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <!-- View Mode -->
        <div v-if="mode === 'view'" class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">机器人名称</label>
              <p class="text-gray-900">{{ bot?.name || '-' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">TRON地址</label>
              <p class="text-gray-900 font-mono text-sm break-all">{{ formatAddress(bot?.address) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">机器人类型</label>
              <span :class="getTypeColor(bot?.type)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ formatType(bot?.type) }}
              </span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <span :class="getStatusColor(bot?.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ formatStatus(bot?.status) }}
              </span>
            </div>
          </div>

          <!-- Balance Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-900 mb-3">余额信息</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <p class="text-2xl font-bold text-blue-600">{{ formatCurrency(bot?.trx_balance) }}</p>
                <p class="text-sm text-gray-600">TRX余额</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-green-600">{{ formatCurrency(bot?.energy_balance) }}</p>
                <p class="text-sm text-gray-600">能量余额</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-orange-600">{{ bot?.today_orders || 0 }}</p>
                <p class="text-sm text-gray-600">今日订单</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-purple-600">{{ bot?.total_orders || 0 }}</p>
                <p class="text-sm text-gray-600">总订单</p>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="bot?.description">
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <p class="text-gray-900">{{ bot.description }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-2 pt-4 border-t">
            <button
              @click="$emit('edit', bot)"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Edit class="w-4 h-4" />
              编辑
            </button>
            <button
              @click="$emit('test-connection', bot)"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Zap class="w-4 h-4" />
              测试连接
            </button>
          </div>
        </div>

        <!-- Edit/Create Mode -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Bot Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              机器人名称 <span class="text-red-500">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人名称"
            />
          </div>

          <!-- TRON Address -->
          <div>
            <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
              TRON地址 <span class="text-red-500">*</span>
            </label>
            <input
              id="address"
              v-model="form.address"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="请输入TRON地址"
            />
          </div>

          <!-- Private Key -->
          <div>
            <label for="private_key" class="block text-sm font-medium text-gray-700 mb-1">
              私钥 <span class="text-red-500">*</span>
            </label>
            <input
              id="private_key"
              v-model="form.private_key"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="请输入私钥"
            />
          </div>

          <!-- Bot Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 mb-1">
              机器人类型 <span class="text-red-500">*</span>
            </label>
            <select
              id="type"
              v-model="form.type"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择机器人类型</option>
              <option value="energy">能量机器人</option>
              <option value="bandwidth">带宽机器人</option>
              <option value="mixed">混合机器人</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人描述（可选）"
            ></textarea>
          </div>

          <!-- Order Amount Range -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="min_order_amount" class="block text-sm font-medium text-gray-700 mb-1">
                最小订单金额 (TRX)
              </label>
              <input
                id="min_order_amount"
                v-model.number="form.min_order_amount"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label for="max_order_amount" class="block text-sm font-medium text-gray-700 mb-1">
                最大订单金额 (TRX)
              </label>
              <input
                id="max_order_amount"
                v-model.number="form.max_order_amount"
                type="number"
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Enable Bot -->
          <div class="flex items-center">
            <input
              id="is_active"
              v-model="form.is_active"
              type="checkbox"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label for="is_active" class="ml-2 text-sm font-medium text-gray-700">
              启用机器人
            </label>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
              {{ mode === 'create' ? '创建' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { X, Edit, Zap, Loader2 } from 'lucide-vue-next'
import type { Bot, BotForm, BotModalMode } from '../types/bot.types'

interface Props {
  show: boolean
  mode: BotModalMode
  bot?: Bot | null
  form: BotForm
  isSaving: boolean
  formatAddress: (address?: string) => string
  formatType: (type?: string) => string
  formatStatus: (status?: string) => string
  formatCurrency: (amount?: number) => string
  getStatusColor: (status?: string) => string
  getTypeColor: (type?: string) => string
}

interface Emits {
  close: []
  edit: [bot: Bot]
  'test-connection': [bot: Bot]
  submit: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modalTitle = computed(() => {
  switch (props.mode) {
    case 'create':
      return '添加机器人'
    case 'edit':
      return '编辑机器人'
    case 'view':
      return '机器人详情'
    default:
      return '机器人'
  }
})

const handleSubmit = () => {
  emit('submit')
}
</script>