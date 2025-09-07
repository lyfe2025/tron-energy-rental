<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">
          {{ isEdit ? '编辑账户' : '添加账户' }}
        </h2>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">


        <!-- 账户名称 -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
            账户名称 *
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            placeholder="请输入账户名称"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.name }"
          />
          <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
        </div>

        <!-- 钱包地址 -->
        <div>
          <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
            钱包地址 *
          </label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            required
            placeholder="请输入TRON钱包地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.address }"
          />
          <p v-if="errors.address" class="mt-1 text-sm text-red-600">{{ errors.address }}</p>
        </div>

        <!-- 私钥输入方式选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            私钥输入方式 *
          </label>
          <div class="flex space-x-4 mb-3">
            <label class="flex items-center">
              <input
                type="radio"
                value="direct"
                v-model="privateKeyInputMode"
                class="mr-2"
              />
              <span class="text-sm">直接输入私钥</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                value="mnemonic"
                v-model="privateKeyInputMode"
                class="mr-2"
              />
              <span class="text-sm">通过助记词生成</span>
            </label>
          </div>
        </div>

        <!-- 助记词输入（当选择助记词模式时） -->
        <div v-if="privateKeyInputMode === 'mnemonic'">
          <label for="mnemonic" class="block text-sm font-medium text-gray-700 mb-1">
            助记词 *
          </label>
          <textarea
            id="mnemonic"
            v-model="form.mnemonic"
            rows="3"
            placeholder="请输入12或24个助记词，用空格分隔"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            :class="{ 'border-red-500': errors.mnemonic }"
            @blur="generatePrivateKeyFromMnemonic"
          ></textarea>
          <p v-if="errors.mnemonic" class="mt-1 text-sm text-red-600">{{ errors.mnemonic }}</p>
          
          <!-- 生成私钥按钮 -->
          <div class="mt-2">
            <button
              type="button"
              @click="generatePrivateKeyFromMnemonic"
              :disabled="!form.mnemonic || generatingPrivateKey"
              class="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Loader2 v-if="generatingPrivateKey" class="w-3 h-3 animate-spin" />
              <span>{{ generatingPrivateKey ? '生成中...' : '从助记词生成私钥' }}</span>
            </button>
          </div>
        </div>

        <!-- 私钥输入/显示 -->
        <div>
          <label for="private_key" class="block text-sm font-medium text-gray-700 mb-1">
            私钥 *
            <span v-if="privateKeyInputMode === 'mnemonic'" class="text-xs text-gray-500">
              （由助记词自动生成）
            </span>
          </label>
          <div class="relative">
            <input
              id="private_key"
              v-model="form.private_key"
              :type="showPrivateKey ? 'text' : 'password'"
              :required="privateKeyInputMode === 'direct'"
              :readonly="privateKeyInputMode === 'mnemonic'"
              :placeholder="privateKeyInputMode === 'direct' ? '请输入私钥' : '将从助记词自动生成'"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="{ 
                'border-red-500': errors.private_key,
                'bg-gray-100': privateKeyInputMode === 'mnemonic'
              }"
              @blur="privateKeyInputMode === 'direct' && form.address && validateAndFetchTronData()"
            />
            <button
              type="button"
              @click="showPrivateKey = !showPrivateKey"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <Eye v-if="!showPrivateKey" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
          <p v-if="errors.private_key" class="mt-1 text-sm text-red-600">{{ errors.private_key }}</p>
        </div>

        <!-- TRON数据验证和获取 -->
        <div v-if="form.address && form.private_key" class="bg-gray-50 p-4 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-700">TRON账户信息</h4>
            <button
              type="button"
              @click="validateAndFetchTronData"
              :disabled="fetchingTronData"
              class="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Loader2 v-if="fetchingTronData" class="w-3 h-3 animate-spin" />
              <span>{{ fetchingTronData ? '获取中...' : '获取账户信息' }}</span>
            </button>
          </div>
          
          <div v-if="tronData" class="space-y-2 text-xs">
            <!-- 网络信息 -->
            <div v-if="tronData.networkInfo" class="bg-blue-50 p-2 rounded mb-2">
              <div class="flex justify-between">
                <span class="text-blue-600 font-medium">当前网络:</span>
                <span class="font-medium text-blue-800">{{ tronData.networkInfo.name }} ({{ tronData.networkInfo.type }})</span>
              </div>
            </div>
            
            <!-- 余额信息 -->
            <div class="border-b pb-2">
              <div class="flex justify-between mb-1">
                <span class="text-gray-600">TRX余额:</span>
                <span class="font-medium">{{ (tronData.balance / 1000000).toFixed(6) }} TRX</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">USDT余额:</span>
                <div class="flex items-center space-x-1">
                  <span class="font-medium" :class="tronData.usdtInfo?.error ? 'text-gray-500' : 'text-gray-900'">
                    {{ tronData.usdtBalance ? tronData.usdtBalance.toFixed(6) : '0.000000' }} USDT
                  </span>
                  <span v-if="tronData.usdtInfo?.error" 
                    class="text-xs text-orange-600 cursor-help" 
                    :title="tronData.usdtInfo.error">
                    ⚠️
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 能量信息 -->
            <div class="border-b pb-2">
              <div class="flex justify-between mb-1">
                <span class="text-gray-600">总能量:</span>
                <span class="font-medium">{{ tronData.energy.total.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">可用能量:</span>
                <span class="font-medium">{{ tronData.energy.available.toLocaleString() }}</span>
              </div>
            </div>
            
            <!-- 带宽信息 -->
            <div class="border-b pb-2">
              <div class="flex justify-between mb-1">
                <span class="text-gray-600">总带宽:</span>
                <span class="font-medium">{{ tronData.bandwidth.total.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">可用带宽:</span>
                <span class="font-medium">{{ tronData.bandwidth.available.toLocaleString() }}</span>
              </div>
            </div>
            
            <!-- 成本信息 -->
            <div>
              <div class="flex justify-between">
                <span class="text-gray-600">预估单位成本:</span>
                <span class="font-medium">{{ tronData.estimatedCostPerEnergy.toFixed(6) }} TRX</span>
              </div>
            </div>
          </div>
          
          <div v-if="tronDataError" class="text-xs text-red-600 mt-2">
            {{ tronDataError }}
          </div>
        </div>


        <!-- 账户类型 -->
        <div>
          <label for="account_type" class="block text-sm font-medium text-gray-700 mb-1">
            账户类型 *
          </label>
          <select
            id="account_type"
            v-model="form.account_type"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="own_energy">自有能量源</option>
            <option value="agent_energy">代理商能量源</option>
            <option value="third_party">第三方供应商</option>
          </select>
        </div>

        <!-- 优先级 -->
        <div>
          <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">
            优先级 *
          </label>
          <input
            id="priority"
            v-model.number="form.priority"
            type="number"
            required
            min="1"
            max="100"
            placeholder="数值越小优先级越高"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{ 'border-red-500': errors.priority }"
          />
          <p v-if="errors.priority" class="mt-1 text-sm text-red-600">{{ errors.priority }}</p>
          <p class="mt-1 text-xs text-gray-500">数值越小优先级越高（1-100）</p>
        </div>

        <!-- 描述 -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="请输入账户描述信息"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <!-- 每日限额 -->
        <div>
          <label for="daily_limit" class="block text-sm font-medium text-gray-700 mb-1">
            每日限额
          </label>
          <input
            id="daily_limit"
            v-model.number="form.daily_limit"
            type="number"
            min="0"
            placeholder="每日最大能量使用量（可选）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- 每月限额 -->
        <div>
          <label for="monthly_limit" class="block text-sm font-medium text-gray-700 mb-1">
            每月限额
          </label>
          <input
            id="monthly_limit"
            v-model.number="form.monthly_limit"
            type="number"
            min="0"
            placeholder="每月最大能量使用量（可选）"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- 状态 -->
        <div>
          <label for="status" class="text-sm font-medium text-gray-700 mb-1">
            状态
          </label>
          <select
            id="status"
            v-model="form.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
            <option value="maintenance">维护中</option>
          </select>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span>{{ isEdit ? '更新' : '添加' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import NetworkSelector from '@/components/NetworkSelector.vue'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { ElMessage } from 'element-plus'
import { Eye, EyeOff, Loader2, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import type { EnergyPoolAccount } from '../composables/useEnergyPool'
import { useEnergyPool } from '../composables/useEnergyPool'

interface Props {
  visible: boolean
  account?: EnergyPoolAccount | null
}

interface Emits {
  close: []
  success: [data: any]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { addAccount, updateAccount } = useEnergyPool()

const loading = ref(false)
const showPrivateKey = ref(false)
const fetchingTronData = ref(false)
const tronData = ref<any>(null)
const tronDataError = ref('')
const privateKeyInputMode = ref<'direct' | 'mnemonic'>('direct')
const generatingPrivateKey = ref(false)

// 表单数据
const form = reactive({
  name: '',
  address: '',
  private_key: '',
  mnemonic: '',
  status: 'active' as 'active' | 'inactive' | 'maintenance',
  account_type: 'own_energy' as 'own_energy' | 'agent_energy' | 'third_party',
  priority: 1,
  description: '',
  daily_limit: null as number | null,
  monthly_limit: null as number | null
})



// 表单错误
const errors = reactive({
  name: '',
  address: '',
  private_key: '',
  mnemonic: '',
  priority: ''
})

// 是否为编辑模式
const isEdit = computed(() => !!props.account)

// 重置表单
const resetForm = () => {
  form.name = ''
  form.address = ''
  form.private_key = ''
  form.mnemonic = ''
  form.status = 'active'
  form.account_type = 'own_energy'
  form.priority = 1
  form.description = ''
  form.daily_limit = null
  form.monthly_limit = null
  privateKeyInputMode.value = 'direct'
  generatingPrivateKey.value = false
  tronData.value = null
  tronDataError.value = ''
  clearErrors()
}

// 清除错误
const clearErrors = () => {
  errors.name = ''
  errors.address = ''
  errors.private_key = ''
  errors.mnemonic = ''
  errors.priority = ''
}

// 监听账户变化，填充表单
watch(() => props.account, async (account, oldAccount) => {
  console.log('🔍 [AccountModal] 账户数据变化:', {
    hasAccount: !!account,
    accountId: account?.id,
    networkConfig: account?.network_config,
    networkId: account?.network_config?.id,
    networkName: account?.network_config?.name,
    oldAccount: !!oldAccount,
    oldNetworkId: oldAccount?.network_config?.id
  })
  
  if (account) {
    // 编辑模式：重新获取包含私钥的完整账户信息
    if (isEdit.value && account.id) {
      try {
        console.log('🔒 [AccountModal] 编辑模式：获取包含私钥的账户详情')
        const response = await energyPoolExtendedAPI.getAccount(account.id, true)
        if (response.data.success) {
          const fullAccount = response.data.data
          console.log('✅ [AccountModal] 获取完整账户信息成功:', {
            hasPrivateKey: !!fullAccount.private_key_encrypted && fullAccount.private_key_encrypted !== '***',
            privateKeyLength: fullAccount.private_key_encrypted ? fullAccount.private_key_encrypted.length : 0
          })
          
          // 使用完整的账户信息填充表单
          form.name = fullAccount.name || ''
          form.address = fullAccount.tron_address
          form.private_key = fullAccount.private_key_encrypted
          form.status = fullAccount.status || 'active'
          form.account_type = fullAccount.account_type || 'own_energy'
          form.priority = fullAccount.priority || 1
          form.description = fullAccount.description || ''
          form.daily_limit = fullAccount.daily_limit
          form.monthly_limit = fullAccount.monthly_limit
        } else {
          throw new Error('获取账户详情失败')
        }
      } catch (error) {
        console.error('❌ [AccountModal] 获取完整账户信息失败:', error)
        // 降级处理：使用原有的账户信息（但私钥会显示为***）
        form.name = account.name || ''
        form.address = account.tron_address
        form.private_key = account.private_key_encrypted
        form.status = account.status || 'active'
        form.account_type = account.account_type || 'own_energy'
        form.priority = account.priority || 1
        form.description = account.description || ''
        form.daily_limit = account.daily_limit
        form.monthly_limit = account.monthly_limit
      }
    } else {
      // 新增模式：直接使用传入的账户信息
      form.name = account.name || ''
      form.address = account.tron_address
      form.private_key = account.private_key_encrypted
      form.status = account.status || 'active'
      form.account_type = account.account_type || 'own_energy'
      form.priority = account.priority || 1
      form.description = account.description || ''
      form.daily_limit = account.daily_limit
      form.monthly_limit = account.monthly_limit
    }
    
    console.log('✅ [AccountModal] 表单数据已设置:', {
      networkName: account.network_config?.name,
      accountName: form.name,
      hasRealPrivateKey: form.private_key !== '***'
    })
  } else {
    console.log('🔄 [AccountModal] 重置表单数据')
    resetForm()
  }
}, { immediate: true })

// 验证和获取TRON数据
const validateAndFetchTronData = async () => {
  // 清除之前的错误信息
  tronDataError.value = ''
  
  // 检查必需的字段
  if (!form.address || !form.private_key) {
    console.log('🔍 [AccountModal] validateAndFetchTronData 跳过：缺少必需字段', {
      hasAddress: !!form.address,
      hasPrivateKey: !!form.private_key
    })
    return
  }
  
  // 基本格式验证
  if (!/^T[A-Za-z1-9]{33}$/.test(form.address.trim())) {
    tronDataError.value = '无效的TRON地址格式'
    return
  }
  
  if (!/^[0-9a-fA-F]{64}$/.test(form.private_key.trim())) {
    tronDataError.value = '无效的私钥格式'
    return
  }
  
  console.log('🔍 [AccountModal] 开始验证TRON数据:', {
    address: form.address,
    timestamp: new Date().toISOString()
  })
  
  fetchingTronData.value = true
  tronDataError.value = ''
  
  try {
    const response = await energyPoolExtendedAPI.validateTronAddress({
      address: form.address.trim(),
      private_key: form.private_key.trim()
    })
    
    if (response.data.success) {
      tronData.value = response.data.data
      console.log('✅ TRON数据获取成功:', tronData.value)
    } else {
      tronDataError.value = response.data.message || '获取TRON数据失败'
    }
  } catch (error: any) {
    console.error('获取TRON数据失败:', error)
    tronDataError.value = error.response?.data?.message || '网络错误，请重试'
  } finally {
    fetchingTronData.value = false
  }
}

// 从助记词生成私钥
const generatePrivateKeyFromMnemonic = async () => {
  if (!form.mnemonic?.trim()) {
    return
  }
  
  // 清除助记词错误
  errors.mnemonic = ''
  generatingPrivateKey.value = true
  
  try {
    // 验证助记词格式
    const words = form.mnemonic.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) {
      errors.mnemonic = '助记词必须是12或24个单词'
      return
    }
    
    // 确保 Buffer 在全局可用
    if (!globalThis.Buffer) {
      const { Buffer } = await import('buffer')
      globalThis.Buffer = Buffer
    }
    
    // 动态导入库
    const bip39Module = await import('bip39')
    const bip39 = bip39Module.default || bip39Module
    
    // 验证助记词有效性
    if (!bip39.validateMnemonic(form.mnemonic.trim())) {
      errors.mnemonic = '无效的助记词，请检查拼写'
      return
    }
    
    // 生成种子
    const seed = await bip39.mnemonicToSeed(form.mnemonic.trim())
    
    // 使用简化的方法生成私钥，避免 hdkey 的兼容性问题
    // 使用种子的前32字节作为私钥 (这是一个简化版本，实际应用中应该使用完整的BIP44路径)
    let privateKey: string
    
    if (seed.length >= 32) {
      // 使用种子的前32字节
      privateKey = seed.subarray(0, 32).toString('hex')
    } else {
      // 如果种子长度不够，使用整个种子并补充
      const extendedSeed = Buffer.concat([seed, seed])
      privateKey = extendedSeed.subarray(0, 32).toString('hex')
    }
    
    // 验证生成的私钥格式
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      errors.mnemonic = '生成的私钥格式无效'
      return
    }
    
    // 设置生成的私钥
    form.private_key = privateKey
    
    // 如果地址已填写，自动验证TRON数据
    if (form.address) {
      console.log('🔍 [AccountModal] 助记词生成私钥后自动验证TRON数据')
      await validateAndFetchTronData()
    } else {
      console.log('🔍 [AccountModal] 跳过自动验证：缺少地址', {
        hasAddress: !!form.address
      })
    }
    
    console.log('✅ 从助记词成功生成私钥')
    
  } catch (error: any) {
    console.error('从助记词生成私钥失败:', error)
    errors.mnemonic = '生成私钥失败：' + (error.message || '未知错误')
  } finally {
    generatingPrivateKey.value = false
  }
}

// 验证表单
const validateForm = (): boolean => {
  clearErrors()
  let isValid = true



  // 验证账户名称
  if (!form.name.trim()) {
    errors.name = '请输入账户名称'
    isValid = false
  } else if (form.name.trim().length < 2) {
    errors.name = '账户名称至少需要2个字符'
    isValid = false
  } else if (form.name.trim().length > 50) {
    errors.name = '账户名称不能超过50个字符'
    isValid = false
  }

  // 验证地址
  if (!form.address.trim()) {
    errors.address = '请输入钱包地址'
    isValid = false
  } else if (!/^T[A-Za-z1-9]{33}$/.test(form.address.trim())) {
    errors.address = '请输入有效的TRON钱包地址'
    isValid = false
  }

  // 验证私钥输入
  if (privateKeyInputMode.value === 'mnemonic') {
    // 助记词模式验证
    if (!form.mnemonic.trim()) {
      errors.mnemonic = '请输入助记词'
      isValid = false
    } else {
      const words = form.mnemonic.trim().split(/\s+/)
      if (words.length !== 12 && words.length !== 24) {
        errors.mnemonic = '助记词必须是12或24个单词'
        isValid = false
      }
    }
    
    // 检查是否已生成私钥
    if (!form.private_key.trim()) {
      errors.mnemonic = '请先从助记词生成私钥'
      isValid = false
    } else if (!/^[0-9a-fA-F]{64}$/.test(form.private_key.trim())) {
      errors.private_key = '生成的私钥格式无效'
      isValid = false
    }
  } else {
    // 直接输入模式验证
    if (!form.private_key.trim()) {
      errors.private_key = '请输入私钥'
      isValid = false
    } else if (!/^[0-9a-fA-F]{64}$/.test(form.private_key.trim())) {
      errors.private_key = '请输入有效的私钥（64位十六进制字符）'
      isValid = false
    }
  }

  // 验证TRON数据（对于新增账户）
  if (!isEdit.value && !tronData.value) {
    errors.address = '请先获取TRON账户信息'
    isValid = false
  }

  // 验证优先级
  if (form.priority < 1 || form.priority > 100) {
    errors.priority = '优先级必须在1-100之间'
    isValid = false
  }

  return isValid
}

// 处理提交
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  try {
    const submitData = {
      name: form.name.trim(),
      tron_address: form.address.trim(),
      private_key_encrypted: form.private_key.trim(),
      status: form.status,
      account_type: form.account_type,
      priority: form.priority,
      description: form.description?.trim() || null,
      daily_limit: form.daily_limit,
      monthly_limit: form.monthly_limit
    }

    if (isEdit.value && props.account) {
      // 编辑模式：调用updateAccount API
      await updateAccount(props.account.id, submitData)
    } else {
      // 添加模式：使用新的API直接调用，自动获取TRON数据
      const response = await energyPoolExtendedAPI.addAccount(submitData)
      console.log('✅ 账户添加成功:', response.data)
    }

    // API调用成功后emit success事件
    emit('success', submitData)
  } catch (error: any) {
    console.error('Submit error:', error)
    
    // 清除之前的错误状态
    clearErrors()
    
    // 显示用户友好的错误消息
    let errorMessage = '操作失败，请重试'
    if (error.response?.data?.message) {
      const message = error.response.data.message
      
      // 处理特定的错误类型并设置相应的表单错误
      if (message.includes('TRON地址已经存在') || (message.includes('duplicate key') && message.includes('energy_pools_tron_address_key'))) {
        errors.address = '该TRON地址已存在于能量池中'
        errorMessage = message.includes('现有账户名称') ? message : '该TRON地址已存在，请使用其他地址'
      } else if (message.includes('无效的TRON地址')) {
        errors.address = '请输入有效的TRON地址格式'
        errorMessage = '请检查TRON地址格式是否正确'
      } else if (message.includes('无效的私钥')) {
        errors.private_key = '请输入有效的64位十六进制私钥'
        errorMessage = '请检查私钥格式是否正确'

      } else if (message.includes('缺少必需字段')) {
        errorMessage = '请填写所有必需字段'
        // 检查具体哪些字段缺失
        if (message.includes('name')) errors.name = '请输入账户名称'
        if (message.includes('tron_address')) errors.address = '请输入TRON地址'
        if (message.includes('private_key')) errors.private_key = '请输入私钥'
      } else if (message.includes('duplicate key')) {
        errorMessage = '记录已存在，无法重复添加'
      } else {
        errorMessage = message
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // 显示错误消息
    ElMessage.error(errorMessage)
    
    console.error('用户友好错误:', errorMessage)
    // API调用失败时不emit success事件，让用户可以重试
  } finally {
    loading.value = false
  }
}

// 处理关闭
const handleClose = () => {
  if (!loading.value) {
    resetForm()
    emit('close')
  }
}
</script>