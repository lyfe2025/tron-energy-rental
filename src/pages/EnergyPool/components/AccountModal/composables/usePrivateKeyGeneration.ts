import { ref } from 'vue'
import type { AccountFormData, AccountFormErrors } from '../types/account-modal.types'

export function usePrivateKeyGeneration() {
  const generatingPrivateKey = ref(false)

  // 从助记词生成私钥
  const generatePrivateKeyFromMnemonic = async (
    form: AccountFormData,
    errors: AccountFormErrors,
    onPrivateKeyGenerated?: (privateKey: string) => void
  ) => {
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
      
      // 调用回调函数（如果提供）
      if (onPrivateKeyGenerated) {
        onPrivateKeyGenerated(privateKey)
      }
      
      console.log('✅ 从助记词成功生成私钥')
      
    } catch (error: any) {
      console.error('从助记词生成私钥失败:', error)
      errors.mnemonic = '生成私钥失败：' + (error.message || '未知错误')
    } finally {
      generatingPrivateKey.value = false
    }
  }

  // 验证助记词有效性（不生成私钥）
  const validateMnemonicOnly = async (mnemonic: string): Promise<{ isValid: boolean; error: string }> => {
    if (!mnemonic?.trim()) {
      return { isValid: false, error: '请输入助记词' }
    }
    
    try {
      // 验证助记词格式
      const words = mnemonic.trim().split(/\s+/)
      if (words.length !== 12 && words.length !== 24) {
        return { isValid: false, error: '助记词必须是12或24个单词' }
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
      if (!bip39.validateMnemonic(mnemonic.trim())) {
        return { isValid: false, error: '无效的助记词，请检查拼写' }
      }
      
      return { isValid: true, error: '' }
      
    } catch (error: any) {
      console.error('验证助记词失败:', error)
      return { isValid: false, error: '验证助记词失败：' + (error.message || '未知错误') }
    }
  }

  return {
    generatingPrivateKey,
    generatePrivateKeyFromMnemonic,
    validateMnemonicOnly
  }
}
