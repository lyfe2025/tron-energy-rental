<template>
  <div class="price-config-page">
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">价格配置</h1>
      <p class="text-gray-600 mt-2">统一管理所有价格模式的配置</p>
    </div>

    <!-- 标签页导航 -->
    <div class="mt-6">
      <nav class="flex space-x-8 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <component :is="tab.icon" class="w-5 h-5 mr-2" />
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- 标签页内容 -->
    <div class="mt-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">正在加载配置...</span>
      </div>
      
      <!-- 能量闪租配置 -->
      <EnergyFlashConfig 
        v-else-if="activeTab === 'energy_flash' && energyFlashConfig"
        :config="energyFlashConfig"
        :saving="saving"
        :onToggle="toggleMode"
        :onSave="saveConfig"
      />
      
      <!-- 配置不存在的提示 -->
      <div v-else-if="activeTab === 'energy_flash' && !loading" class="text-center py-12">
        <p class="text-gray-600">暂无能量闪租配置，请联系管理员创建配置。</p>
      </div>

      <!-- 笔数套餐配置 -->
      <TransactionPackageConfig 
        v-else-if="activeTab === 'transaction_package' && transactionPackageConfig"
        :config="transactionPackageConfig"
        :saving="saving"
        :onToggle="toggleMode"
        :onSave="saveConfig"
      />
      
      <!-- 配置不存在的提示 -->
      <div v-else-if="activeTab === 'transaction_package' && !loading" class="text-center py-12">
        <p class="text-gray-600">暂无笔数套餐配置，请联系管理员创建配置。</p>
      </div>

      <!-- TRX闪兑配置 -->
      <TrxExchangeConfig 
        v-else-if="activeTab === 'trx_exchange' && trxExchangeConfig"
        :config="trxExchangeConfig"
        :saving="saving"
        :onToggle="toggleMode"
        :onSave="saveConfig"
      />
      
      <!-- 配置不存在的提示 -->
      <div v-else-if="activeTab === 'trx_exchange' && !loading" class="text-center py-12">
        <p class="text-gray-600">暂无TRX闪兑配置，请联系管理员创建配置。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftRight, Package, Zap } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { usePriceConfig } from '../../composables/usePriceConfig'
import { useToast } from '../../composables/useToast'

// 导入子组件
import EnergyFlashConfig from './components/EnergyFlashConfig.vue'
import TransactionPackageConfig from './components/TransactionPackageConfig.vue'
import TrxExchangeConfig from './components/TrxExchangeConfig.vue'

// 保持所有原有逻辑不变
const {
  configs,
  loading,
  loadConfigs,
  updateConfig,
  toggleConfigStatus,
  getTrxExchangeConfig
} = usePriceConfig()

const { success, error, warning, loading: showLoading, dismiss } = useToast()
const saving = ref(false)

// 标签页配置
const activeTab = ref('energy_flash')
const tabs = [
  {
    id: 'energy_flash',
    name: '能量闪租',
    icon: Zap
  },
  {
    id: 'transaction_package',
    name: '笔数套餐',
    icon: Package
  },
  {
    id: 'trx_exchange',
    name: 'TRX闪兑',
    icon: ArrowLeftRight
  }
]

// 计算属性获取各模式配置 - 保持原有逻辑
const energyFlashConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'energy_flash')
)

const transactionPackageConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'transaction_package')
)


const trxExchangeConfig = computed(() => 
  configs.value.find(c => c.mode_type === 'trx_exchange')
)

// 切换模式状态 - 保持原有逻辑
const toggleMode = async (modeType: string) => {
  let loadingId: string | null = null
  try {
    loadingId = showLoading('正在更新状态...')
    await toggleConfigStatus(modeType)
    if (loadingId) dismiss(loadingId)
    success('状态更新成功')
  } catch (err: any) {
    if (loadingId) dismiss(loadingId)
    console.error('Toggle mode error:', err)
    
    // 详细错误处理
    let errorMessage = '状态更新失败'
    if (err?.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录'
    } else if (err?.response?.status === 403) {
      errorMessage = '权限不足，无法修改配置'
    } else if (err?.response?.status === 404) {
      errorMessage = '配置不存在'
    } else if (err?.response?.status >= 500) {
      errorMessage = '服务器错误，请稍后重试'
    } else if (err?.message) {
      errorMessage = `状态更新失败: ${err.message}`
    } else if (!navigator.onLine) {
      errorMessage = '网络连接失败，请检查网络设置'
    }
    
    error(errorMessage)
  }
}

// 保存配置 - 保持原有逻辑
const saveConfig = async (modeType: string) => {
  saving.value = true
  let loadingId: string | null = null
  
  try {
    const config = configs.value.find(c => c.mode_type === modeType)
    if (!config) {
      warning('未找到对应的配置数据')
      return
    }
    
    // 数据验证
    const validationResult = validateConfig(modeType, config.config)
    if (!validationResult.isValid) {
      error(`配置验证失败: ${validationResult.message}`)
      return
    }
    
    loadingId = showLoading('正在保存配置...')
    await updateConfig(modeType, config.config)
    
    if (loadingId) dismiss(loadingId)
    success('配置保存成功')
    
  } catch (err: any) {
    if (loadingId) dismiss(loadingId)
    console.error('Save config error:', err)
    
    // 详细错误处理
    let errorMessage = '配置保存失败'
    if (err?.response?.status === 400) {
      const responseData = err?.response?.data
      if (responseData?.message) {
        errorMessage = `配置验证失败: ${responseData.message}`
      } else {
        errorMessage = '配置数据格式错误，请检查输入'
      }
    } else if (err?.response?.status === 401) {
      errorMessage = '登录已过期，请重新登录后再试'
    } else if (err?.response?.status === 403) {
      errorMessage = '权限不足，无法保存配置'
    } else if (err?.response?.status === 404) {
      errorMessage = '配置不存在或已被删除'
    } else if (err?.response?.status >= 500) {
      errorMessage = '服务器内部错误，请稍后重试'
    } else if (err?.code === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = '网络连接失败，请检查网络设置后重试'
    } else if (err?.message) {
      errorMessage = `保存失败: ${err.message}`
    }
    
    error(errorMessage)
    
  } finally {
    saving.value = false
  }
}

// 配置验证函数 - 保持原有逻辑
const validateConfig = (modeType: string, config: any) => {
  if (!config) {
    return { isValid: false, message: '配置数据不能为空' }
  }
  
  if (modeType === 'energy_flash') {
    if (!config.single_price || config.single_price <= 0) {
      return { isValid: false, message: '单笔价格必须大于0' }
    }
    if (!config.max_transactions || config.max_transactions <= 0) {
      return { isValid: false, message: '最大购买笔数必须大于0' }
    }
  } else if (modeType === 'transaction_package') {
    if (!config.packages || !Array.isArray(config.packages) || config.packages.length === 0) {
      return { isValid: false, message: '至少需要配置一个套餐' }
    }
    
    for (let i = 0; i < config.packages.length; i++) {
      const pkg = config.packages[i]
      if (!pkg.name || pkg.name.trim() === '') {
        return { isValid: false, message: `第${i + 1}个套餐名称不能为空` }
      }
      if (!pkg.price || pkg.price <= 0) {
        return { isValid: false, message: `第${i + 1}个套餐价格必须大于0` }
      }
      
      if (modeType === 'transaction_package') {
        if (!pkg.transaction_count || pkg.transaction_count <= 0) {
          return { isValid: false, message: `第${i + 1}个套餐交易次数必须大于0` }
        }
      }
    }
  }
  
  return { isValid: true, message: '' }
}

// 初始化 - 保持原有逻辑
onMounted(() => {
  loadConfigs()
  // 确保加载TRX闪兑配置
  getTrxExchangeConfig()
})
</script>

<style scoped>
.price-config-page {
  @apply p-6;
}
</style>
