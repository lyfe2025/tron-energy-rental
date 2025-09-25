/**
 * 模板管理器
 * 负责各种模板的管理和应用
 */
import { ref } from 'vue'
import { ORDER_TEMPLATES, TRX_ORDER_TEMPLATES, MAIN_MESSAGE_TEMPLATES } from '../core/defaults'

export class TemplateManager {
  private mainMessageTemplate = ref('')
  private dailyFee = ref(1)
  private replyMessage = ref('')
  private usageRules = ref<string[]>([])
  private notes = ref<string[]>([])

  // Getters
  getMainMessageTemplate() {
    return this.mainMessageTemplate
  }

  getDailyFee() {
    return this.dailyFee
  }

  getReplyMessage() {
    return this.replyMessage
  }

  getUsageRules() {
    return this.usageRules
  }

  getNotes() {
    return this.notes
  }

  // Setters
  setMainMessageTemplate(template: string) {
    this.mainMessageTemplate.value = template
  }

  setDailyFee(fee: number) {
    this.dailyFee.value = fee
  }

  setReplyMessage(message: string) {
    this.replyMessage.value = message
  }

  setUsageRules(rules: string[]) {
    this.usageRules.value = rules
  }

  setNotes(notes: string[]) {
    this.notes.value = notes
  }

  /**
   * 从配置加载模板设置
   */
  loadFromConfig(config: any) {
    this.mainMessageTemplate.value = config?.main_message_template || MAIN_MESSAGE_TEMPLATES.default
    this.dailyFee.value = config?.daily_fee || 1
    this.replyMessage.value = config?.reply_message || '请输入能量接收地址:'
    this.usageRules.value = config?.usage_rules || []
    this.notes.value = config?.notes || []
  }

  /**
   * 应用主消息模板
   */
  applyMainTemplate(templateType: keyof typeof MAIN_MESSAGE_TEMPLATES) {
    const template = MAIN_MESSAGE_TEMPLATES[templateType]
    if (template) {
      this.mainMessageTemplate.value = template
    }
  }

  /**
   * 应用订单确认模板（USDT）
   */
  applyOrderTemplate(templateType: keyof typeof ORDER_TEMPLATES): string {
    const template = ORDER_TEMPLATES[templateType]
    return template || ORDER_TEMPLATES.detailed
  }

  /**
   * 应用订单确认模板（TRX）
   */
  applyOrderTemplateTrx(templateType: keyof typeof TRX_ORDER_TEMPLATES): string {
    const template = TRX_ORDER_TEMPLATES[templateType]
    return template || TRX_ORDER_TEMPLATES.detailed
  }

  /**
   * 添加使用规则
   */
  addUsageRule() {
    this.usageRules.value.push('')
  }

  /**
   * 删除使用规则
   */
  removeUsageRule(index: number) {
    this.usageRules.value.splice(index, 1)
  }

  /**
   * 更新使用规则
   */
  updateUsageRule(index: number, rule: string) {
    if (index >= 0 && index < this.usageRules.value.length) {
      this.usageRules.value[index] = rule
    }
  }

  /**
   * 添加注意事项
   */
  addNote() {
    this.notes.value.push('')
  }

  /**
   * 删除注意事项
   */
  removeNote(index: number) {
    this.notes.value.splice(index, 1)
  }

  /**
   * 更新注意事项
   */
  updateNote(index: number, note: string) {
    if (index >= 0 && index < this.notes.value.length) {
      this.notes.value[index] = note
    }
  }

  /**
   * 导出模板配置用于保存
   */
  exportConfig() {
    return {
      main_message_template: this.mainMessageTemplate.value,
      daily_fee: this.dailyFee.value,
      reply_message: this.replyMessage.value,
      usage_rules: this.usageRules.value,
      notes: this.notes.value
    }
  }

  /**
   * 验证模板配置
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证主消息模板
    if (!this.mainMessageTemplate.value.trim()) {
      errors.push('主消息模板不能为空')
    }

    // 验证回复消息
    if (!this.replyMessage.value.trim()) {
      errors.push('回复消息不能为空')
    }

    // 验证日费用
    if (this.dailyFee.value < 0) {
      errors.push('日费用不能为负数')
    }

    // 验证使用规则（过滤空规则）
    const validRules = this.usageRules.value.filter(rule => rule.trim())
    if (validRules.length !== this.usageRules.value.length) {
      // 自动清理空规则
      this.usageRules.value = validRules
    }

    // 验证注意事项（过滤空注意事项）
    const validNotes = this.notes.value.filter(note => note.trim())
    if (validNotes.length !== this.notes.value.length) {
      // 自动清理空注意事项
      this.notes.value = validNotes
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.mainMessageTemplate.value = MAIN_MESSAGE_TEMPLATES.default
    this.dailyFee.value = 1
    this.replyMessage.value = '请输入能量接收地址:'
    this.usageRules.value = []
    this.notes.value = []
  }

  /**
   * 获取所有可用的模板类型
   */
  getAvailableTemplates() {
    return {
      mainMessage: Object.keys(MAIN_MESSAGE_TEMPLATES),
      orderTemplates: Object.keys(ORDER_TEMPLATES),
      trxOrderTemplates: Object.keys(TRX_ORDER_TEMPLATES)
    }
  }

  /**
   * 预览模板内容
   */
  previewTemplate(templateType: string, category: 'main' | 'order' | 'trx'): string {
    switch (category) {
      case 'main':
        return MAIN_MESSAGE_TEMPLATES[templateType as keyof typeof MAIN_MESSAGE_TEMPLATES] || ''
      case 'order':
        return ORDER_TEMPLATES[templateType as keyof typeof ORDER_TEMPLATES] || ''
      case 'trx':
        return TRX_ORDER_TEMPLATES[templateType as keyof typeof TRX_ORDER_TEMPLATES] || ''
      default:
        return ''
    }
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary() {
    return {
      mainMessageLength: this.mainMessageTemplate.value.length,
      replyMessageLength: this.replyMessage.value.length,
      dailyFee: this.dailyFee.value,
      usageRulesCount: this.usageRules.value.length,
      notesCount: this.notes.value.length
    }
  }
}
