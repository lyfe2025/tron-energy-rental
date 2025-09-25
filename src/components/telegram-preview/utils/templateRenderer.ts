/**
 * 模板渲染工具
 * 从TelegramPreview.vue中分离出的模板渲染逻辑
 */

export interface OrderConfirmationProps {
  currentUnitPrice?: number
  currentTotalAmount?: number
  currentTransactionCount?: number
  paymentAddress?: string
  orderExpireMinutes?: number
  orderConfirmationTemplate?: string
  orderConfirmationTemplateTrx?: string
  userInputAddress?: string
}

export class TemplateRenderer {
  /**
   * 计算过期时间
   */
  static calculateExpireTime(orderExpireMinutes?: number): string {
    if (!orderExpireMinutes) return '未设置'
    
    const now = new Date()
    const expireTime = new Date(now.getTime() + orderExpireMinutes * 60 * 1000)
    return expireTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * 格式化订单确认模板，替换所有占位符
   */
  static formatOrderConfirmation(props: OrderConfirmationProps, currentPaymentMode: 'USDT' | 'TRX'): string {
    const defaultUsdtTemplate = `✅ 订单确认

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

订单将于 {expireTime} 过期，请尽快支付！`

    const defaultTrxTemplate = `✅ 订单确认

📋 已为您生成基于地址 {userAddress} 的个性化订单

每笔单价：{unitPrice} TRX
收款金额：{totalAmount} TRX (点击复制)
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

订单将于 {expireTime} 过期，请尽快支付！`

    // 根据当前支付方式选择模板
    let template: string
    let unitPrice: number
    let totalAmount: number
    
    if (currentPaymentMode === 'TRX') {
      template = props.orderConfirmationTemplateTrx || defaultTrxTemplate
      // TRX价格 (假设汇率3.02)
      const rate = 3.02
      unitPrice = (props.currentUnitPrice || 1.1509) * rate
      totalAmount = (props.currentTotalAmount || 11.509) * rate
    } else {
      template = props.orderConfirmationTemplate || defaultUsdtTemplate
      unitPrice = props.currentUnitPrice || 1.1509
      totalAmount = props.currentTotalAmount || 11.509
    }
    
    const expireTime = TemplateRenderer.calculateExpireTime(props.orderExpireMinutes)
    
    return template
      .replace(/{unitPrice}/g, unitPrice.toFixed(4))
      .replace(/{totalAmount}/g, totalAmount.toFixed(4))
      .replace(/{transactionCount}/g, (props.currentTransactionCount || 10).toString())
      .replace(/{userAddress}/g, props.userInputAddress || '用户输入的地址')
      .replace(/{paymentAddress}/g, props.paymentAddress || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678')
      .replace(/{expireTime}/g, expireTime)
  }

  /**
   * 格式化订单确认模板为HTML，支付地址和金额可点击
   */
  static formatOrderConfirmationHTML(
    props: OrderConfirmationProps, 
    currentPaymentMode: 'USDT' | 'TRX'
  ): string {
    const textContent = TemplateRenderer.formatOrderConfirmation(props, currentPaymentMode)
    const paymentAddress = props.paymentAddress || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678'
    
    // 根据当前支付方式计算总金额
    let totalAmount: number
    if (currentPaymentMode === 'TRX') {
      const rate = 3.02
      totalAmount = (props.currentTotalAmount || 11.509) * rate
    } else {
      totalAmount = props.currentTotalAmount || 11.509
    }
    const totalAmountString = totalAmount.toFixed(4)
    
    // 将支付地址替换为可点击的HTML元素
    const clickableAddress = `<span class="font-mono text-blue-600 break-all cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors border-b border-dashed border-blue-300" onclick="window.copyTransactionPackageAddress('${paymentAddress}')" title="点击复制地址: ${paymentAddress}">${paymentAddress}</span>`
    
    // 将总金额替换为可点击的HTML元素  
    const clickableAmount = `<span class="font-mono text-orange-600 cursor-pointer hover:bg-orange-50 px-1 py-0.5 rounded transition-colors border-b border-dashed border-orange-300" onclick="window.copyTransactionPackageAmount('${totalAmountString}')" title="点击复制金额: ${totalAmountString}">${totalAmountString}</span>`
    
    // 使用正则表达式进行全局替换，确保精确匹配
    let result = textContent.replace(new RegExp(TemplateRenderer.escapeRegExp(paymentAddress), 'g'), clickableAddress)
    result = result.replace(new RegExp(TemplateRenderer.escapeRegExp(totalAmountString), 'g'), clickableAmount)
    
    return result
  }

  /**
   * 转义正则表达式特殊字符
   */
  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
