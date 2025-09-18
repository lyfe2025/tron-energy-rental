<!--
  TRON资源代理交易确认弹窗 - 容器组件
  仿照官方TRONLink钱包的交易确认界面
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部组件 -->
      <TransactionHeader 
        :display-account-name="getDisplayAccountName()"
        :network-name="networkName"
      />

      <!-- 内容区域 -->
      <div class="space-y-6">
        <!-- 交易图标组件 -->
        <TransactionIcon 
          :amount="transactionData.amount"
          :resource-type="transactionData.resourceType"
        />

        <!-- 交易详情组件 -->
        <TransactionDetails 
          :amount="transactionData.amount"
          :resource-type="transactionData.resourceType"
          :receiver-address="transactionData.receiverAddress"
          :account-address="transactionData.accountAddress"
          :enable-lock-period="transactionData.enableLockPeriod"
          :lock-period="transactionData.lockPeriod"
        />

        <!-- 费用组件 -->
        <TransactionFees 
          :estimated-bandwidth-fee="estimatedBandwidthFee"
          :estimated-energy-fee="estimatedEnergyFee"
          :estimated-service-fee="estimatedServiceFee"
          :fees-error="feesError"
          :enable-lock-period="transactionData.enableLockPeriod"
          :lock-period="transactionData.lockPeriod"
          @retry-fees="fetchTransactionFees"
        />
      </div>

      <!-- 操作按钮组件 -->
      <TransactionActions 
        :loading="loading"
        @confirm="handleConfirm"
        @reject="handleReject"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkParameters } from '@/services/networkParametersService'
import { transactionFeeService, type TransactionFees as TTransactionFees } from '@/services/transactionFeeService'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import TransactionHeader from './components/TransactionHeader.vue'
import TransactionIcon from './components/TransactionIcon.vue'
import TransactionDetails from './components/TransactionDetails.vue'
import TransactionFees from './components/TransactionFees.vue'
import TransactionActions from './components/TransactionActions.vue'

export interface DelegateTransactionData {
  amount: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
  receiverAddress: string
  accountAddress: string
  enableLockPeriod: boolean
  lockPeriod?: number
  poolId: string
  accountId?: string
}

interface Props {
  transactionData: DelegateTransactionData
  networkParams?: NetworkParameters
  accountName?: string
}

interface Emits {
  confirm: [data: DelegateTransactionData]
  reject: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const route = useRoute()

const loading = ref(false)
const transactionFees = ref<TTransactionFees | null>(null)
const feesLoading = ref(false)
const feesError = ref<string | null>(null)

// 获取网络ID
const networkId = computed(() => route.params.networkId as string)

// 计算属性
const networkName = computed(() => {
  return props.networkParams?.networkName || 'TRON 网络'
})

const estimatedBandwidthFee = computed(() => {
  if (feesLoading.value) {
    return '获取中...'
  }
  if (feesError.value) {
    return '获取失败'
  }
  if (transactionFees.value === null) {
    return '未知'
  }
  return transactionFees.value.bandwidthFee?.toString() || '0'
})

const estimatedEnergyFee = computed(() => {
  if (feesLoading.value) {
    return '获取中...'
  }
  if (feesError.value) {
    return '获取失败'
  }
  if (transactionFees.value === null) {
    return '未知'
  }
  return transactionFees.value.energyFee?.toString() || '0'  
})

const estimatedServiceFee = computed(() => {
  if (feesLoading.value) {
    return '获取中...'
  }
  if (feesError.value) {
    return '获取失败'
  }
  if (transactionFees.value === null) {
    return '未知'
  }
  return transactionFees.value.serviceFee?.toString() || '0'
})

// 获取交易费用 - 从TRON官方API (代理交易)
const fetchTransactionFees = async () => {
  if (!props.transactionData || !networkId.value) return
  
  feesLoading.value = true
  feesError.value = null
  
  try {
    console.log('[DelegateTransactionConfirmModal] 获取TRON官方代理交易费用...')
    
    // 代理交易的费用计算（这里需要根据实际的代理合约来计算）
    const fees = await transactionFeeService.calculateDelegateFees({
      amount: parseFloat(props.transactionData.amount),
      resourceType: props.transactionData.resourceType,
      networkId: networkId.value,
      accountAddress: props.transactionData.accountAddress,
      receiverAddress: props.transactionData.receiverAddress,
      enableLockPeriod: props.transactionData.enableLockPeriod,
      lockPeriod: props.transactionData.lockPeriod
    })
    
    transactionFees.value = fees
    console.log('[DelegateTransactionConfirmModal] TRON官方代理费用获取成功:', fees)
    
  } catch (error) {
    console.error('[DelegateTransactionConfirmModal] TRON官方代理费用获取失败:', error)
    feesError.value = 'TRON网络数据获取失败'
    // 设置默认的代理交易费用估算
    transactionFees.value = {
      bandwidthFee: 345, // 代理交易通常消耗较少的带宽
      energyFee: 0,
      serviceFee: 0,
      totalEstimated: 345
    }
  } finally {
    feesLoading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  fetchTransactionFees()
})

// 方法
const getDisplayAccountName = () => {
  // 优先使用传入的账户名称
  if (props.accountName && props.accountName.trim()) {
    return props.accountName
  }
  
  // 如果有账户地址，显示地址的前几位作为标识
  if (props.transactionData?.accountAddress) {
    const address = props.transactionData.accountAddress
    return `钱包 ${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  // 最后的兜底显示
  return '当前钱包'
}

const handleReject = () => {
  emit('reject')
}

const handleConfirm = async () => {
  loading.value = true
  
  // 🔍 详细调试信息
  console.log('🔍 [DelegateTransactionConfirmModal] 用户点击签名按钮');
  console.log('🔍 [DelegateTransactionConfirmModal] props.transactionData:', JSON.stringify(props.transactionData, null, 2));
  console.log('🔍 [DelegateTransactionConfirmModal] 代理交易数据详情:', {
    amount: props.transactionData?.amount,
    resourceType: props.transactionData?.resourceType,
    receiverAddress: props.transactionData?.receiverAddress,
    accountAddress: props.transactionData?.accountAddress,
    enableLockPeriod: props.transactionData?.enableLockPeriod,
    lockPeriod: props.transactionData?.lockPeriod,
    poolId: props.transactionData?.poolId,
    accountId: props.transactionData?.accountId,
    完整数据: props.transactionData
  });
  
  // 验证关键数据
  if (!props.transactionData?.receiverAddress) {
    console.error('🔍 [DelegateTransactionConfirmModal] ❌ receiverAddress 缺失！');
  } else if (!props.transactionData.receiverAddress.startsWith('T') || props.transactionData.receiverAddress.length !== 34) {
    console.error('🔍 [DelegateTransactionConfirmModal] ❌ 无效的接收方TRON地址格式:', props.transactionData.receiverAddress);
  } else {
    console.log('🔍 [DelegateTransactionConfirmModal] ✅ 接收方TRON地址格式正确');
  }
  
  if (!props.transactionData?.amount || parseFloat(props.transactionData.amount) <= 0) {
    console.error('🔍 [DelegateTransactionConfirmModal] ❌ 代理数量无效:', props.transactionData?.amount);
  } else {
    console.log('🔍 [DelegateTransactionConfirmModal] ✅ 代理数量有效:', props.transactionData.amount);
  }
  
  try {
    console.log('🔍 [DelegateTransactionConfirmModal] 即将发送confirm事件...');
    emit('confirm', props.transactionData)
  } finally {
    loading.value = false
  }
}
</script>
