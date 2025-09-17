/**
 * 代理提交处理逻辑 Composable
 */
import { watch } from 'vue'

export function useDelegateSubmit() {
  // 处理表单提交
  const handleSubmit = async (
    form: any,
    state: any,
    isFormValid: any,
    addressValidation: any,
    validateLockPeriod: Function,
    validateAmount: Function,
    emit: any
  ) => {
    // 验证所有必填字段和代理期限
    if (!isFormValid.value || !state.value.networkParams || !form.value.receiverAddress || !form.value.amount) {
      state.value.error = '请填写完整的代理信息'
      return
    }
    
    // 验证接收方地址
    if (!addressValidation.value || !addressValidation.value.isValid) {
      const errorMsg = addressValidation.value ? 
        `地址验证失败: ${addressValidation.value.errors.join(', ')}` : 
        '请输入有效的TRON地址'
      state.value.error = errorMsg
      return
    }
    
    // 验证代理数量
    if (!validateAmount()) {
      state.value.error = '代理数量设置有误，请检查'
      return
    }
    
    // 验证代理期限（仅在启用时验证）
    if (!validateLockPeriod()) {
      state.value.error = '代理期限设置有误，请检查'
      return
    }

    try {
      state.value.error = '' // 清空之前的错误
      state.value.loading = true
      
      // TODO: 实现代理逻辑
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      emit('success')
      const resourceName = form.value.resourceType === 'ENERGY' ? '能量' : '带宽'
      const periodText = form.value.enableLockPeriod ? `，期限: ${form.value.lockPeriod}天` : '，永久代理'
      alert(`代理成功！代理${resourceName}: ${parseFloat(form.value.amount).toLocaleString()}${periodText}`)
    } catch (err: any) {
      state.value.error = err.message || '代理失败，请重试'
    } finally {
      state.value.loading = false
    }
  }

  // 设置表单验证监听器
  const setupFormWatchers = (form: any, validateLockPeriod: Function) => {
    // 监听代理期限输入变化
    watch(() => form.value.lockPeriod, () => {
      if (form.value.lockPeriod) {
        validateLockPeriod()
      }
    })
  }

  return {
    handleSubmit,
    setupFormWatchers
  }
}
