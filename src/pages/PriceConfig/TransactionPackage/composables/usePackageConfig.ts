import { computed, ref } from 'vue'
import type { ConfigCardProps } from '../../types'
import type {
  Button,
  OrderConfig,
  PackageButton,
  TransactionPackageConfigData
} from '../types/transaction-package.types'

// 重新导出Button类型以保持向后兼容
export type { Button } from '../types/transaction-package.types'

export function usePackageConfig(props: ConfigCardProps) {
  // 响应式数据
  const showReply = ref(false)
  const showOrderReply = ref(false)
  const currentTime = ref('')
  const userInputAddress = ref('')
  const imageEnabled = ref(false)
  const imageUrl = ref('')
  const imageAlt = ref('')
  
  
  // 订单配置信息（静态配置）
  const paymentAddress = ref('TWdcgk9NEsV1nt5yPrNfSYktbA12345678')  // 支付地址
  const orderExpireMinutes = ref(30)  // 订单过期时间（分钟）
  
  // 主消息配置
  const mainMessageTemplate = ref('')  // 主消息模板
  const dailyFee = ref(1)  // 每日费用
  const replyMessage = ref('')  // 回复消息
  const usageRules = ref<string[]>([])  // 使用规则
  const notes = ref<string[]>([])  // 注意事项
  
  // 订单确认文案模板
  const orderConfirmationTemplate = ref(`✅ 订单确认

📋 已为您生成基于地址 {userAddress} 的个性化订单

每笔单价：{unitPrice} USDT
收款金额：{totalAmount} USDT (点击复制)
使用笔数：{transactionCount} 笔转账

能量接收地址：
{userAddress}
↑ 这是用户刚才输入的地址

支付地址：
{paymentAddress}
(点击地址自动复制)

‼️请务必核对金额尾数，金额不对则无法确认
‼️请务必核对金额尾数，金额不对则无法确认
‼️请务必核对金额尾数，金额不对则无法确认

订单将于 {expireTime} 过期，请尽快支付！`)
  
  // 动态计算的订单信息（根据用户选择的套餐）
  const selectedButton = ref<Button | null>(null)
  
  // 计算属性：根据选择的按钮动态计算
  const currentUnitPrice = computed(() => selectedButton.value?.unitPrice || 1.1438)
  const currentTransactionCount = computed(() => selectedButton.value?.count || 10)
  const currentTotalAmount = computed(() => {
    if (selectedButton.value) {
      return selectedButton.value.count * selectedButton.value.unitPrice
    }
    return 11.504
  })

  // 初始化默认配置
  const initializeConfig = () => {
    if (props.config) {
      // 确保 config 对象存在
      if (!props.config.config) {
        props.config.config = {}
      }
      

      // 确保订单配置存在
      if (!props.config.config.order_config) {
        props.config.config.order_config = {
          delegate_address: 'TL5afFHPzESaGrvG8JKAwrNx6drbDZf9it',
          payment_address: 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678',
          expire_minutes: 30
        }
      }
    }
  }

  // 初始化方法，从props.config中加载数据
  const initializeFromConfig = () => {
    
    if (props.config) {
      // 先初始化配置确保默认值存在
      initializeConfig()
      
      // 加载图片配置
      imageEnabled.value = props.config.enable_image || false
      imageUrl.value = props.config.image_url || ''
      imageAlt.value = props.config.image_alt || ''
      
      // 加载其他配置（如果存在）
      if (props.config.config) {
        
        // 加载套餐数据
        if (props.config.config.packages && Array.isArray(props.config.config.packages)) {
          buttons.value = props.config.config.packages.map((pkg: any, index: number) => {
            // 安全地获取数值，防止 NaN
            const transactionCount = Number(pkg.transaction_count) || 10
            const savedUnitPrice = Number(pkg.unit_price)
            const savedPrice = Number(pkg.price)
            
            // 计算单价：优先使用保存的单价，否则从总价计算，最后使用默认值
            let unitPrice = 1.1500 // 默认值
            if (!isNaN(savedUnitPrice) && savedUnitPrice > 0) {
              unitPrice = savedUnitPrice
            } else if (!isNaN(savedPrice) && savedPrice > 0 && transactionCount > 0) {
              unitPrice = savedPrice / transactionCount
            }
            
            // 计算总价：优先使用计算值确保一致性
            const price = transactionCount * unitPrice
            
            return {
              id: (index + 1).toString(),
              count: transactionCount,
              unitPrice: unitPrice,
              price: price,
              isSpecial: index === props.config.config.packages.length - 1
            }
          })
        }
        

        // 加载订单配置
        if (props.config.config.order_config) {
          paymentAddress.value = props.config.config.order_config.payment_address || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678'
          orderExpireMinutes.value = props.config.config.order_config.expire_minutes || 30
          if (props.config.config.order_config.confirmation_template) {
            orderConfirmationTemplate.value = props.config.config.order_config.confirmation_template
          }
        }
      }
    }
  }

  // 根据真实截图配置7个按钮：10笔、20笔、50笔、100笔、200笔、300笔、500笔（最后一个全宽）
  // 递减价格策略：10笔起始价1.1509，随笔数增加单价递减
  const buttons = ref<Button[]>([
    { id: '1', count: 10, unitPrice: 1.1509, price: 11.509, isSpecial: false },
    { id: '2', count: 20, unitPrice: 1.1450, price: 22.9, isSpecial: false },
    { id: '3', count: 50, unitPrice: 1.1400, price: 57.0, isSpecial: false },
    { id: '4', count: 100, unitPrice: 1.1350, price: 113.5, isSpecial: false },
    { id: '5', count: 200, unitPrice: 1.1300, price: 226.0, isSpecial: false },
    { id: '6', count: 300, unitPrice: 1.1250, price: 337.5, isSpecial: false },
    { id: '7', count: 500, unitPrice: 1.1200, price: 560.0, isSpecial: true }
  ])

  // 计算属性
  const regularButtons = computed(() => buttons.value.filter(b => !b.isSpecial))
  const specialButton = computed(() => buttons.value.find(b => b.isSpecial))
  const specialButtons = computed(() => buttons.value.filter(b => b.isSpecial))

  // 业务方法
  const handleToggle = () => {
    props.onToggle('transaction_package')
  }

  const handleSave = () => {
    // 构建标准配置数据，只保存必要字段
    if (props.config) {
      // 构建标准的套餐配置数据
      const packages: PackageButton[] = buttons.value.map(button => ({
        name: `${button.count}笔套餐`,
        transaction_count: button.count,
        price: button.count * button.unitPrice, // 使用计算得到的准确价格
        unit_price: button.unitPrice, // 保存单价信息
        currency: 'TRX'
      }))

      // 构建标准的订单配置
      const orderConfig: OrderConfig = {
        payment_address: paymentAddress.value,
        expire_minutes: orderExpireMinutes.value,
        confirmation_template: orderConfirmationTemplate.value
      }

      // 构建标准的笔数套餐配置数据，只保存页面有配置界面的字段
      const standardConfig: TransactionPackageConfigData = {
        packages,
        daily_fee: 1, // 将从主消息配置中更新
        order_config: orderConfig,
        main_message_template: props.config.config?.main_message_template || '',
        reply_message: props.config.config?.reply_message || '请输入能量接收地址:',
        transferable: true,
        proxy_purchase: true
      }

      // 安全替换配置，只保留标准字段
      props.config.config = standardConfig
      
      // 更新图片配置
      props.config.enable_image = imageEnabled.value
      props.config.image_url = imageUrl.value || null
      props.config.image_alt = imageAlt.value || null
      
      // 构建标准的内嵌键盘配置
      props.config.inline_keyboard_config = {
        enabled: true,
        keyboard_type: 'transaction_count_selection',
        title: `🔥 笔数套餐 🔥（无时间限制）`,
        description: `选择您需要的交易笔数`,
        buttons_per_row: 2,
        buttons: buttons.value.map(button => ({
          id: button.id,
          text: `${button.count}笔`,
          callback_data: `transaction_package_${button.count}`,
          transaction_count: button.count,
          price: button.price,
          description: `${button.count}笔套餐`
        })),
        next_message: '请输入能量接收地址:',
        validation: {
          address_required: true,
          min_transaction_count: 1,
          max_transaction_count: 1000
        }
      }
    }
    
    props.onSave('transaction_package')
  }

  const simulateButtonClick = (button: Button) => {
    // 重置状态
    showReply.value = false
    showOrderReply.value = false
    userInputAddress.value = ''
    
    // 设置当前选择的按钮（这样会自动计算价格等信息）
    selectedButton.value = button
    
    // 第一步：显示"请输入能量接收地址"
    setTimeout(() => {
      showReply.value = true
    }, 300)
    
    // 第二步：1.5秒后设置用户输入的地址
    setTimeout(() => {
      userInputAddress.value = 'TL5afFHPzESaGrvG8JKAwrNx6drbDZf9it'
    }, 1500)
    
    // 第三步：3秒后显示完整订单信息
    setTimeout(() => {
      showOrderReply.value = true
    }, 3000)
    
    // 保持展开状态，不自动重置
    // 用户可以手动点击其他按钮来重新演示
  }

  const addButton = () => {
    const newId = Date.now().toString()
    buttons.value.push({
      id: newId,
      count: 10,
      unitPrice: 1.1438,
      price: 200,
      isSpecial: false
    })
  }

  const removeButton = (index: number) => {
    buttons.value.splice(index, 1)
  }

  const applyTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic':
        buttons.value = [
          { id: '1', count: 5, unitPrice: 1.1550, price: 5.775, isSpecial: false },
          { id: '2', count: 10, unitPrice: 1.1509, price: 11.509, isSpecial: false },
          { id: '3', count: 20, unitPrice: 1.1450, price: 22.9, isSpecial: false },
          { id: '4', count: 50, unitPrice: 1.1400, price: 57.0, isSpecial: true }
        ]
        break
      case 'popular':
        buttons.value = [
          { id: '1', count: 10, unitPrice: 1.1509, price: 11.509, isSpecial: false },
          { id: '2', count: 20, unitPrice: 1.1450, price: 22.9, isSpecial: false },
          { id: '3', count: 50, unitPrice: 1.1400, price: 57.0, isSpecial: false },
          { id: '4', count: 100, unitPrice: 1.1350, price: 113.5, isSpecial: false },
          { id: '5', count: 200, unitPrice: 1.1300, price: 226.0, isSpecial: false },
          { id: '6', count: 300, unitPrice: 1.1250, price: 337.5, isSpecial: false },
          { id: '7', count: 500, unitPrice: 1.1200, price: 560.0, isSpecial: true }
        ]
        break
      case 'enterprise':
        buttons.value = [
          { id: '1', count: 100, unitPrice: 1.1350, price: 113.5, isSpecial: false },
          { id: '2', count: 200, unitPrice: 1.1300, price: 226.0, isSpecial: false },
          { id: '3', count: 500, unitPrice: 1.1200, price: 560.0, isSpecial: false },
          { id: '4', count: 1000, unitPrice: 1.1150, price: 1115.0, isSpecial: false },
          { id: '5', count: 2000, unitPrice: 1.1100, price: 2220.0, isSpecial: false },
          { id: '6', count: 3000, unitPrice: 1.1050, price: 3315.0, isSpecial: false },
          { id: '7', count: 5000, unitPrice: 1.1000, price: 5500.0, isSpecial: true }
        ]
        break
    }
  }

  const toggleImageEnabled = () => {
    imageEnabled.value = !imageEnabled.value
    if (!imageEnabled.value) {
      imageUrl.value = ''
      imageAlt.value = ''
    }
  }

  // 图片上传成功处理
  const handleImageUploadSuccess = (data: any) => {
    console.log('图片上传成功:', data)
    imageUrl.value = data.url || data
  }

  // 图片上传错误处理
  const handleImageUploadError = (error: string) => {
    console.error('图片上传失败:', error)
  }

  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // 更新函数


  const updateImageUrl = (value: string) => {
    imageUrl.value = value
  }

  const updateImageAlt = (value: string) => {
    imageAlt.value = value
  }


  // 订单配置更新函数
  const updatePaymentAddress = (value: string) => {
    paymentAddress.value = value
  }

  const updateOrderExpireMinutes = (value: number) => {
    orderExpireMinutes.value = value
  }

  const updateOrderConfirmationTemplate = (value: string) => {
    orderConfirmationTemplate.value = value
  }
  
  // 主消息配置更新函数
  const updateMainMessageTemplate = (value: string) => {
    mainMessageTemplate.value = value
  }
  
  const updateDailyFee = (value: number) => {
    dailyFee.value = value
  }
  
  const updateReplyMessage = (value: string) => {
    replyMessage.value = value
  }
  
  const addUsageRule = () => {
    usageRules.value.push('')
  }
  
  const removeUsageRule = (index: number) => {
    usageRules.value.splice(index, 1)
  }
  
  const addNote = () => {
    notes.value.push('')
  }
  
  const removeNote = (index: number) => {
    notes.value.splice(index, 1)
  }
  
  const applyMainTemplate = (templateType: string) => {
    // 应用主消息模板的逻辑
    switch (templateType) {
      case 'default':
        mainMessageTemplate.value = '🔥 笔数套餐 🔥（无时间限制）'
        break
      case 'simple':
        mainMessageTemplate.value = '💰 笔数套餐 - 简单直接'
        break
      default:
        break
    }
  }


  // 订单确认模板快速模板
  const applyOrderTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic':
        orderConfirmationTemplate.value = `✅ 订单确认

📋 订单信息：
• 每笔单价：{unitPrice} USDT
• 收款金额：{totalAmount} USDT
• 使用笔数：{transactionCount} 笔转账

🎯 能量接收地址：{userAddress}
💰 支付地址：{paymentAddress}

⚠️ 请务必核对金额尾数，确保支付准确！
⏰ 订单将于 {expireTime} 过期`
        break
      
      case 'detailed':
        orderConfirmationTemplate.value = `✅ 订单确认成功

📋 已为您生成基于地址 {userAddress} 的个性化订单

💎 套餐详情：
├─ 每笔单价：{unitPrice} USDT
├─ 收款金额：{totalAmount} USDT (点击复制)
└─ 使用笔数：{transactionCount} 笔转账

🎯 能量接收地址：
{userAddress}
↑ 这是您刚才输入的能量接收地址

💰 支付地址：
{paymentAddress}
(点击地址可自动复制到剪贴板)

‼️ 重要提醒：
请务必核对金额尾数，金额不对则无法确认
请务必核对金额尾数，金额不对则无法确认
请务必核对金额尾数，金额不对则无法确认

⏰ 付款提醒：
订单将于 {expireTime} 过期，请尽快支付！`
        break

      case 'simple':
        orderConfirmationTemplate.value = `订单确认 ✅

单价：{unitPrice} USDT
金额：{totalAmount} USDT
笔数：{transactionCount} 笔

接收地址：{userAddress}
支付地址：{paymentAddress}

请核对金额后支付
过期时间：{expireTime}`
        break

      case 'professional':
        orderConfirmationTemplate.value = `🔔 TRON能量代理订单确认

订单编号：#{transactionCount}-{unitPrice}
生成时间：{expireTime}

📊 交易详情：
━━━━━━━━━━━━━━━━━━━━
单笔价格：{unitPrice} USDT
交易笔数：{transactionCount} 笔
应付总额：{totalAmount} USDT
━━━━━━━━━━━━━━━━━━━━

🎯 服务地址：{userAddress}
💳 支付地址：{paymentAddress}

⚠️ 风险提示：
1. 请仔细核对付款金额的小数位
2. 金额错误将导致订单处理失败
3. 本订单具有时效性，请及时付款

📞 如有疑问，请联系客服`
        break

      case 'friendly':
        orderConfirmationTemplate.value = `🎉 太好了！您的订单已生成

亲爱的用户，我们已经为您的地址 {userAddress} 准备好了专属的能量套餐！

🛍️ 您购买的套餐：
• 超值价格：每笔只需 {unitPrice} USDT
• 交易次数：{transactionCount} 笔畅享
• 总计费用：{totalAmount} USDT

💝 温馨提示：
支付地址：{paymentAddress}
记得要精确到小数点后4位哦！💰

⏰ 温馨提醒：
您的订单将在 {expireTime} 过期
为了不影响使用，请尽快完成支付 😊

祝您使用愉快！🌟`
        break
    }
  }



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
    
    
    // 计算属性
    regularButtons,
    specialButton,
    specialButtons,
    
    // 方法
    handleToggle,
    handleSave,
    simulateButtonClick,
    addButton,
    removeButton,
    applyTemplate,
    toggleImageEnabled,
    handleImageUploadSuccess,
    handleImageUploadError,
    updateTime,
    initializeFromConfig,
    updateImageUrl,
    updateImageAlt,
    
    // 主消息配置
    mainMessageTemplate,
    dailyFee,
    replyMessage,
    usageRules,
    notes,
    
    // 主消息配置更新函数
    updateMainMessageTemplate,
    updateDailyFee,
    updateReplyMessage,
    addUsageRule,
    removeUsageRule,
    addNote,
    removeNote,
    applyMainTemplate,
    
    // 订单配置更新函数
    updatePaymentAddress,
    updateOrderExpireMinutes,
    updateOrderConfirmationTemplate,
    applyOrderTemplate,
    
  }
}
