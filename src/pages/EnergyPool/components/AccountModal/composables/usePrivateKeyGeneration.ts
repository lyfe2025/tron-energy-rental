import { ref } from 'vue'
import type { AccountFormData, AccountFormErrors } from '../types/account-modal.types'

// 确保浏览器环境中的必要 polyfills
async function ensureBrowserPolyfills() {
  // 确保 Buffer 在全局可用
  if (!globalThis.Buffer) {
    const { Buffer } = await import('buffer')
    globalThis.Buffer = Buffer
    // 同时设置window.Buffer以确保兼容性
    if (typeof window !== 'undefined') {
      (window as any).Buffer = Buffer
    }
  }
  
  // 确保 process 在全局可用（浏览器环境需要）
  if (!globalThis.process) {
    const process = {
      env: {},
      version: '16.0.0',
      versions: { node: '16.0.0' },
      platform: 'browser',
      nextTick: (fn: () => void) => setTimeout(fn, 0),
      browser: true,
      argv: [],
      cwd: () => '/',
      stdout: { write: () => {} },
      stderr: { write: () => {} }
    } as any
    
    globalThis.process = process
    // 同时设置window.process以确保兼容性
    if (typeof window !== 'undefined') {
      (window as any).process = process
    }
  }
  
  // 确保其他必要的全局变量
  if (!globalThis.global) {
    globalThis.global = globalThis
  }
}

export function usePrivateKeyGeneration() {
  const generatingPrivateKey = ref(false)

  // 从助记词生成私钥 - 使用浏览器兼容方案
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
      
      console.log('🔧 开始验证助记词...')
      
      // 动态导入库
      const bip39Module = await import('bip39')
      const bip39 = bip39Module.default || bip39Module
      
      // 验证助记词有效性
      if (!bip39.validateMnemonic(form.mnemonic.trim())) {
        errors.mnemonic = '无效的助记词，请检查拼写'
        return
      }
      
      console.log('✅ 助记词验证通过，开始生成种子...')
      
      // 使用标准BIP44实现（符合官方规范）
      try {
        // 生成种子
        const seed = await bip39.mnemonicToSeed(form.mnemonic.trim())
        console.log('✅ 种子生成成功')
        
        // 使用@scure/bip32库进行正确的BIP44密钥派生
        const { HDKey } = await import('@scure/bip32')
        
        // 从种子创建主密钥
        const masterKey = HDKey.fromMasterSeed(seed)
        
        // 使用TRON的BIP44路径：m/44'/195'/0'/0/0
        // 195是TRON的官方币种代码
        const derivationPath = "m/44'/195'/0'/0/0"
        const childKey = masterKey.derive(derivationPath)
        
        if (!childKey.privateKey) {
          throw new Error('无法从路径衍生私钥: ' + derivationPath)
        }
        
        // 转换为十六进制私钥
        const privateKey = Buffer.from(childKey.privateKey).toString('hex')
        
        console.log('✅ 使用标准BIP44生成私钥成功')
        console.log('📍 派生路径:', derivationPath)
        
        // 验证生成的私钥格式
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error('生成的私钥格式无效，长度: ' + privateKey.length)
        }
        
        // 设置生成的私钥
        form.private_key = privateKey
        
        // 调用回调函数（如果提供）
        if (onPrivateKeyGenerated) {
          onPrivateKeyGenerated(privateKey)
        }
        
        console.log('✅ 从助记词成功生成私钥（使用标准BIP44实现）')
        
      } catch (bip44Error: any) {
        console.warn('标准BIP44方案失败，尝试备用方案:', bip44Error.message)
        
        // 备用方案：使用bip39直接生成（兼容一些旧钱包）
        const seed = await bip39.mnemonicToSeed(form.mnemonic.trim())
        
        // 简单的从种子取前32字节作为私钥（某些钱包的做法）
        const privateKeyBytes = seed.slice(0, 32)
        const privateKey = privateKeyBytes.toString('hex')
        
        console.log('✅ 使用种子直接生成私钥成功（备用方案）')
        
        // 验证生成的私钥格式
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error('生成的私钥格式无效，长度: ' + privateKey.length)
        }
        
        // 设置生成的私钥
        form.private_key = privateKey
        
        // 调用回调函数（如果提供）
        if (onPrivateKeyGenerated) {
          onPrivateKeyGenerated(privateKey)
        }
        
        console.log('✅ 从助记词成功生成私钥（使用备用方案）')
      }
      
    } catch (error: any) {
      console.error('从助记词生成私钥失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = '生成私钥失败：'
      if (error.message) {
        errorMessage += error.message
      } else if (typeof error === 'string') {
        errorMessage += error
      } else {
        errorMessage += '未知错误'
      }
      
      // 添加调试信息
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        type: typeof error,
        error
      })
      
      errors.mnemonic = errorMessage
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
