/**
 * 默认配置数据
 */
import type { TransactionPackageConfigData } from '../types/transaction-package.types'

export const DEFAULT_CONFIG: TransactionPackageConfigData = {
  packages: [
    { name: '10笔套餐', transaction_count: 10, price: 11.509, unit_price: 1.1509, currency: 'USDT' },
    { name: '20笔套餐', transaction_count: 20, price: 22.9, unit_price: 1.1450, currency: 'USDT' },
    { name: '50笔套餐', transaction_count: 50, price: 57.0, unit_price: 1.1400, currency: 'USDT' },
    { name: '100笔套餐', transaction_count: 100, price: 113.5, unit_price: 1.1350, currency: 'USDT' },
    { name: '200笔套餐', transaction_count: 200, price: 226.0, unit_price: 1.1300, currency: 'USDT' },
    { name: '300笔套餐', transaction_count: 300, price: 337.5, unit_price: 1.1250, currency: 'USDT' },
    { name: '500笔套餐', transaction_count: 500, price: 560.0, unit_price: 1.1200, currency: 'USDT' }
  ],
  daily_fee: 1,
  order_config: {
    payment_address: 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678',
    expire_minutes: 30,
    confirmation_template: `✅ 订单确认成功

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
订单将于 {expireTime} 过期，请尽快支付！`,
    confirmation_template_trx: `✅ 订单确认成功

📋 已为您生成基于地址 {userAddress} 的个性化订单

💎 套餐详情：
├─ 每笔单价：{unitPrice} TRX
├─ 收款金额：{totalAmount} TRX (点击复制)
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
订单将于 {expireTime} 过期，请尽快支付！`,
    inline_keyboard: {
      enabled: true,
      buttons_per_row: 2,
      buttons: [
        { text: '🔄 切换 TRX 支付', callback_data: 'switch_currency_trx' },
        { text: '❌ 取消订单', callback_data: 'cancel_order' }
      ]
    }
  },
  main_message_template: '🔥 笔数套餐 🔥（无时间限制）',
  reply_message: '请输入能量接收地址:',
  transferable: true,
  proxy_purchase: true
}

/**
 * 快速模板配置
 */
export const BUTTON_TEMPLATES = {
  basic: [
    { id: '1', count: 5, unitPrice: 1.1550, price: 5.775, isSpecial: false },
    { id: '2', count: 10, unitPrice: 1.1509, price: 11.509, isSpecial: false },
    { id: '3', count: 20, unitPrice: 1.1450, price: 22.9, isSpecial: false },
    { id: '4', count: 50, unitPrice: 1.1400, price: 57.0, isSpecial: true }
  ],
  popular: [
    { id: '1', count: 10, unitPrice: 1.1509, price: 11.509, isSpecial: false },
    { id: '2', count: 20, unitPrice: 1.1450, price: 22.9, isSpecial: false },
    { id: '3', count: 50, unitPrice: 1.1400, price: 57.0, isSpecial: false },
    { id: '4', count: 100, unitPrice: 1.1350, price: 113.5, isSpecial: false },
    { id: '5', count: 200, unitPrice: 1.1300, price: 226.0, isSpecial: false },
    { id: '6', count: 300, unitPrice: 1.1250, price: 337.5, isSpecial: false },
    { id: '7', count: 500, unitPrice: 1.1200, price: 560.0, isSpecial: true }
  ],
  enterprise: [
    { id: '1', count: 100, unitPrice: 1.1350, price: 113.5, isSpecial: false },
    { id: '2', count: 200, unitPrice: 1.1300, price: 226.0, isSpecial: false },
    { id: '3', count: 500, unitPrice: 1.1200, price: 560.0, isSpecial: false },
    { id: '4', count: 1000, unitPrice: 1.1150, price: 1115.0, isSpecial: false },
    { id: '5', count: 2000, unitPrice: 1.1100, price: 2220.0, isSpecial: false },
    { id: '6', count: 3000, unitPrice: 1.1050, price: 3315.0, isSpecial: false },
    { id: '7', count: 5000, unitPrice: 1.1000, price: 5500.0, isSpecial: true }
  ]
}

/**
 * 订单确认模板
 */
export const ORDER_TEMPLATES = {
  basic: `✅ 订单确认

📋 订单信息：
• 每笔单价：{unitPrice} USDT
• 收款金额：{totalAmount} USDT
• 使用笔数：{transactionCount} 笔转账

🎯 能量接收地址：{userAddress}
💰 支付地址：{paymentAddress}

⚠️ 请务必核对金额尾数，确保支付准确！
⏰ 订单将于 {expireTime} 过期`,

  detailed: `✅ 订单确认成功

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
订单将于 {expireTime} 过期，请尽快支付！`,

  simple: `订单确认 ✅

单价：{unitPrice} USDT
金额：{totalAmount} USDT
笔数：{transactionCount} 笔

接收地址：{userAddress}
支付地址：{paymentAddress}

请核对金额后支付
过期时间：{expireTime}`,

  professional: `🔔 TRON能量代理订单确认

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

📞 如有疑问，请联系客服`,

  friendly: `🎉 太好了！您的订单已生成

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
}

/**
 * TRX订单确认模板
 */
export const TRX_ORDER_TEMPLATES = {
  basic: `✅ 订单确认

💎 套餐详情：
├─ 每笔单价：{unitPrice} TRX
├─ 收款金额：{totalAmount} TRX
└─ 使用笔数：{transactionCount} 笔转账

🎯 能量接收地址：{userAddress}

💰 支付地址：{paymentAddress}

订单将于 {expireTime} 过期，请尽快支付！`,

  detailed: `✅ 订单确认成功

📋 已为您生成基于地址 {userAddress} 的个性化订单

💎 套餐详情：
├─ 每笔单价：{unitPrice} TRX
├─ 收款金额：{totalAmount} TRX (点击复制)
└─ 使用笔数：{transactionCount} 笔转账

🎯 能量接收地址：
{userAddress}
↑ 这是您刚才输入的能量接收地址

💰 支付地址：
{paymentAddress}
(点击地址可自动复制到剪贴板)

‼️ 重要提醒：
请务必核对金额尾数，金额不对则无法确认

⏰ 付款提醒：
订单将于 {expireTime} 过期，请尽快支付！`,

  simple: `✅ 订单确认

🪙 {transactionCount}笔套餐 - {unitPrice} TRX/笔
💰 总计：{totalAmount} TRX
📍 接收地址：{userAddress}
💳 支付地址：{paymentAddress}
⏰ 过期时间：{expireTime}`
}

/**
 * 主消息模板
 */
export const MAIN_MESSAGE_TEMPLATES = {
  default: '🔥 笔数套餐 🔥（无时间限制）',
  simple: '💰 笔数套餐 - 简单直接'
}
