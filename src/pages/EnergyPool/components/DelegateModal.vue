<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">代理资源</h3>
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

      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto">
        <div class="p-6 space-y-4">
        <!-- 操作类型选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">操作类型</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="form.operationType = 'delegate'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.operationType === 'delegate'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">代理资源</div>
              <div class="text-xs text-gray-500">将资源代理给其他地址</div>
            </button>
            <button
              type="button"
              @click="form.operationType = 'undelegate'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.operationType === 'undelegate'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">取消代理</div>
              <div class="text-xs text-gray-500">收回已代理的资源</div>
            </button>
          </div>
        </div>

        <!-- 资源类型选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="form.resourceType = 'ENERGY'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.resourceType === 'ENERGY'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">能量</div>
              <div class="text-xs text-gray-500">智能合约执行</div>
            </button>
            <button
              type="button"
              @click="form.resourceType = 'BANDWIDTH'"
              :class="[
                'p-3 border rounded-lg text-center transition-colors',
                form.resourceType === 'BANDWIDTH'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="font-medium">带宽</div>
              <div class="text-xs text-gray-500">普通交易</div>
            </button>
          </div>
        </div>

        <!-- 目标地址 -->
        <div v-if="form.operationType === 'delegate'">
          <label class="block text-sm font-medium text-gray-700 mb-2">目标地址</label>
          <input
            v-model="form.targetAddress"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入TRON地址 (T开头)"
          />
          <p class="text-xs text-gray-500 mt-1">资源将代理给此地址使用</p>
        </div>

        <!-- 代理金额/资源量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ form.operationType === 'delegate' ? '代理金额 (TRX)' : '取消代理资源量' }}
          </label>
          <input
            v-model="form.amount"
            type="number"
            step="0.000001"
            min="1"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="form.operationType === 'delegate' ? '请输入代理金额' : '请输入取消代理的资源量'"
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ form.operationType === 'delegate' ? '最小代理金额: 1 TRX' : '输入要取消代理的资源数量' }}
          </p>
        </div>

        <!-- 锁定期选择 (仅代理时显示) -->
        <div v-if="form.operationType === 'delegate'">
          <label class="block text-sm font-medium text-gray-700 mb-2">锁定期</label>
          <select
            v-model="form.lockPeriod"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="3">3天 (灵活性高)</option>
            <option value="7">7天 (推荐)</option>
            <option value="14">14天 (收益较高)</option>
            <option value="30">30天 (收益最高)</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">锁定期越长，获得的资源越多</p>
        </div>

        <!-- 当前资源信息 -->
        <div v-if="resourceInfo" class="p-4 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-2">当前资源信息</h4>
          <div class="space-y-1 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>可用{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-medium">{{ formatResource(resourceInfo.available) }}</span>
            </div>
            <div class="flex justify-between">
              <span>已代理{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-medium">{{ formatResource(resourceInfo.delegated) }}</span>
            </div>
            <div class="flex justify-between">
              <span>总计:</span>
              <span class="font-medium">{{ formatResource(resourceInfo.total) }}</span>
            </div>
          </div>
        </div>

        <!-- 预估信息 -->
        <div v-if="form.operationType === 'delegate' && form.amount" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 class="text-sm font-medium text-blue-900 mb-2">预估信息</h4>
          <div class="space-y-1 text-sm text-blue-700">
            <div class="flex justify-between">
              <span>代理金额:</span>
              <span class="font-medium">{{ formatTrx(parseFloat(form.amount)) }}</span>
            </div>
            <div class="flex justify-between">
              <span>获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-medium">{{ formatResource(estimatedResource) }}</span>
            </div>
            <div class="flex justify-between">
              <span>锁定期:</span>
              <span class="font-medium">{{ form.lockPeriod }}天</span>
            </div>
          </div>
        </div>

        <!-- 代理说明 -->
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm text-yellow-800">
              <p class="font-medium mb-1">{{ form.operationType === 'delegate' ? '代理说明' : '取消代理说明' }}:</p>
              <ul class="list-disc list-inside space-y-1">
                <li v-if="form.operationType === 'delegate'">代理后资源将转移给目标地址使用</li>
                <li v-if="form.operationType === 'delegate'">代理期间您无法使用这些资源</li>
                <li v-if="form.operationType === 'delegate'">锁定期结束后可以取消代理</li>
                <li v-if="form.operationType === 'undelegate'">取消代理后资源将立即返回</li>
                <li v-if="form.operationType === 'undelegate'">只能取消已过锁定期的代理</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
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
            :class="[
              'flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
              form.operationType === 'delegate'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            ]"
          >
            <span v-if="loading">处理中...</span>
            <span v-else>{{ form.operationType === 'delegate' ? '确认代理' : '确认取消代理' }}</span>
          </button>
        </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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

const { delegateResource, undelegateResource, loadAccountResources, formatEnergy, formatTrx } = useStake()

// 表单数据
const form = ref({
  operationType: 'delegate' as 'delegate' | 'undelegate',
  resourceType: 'ENERGY' as 'ENERGY' | 'BANDWIDTH',
  targetAddress: '',
  amount: '',
  lockPeriod: 7
})

// 状态
const loading = ref(false)
const error = ref('')
const resourceInfo = ref<{
  available: number
  delegated: number
  total: number
} | null>(null)

// 计算属性
const isFormValid = computed(() => {
  const amount = parseFloat(form.value.amount)
  const baseValid = form.value.amount && amount >= 1
  
  if (form.value.operationType === 'delegate') {
    return baseValid && 
           form.value.targetAddress && 
           form.value.targetAddress.startsWith('T') &&
           form.value.targetAddress.length === 34
  } else {
    return baseValid && 
           resourceInfo.value &&
           amount <= resourceInfo.value.delegated
  }
})

// 预估资源
const estimatedResource = computed(() => {
  if (!form.value.amount) return 0
  const amount = parseFloat(form.value.amount)
  // 简化的资源计算，实际应该根据当前网络状态计算
  if (form.value.resourceType === 'ENERGY') {
    return amount * 1000 * form.value.lockPeriod // 1 TRX ≈ 1000 能量 * 锁定期倍数
  } else {
    return amount * 1 * form.value.lockPeriod // 1 TRX ≈ 1 带宽 * 锁定期倍数
  }
})

// 格式化资源
const formatResource = (amount: number) => {
  if (form.value.resourceType === 'ENERGY') {
    return formatEnergy(amount)
  } else {
    return formatTrx(amount)
  }
}

// 加载资源信息
const loadResourceInfo = async () => {
  try {
    // 这里应该调用API获取当前资源信息
    // 暂时使用模拟数据
    resourceInfo.value = {
      available: form.value.resourceType === 'ENERGY' ? 500000 : 500,
      delegated: form.value.resourceType === 'ENERGY' ? 200000 : 200,
      total: form.value.resourceType === 'ENERGY' ? 700000 : 700
    }
  } catch (err: any) {
    error.value = '加载资源信息失败'
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value) return

  loading.value = true
  error.value = ''

  try {
    let result
    
    if (form.value.operationType === 'delegate') {
      result = await delegateResource({
        networkId: props.poolId,        // props.poolId 实际上是 networkId
        poolAccountId: props.accountId, // props.accountId 实际上是 poolAccountId
        accountAddress: props.accountAddress,
        toAddress: form.value.targetAddress,
        amount: parseFloat(form.value.amount),
        resourceType: form.value.resourceType,
        lockPeriod: form.value.lockPeriod
      })
    } else {
      result = await undelegateResource({
        networkId: props.poolId,        // props.poolId 实际上是 networkId
        poolAccountId: props.accountId, // props.accountId 实际上是 poolAccountId
        accountAddress: props.accountAddress,
        toAddress: form.value.targetAddress,
        amount: parseFloat(form.value.amount),
        resourceType: form.value.resourceType
      })
    }

    if (result) {
      emit('success')
      // 显示成功消息
      const operation = form.value.operationType === 'delegate' ? '代理' : '取消代理'
      alert(`${operation}成功！交易ID: ${result.txid}`)
    }
  } catch (err: any) {
    error.value = err.message || `${form.value.operationType === 'delegate' ? '代理' : '取消代理'}失败，请重试`
  } finally {
    loading.value = false
  }
}

// 监听资源类型变化
watch(() => form.value.resourceType, () => {
  loadResourceInfo()
})

// 生命周期
onMounted(() => {
  loadResourceInfo()
})
</script>