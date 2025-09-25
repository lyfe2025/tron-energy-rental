/**
 * 重构后的笔数套餐配置组合函数
 * 作为所有分离模块的整合器，保持原有API接口不变
 */
import { computed, onMounted } from 'vue'
import type { ConfigCardProps } from '../../types'
import type {
    Button,
    TransactionPackageConfigData
} from '../types/transaction-package.types'

// 导入分离的管理器和工具
import { ConfigManager } from '../core/ConfigManager'
import { ButtonManager } from '../managers/ButtonManager'
import { ImageManager } from '../managers/ImageManager'
import { OrderConfigManager } from '../managers/OrderConfigManager'
import { TemplateManager } from '../managers/TemplateManager'
import { PreviewSimulator } from '../utils/PreviewSimulator'

// 重新导出Button类型以保持向后兼容
export type { Button } from '../types/transaction-package.types'

export function usePackageConfig(props: ConfigCardProps) {
  // 创建管理器实例
  const buttonManager = new ButtonManager()
  const imageManager = new ImageManager()
  const orderConfigManager = new OrderConfigManager()
  const templateManager = new TemplateManager()
  const previewSimulator = new PreviewSimulator()

  // 全局汇率配置
  const DEFAULT_USDT_TO_TRX_RATE = 3.02

  // 从配置初始化所有管理器
  const initializeFromConfig = () => {
    if (props.config) {
      // 初始化核心配置
      ConfigManager.initializeConfig(props)
      
      // 初始化各个管理器
      imageManager.loadFromConfig(props.config)
      templateManager.loadFromConfig(props.config.config)
      orderConfigManager.loadFromConfig(props.config.config)
      
      // 初始化按钮管理器
      buttonManager.updateExchangeRate(DEFAULT_USDT_TO_TRX_RATE)
      if (props.config.config?.packages) {
        buttonManager.loadButtonsFromPackages(props.config.config.packages)
      } else {
        buttonManager.loadDefaultButtons()
      }
      
      // 更新预览时间
      previewSimulator.updateTime()
    }
  }

  // 计算属性（通过管理器获取）
  const buttons = computed(() => buttonManager.getButtons().value)
  const regularButtons = buttonManager.regularButtons
  const specialButton = buttonManager.specialButton
  const specialButtons = buttonManager.specialButtons
  const currentUnitPrice = buttonManager.currentUnitPrice
  const currentTransactionCount = buttonManager.currentTransactionCount
  const currentTotalAmount = buttonManager.currentTotalAmount

  // 响应式数据访问器
  const showReply = computed(() => previewSimulator.getShowReply().value)
  const showOrderReply = computed(() => previewSimulator.getShowOrderReply().value)
  const currentTime = computed(() => previewSimulator.getCurrentTime().value)
  const userInputAddress = computed(() => previewSimulator.getUserInputAddress().value)
  
  const imageEnabled = computed(() => imageManager.getImageEnabled().value)
  const imageUrl = computed(() => imageManager.getImageUrl().value)
  const imageAlt = computed(() => imageManager.getImageAlt().value)
  
  const mainMessageTemplate = computed(() => templateManager.getMainMessageTemplate().value)
  const dailyFee = computed(() => templateManager.getDailyFee().value)
  const replyMessage = computed(() => templateManager.getReplyMessage().value)
  const usageRules = computed(() => templateManager.getUsageRules().value)
  const notes = computed(() => templateManager.getNotes().value)
  
  const paymentAddress = computed(() => orderConfigManager.getPaymentAddress().value)
  const orderExpireMinutes = computed(() => orderConfigManager.getOrderExpireMinutes().value)
  const orderConfirmationTemplate = computed(() => orderConfigManager.getOrderConfirmationTemplate().value)
  const orderConfirmationTemplateTrx = computed(() => orderConfigManager.getOrderConfirmationTemplateTrx().value)
  const inlineKeyboardEnabled = computed(() => orderConfigManager.getInlineKeyboardEnabled().value)
  const keyboardButtonsPerRow = computed(() => orderConfigManager.getKeyboardButtonsPerRow().value)

  // 汇率管理
  const usdtToTrxRate = computed({
    get: () => DEFAULT_USDT_TO_TRX_RATE,
    set: (value: number) => {
      buttonManager.updateExchangeRate(value)
    }
  })

  // 业务方法
  const handleToggle = () => {
    props.onToggle('transaction_package')
  }

  const handleSave = () => {
    if (props.config) {
      // 构建标准的笔数套餐配置数据
      const standardConfig: TransactionPackageConfigData = {
        packages: buttonManager.exportButtonsConfig(),
        daily_fee: templateManager.getDailyFee().value,
        order_config: orderConfigManager.exportConfig(),
        main_message_template: templateManager.getMainMessageTemplate().value,
        reply_message: templateManager.getReplyMessage().value,
        transferable: true,
        proxy_purchase: true
      }

      // 安全替换配置
      props.config.config = standardConfig
      
      // 更新图片配置
      const imageConfig = imageManager.exportConfig()
      props.config.enable_image = imageConfig.enable_image
      props.config.image_url = imageConfig.image_url
      props.config.image_alt = imageConfig.image_alt
      
      // 构建标准的内嵌键盘配置
      props.config.inline_keyboard_config = {
        enabled: true,
        keyboard_type: 'transaction_count_selection',
        title: templateManager.getMainMessageTemplate().value,
        description: '选择您需要的交易笔数',
        buttons_per_row: 3,
        buttons: buttonManager.exportInlineKeyboardButtons(),
        next_message: templateManager.getReplyMessage().value,
        validation: {
          address_required: true,
          min_transaction_count: 1,
          max_transaction_count: 1000
        }
      }
    }
    
    props.onSave('transaction_package')
  }

  // 按钮操作方法
  const simulateButtonClick = (button: Button) => {
    previewSimulator.simulateButtonClick(button, (selectedButton) => {
      buttonManager.setSelectedButton(selectedButton)
    })
  }

  const addButton = () => {
    buttonManager.addButton()
  }

  const removeButton = (index: number) => {
    buttonManager.removeButton(index)
  }

  const applyTemplate = (templateType: 'basic' | 'popular' | 'enterprise') => {
    buttonManager.applyTemplate(templateType)
  }

  // 图片操作方法
  const toggleImageEnabled = () => {
    imageManager.toggleImageEnabled()
  }

  const handleImageUploadSuccess = (data: any) => {
    imageManager.handleImageUploadSuccess(data)
  }

  const handleImageUploadError = (error: string) => {
    imageManager.handleImageUploadError(error)
  }

  const updateImageUrl = (value: string) => {
    imageManager.setImageUrl(value)
  }

  const updateImageAlt = (value: string) => {
    imageManager.setImageAlt(value)
  }

  // 时间更新方法
  const updateTime = () => {
    previewSimulator.updateTime()
  }

  // 订单配置更新方法
  const updatePaymentAddress = (value: string) => {
    orderConfigManager.setPaymentAddress(value)
  }

  const updateOrderExpireMinutes = (value: number) => {
    orderConfigManager.setOrderExpireMinutes(value)
  }

  const updateUsdtToTrxRate = (value: number) => {
    buttonManager.updateExchangeRate(value)
  }

  const updateInlineKeyboardEnabled = (value: boolean) => {
    orderConfigManager.setInlineKeyboardEnabled(value)
  }

  const updateKeyboardButtonsPerRow = (value: number) => {
    orderConfigManager.setKeyboardButtonsPerRow(value)
  }

  const updateOrderConfirmationTemplate = (value: string) => {
    orderConfigManager.setOrderConfirmationTemplate(value)
  }

  const updateOrderConfirmationTemplateTrx = (value: string) => {
    orderConfigManager.setOrderConfirmationTemplateTrx(value)
  }

  // 主消息配置更新方法
  const updateMainMessageTemplate = (value: string) => {
    templateManager.setMainMessageTemplate(value)
  }

  const updateDailyFee = (value: number) => {
    templateManager.setDailyFee(value)
  }

  const updateReplyMessage = (value: string) => {
    templateManager.setReplyMessage(value)
  }

  const addUsageRule = () => {
    templateManager.addUsageRule()
  }

  const removeUsageRule = (index: number) => {
    templateManager.removeUsageRule(index)
  }

  const addNote = () => {
    templateManager.addNote()
  }

  const removeNote = (index: number) => {
    templateManager.removeNote(index)
  }

  const applyMainTemplate = (templateType: 'default' | 'simple') => {
    templateManager.applyMainTemplate(templateType)
  }

  // 模板应用方法
  const applyOrderTemplate = (templateType: 'basic' | 'detailed' | 'simple' | 'professional' | 'friendly') => {
    const template = templateManager.applyOrderTemplate(templateType)
    orderConfigManager.setOrderConfirmationTemplate(template)
  }

  const applyOrderTemplateTrx = (templateType: 'basic' | 'detailed' | 'simple') => {
    const template = templateManager.applyOrderTemplateTrx(templateType)
    orderConfigManager.setOrderConfirmationTemplateTrx(template)
  }

  // 组件挂载时初始化
  onMounted(() => {
    initializeFromConfig()
  })

  return {
    // 响应式数据
    showReply,
    showOrderReply,
    currentTime,
    userInputAddress,
    imageEnabled,
    imageUrl,
    imageAlt,
    buttons,
    
    // 订单配置字段
    currentUnitPrice,
    currentTotalAmount,
    currentTransactionCount,
    paymentAddress,
    orderExpireMinutes,
    orderConfirmationTemplate,
    orderConfirmationTemplateTrx,
    usdtToTrxRate,
    inlineKeyboardEnabled,
    keyboardButtonsPerRow,
    
    // 主消息配置
    mainMessageTemplate,
    dailyFee,
    replyMessage,
    usageRules,
    notes,
    
    // 计算属性
    regularButtons,
    specialButton,
    specialButtons,
    
    // 核心方法
    handleToggle,
    handleSave,
    initializeFromConfig,
    
    // 按钮操作方法
    simulateButtonClick,
    addButton,
    removeButton,
    applyTemplate,
    
    // 图片操作方法
    toggleImageEnabled,
    handleImageUploadSuccess,
    handleImageUploadError,
    updateImageUrl,
    updateImageAlt,
    
    // 时间更新方法
    updateTime,
    
    // 订单配置更新方法
    updatePaymentAddress,
    updateOrderExpireMinutes,
    updateUsdtToTrxRate,
    updateInlineKeyboardEnabled,
    updateKeyboardButtonsPerRow,
    updateOrderConfirmationTemplate,
    updateOrderConfirmationTemplateTrx,
    
    // 主消息配置更新方法
    updateMainMessageTemplate,
    updateDailyFee,
    updateReplyMessage,
    addUsageRule,
    removeUsageRule,
    addNote,
    removeNote,
    applyMainTemplate,
    
    // 模板应用方法
    applyOrderTemplate,
    applyOrderTemplateTrx
  }
}
