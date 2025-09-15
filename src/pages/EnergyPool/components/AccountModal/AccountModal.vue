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
        <AccountForm
          :form="form"
          :errors="errors"
          :private-key-input-mode="privateKeyInputMode"
          :generating-private-key="generatingPrivateKey"
          :tron-data="tronData"
          :tron-data-error="tronDataError"
          :fetching-tron-data="fetchingTronData"
          @update:form="updateForm"
          @update:private-key-input-mode="privateKeyInputMode = $event"
          @generate-private-key="handleGeneratePrivateKey"
          @private-key-blur="handlePrivateKeyBlur"
          @mnemonic-blur="handleMnemonicBlur"
          @refresh-tron-data="handleRefreshTronData"
        />

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
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { ElMessage } from 'element-plus'
import { Loader2, X } from 'lucide-vue-next'
import { watch } from 'vue'
import { useEnergyPool } from '../../composables/useEnergyPool'
import AccountForm from './components/AccountForm.vue'
import { useAccountForm } from './composables/useAccountForm'
import { useAccountValidation } from './composables/useAccountValidation'
import { usePrivateKeyGeneration } from './composables/usePrivateKeyGeneration'
import type {
  AccountFormData,
  AccountModalEmits,
  AccountModalProps,
  AccountSubmitData
} from './types/account-modal.types'

const props = defineProps<AccountModalProps>()
const emit = defineEmits<AccountModalEmits>()

console.log('🔍 [AccountModal] 组件初始化:', {
  visible: props.visible,
  hasAccount: !!props.account,
  accountId: props.account?.id,
  accountName: props.account?.name,
  currentNetworkId: props.currentNetworkId,
  currentNetwork: props.currentNetwork
})

const { addAccount, updateAccount } = useEnergyPool()

// 使用 composables
const {
  form,
  errors,
  loading,
  fetchingTronData,
  tronData,
  tronDataError,
  privateKeyInputMode,
  isEdit,
  resetForm,
  clearErrors,
  setError,
  setTronData,
  setTronDataError
} = useAccountForm(props)

const {
  validateForm,
  validateAndFetchTronData
} = useAccountValidation()

const {
  generatingPrivateKey,
  generatePrivateKeyFromMnemonic
} = usePrivateKeyGeneration()

// 监听 props.account 的变化
watch(() => props.account, (newAccount, oldAccount) => {
  console.log('🔍 [AccountModal] props.account 变化:', {
    hasNewAccount: !!newAccount,
    newAccountId: newAccount?.id,
    newAccountName: newAccount?.name,
    hasOldAccount: !!oldAccount,
    oldAccountId: oldAccount?.id,
    visible: props.visible
  })
}, { immediate: true, deep: true })

// 监听 props.currentNetworkId 的变化
watch(() => props.currentNetworkId, (newNetworkId, oldNetworkId) => {
  console.log('🔍 [AccountModal] props.currentNetworkId 变化:', {
    newNetworkId: newNetworkId,
    oldNetworkId: oldNetworkId,
    hasNewNetworkId: !!newNetworkId,
    currentNetwork: props.currentNetwork
  })
}, { immediate: true })

// 更新表单数据
const updateForm = (updates: Partial<AccountFormData>) => {
  Object.assign(form, updates)
}

// 处理私钥生成
const handleGeneratePrivateKey = async () => {
  await generatePrivateKeyFromMnemonic(
    form,
    errors,
    (privateKey: string) => {
      // 私钥生成成功后的回调
      if (form.address) {
        console.log('🔍 [AccountModal] 助记词生成私钥后自动验证TRON数据')
        handleRefreshTronData()
      } else {
        console.log('🔍 [AccountModal] 跳过自动验证：缺少地址', {
          hasAddress: !!form.address
        })
      }
    }
  )
}

// 处理私钥输入失焦
const handlePrivateKeyBlur = () => {
  if (privateKeyInputMode.value === 'direct' && form.address && form.private_key) {
    handleRefreshTronData()
  }
}

// 处理助记词失焦
const handleMnemonicBlur = () => {
  if (form.mnemonic) {
    handleGeneratePrivateKey()
  }
}

// 处理TRON数据刷新
const handleRefreshTronData = async () => {
  console.log('🔍 [AccountModal] 刷新TRON数据')
  
  await validateAndFetchTronData(
    form,
    setTronData,
    setTronDataError,
    (fetching: boolean) => { fetchingTronData.value = fetching }
  )
}

// 处理提交
const handleSubmit = async () => {
  if (!validateForm(form, errors, privateKeyInputMode.value, isEdit.value, tronData.value)) {
    return
  }

  loading.value = true
  try {
    const submitData: AccountSubmitData = {
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
        setError('address', '该TRON地址已存在于能量池中')
        errorMessage = message.includes('现有账户名称') ? message : '该TRON地址已存在，请使用其他地址'
      } else if (message.includes('无效的TRON地址')) {
        setError('address', '请输入有效的TRON地址格式')
        errorMessage = '请检查TRON地址格式是否正确'
      } else if (message.includes('无效的私钥')) {
        setError('private_key', '请输入有效的64位十六进制私钥')
        errorMessage = '请检查私钥格式是否正确'
      } else if (message.includes('缺少必需字段')) {
        errorMessage = '请填写所有必需字段'
        // 检查具体哪些字段缺失
        if (message.includes('name')) setError('name', '请输入账户名称')
        if (message.includes('tron_address')) setError('address', '请输入TRON地址')
        if (message.includes('private_key')) setError('private_key', '请输入私钥')
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
