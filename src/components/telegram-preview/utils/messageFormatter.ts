/**
 * 消息格式化工具
 * 从TelegramPreview.vue中分离出的消息格式化逻辑
 */

export interface MessageProps {
  mainMessageTemplate?: string
  dailyFee: number
  usageRules: string[]
  notes: string[]
  lineBreaks?: any
  generateLineBreaks?: (count: number) => string
}

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

export class MessageFormatter {
  /**
   * 格式化主消息模板
   */
  static formatMainMessage(props: MessageProps): string {
    if (!props.mainMessageTemplate) {
      // 如果没有主消息模板，使用默认的老式构建方式
      return MessageFormatter.buildDefaultMessage(props)
    }
    
    const template = props.mainMessageTemplate
    
    return template
      .replace(/{dailyFee}/g, props.dailyFee.toString())
  }

  /**
   * 构建默认消息（兼容旧版本）
   */
  static buildDefaultMessage(props: MessageProps): string {
    let message = '🔥 笔数套餐 🔥（无时间限制）'
    
    // 添加副标题
    message += '\n（24小时不使用，则扣' + props.dailyFee + '笔占用费）'
    
    // 使用规则
    if (props.usageRules && props.usageRules.length > 0) {
      message += '\n使用说明：'
      props.usageRules.forEach(rule => {
        if (rule && rule.trim()) {
          message += '\n• ' + rule
        }
      })
    }
    
    // 注意事项
    if (props.notes && props.notes.length > 0) {
      message += '\n注意事项：'
      props.notes.forEach(note => {
        if (note && note.trim()) {
          message += '\n• ' + note
        }
      })
    }
    
    return message
  }

  /**
   * 生成换行字符串
   */
  static generateLineBreaks(count: number): string {
    return count > 0 ? '\n'.repeat(count) : ''
  }
}
