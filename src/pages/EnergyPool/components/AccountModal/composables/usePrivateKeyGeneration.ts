import { ref } from 'vue'
import type { AccountFormData, AccountFormErrors } from '../types/account-modal.types'

// 确保浏览器环境中的必要 polyfills
async function ensureBrowserPolyfills() {
  // 确保 Buffer 在全局可用
  if (!globalThis.Buffer) {
    const { Buffer } = await import('buffer')
    globalThis.Buffer = Buffer
  }
  
  // 确保 process 在全局可用（浏览器环境需要）
  if (!globalThis.process) {
    globalThis.process = {
      env: {},
      version: '',
      versions: {},
      platform: 'browser',
      nextTick: (fn: () => void) => setTimeout(fn, 0)
    } as any
  }
}

export function usePrivateKeyGeneration() {
  const generatingPrivateKey = ref(false)

  // 从助记词生成私钥 - 使用标准BIP44路径
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
      
      // 确保浏览器环境必要的 polyfills
      await ensureBrowserPolyfills()
      
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
      
      // 使用标准BIP44路径生成私钥：m/44'/195'/0'/0/0
      // 195 是 TRON 的币种编号
      const hdkeyModule = await import('hdkey')
      const hdkey = hdkeyModule.default || hdkeyModule
      
      // 从种子创建主密钥
      const root = hdkey.fromMasterSeed(seed)
      
      // 按照BIP44标准路径衍生私钥
      const derivationPath = "m/44'/195'/0'/0/0"
      const addrNode = root.derive(derivationPath)
      
      // 获取私钥
      const privateKey = addrNode.privateKey.toString('hex')
      
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
      
      console.log('✅ 从助记词成功生成私钥（使用标准BIP44路径：' + derivationPath + '）')
      
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
      
      // 确保浏览器环境必要的 polyfills
      await ensureBrowserPolyfills()
      
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
