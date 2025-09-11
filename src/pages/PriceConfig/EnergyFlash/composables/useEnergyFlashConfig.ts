/**
 * 能量闪租配置管理逻辑
 * 从原组件中提取配置初始化和状态管理功能
 */

import { computed } from 'vue'
import type {
    EnergyFlashConfig,
    LineBreakPresets
} from '../types/energy-flash.types'

export function useEnergyFlashConfig(config: EnergyFlashConfig | null) {
  /**
   * 初始化默认配置
   */
  const initializeConfig = () => {
    if (config?.config) {
      // 确保 display_texts 存在
      if (!config.config.display_texts) {
        config.config.display_texts = {
          title: '',
          subtitle_template: [''],
          duration_label: '',
          price_label: '',
          max_label: '',
          address_label: '💰 下单地址：（点击地址自动复制）',
          double_energy_warning: '',
          line_breaks: {
            after_title: 0,
            after_subtitle: 0,
            after_details: 0,
            before_warning: 0,
            before_notes: 0
          }
        }
      }
      // 确保 line_breaks 存在
      if (!config.config.display_texts.line_breaks) {
        config.config.display_texts.line_breaks = {
          after_title: 0,
          after_subtitle: 0,
          after_details: 0,
          before_warning: 0,
          before_notes: 0
        }
      }
      // 兼容旧版本：如果subtitle_template是字符串，转换为数组
      if (typeof config.config.display_texts.subtitle_template === 'string') {
        const oldTemplate = config.config.display_texts.subtitle_template
        config.config.display_texts.subtitle_template = oldTemplate ? [oldTemplate] : ['']
      }
      // 确保subtitle_template是数组且至少有一个元素
      if (!Array.isArray(config.config.display_texts.subtitle_template)) {
        config.config.display_texts.subtitle_template = ['']
      } else if (config.config.display_texts.subtitle_template.length === 0) {
        config.config.display_texts.subtitle_template = ['']
      }
      // 确保 notes 数组存在
      if (!config.config.notes) {
        config.config.notes = []
      }
    }
  }

  // 计算属性：安全访问 display_texts
  const displayTexts = computed(() => {
    if (!config?.config?.display_texts) {
      return {
        title: '',
        subtitle_template: [''],
        duration_label: '',
        price_label: '',
        max_label: '',
        address_label: '💰 下单地址：（点击地址自动复制）',
        double_energy_warning: ''
      }
    }
    return config.config.display_texts
  })

  // 计算属性：安全访问 subtitle_templates 数组
  const subtitleTemplates = computed(() => {
    return Array.isArray(displayTexts.value.subtitle_template) 
      ? displayTexts.value.subtitle_template 
      : ['']
  })

  // 计算属性：安全访问 notes
  const notes = computed(() => {
    return config?.config?.notes || []
  })

  // 计算属性：安全访问 line_breaks
  const lineBreaks = computed(() => {
    return config?.config?.display_texts?.line_breaks || {
      after_title: 0,
      after_subtitle: 0,
      after_details: 0,
      before_warning: 0,
      before_notes: 0
    }
  })

  /**
   * 换行配置预设方法
   */
  const setLineBreakPreset = (presetType: string) => {
    if (!config?.config?.display_texts?.line_breaks) return
    
    const presets: LineBreakPresets = {
      compact: {
        after_title: 0,
        after_subtitle: 0,
        after_details: 0,
        before_warning: 0,
        before_notes: 0
      },
      normal: {
        after_title: 1,
        after_subtitle: 1,
        after_details: 1,
        before_warning: 1,
        before_notes: 1
      },
      spacious: {
        after_title: 2,
        after_subtitle: 2,
        after_details: 2,
        before_warning: 2,
        before_notes: 2
      },
      custom: {
        after_title: 1,
        after_subtitle: 1,
        after_details: 1,
        before_warning: 1,
        before_notes: 1
      }
    }
    
    const preset = presets[presetType] || presets.normal
    Object.assign(config.config.display_texts.line_breaks, preset)
  }

  return {
    initializeConfig,
    displayTexts,
    subtitleTemplates,
    notes,
    lineBreaks,
    setLineBreakPreset
  }
}
