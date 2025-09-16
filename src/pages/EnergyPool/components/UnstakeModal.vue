<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">解质押TRX</h3>
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
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">能量</div>
              <div class="text-xs text-gray-500">解质押能量资源</div>
            </button>
            <button
              type="button"
              @click="form.resourceType = 'BANDWIDTH'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.resourceType === 'BANDWIDTH'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">带宽</div>
              <div class="text-xs text-gray-500">解质押带宽资源</div>
            </button>
          </div>
        </div>

        <!-- 解质押金额 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">解质押金额 (TRX)</label>
          <input
            v-model="form.amount"
            type="number"
            step="0.000001"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="请输入解质押金额"
          />
          <p class="text-xs text-gray-500 mt-1">最小解质押金额: 1 TRX</p>
        </div>

        <!-- 当前质押信息 -->
        <div v-if="stakeInfo" class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-2">当前质押信息</h4>
          <div class="space-y-1 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>总质押金额:</span>
              <span class="font-medium">{{ formatTrx(stakeInfo.totalStaked) }}</span>
            </div>
            <div class="flex justify-between">
              <span>可解质押金额:</span>
              <span class="font-medium">{{ formatTrx(stakeInfo.availableToUnstake) }}</span>
            </div>
            <div class="flex justify-between">
              <span>获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-medium">{{ formatResource(stakeInfo.currentResource) }}</span>
            </div>
          </div>
        </div>

        <!-- 解质押说明 -->
        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm text-yellow-800">
              <p class="font-medium mb-1">解质押说明:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>解质押后需要等待14天才能提取资金</li>
                <li>解质押期间不会获得任何收益</li>
                <li>解质押后对应的资源将立即失效</li>
              </ul>
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
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">处理中...</span>
            <span v-else>确认解质押</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useStake } from '../composables/useStake'

interface Props {
  poolId: string
  accountId?: string
  accountAddress?: string
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { unfreezeTrx, loadAccountResources, formatEnergy, formatTrx } = useStake()

// 表单数据
const form = ref({
  resourceType: 'ENERGY' as 'ENERGY' | 'BANDWIDTH',
  amount: ''
})

// 状态
const loading = ref(false)
const error = ref('')
const stakeInfo = ref<{
  totalStaked: number
  availableToUnstake: number
  currentResource: number
} | null>(null)

// 计算属性
const isFormValid = computed(() => {
  const amount = parseFloat(form.value.amount)
  return form.value.amount && 
         amount >= 1 && 
         stakeInfo.value &&
         amount <= stakeInfo.value.availableToUnstake
})

// 格式化资源
const formatResource = (amount: number) => {
  if (form.value.resourceType === 'ENERGY') {
    return formatEnergy(amount)
  } else {
    return formatTrx(amount)
  }
}

// 加载质押信息
const loadStakeInfo = async () => {
  try {
    // 这里应该调用API获取当前质押信息
    // 暂时使用模拟数据
    stakeInfo.value = {
      totalStaked: 1000,
      availableToUnstake: 800,
      currentResource: form.value.resourceType === 'ENERGY' ? 800000 : 800
    }
  } catch (err: any) {
    error.value = '加载质押信息失败'
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value) return

  loading.value = true
  error.value = ''

  try {
    const result = await unfreezeTrx({
      networkId: props.poolId,        // props.poolId 实际上是 networkId
      poolAccountId: props.accountId, // props.accountId 实际上是 poolAccountId
      accountAddress: props.accountAddress,
      amount: parseFloat(form.value.amount),
      resourceType: form.value.resourceType
    })

    if (result) {
      emit('success')
      // 显示成功消息
      alert(`解质押成功！交易ID: ${result.txid}，解质押金额: ${formatTrx(parseFloat(form.value.amount))}，14天后可提取`)
    }
  } catch (err: any) {
    error.value = err.message || '解质押失败，请重试'
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  loadStakeInfo()
})
</script>