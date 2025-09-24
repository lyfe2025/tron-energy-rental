/**
 * TRX闪兑主消息配置管理逻辑
 */
import { computed, ref } from 'vue'
import type { TrxExchangeConfig } from '../types/trx-exchange.types'

export function useMainMessageConfig(config: TrxExchangeConfig | null) {
  // 主消息模板
  const mainMessageTemplate = ref(`💱 USDT自动兑换TRX服务

快速兑换，实时到账！

💰 汇率：
• USDT → TRX：{usdtToTrxRate}
• TRX → USDT：{trxToUsdtRate}

💵 兑换限额：
• 最小金额：{minAmount} USDT
• 最大金额：{maxAmount} USDT

服务说明：
• 7×24小时自动兑换
• 实时汇率，公平透明
• 秒级到账，无需等待
• 专业团队，安全保障

操作流程：
• 发送USDT到指定地址
• 系统自动计算TRX数量
• 立即转账到您的钱包
• 全程无需人工干预

注意事项：
• 请确保地址准确无误
• 汇率可能实时波动
• 有问题及时联系客服
• 支持24小时客服服务

💳 支付地址：{paymentAddress}`)

  // 配置项
  const usdtToTrxRate = ref(6.5)
  const trxToUsdtRate = ref(0.153)
  const minAmount = ref(1.0)
  const maxAmount = ref(10000)
  const paymentAddress = ref('')

  // 初始化配置
  const initializeFromConfig = () => {
    if (config?.config) {
      usdtToTrxRate.value = config.config.usdt_to_trx_rate || 6.5
      trxToUsdtRate.value = config.config.trx_to_usdt_rate || 0.153
      minAmount.value = config.config.min_amount || 1.0
      maxAmount.value = config.config.max_amount || 10000
      paymentAddress.value = config.config.payment_address || ''
      
      // 加载主消息模板
      if (config.config.main_message_template) {
        mainMessageTemplate.value = config.config.main_message_template
      }
    }
  }

  // 保存配置
  const saveConfig = () => {
    if (config?.config) {
      // 构建标准的TRX闪兑配置数据，只保存页面有配置界面的字段
      const standardConfig = {
        usdt_to_trx_rate: usdtToTrxRate.value,
        trx_to_usdt_rate: trxToUsdtRate.value,
        min_amount: minAmount.value,
        max_amount: maxAmount.value,
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
        mainMessageTemplate.value = `💱 USDT闪兑TRX服务

根据支付金额自动兑换！

💰 当前汇率：
• USDT → TRX：{usdtToTrxRate}
• TRX → USDT：{trxToUsdtRate}

💵 兑换限额：
• 最小金额：{minAmount} USDT
• 最大金额：{maxAmount} USDT

使用说明：
• 直接发送USDT到支付地址
• 系统自动按汇率计算TRX
• 秒级到账，无需等待确认
• 24小时全自动处理

注意事项：
• 请确保转账地址准确无误
• 汇率可能根据市场实时波动
• 转账金额需在限额范围内
• 遇到问题请及时联系客服
• 建议小额测试后再大额兑换

💳 支付地址：{paymentAddress}
（点击地址可自动复制）`
        break
        
      case 'detailed':
        mainMessageTemplate.value = `💎 TRON区块链USDT闪兑服务 💎

━━━━━━━━━━━━━━━━━━━━
💰 实时汇率信息
━━━━━━━━━━━━━━━━━━━━
• USDT → TRX：{usdtToTrxRate}
• TRX → USDT：{trxToUsdtRate}
• 汇率实时更新，公开透明

━━━━━━━━━━━━━━━━━━━━
💵 兑换额度设置
━━━━━━━━━━━━━━━━━━━━
• 起兑金额：{minAmount} USDT
• 单笔上限：{maxAmount} USDT
• 根据支付金额自动兑换

━━━━━━━━━━━━━━━━━━━━
⚡ 服务特色优势
━━━━━━━━━━━━━━━━━━━━
• 🕐 7×24小时全天候自动服务
• 📊 市场实时汇率，公平透明
• ⚡ 支付即兑换，秒级到账
• 🛡️ 专业团队技术保障
• 🤖 全自动化，无需人工

━━━━━━━━━━━━━━━━━━━━
📋 使用流程说明
━━━━━━━━━━━━━━━━━━━━
• 1️⃣ 直接发送USDT到支付地址
• 2️⃣ 系统自动识别支付金额
• 3️⃣ 按当前汇率计算TRX数量
• 4️⃣ 立即转账TRX到您的钱包

━━━━━━━━━━━━━━━━━━━━
⚠️ 重要注意事项
━━━━━━━━━━━━━━━━━━━━
• 🎯 务必确保支付地址准确无误
• 📈 汇率可能因市场波动实时变化
• 💰 转账金额必须在限额范围内
• 📞 遇到问题请及时联系客服支持
• 🔒 建议首次使用时小额测试
• ⏰ 超出限额的转账将被退回

💳 官方支付地址：{paymentAddress}
📋 点击地址可自动复制到剪贴板`
        break
        
      case 'simple':
        mainMessageTemplate.value = `💱 USDT闪兑TRX

汇率：{usdtToTrxRate} (USDT→TRX)
限额：{minAmount}-{maxAmount} USDT

说明：
• 发送USDT自动兑换
• 根据支付金额计算
• 24小时自动处理
• 秒级到账

注意：
• 地址必须准确
• 汇率实时波动
• 在限额范围内
• 小额测试建议

地址：{paymentAddress}`
        break
        
      case 'professional':
        mainMessageTemplate.value = `🏢 TRON数字资产兑换服务（企业级）

根据支付金额自动兑换，无需人工干预

【实时汇率信息】
USDT→TRX汇率：{usdtToTrxRate}
TRX→USDT汇率：{trxToUsdtRate}

【交易限额设定】
最小兑换金额：{minAmount} USDT
最大兑换金额：{maxAmount} USDT

【自动化服务标准】
• 执行时效：7×24小时全天候自动服务
• 汇率基准：实时市场价格，公开透明
• 到账时间：支付后秒级自动兑换
• 技术保障：全自动化系统，零人工干预
• 服务方式：根据实际支付金额自动计算

【操作流程规范】
• 第一步：用户发送USDT至指定支付地址
• 第二步：系统自动识别并确认支付金额
• 第三步：按实时汇率自动计算TRX数量
• 第四步：TRX自动转入用户钱包地址
• 第五步：区块链网络确认交易完成

【重要注意事项】
• 地址安全：务必确保支付地址准确无误
• 市场风险：汇率受市场波动影响可能实时变化
• 限额规范：兑换金额必须在规定限额范围内
• 技术支持：如遇系统问题请及时联系技术团队
• 测试建议：建议首次使用时进行小额兑换测试
• 合规声明：请确保所有交易符合当地法律法规

【官方支付地址】
{paymentAddress}
（点击地址可自动复制到剪贴板）

【技术支持】
专业技术团队24小时在线服务`
        break
        
      case 'friendly':
        mainMessageTemplate.value = `💱 USDT兑换TRX小助手 💱

嗨！欢迎使用自动兑换服务 😊
发多少USDT就自动换多少TRX！

💰 当前汇率（实时更新）：
• USDT换TRX：{usdtToTrxRate} 💎
• TRX换USDT：{trxToUsdtRate} ✨

💵 兑换额度：
• 最少：{minAmount} USDT起兑
• 最多：{maxAmount} USDT上限

🌟 超棒特色：
• 24小时不打烊，随时都能换 🕐
• 汇率很公道，跟着市场走 📊
• 几秒钟到账，超级快 ⚡
• 全自动的，根据您付的钱自动换 🤖
• 发多少算多少，不用猜 💯

💫 操作超简单：
• 直接把USDT发到支付地址 📤
• 系统看到钱就自动开始换 👀
• 按您付的金额自动算TRX 🔄
• 马上转到您的钱包里 💰
• 搞定！就是这么省心 ✨

🌈 贴心提醒：
• 支付地址千万别填错哦 😅
• 汇率会跟着市场实时变动 📈
• 金额要在限额范围内哦 💰
• 有问题随时找我们客服 💬
• 建议第一次先小额试试 🔍
• 超出限额的会退回给您 🔄

💳 支付地址：{paymentAddress}
（点击就能复制地址啦 📋）

有任何问题都可以找我们哦~ 😘`
        break
    }
  }

  // 格式化主消息
  const formatMainMessage = computed(() => {
    return mainMessageTemplate.value
      .replace(/{usdtToTrxRate}/g, usdtToTrxRate.value.toString())
      .replace(/{trxToUsdtRate}/g, trxToUsdtRate.value.toString())
      .replace(/{minAmount}/g, minAmount.value.toString())
      .replace(/{maxAmount}/g, maxAmount.value.toString())
      .replace(/{paymentAddress}/g, paymentAddress.value)
  })

  // 更新函数
  const updateUsdtToTrxRate = (value: number) => {
    usdtToTrxRate.value = value
  }

  const updateTrxToUsdtRate = (value: number) => {
    trxToUsdtRate.value = value
  }

  const updateMinAmount = (value: number) => {
    minAmount.value = value
  }

  const updateMaxAmount = (value: number) => {
    maxAmount.value = value
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
    usdtToTrxRate,
    trxToUsdtRate,
    minAmount,
    maxAmount,
    paymentAddress,
    
    // 计算属性
    formatMainMessage,
    
    // 方法
    initializeFromConfig,
    saveConfig,
    applyMainTemplate,
    updateUsdtToTrxRate,
    updateTrxToUsdtRate,
    updateMinAmount,
    updateMaxAmount,
    updatePaymentAddress,
    updateMainMessageTemplate
  }
}
