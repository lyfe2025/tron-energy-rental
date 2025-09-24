import { nextTick, onMounted, ref, watch } from 'vue'
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
      // TRX闪兑配置只需要保证基本字段存在即可
      // 所有配置都通过页面界面直接编辑，无需额外的display_texts或notes
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

  // TRX闪兑配置已简化，移除了不必要的computed属性

  // 移除了不再需要的显示文本处理方法

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


  // 移除了不再需要的notes管理方法

  // 移除了不再需要的换行配置方法

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
    handleToggle,
    handleSave,
    initializeConfig,
    handleImageError,
    handleImageUploadSuccess,
    handleImageUploadError,
    toggleImageEnabled,
    debugLayout
  }
}
