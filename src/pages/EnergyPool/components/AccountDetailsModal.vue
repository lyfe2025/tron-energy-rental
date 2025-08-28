<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">账户详情</h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div v-if="account" class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">账户ID</label>
              <p class="text-sm text-gray-900">{{ account.id }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <span :class="getStatusClass(account.status)" class="inline-flex px-2 py-1 text-xs font-medium rounded-full">
                {{ getStatusText(account.status) }}
              </span>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">钱包地址</label>
              <div class="flex items-center space-x-2">
                <p class="text-sm text-gray-900 font-mono">{{ account.tron_address }}</p>
                <button
                  @click="copyToClipboard(account.tron_address)"
                  :class="[
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                    copyStatus === 'success' 
                      ? 'bg-green-100 text-green-600 border border-green-300' 
                      : copyStatus === 'error'
                      ? 'bg-red-100 text-red-600 border border-red-300'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-transparent'
                  ]"
                  :title="copyStatus === 'success' ? '已复制' : copyStatus === 'error' ? '复制失败' : '复制地址'"
                  :disabled="copyStatus === 'success'"
                >
                  <Check v-if="copyStatus === 'success'" class="w-4 h-4" />
                  <X v-else-if="copyStatus === 'error'" class="w-4 h-4" />
                  <Copy v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">最后更新时间</label>
              <p class="text-sm text-gray-900">{{ formatDate(account.last_updated_at) }}</p>
            </div>
          </div>
        </div>

        <!-- 能量信息 -->
        <div class="bg-blue-50 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">能量信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ formatEnergy(Number(account.total_energy)) }}</div>
              <div class="text-sm text-gray-600">总能量</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ formatEnergy(Number(account.available_energy)) }}</div>
              <div class="text-sm text-gray-600">可用能量</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">{{ formatEnergy(Number(account.reserved_energy)) }}</div>
              <div class="text-sm text-gray-600">预留能量</div>
            </div>
          </div>
          
          <!-- 能量使用率 -->
          <div class="mt-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
              <span>能量使用率</span>
              <span>{{ usagePercentage }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${usagePercentage}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 成本信息 -->
        <div class="bg-green-50 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">成本信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">单位能量成本</label>
              <p class="text-lg font-semibold text-green-600">{{ Number(account.cost_per_energy).toFixed(6) }} TRX</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">预估总价值</label>
              <p class="text-lg font-semibold text-green-600">
                {{ (Number(account.total_energy) * Number(account.cost_per_energy)).toFixed(2) }} TRX
              </p>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            @click="$emit('edit', account)"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Edit class="w-4 h-4" />
            <span>编辑账户</span>
          </button>
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">未找到账户信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Copy, Edit, X } from 'lucide-vue-next'
import { toast } from 'sonner'
import { computed, ref } from 'vue'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'

interface Props {
  isOpen: boolean
  account: EnergyPoolAccount | null
}

interface Emits {
  close: []
  edit: [account: EnergyPoolAccount]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 复制状态管理
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')

// 计算能量使用率
const usagePercentage = computed(() => {
  if (!props.account || Number(props.account.total_energy) === 0) return 0
  const used = Number(props.account.total_energy) - Number(props.account.available_energy)
  return Math.round((used / Number(props.account.total_energy)) * 100)
})

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = 'success'
    toast.success('地址已复制到剪贴板')
    
    // 3秒后重置状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    console.error('Failed to copy:', error)
    copyStatus.value = 'error'
    toast.error('复制失败')
    
    // 2秒后重置错误状态
    setTimeout(() => {
      copyStatus.value = 'idle'
    }, 2000)
  }
}

// 格式化能量数值
const formatEnergy = (energy: number): string => {
  if (energy >= 1000000) {
    return `${(energy / 1000000).toFixed(1)}M`
  } else if (energy >= 1000) {
    return `${(energy / 1000).toFixed(1)}K`
  }
  return energy.toString()
}

// 格式化日期
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态样式类
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 获取状态文本
const getStatusText = (status: string): string => {
  switch (status) {
    case 'active':
      return '已启用'
    case 'inactive':
      return '已停用'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
}
</script>