import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ConfigCardProps } from '../../types'

export function useTrxExchangeConfig(props: ConfigCardProps) {
  const layoutContainer = ref(null)

  // 调试函数  
  const debugLayout = () => {
    if (layoutContainer.value) {
      const element = layoutContainer.value as HTMLElement
      const styles = window.getComputedStyle(element)
      const screenWidth = window.innerWidth
      
      console.log('🐛 TrxExchange Layout Debug:', {
        screenWidth,
        flexDirection: styles.flexDirection,
        className: element.className,
        isMdBreakpoint: screenWidth >= 768,
        elementWidth: element.offsetWidth
      })
      
      // 检查子元素
      const children = element.children
      console.log(`🐛 TrxExchange 总共有 ${children.length} 个子元素`)
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        const childStyles = window.getComputedStyle(child)
        console.log(`  子元素 ${i + 1}:`, {
          className: child.className,
          width: childStyles.width,
          height: childStyles.height,
          display: childStyles.display,
          visibility: childStyles.visibility,
          opacity: childStyles.opacity,
          flexBasis: childStyles.flexBasis,
          offsetWidth: child.offsetWidth,
          offsetHeight: child.offsetHeight,
          isVisible: child.offsetWidth > 0 && child.offsetHeight > 0
        })
      }
    }
  }

  // 初始化默认配置
  const initializeConfig = () => {
    if (props.config?.config) {
      // 确保 display_texts 存在
      if (!props.config.config.display_texts) {
        props.config.config.display_texts = {
          title: '',
          subtitle_template: '',
          rate_title: '',
          rate_description: '',
          address_label: ''
        }
      }
      // 确保 notes 数组存在
      if (!props.config.config.notes) {
        props.config.config.notes = []
      }
    }
  }

  // 每次props变化时也调试一下
  watch(() => props.config, () => {
    console.log('🐛 TrxExchange Config Changed:', props.config?.mode_type)
    initializeConfig() // 初始化配置
    setTimeout(() => {
      if (layoutContainer.value) debugLayout()
    }, 100)
  }, { immediate: true })

  // 业务方法
  const handleToggle = () => {
    props.onToggle('trx_exchange')
  }

  const handleSave = () => {
    props.onSave('trx_exchange')
  }

  // 计算属性：安全访问 display_texts
  const displayTexts = computed(() => {
    if (!props.config?.config?.display_texts) {
      return {
        title: '',
        subtitle_template: '',
        rate_title: '',
        rate_description: '',
        address_label: ''
      }
    }
    return props.config.config.display_texts
  })

  // 计算属性：安全访问 notes
  const notes = computed(() => {
    return props.config?.config?.notes || []
  })

  // 获取显示文本，如果没有配置则使用默认值
  const getDisplayText = (key: string, defaultValue: string): string => {
    return props.config?.config.display_texts?.[key] || defaultValue
  }

  // 格式化副标题，替换占位符
  const formatSubtitle = (): string => {
    const template = getDisplayText('subtitle_template', '（转U自动回TRX，{min_amount}U起换）')
    return template.replace('{min_amount}', props.config?.config.min_amount?.toString() || '0')
  }

  // 图片相关处理函数
  const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement
    console.error('图片加载失败:', img.src)
  }

  const handleImageUploadSuccess = (data: { url: string; filename: string }) => {
    if (props.config) {
      props.config.image_url = data.url
      console.log('图片上传成功:', data)
    }
  }

  const handleImageUploadError = (error: string) => {
    console.error('图片上传失败:', error)
  }

  const toggleImageEnabled = () => {
    if (props.config) {
      props.config.enable_image = !props.config.enable_image
      if (!props.config.enable_image) {
        props.config.image_url = ''
        props.config.image_alt = ''
      }
    }
  }

  // 自动兑换开关
  const toggleAutoExchange = () => {
    if (props.config) {
      props.config.config.is_auto_exchange = !props.config.config.is_auto_exchange
    }
  }

  // 注意事项管理
  const addNote = () => {
    if (props.config && props.config.config.notes) {
      props.config.config.notes.push('')
    }
  }

  const removeNote = (index: number) => {
    if (props.config && props.config.config.notes) {
      props.config.config.notes.splice(index, 1)
    }
  }

  onMounted(() => {
    // 调试当前布局
    nextTick(() => {
      debugLayout()
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        setTimeout(debugLayout, 100)
      })
    })
  })

  return {
    layoutContainer,
    displayTexts,
    notes,
    handleToggle,
    handleSave,
    initializeConfig,
    getDisplayText,
    formatSubtitle,
    handleImageError,
    handleImageUploadSuccess,
    handleImageUploadError,
    toggleImageEnabled,
    toggleAutoExchange,
    addNote,
    removeNote,
    debugLayout
  }
}
