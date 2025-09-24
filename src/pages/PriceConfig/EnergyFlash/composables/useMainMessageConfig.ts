/**
 * 能量闪租主消息配置管理逻辑
 */
import { computed, ref } from 'vue'
import type { EnergyFlashConfig } from '../types/energy-flash.types'

export function useMainMessageConfig(config: EnergyFlashConfig | null) {
  // 主消息模板
  const mainMessageTemplate = ref(`⚡ TRON能量闪租服务

快速获取能量，即买即用！

💰 价格：{price} TRX/笔
⏰ 有效期：{hours} 小时
📊 最大笔数：{maxTransactions} 笔

使用说明：
• 按单价计算笔数（{price} TRX = 1 笔）
• 有效期内随时使用
• 支持多次转账，余额不清零
• 24小时全自动发放

注意事项：
• 请确保地址准确无误
• 仅适用于TRC20转账
• 不支持TRX主币转账
• 有问题及时联系客服

💳 支付地址：{paymentAddress}`)

  // 配置项
  const singlePrice = ref(0.1)
  const expiryHours = ref(24)
  const maxTransactions = ref(5)
  const paymentAddress = ref('')

  // 初始化配置
  const initializeFromConfig = () => {
    if (config?.config) {
      singlePrice.value = config.config.single_price || 0.1
      expiryHours.value = config.config.expiry_hours || 24
      maxTransactions.value = config.config.max_transactions || 5
      paymentAddress.value = config.config.payment_address || ''
      
      // 加载主消息模板
      if (config.config.main_message_template) {
        mainMessageTemplate.value = config.config.main_message_template
      }
    }
  }

  // 保存配置 - 构建标准的能量闪租配置
  const saveConfig = () => {
    if (config?.config) {
      // 构建标准的能量闪租配置数据，只保存页面有配置界面的字段
      const standardConfig = {
        single_price: singlePrice.value,
        max_transactions: maxTransactions.value,
        expiry_hours: expiryHours.value,
        payment_address: paymentAddress.value,
        main_message_template: mainMessageTemplate.value
      }
      
      // 安全替换配置，只保留页面定义的字段
      config.config = standardConfig
    }
  }

  // 快速模板应用
  const applyMainTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic':
        mainMessageTemplate.value = `⚡ TRON能量闪租服务

快速获取能量，即买即用！

💰 价格：{price} TRX/笔
⏰ 有效期：{hours} 小时
📊 最大：{maxTransactions} 笔

💎 转账示例：
🔸转账 {price} TRX = 1 笔能量
🔸转账 {price*2} TRX = 2 笔能量
🔸转账 {price*3} TRX = 3 笔能量
单笔 {price} TRX，以此类推，最大 {maxTransactions} 笔

使用说明：
• 按单价计算笔数（{price} TRX = 1 笔）
• 有效期内随时使用
• 支持多次转账，余额不清零
• 24小时全自动发放

注意事项：
• 请确保地址准确无误
• 仅适用于TRC20转账
• 不支持TRX主币转账
• 向无U地址转账，需要双倍能量
• 请在{hours}小时内转账，否则过期回收
• 有问题及时联系客服

💳 支付地址：{paymentAddress}`
        break
        
      case 'detailed':
        mainMessageTemplate.value = `⚡ TRON区块链能量闪租服务 ⚡

━━━━━━━━━━━━━━━━━━━━
📋 服务详情
━━━━━━━━━━━━━━━━━━━━
💰 单笔价格：{price} TRX
⏰ 租赁时长：{hours} 小时
📊 最大笔数：{maxTransactions} 笔
🎯 即买即用，快速到账

━━━━━━━━━━━━━━━━━━━━
💎 价格对照表
━━━━━━━━━━━━━━━━━━━━
🔸转账 {price} TRX = 1 笔能量
🔸转账 {price*2} TRX = 2 笔能量
🔸转账 {price*3} TRX = 3 笔能量
🔸转账 {price*5} TRX = 5 笔能量
单笔 {price} TRX，以此类推，最大 {maxTransactions} 笔

━━━━━━━━━━━━━━━━━━━━
📖 使用说明  
━━━━━━━━━━━━━━━━━━━━
• ✅ 按单价计算笔数（{price} TRX = 1 笔）
• ⏰ 有效期{hours}小时内随时使用
• 🔄 支持多次转账，余额不清零
• 🤖 24小时全自动发放，无需等待
• 💎 专业团队保障，安全可靠

━━━━━━━━━━━━━━━━━━━━
⚠️ 注意事项
━━━━━━━━━━━━━━━━━━━━
• 🎯 请务必确保接收地址准确无误
• 🚫 仅适用于TRC20代币转账
• ❌ 不支持TRX主币转账操作
• ⚡ 向无U地址转账，需要双倍能量
• ⏰ 请在{hours}小时内转账，否则过期回收
• 📞 遇到问题请及时联系专业客服

💳 支付地址：{paymentAddress}
📋 点击地址可自动复制到剪贴板`
        break
        
      case 'simple':
        mainMessageTemplate.value = `⚡ 能量闪租

{price} TRX/笔，{hours}小时有效，最大{maxTransactions}笔

💎 转账示例：
🔸{price} TRX = 1 笔能量
🔸{price*2} TRX = 2 笔能量
🔸{price*3} TRX = 3 笔能量

说明：
• 按单价计算笔数（{price} TRX = 1 笔）
• 多次转账余额累计
• 24小时自动发放

注意：
• 地址准确无误
• 仅支持TRC20转账
• 不支持TRX主币转账
• 向无U地址转账，需要双倍能量
• 请在{hours}小时内转账，否则过期回收
• 有问题联系客服

支付：{paymentAddress}`
        break
        
      case 'professional':
        mainMessageTemplate.value = `🏢 TRON能量租赁服务（企业级）

【服务规格】
单价：{price} TRX/笔
时效：{hours} 小时
最大：{maxTransactions} 笔

【费率标准】
转账 {price} TRX = 1 笔能量
转账 {price*2} TRX = 2 笔能量
转账 {price*5} TRX = 5 笔能量
计算标准：单笔 {price} TRX，最大支持 {maxTransactions} 笔

【服务条款】
• 执行标准：按单价计算能量笔数（{price} TRX = 1 笔）
• 使用期限：购买后{hours}小时内有效
• 支付方式：支持多次转账，余额累计不清零
• 技术保障：24小时自动化系统，无人工干预

【风险提示】
• 地址验证：请确保能量接收地址准确性
• 适用范围：仅支持TRC20代币转账操作
• 技术限制：不支持TRX主币转账功能
• 特殊情况：向无USDT地址转账，消耗双倍能量资源
• 时效约束：请在{hours}小时内完成转账，否则资源自动回收
• 客服支持：如遇技术问题请联系专业团队

【支付信息】
支付地址：{paymentAddress}
风险声明：使用本服务即表示同意相关条款`
        break
        
      case 'friendly':
        mainMessageTemplate.value = `⚡ 能量闪租小助手 ⚡

嗨！欢迎使用TRON能量闪租服务 😊

💰 价格很实惠：{price} TRX一笔
⏰ 时间很充足：{hours} 小时有效
📊 最多可买：{maxTransactions} 笔

💎 价格示例（超好理解）：
🔸转 {price} TRX = 得到 1 笔能量 ⚡
🔸转 {price*2} TRX = 得到 2 笔能量 ⚡⚡
🔸转 {price*3} TRX = 得到 3 笔能量 ⚡⚡⚡
每笔都是 {price} TRX，最多买 {maxTransactions} 笔哦 💫

✨ 贴心提示：
• 按固定单价计算笔数，{price} TRX = 1 笔 ⚡
• {hours}小时内想用就用，很方便 🎉
• 可以多次转账哦，余额不会清零 💎
• 24小时自动发放，不用等人工 🤖

🌟 温馨提醒：
• 地址一定要填对哦，错了找不回来 😅
• 只能转TRC20代币，不支持TRX主币转账哦 🚫
• 如果对方钱包没有USDT，会用掉双倍能量哦 ⚡⚡
• 记得在{hours}小时内转账，过期就收回啦 ⏰
• 有任何问题都可以找客服小姐姐 💬
• 我们的服务很专业，放心使用 ✨

💳 支付地址：{paymentAddress}
点击可以直接复制地址哦 📋`
        break
    }
  }

  // 格式化主消息
  const formatMainMessage = computed(() => {
    let formattedMessage = mainMessageTemplate.value
    
    // 首先处理价格计算表达式，如 {price*2}, {price*3}, {price*5}
    formattedMessage = formattedMessage.replace(/{price\*(\d+)}/g, (match, multiplier) => {
      const result = singlePrice.value * parseInt(multiplier)
      // 修复浮点数精度问题，保留合理的小数位数
      return Number(result.toFixed(8)).toString()
    })
    
    // 然后处理其他变量
    formattedMessage = formattedMessage
      .replace(/{price}/g, Number(singlePrice.value.toFixed(8)).toString())
      .replace(/{hours}/g, expiryHours.value.toString())
      .replace(/{maxTransactions}/g, maxTransactions.value.toString())
      .replace(/{paymentAddress}/g, paymentAddress.value)
    
    return formattedMessage
  })

  // 更新函数
  const updateSinglePrice = (value: number) => {
    singlePrice.value = value
  }

  const updateExpiryHours = (value: number) => {
    expiryHours.value = Math.floor(value) || 1
  }

  const updateMaxTransactions = (value: number) => {
    maxTransactions.value = Math.floor(value) || 5
  }


  const updatePaymentAddress = (value: string) => {
    paymentAddress.value = value
  }

  const updateMainMessageTemplate = (value: string) => {
    mainMessageTemplate.value = value
  }

  return {
    // 状态
    mainMessageTemplate,
    singlePrice,
    expiryHours,
    maxTransactions,
    paymentAddress,
    
    // 计算属性
    formatMainMessage,
    
    // 方法
    initializeFromConfig,
    saveConfig: saveConfig as () => void,
    applyMainTemplate,
    updateSinglePrice,
    updateExpiryHours,
    updateMaxTransactions,
    updatePaymentAddress,
    updateMainMessageTemplate
  }
}
