import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { useRoute } from 'vue-router'
import type {
    AccountFormData,
    AccountFormErrors,
    PrivateKeyInputMode,
    TronData
} from '../types/account-modal.types'

export function useAccountValidation() {
  const route = useRoute()
  
  // 验证表单
  const validateForm = (
    form: AccountFormData, 
    errors: AccountFormErrors,
    privateKeyInputMode: PrivateKeyInputMode,
    isEdit: boolean,
    tronData: TronData | null
  ): boolean => {
    // 清除之前的错误
    Object.keys(errors).forEach(key => {
      errors[key as keyof AccountFormErrors] = ''
    })
    
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
    if (privateKeyInputMode === 'mnemonic') {
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
    if (!isEdit && !tronData) {
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

  // 验证和获取TRON数据
  const validateAndFetchTronData = async (
    form: AccountFormData,
    setTronData: (data: TronData | null) => void,
    setTronDataError: (error: string) => void,
    setFetchingState: (fetching: boolean) => void
  ) => {
    // 从URL直接获取网络ID
    const networkId = route.params.networkId as string
    // 清除之前的错误信息
    setTronDataError('')
    
    // 检查必需的字段
    if (!form.address || !form.private_key) {
      console.log('🔍 [useAccountValidation] validateAndFetchTronData 跳过：缺少必需字段', {
        hasAddress: !!form.address,
        hasPrivateKey: !!form.private_key
      })
      return
    }
    
    // 基本格式验证
    if (!/^T[A-Za-z1-9]{33}$/.test(form.address.trim())) {
      setTronDataError('无效的TRON地址格式')
      return
    }
    
    if (!/^[0-9a-fA-F]{64}$/.test(form.private_key.trim())) {
      setTronDataError('无效的私钥格式')
      return
    }
    
    console.log('🔍 [useAccountValidation] 开始验证TRON数据:', {
      address: form.address,
      networkId: networkId,
      routeParams: route.params,
      routePath: route.path,
      timestamp: new Date().toISOString()
    })
    
    if (!networkId) {
      console.error('❌ [useAccountValidation] 网络ID为空:', {
        routeParams: route.params,
        routePath: route.path,
        routeName: route.name
      })
      setTronDataError('请先选择TRON网络')
      return
    }
    
    setFetchingState(true)
    setTronDataError('')
    
    try {
      const response = await energyPoolExtendedAPI.validateTronAddress({
        address: form.address.trim(),
        private_key: form.private_key.trim(),
        network_id: networkId
      })
      
      if (response.data.success) {
        setTronData(response.data.data)
        console.log('✅ TRON数据获取成功:', response.data.data)
      } else {
        setTronDataError(response.data.message || '获取TRON数据失败')
      }
    } catch (error: any) {
      console.error('获取TRON数据失败:', error)
      setTronDataError(error.response?.data?.message || '网络错误，请重试')
    } finally {
      setFetchingState(false)
    }
  }

  // 验证助记词格式
  const validateMnemonic = (mnemonic: string): { isValid: boolean; error: string } => {
    if (!mnemonic.trim()) {
      return { isValid: false, error: '请输入助记词' }
    }
    
    const words = mnemonic.trim().split(/\s+/)
    if (words.length !== 12 && words.length !== 24) {
      return { isValid: false, error: '助记词必须是12或24个单词' }
    }
    
    return { isValid: true, error: '' }
  }

  // 验证私钥格式
  const validatePrivateKey = (privateKey: string): { isValid: boolean; error: string } => {
    if (!privateKey.trim()) {
      return { isValid: false, error: '请输入私钥' }
    }
    
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey.trim())) {
      return { isValid: false, error: '请输入有效的私钥（64位十六进制字符）' }
    }
    
    return { isValid: true, error: '' }
  }

  // 验证TRON地址格式
  const validateTronAddress = (address: string): { isValid: boolean; error: string } => {
    if (!address.trim()) {
      return { isValid: false, error: '请输入钱包地址' }
    }
    
    if (!/^T[A-Za-z1-9]{33}$/.test(address.trim())) {
      return { isValid: false, error: '请输入有效的TRON钱包地址' }
    }
    
    return { isValid: true, error: '' }
  }

  return {
    validateForm,
    validateAndFetchTronData,
    validateMnemonic,
    validatePrivateKey,
    validateTronAddress
  }
}
