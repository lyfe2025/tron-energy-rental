import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { computed, reactive, ref, watch } from 'vue'
import type {
    AccountFormData,
    AccountFormErrors,
    AccountModalProps,
    PrivateKeyInputMode,
    TronData
} from '../types/account-modal.types'

export function useAccountForm(props: AccountModalProps) {
  // 添加调试日志
  console.log('🔍 [useAccountForm] 初始化:', {
    hasPropsAccount: !!props.account,
    propsAccountId: props.account?.id,
    propsAccountName: props.account?.name,
    currentNetworkId: props.currentNetworkId,
    currentNetwork: props.currentNetwork,
    propsKeys: Object.keys(props)
  })
  
  // 表单数据
  const form = reactive<AccountFormData>({
    name: '',
    address: '',
    private_key: '',
    mnemonic: '',
    status: 'active',
    account_type: 'own_energy',
    priority: 1,
    description: '',
    daily_limit: null,
    monthly_limit: null
  })

  // 表单错误
  const errors = reactive<AccountFormErrors>({
    name: '',
    address: '',
    private_key: '',
    mnemonic: '',
    priority: ''
  })

  // 状态管理
  const loading = ref(false)
  const showPrivateKey = ref(false)
  const fetchingTronData = ref(false)
  const tronData = ref<TronData | null>(null)
  const tronDataError = ref('')
  const privateKeyInputMode = ref<PrivateKeyInputMode>('direct')
  const generatingPrivateKey = ref(false)

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

  // 设置表单错误
  const setError = (field: keyof AccountFormErrors, message: string) => {
    errors[field] = message
  }

  // 设置TRON数据
  const setTronData = (data: TronData | null) => {
    tronData.value = data
  }

  // 设置TRON数据错误
  const setTronDataError = (error: string) => {
    tronDataError.value = error
  }

  // 监听账户变化，填充表单
  watch(() => props.account, async (account, oldAccount) => {
    console.log('🔍 [useAccountForm] 账户数据变化:', {
      hasAccount: !!account,
      accountId: account?.id,
      accountName: account?.name,
      accountStatus: account?.status,
      accountType: account?.account_type,
      hasPrivateKey: !!account?.private_key_encrypted,
      privateKeyValue: account?.private_key_encrypted,
      isEdit: isEdit.value,
      oldAccount: !!oldAccount,
      propsAccount: props.account
    })
    
    if (account) {
      // 编辑模式：重新获取包含私钥的完整账户信息
      if (isEdit.value && account.id) {
        try {
          console.log('🔒 [useAccountForm] 编辑模式：获取包含私钥的账户详情')
          const response = await energyPoolExtendedAPI.getAccount(account.id, true)
          if (response.data.success) {
            const fullAccount = response.data.data
            console.log('✅ [useAccountForm] 获取完整账户信息成功:', {
              hasPrivateKey: !!fullAccount.private_key_encrypted && fullAccount.private_key_encrypted !== '***',
              privateKeyLength: fullAccount.private_key_encrypted ? fullAccount.private_key_encrypted.length : 0
            })
            
            // 使用完整的账户信息填充表单
            console.log('🔍 [useAccountForm] 开始填充表单数据:', {
              fullAccountName: fullAccount.name,
              fullAccountAddress: fullAccount.tron_address,
              fullAccountPrivateKey: fullAccount.private_key_encrypted,
              fullAccountStatus: fullAccount.status,
              fullAccountType: fullAccount.account_type,
              fullAccountPriority: fullAccount.priority,
              fullAccountDescription: fullAccount.description
            })
            
            form.name = fullAccount.name || ''
            form.address = fullAccount.tron_address
            form.private_key = fullAccount.private_key_encrypted
            form.status = fullAccount.status || 'active'
            form.account_type = fullAccount.account_type || 'own_energy'
            form.priority = fullAccount.priority || 1
            form.description = fullAccount.description || ''
            form.daily_limit = fullAccount.daily_limit
            form.monthly_limit = fullAccount.monthly_limit
            
            console.log('✅ [useAccountForm] 表单数据填充完成:', {
              formName: form.name,
              formAddress: form.address,
              formPrivateKey: form.private_key,
              formStatus: form.status,
              formAccountType: form.account_type,
              formPriority: form.priority,
              formDescription: form.description
            })
          } else {
            throw new Error('获取账户详情失败')
          }
        } catch (error) {
          console.error('❌ [useAccountForm] 获取完整账户信息失败:', error)
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
      
      console.log('✅ [useAccountForm] 表单数据已设置:', {
        accountName: form.name,
        hasRealPrivateKey: form.private_key !== '***'
      })
    } else {
      console.log('🔄 [useAccountForm] 重置表单数据')
      resetForm()
    }
  }, { immediate: true, deep: true })

  return {
    // 表单数据
    form,
    errors,
    
    // 状态
    loading,
    showPrivateKey,
    fetchingTronData,
    tronData,
    tronDataError,
    privateKeyInputMode,
    generatingPrivateKey,
    
    // 计算属性
    isEdit,
    
    // 方法
    resetForm,
    clearErrors,
    setError,
    setTronData,
    setTronDataError
  }
}
