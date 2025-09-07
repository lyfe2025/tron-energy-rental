/**
 * 质押数据管理composable
 * 从 Stake.vue 中安全分离的数据状态和网络管理逻辑
 */

import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { useNetworkStore } from '@/stores/network'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEnergyPool } from '../../composables/useEnergyPool'
import { useStake } from '../../composables/useStake'
// 使用网络store的实际类型
import type { Network } from '@/stores/network'
type NetworkStoreNetwork = Network

interface StakeDataState {
  // 路由和网络
  route: ReturnType<typeof useRoute>
  router: ReturnType<typeof useRouter>
  networkStore: ReturnType<typeof useNetworkStore>
  currentNetworkId: ComputedRef<string>
  
  // 账户和网络选择
  selectedAccountId: Ref<string | null>
  selectedNetworkId: Ref<string | null>
  selectedAccount: Ref<EnergyPoolAccount | null>
  selectedNetwork: Ref<NetworkStoreNetwork | null>
  
  // 状态管理
  showNetworkSwitcher: Ref<boolean>
  isRefreshing: Ref<boolean>
  activeTab: Ref<string>
  showStakeModal: Ref<boolean>
  showUnstakeModal: Ref<boolean>
  showDelegateModal: Ref<boolean>
  
  // 计算属性
  currentNetwork: ComputedRef<NetworkStoreNetwork | null>
  availableNetworks: ComputedRef<NetworkStoreNetwork[]>
  
  // 组合式函数
  stakeComposable: ReturnType<typeof useStake>
  energyPoolComposable: ReturnType<typeof useEnergyPool>
  
  // 标签页配置
  tabs: Array<{ key: string; label: string }>
}

export function useStakeData(): StakeDataState {
  // 路由和网络状态
  const route = useRoute()
  const router = useRouter()
  const networkStore = useNetworkStore()
  const currentNetworkId = computed(() => route.params.networkId as string)

  // 账户和网络选择
  const selectedAccountId = ref<string | null>(null)
  const selectedNetworkId = ref<string | null>(currentNetworkId.value || null)
  const selectedAccount = ref<EnergyPoolAccount | null>(null)
  const selectedNetwork = ref<NetworkStoreNetwork | null>(null)

  // 状态管理
  const showNetworkSwitcher = ref(false)
  const isRefreshing = ref(false)
  const activeTab = ref('stake')
  const showStakeModal = ref(false)
  const showUnstakeModal = ref(false)
  const showDelegateModal = ref(false)

  // 计算属性
  const currentNetwork = computed(() => {
    return networkStore.networks.find(n => n.id === currentNetworkId.value) || null
  })

  const availableNetworks = computed(() => {
    return networkStore.networks.filter(n => n.is_active)
  })

  // 组合式函数
  const stakeComposable = useStake()
  const energyPoolComposable = useEnergyPool()

  // 标签页配置
  const tabs = [
    { key: 'stake', label: '质押记录' },
    { key: 'delegate', label: '委托记录' },
    { key: 'unfreeze', label: '解质押记录' }
  ]

  return {
    // 路由和网络
    route,
    router,
    networkStore,
    currentNetworkId,
    
    // 账户和网络选择
    selectedAccountId,
    selectedNetworkId,
    selectedAccount,
    selectedNetwork,
    
    // 状态管理
    showNetworkSwitcher,
    isRefreshing,
    activeTab,
    showStakeModal,
    showUnstakeModal,
    showDelegateModal,
    
    // 计算属性
    currentNetwork,
    availableNetworks,
    
    // 组合式函数
    stakeComposable,
    energyPoolComposable,
    
    // 配置
    tabs
  }
}
