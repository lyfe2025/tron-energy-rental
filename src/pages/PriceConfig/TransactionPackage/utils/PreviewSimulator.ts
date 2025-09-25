/**
 * 预览模拟器
 * 负责模拟按钮点击和预览功能
 */
import { ref } from 'vue'
import type { Button } from '../types/transaction-package.types'

export class PreviewSimulator {
  private showReply = ref(false)
  private showOrderReply = ref(false)
  private currentTime = ref('')
  private userInputAddress = ref('')

  // Getters
  getShowReply() {
    return this.showReply
  }

  getShowOrderReply() {
    return this.showOrderReply
  }

  getCurrentTime() {
    return this.currentTime
  }

  getUserInputAddress() {
    return this.userInputAddress
  }

  // Setters
  setShowReply(show: boolean) {
    this.showReply.value = show
  }

  setShowOrderReply(show: boolean) {
    this.showOrderReply.value = show
  }

  setUserInputAddress(address: string) {
    this.userInputAddress.value = address
  }

  /**
   * 更新当前时间
   */
  updateTime() {
    const now = new Date()
    this.currentTime.value = now.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  /**
   * 模拟按钮点击流程
   */
  simulateButtonClick(button: Button, onButtonSelected?: (button: Button) => void) {
    // 重置状态
    this.showReply.value = false
    this.showOrderReply.value = false
    this.userInputAddress.value = ''
    
    // 通知按钮被选择（用于更新价格等信息）
    if (onButtonSelected) {
      onButtonSelected(button)
    }
    
    // 第一步：显示"请输入能量接收地址"
    setTimeout(() => {
      this.showReply.value = true
    }, 300)
    
    // 第二步：1.5秒后设置用户输入的地址（使用示例地址）
    setTimeout(() => {
      this.userInputAddress.value = 'TL5afFHPzESaGrvG8JKAwrNx6drbDZf9it'  // 示例预览地址
    }, 1500)
    
    // 第三步：3秒后显示完整订单信息
    setTimeout(() => {
      this.showOrderReply.value = true
    }, 3000)
    
    // 保持展开状态，不自动重置
    // 用户可以手动点击其他按钮来重新演示
  }

  /**
   * 重置预览状态
   */
  resetPreview() {
    this.showReply.value = false
    this.showOrderReply.value = false
    this.userInputAddress.value = ''
  }

  /**
   * 开始自动预览演示
   */
  startAutoPreview(button: Button, onButtonSelected?: (button: Button) => void) {
    // 先重置状态
    this.resetPreview()
    
    // 延迟开始，让用户看到重置效果
    setTimeout(() => {
      this.simulateButtonClick(button, onButtonSelected)
    }, 100)
  }

  /**
   * 检查预览状态
   */
  getPreviewState() {
    return {
      showReply: this.showReply.value,
      showOrderReply: this.showOrderReply.value,
      hasUserInput: !!this.userInputAddress.value,
      userAddress: this.userInputAddress.value,
      currentTime: this.currentTime.value
    }
  }

  /**
   * 设置预览状态（用于外部控制）
   */
  setPreviewState(state: {
    showReply?: boolean
    showOrderReply?: boolean
    userAddress?: string
  }) {
    if (state.showReply !== undefined) {
      this.showReply.value = state.showReply
    }
    if (state.showOrderReply !== undefined) {
      this.showOrderReply.value = state.showOrderReply
    }
    if (state.userAddress !== undefined) {
      this.userInputAddress.value = state.userAddress
    }
  }

  /**
   * 生成示例用户地址
   */
  generateSampleAddress(): string {
    const sampleAddresses = [
      'TL5afFHPzESaGrvG8JKAwrNx6drbDZf9it',
      'TRX9pY4xv2pQRqZeDh1gH4Sxz1C6B5Nf8K',
      'THPvaUhoh2Qn2PIJ4MGYKzsZj4dDgqvLjD',
      'TKs8Vo4Zx1M3CePq6nR4xQ8dB2F7yH9tL3',
      'TWaKGcE2xQ7BfV5nN8Px1Dq6r9S4mZ2kHx'
    ]
    
    return sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)]
  }

  /**
   * 使用随机地址进行预览
   */
  simulateWithRandomAddress(button: Button, onButtonSelected?: (button: Button) => void) {
    // 重置状态
    this.showReply.value = false
    this.showOrderReply.value = false
    this.userInputAddress.value = ''
    
    // 通知按钮被选择
    if (onButtonSelected) {
      onButtonSelected(button)
    }
    
    // 第一步：显示"请输入能量接收地址"
    setTimeout(() => {
      this.showReply.value = true
    }, 300)
    
    // 第二步：1.5秒后设置随机地址
    setTimeout(() => {
      this.userInputAddress.value = this.generateSampleAddress()
    }, 1500)
    
    // 第三步：3秒后显示完整订单信息
    setTimeout(() => {
      this.showOrderReply.value = true
    }, 3000)
  }

  /**
   * 快速预览模式（跳过动画）
   */
  quickPreview(button: Button, userAddress?: string, onButtonSelected?: (button: Button) => void) {
    // 通知按钮被选择
    if (onButtonSelected) {
      onButtonSelected(button)
    }
    
    // 直接设置所有状态
    this.showReply.value = true
    this.showOrderReply.value = true
    this.userInputAddress.value = userAddress || this.generateSampleAddress()
  }

  /**
   * 获取预览进度
   */
  getPreviewProgress(): { step: number; total: number; description: string } {
    if (!this.showReply.value) {
      return { step: 0, total: 3, description: '等待开始' }
    } else if (!this.userInputAddress.value) {
      return { step: 1, total: 3, description: '显示地址输入提示' }
    } else if (!this.showOrderReply.value) {
      return { step: 2, total: 3, description: '用户输入地址' }
    } else {
      return { step: 3, total: 3, description: '显示订单确认' }
    }
  }

  /**
   * 检查是否处于预览模式
   */
  isInPreviewMode(): boolean {
    return this.showReply.value || this.showOrderReply.value || !!this.userInputAddress.value
  }

  /**
   * 导出预览配置（用于保存状态）
   */
  exportPreviewConfig() {
    return {
      showReply: this.showReply.value,
      showOrderReply: this.showOrderReply.value,
      userInputAddress: this.userInputAddress.value,
      currentTime: this.currentTime.value
    }
  }

  /**
   * 导入预览配置（用于恢复状态）
   */
  importPreviewConfig(config: any) {
    this.showReply.value = config.showReply || false
    this.showOrderReply.value = config.showOrderReply || false
    this.userInputAddress.value = config.userInputAddress || ''
    this.currentTime.value = config.currentTime || ''
  }
}
