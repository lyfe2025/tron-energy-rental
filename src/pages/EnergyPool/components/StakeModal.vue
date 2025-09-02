<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">质押TRX</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <!-- 资源类型选择 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="form.resourceType = 'ENERGY'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.resourceType === 'ENERGY'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">能量</div>
              <div class="text-xs text-gray-500">用于智能合约调用</div>
            </button>
            <button
              type="button"
              @click="form.resourceType = 'BANDWIDTH'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.resourceType === 'BANDWIDTH'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">带宽</div>
              <div class="text-xs text-gray-500">用于普通转账</div>
            </button>
          </div>
        </div>

        <!-- 质押金额 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">质押金额 (TRX)</label>
          <input
            v-model="form.amount"
            type="number"
            step="0.000001"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入质押金额"
          />
          <p class="text-xs text-gray-500 mt-1">最小质押金额: 1 TRX</p>
        </div>

        <!-- 锁定期 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">锁定期</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              v-for="period in lockPeriods"
              :key="period.value"
              @click="form.lockPeriod = period.value"
              :class="[
                'p-2 border rounded text-sm transition-colors',
                form.lockPeriod === period.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              {{ period.label }}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">锁定期越长，获得的资源越多</p>
        </div>

        <!-- 预估收益 -->
        <div v-if="estimatedReward" class="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-medium text-blue-900 mb-2">预估收益</h4>
          <div class="space-y-1 text-sm text-blue-700">
            <div class="flex justify-between">
              <span>获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-medium">{{ formatResource(estimatedReward.resource) }}</span>
            </div>
            <div class="flex justify-between">
              <span>年化收益率:</span>
              <span class="font-medium">{{ estimatedReward.apy }}%</span>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading || !isFormValid"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">处理中...</span>
            <span v-else>确认质押</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStake } from '../composables/useStake'

interface Props {
  poolId: string
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { freezeTrx, formatEnergy, formatTrx } = useStake()

// 表单数据
const form = ref({
  resourceType: 'ENERGY' as 'ENERGY' | 'BANDWIDTH',
  amount: '',
  lockPeriod: 3
})

// 状态
const loading = ref(false)
const error = ref('')
const estimatedReward = ref<{
  resource: number
  apy: number
} | null>(null)

// 锁定期选项
const lockPeriods = [
  { value: 3, label: '3天' },
  { value: 7, label: '7天' },
  { value: 14, label: '14天' },
  { value: 30, label: '30天' },
  { value: 60, label: '60天' },
  { value: 90, label: '90天' }
]

// 计算属性
const isFormValid = computed(() => {
  return form.value.amount && 
         parseFloat(form.value.amount) >= 1 && 
         form.value.resourceType && 
         form.value.lockPeriod > 0
})

// 格式化资源
const formatResource = (amount: number) => {
  if (form.value.resourceType === 'ENERGY') {
    return formatEnergy(amount)
  } else {
    return formatTrx(amount)
  }
}

// 计算预估收益
const calculateEstimatedReward = () => {
  const amount = parseFloat(form.value.amount)
  if (!amount || amount < 1) {
    estimatedReward.value = null
    return
  }

  // 简单的收益计算逻辑（实际应该调用API）
  const baseRate = form.value.resourceType === 'ENERGY' ? 1000 : 1
  const lockMultiplier = 1 + (form.value.lockPeriod - 3) * 0.1
  const resource = amount * baseRate * lockMultiplier
  const apy = (form.value.lockPeriod / 365) * 100 * lockMultiplier

  estimatedReward.value = {
    resource,
    apy: Math.round(apy * 100) / 100
  }
}

// 监听表单变化
watch([() => form.value.amount, () => form.value.resourceType, () => form.value.lockPeriod], () => {
  calculateEstimatedReward()
}, { immediate: true })

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value) return

  loading.value = true
  error.value = ''

  try {
    const result = await freezeTrx({
      poolId: props.poolId,
      amount: parseFloat(form.value.amount),
      resourceType: form.value.resourceType,
      lockPeriod: form.value.lockPeriod
    })

    if (result) {
      emit('success')
      // 显示成功消息
      alert(`质押成功！交易ID: ${result.txid}，质押金额: ${formatTrx(parseFloat(form.value.amount))}`)
    }
  } catch (err: any) {
    error.value = err.message || '质押失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>