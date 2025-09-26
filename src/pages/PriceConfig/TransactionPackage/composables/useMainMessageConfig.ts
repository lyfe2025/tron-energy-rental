import { computed, ref } from 'vue'
import type { ConfigCardProps } from '../../types'

export function useMainMessageConfig(props: ConfigCardProps) {
  // 主消息模板（整合所有文案配置）
  const mainMessageTemplate = ref(`🔥 TRON能量笔数套餐 🔥（永久有效）

（24小时内如无使用，扣{dailyFee}笔占用费）

使用说明：
• 套餐购买后永久有效，无时间限制
• 24小时内如无使用，扣 {dailyFee} 笔占用费
• 转账成功后立即到账，服务永久有效
• 支持所有TRON网络TRC20代币转账
• 一次购买，多次使用，余额不清零

注意事项：
• 请确保接收地址准确无误
• 能量仅适用于TRC20转账，不支持TRX转账
• 购买后如有问题，请及时联系客服
• 本服务7×24小时自动发放，无需等待`)

  // 独立配置项
  const dailyFee = ref(1)
  const replyMessage = ref('请输入能量接收地址:')

  // 兼容性：从模板解析出的数组（用于显示）
  const usageRules = computed(() => {
    const template = mainMessageTemplate.value
    const usageMatch = template.match(/使用说明：\n((?:• .+\n?)+)/)?.[1]
    if (usageMatch) {
      return usageMatch.split('\n').filter(line => line.trim()).map(line => line.replace('• ', ''))
    }
    return []
  })
  
  const notes = computed(() => {
    const template = mainMessageTemplate.value
    const notesMatch = template.match(/注意事项：\n((?:• .+\n?)+)/)?.[1]
    if (notesMatch) {
      return notesMatch.split('\n').filter(line => line.trim()).map(line => line.replace('• ', ''))
    }
    return []
  })

  // 初始化配置
  const initializeFromConfig = () => {
    if (props.config?.config) {
      // 加载主消息模板
      if (props.config.config.main_message_template) {
        mainMessageTemplate.value = props.config.config.main_message_template
      }
      
      // 加载独立配置项
      if (typeof props.config.config.daily_fee === 'number') {
        dailyFee.value = Math.floor(props.config.config.daily_fee) || 0
      }
      
      if (props.config.config.reply_message) {
        replyMessage.value = props.config.config.reply_message
      }
    }
  }

  // 保存配置 - 只更新主消息相关字段
  const saveConfig = () => {
    if (props.config?.config) {
      // 只更新主消息相关的字段，保留其他配置
      props.config.config.main_message_template = mainMessageTemplate.value
      props.config.config.daily_fee = dailyFee.value
      props.config.config.reply_message = replyMessage.value
      
      // usage_rules和notes现在直接保存在main_message_template中，无需单独保存
    }
  }

  // 主消息模板快速模板
  const applyMainTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic':
        mainMessageTemplate.value = `🔥 TRON能量笔数套餐 🔥（永久有效）

（24小时内如无使用，扣{dailyFee}笔占用费）

使用说明：
• 套餐购买后永久有效，无时间限制
• 24小时内如无使用，扣 {dailyFee} 笔占用费
• 转账成功后立即到账，服务永久有效
• 支持所有TRON网络TRC20代币转账
• 一次购买，多次使用，余额不清零

注意事项：
• 请确保接收地址准确无误
• 能量仅适用于TRC20转账，不支持TRX转账
• 购买后如有问题，请及时联系客服
• 本服务7×24小时自动发放，无需等待`
        break
        
      case 'detailed':
        mainMessageTemplate.value = `💎 TRON能量转账套餐（精品版）💎

（24小时内如无使用，扣{dailyFee}笔占用费）

📋 使用说明：
━━━━━━━━━━━━━━━━━━━━
• 套餐购买后永久有效，无时间限制
• 24小时内如无使用，扣 {dailyFee} 笔占用费
• 转账成功后立即到账，服务永久有效
• 支持所有TRON网络TRC20代币转账
• 一次购买，多次使用，余额不清零
• 批量操作更优惠，建议选择大套餐
━━━━━━━━━━━━━━━━━━━━

⚠️ 注意事项：
━━━━━━━━━━━━━━━━━━━━
• 请确保接收地址准确无误
• 能量仅适用于TRC20转账，不支持TRX转账
• 购买后如有问题，请及时联系客服
• 本服务7×24小时自动发放，无需等待
• 余额不清零，可多次转账使用
━━━━━━━━━━━━━━━━━━━━`
        break
        
      case 'simple':
        mainMessageTemplate.value = `⚡ TRX能量套餐

（24小时内如无使用，扣{dailyFee}笔占用费）

说明：
• 服务永久有效，无时间限制
• 24小时内如无使用，扣 {dailyFee} 笔占用费
• 立即到账，永久有效
• 支持TRC20转账

注意：
• 地址准确无误
• 不支持TRX转账
• 7×24小时自动发放`
        break
        
      case 'professional':
        mainMessageTemplate.value = `🏢 TRON能量转账服务（企业级）

（24小时内如无使用，扣{dailyFee}笔占用费）

📊 服务条款：
• 计费规则：24小时内如无使用，扣 {dailyFee} 笔占用费
• 生效时间：转账成功后立即到账，服务永久有效
• 适用范围：支持所有TRON网络TRC20代币转账操作
• 使用策略：一次购买，多次使用，余额不清零

⚠️ 风险提示：
• 请务必确保接收地址准确无误，错误地址无法撤回
• 本服务仅适用于TRC20代币转账，不支持TRX主币转账
• 如遇技术问题，请及时联系专业客服团队
• 系统7×24小时自动发放，无需人工干预

📞 客服支持：专业技术团队为您服务`
        break
        
      case 'friendly':
        mainMessageTemplate.value = `🎉 TRON能量转账小助手 🎉

（24小时内如无使用，扣{dailyFee}笔占用费）

💡 温馨提示：
• 服务购买后永久有效，没有时间限制 🎊
• 24小时内如无使用，扣 {dailyFee} 笔占用费哦
• 转账成功马上到账，永久有效 ⏰
• 支持所有TRC20代币转账 💰
• 一次购买可以多次使用，余额不会清零 🔄

🌟 贴心提醒：
• 地址一定要填对哦，填错了找不回来的 😅
• 只能用来转TRC20代币，TRX转不了
• 有问题随时找客服小姐姐 💬
• 24小时自动发放，不用等待 ⚡`
        break
    }
  }

  // 更新函数
  const updateMainMessageTemplate = (value: string) => {
    mainMessageTemplate.value = value
  }

  const updateDailyFee = (value: number) => {
    dailyFee.value = Math.floor(value) || 0
  }

  const updateReplyMessage = (value: string) => {
    replyMessage.value = value
  }

  // 格式化主消息（替换占位符）
  const formatMainMessage = computed(() => {
    return mainMessageTemplate.value
      .replace(/{dailyFee}/g, dailyFee.value.toString())
  })

  return {
    // 响应式数据
    mainMessageTemplate,
    dailyFee,
    replyMessage,
    usageRules,
    notes,
    formatMainMessage,

    // 方法
    initializeFromConfig,
    saveConfig,
    applyMainTemplate,
    updateMainMessageTemplate,
    updateDailyFee,
    updateReplyMessage
  }
}
