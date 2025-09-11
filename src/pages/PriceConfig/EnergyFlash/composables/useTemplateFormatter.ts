/**
 * 模板格式化逻辑
 * 从原组件中提取模板格式化相关功能
 */

import type { EnergyFlashConfigData, LineBreaksConfig } from '../types/energy-flash.types'

export function useTemplateFormatter() {
  /**
   * 格式化单个模板，支持动态计算和多种变量
   */
  const formatTemplate = (template: string, config: EnergyFlashConfigData): string => {
    const price = config.single_price || 0
    const max = config.max_transactions || 0
    
    let result = template
    
    // 先处理所有计算表达式（必须在基础变量之前处理）
    
    // price计算表达式
    result = result.replace(/\{price\*(\d+)\}/g, (match, multiplier) => {
      return (price * parseInt(multiplier)).toString()
    })
    
    result = result.replace(/\{price\/(\d+)\}/g, (match, divisor) => {
      const div = parseInt(divisor)
      return div > 0 ? (price / div).toString() : price.toString()
    })
    
    result = result.replace(/\{price\+(\d+)\}/g, (match, addend) => {
      return (price + parseInt(addend)).toString()
    })
    
    result = result.replace(/\{price\-(\d+)\}/g, (match, subtrahend) => {
      return (price - parseInt(subtrahend)).toString()
    })
    
    // max计算表达式
    result = result.replace(/\{max\*(\d+)\}/g, (match, multiplier) => {
      return (max * parseInt(multiplier)).toString()
    })
    
    result = result.replace(/\{max\/(\d+)\}/g, (match, divisor) => {
      const div = parseInt(divisor)
      return div > 0 ? (max / div).toString() : max.toString()
    })
    
    result = result.replace(/\{max\+(\d+)\}/g, (match, addend) => {
      return (max + parseInt(addend)).toString()
    })
    
    result = result.replace(/\{max\-(\d+)\}/g, (match, subtrahend) => {
      return (max - parseInt(subtrahend)).toString()
    })
    
    // 最后处理基础变量
    result = result.replace(/\{price\}/g, price.toString())
    result = result.replace(/\{max\}/g, max.toString())
    
    return result
  }

  /**
   * 格式化副标题，替换占位符 - 显示所有副标题模板，支持动态计算和换行配置
   */
  const formatSubtitle = (
    subtitleTemplates: string[],
    config: EnergyFlashConfigData,
    lineBreaks: LineBreaksConfig
  ): string => {
    const templates = subtitleTemplates.filter(t => t.trim() !== '')
    if (templates.length === 0) {
      // 如果没有有效模板，使用默认模板
      const defaultTemplate = '（{price}TRX/笔，最多买{max}笔）'
      return formatTemplate(defaultTemplate, config) + generateLineBreaks(lineBreaks.after_subtitle)
    }
    
    // 格式化所有模板并用换行符连接
    const formattedTemplates = templates.map(template => formatTemplate(template, config))
    
    return formattedTemplates.join('\n') + generateLineBreaks(lineBreaks.after_subtitle)
  }

  /**
   * 格式化文本，替换单个占位符
   */
  const formatText = (
    textKey: string,
    defaultTemplate: string,
    value: any,
    displayTexts: Record<string, any>
  ): string => {
    const template = displayTexts[textKey] || defaultTemplate
    const placeholder = textKey.includes('duration') ? '{duration}' : 
                       textKey.includes('price') ? '{price}' : 
                       textKey.includes('max') ? '{max}' : '{value}'
    return template.replace(placeholder, value?.toString() || '0')
  }

  /**
   * 获取显示文本，如果没有配置则使用默认值
   */
  const getDisplayText = (
    key: string,
    defaultValue: string,
    displayTexts: Record<string, any>
  ): string => {
    return displayTexts[key] || defaultValue
  }

  /**
   * 生成额外换行字符串
   */
  const generateLineBreaks = (count: number): string => {
    return count > 0 ? '\n'.repeat(count) : ''
  }

  return {
    formatTemplate,
    formatSubtitle,
    formatText,
    getDisplayText,
    generateLineBreaks
  }
}
