import { ref, computed } from 'vue'

/**
 * 价格配置默认图片管理
 */

// 默认图片配置
export const DEFAULT_IMAGES = {
  energy_flash: {
    url: '/assets/defaults/price-configs/energy-flash-default.jpeg',
    alt: '能量闪租默认图片'
  },
  transaction_package: {
    url: '/assets/defaults/price-configs/transaction-package-default.jpeg',
    alt: '交易套餐默认图片'
  },
  trx_exchange: {
    url: '/assets/defaults/price-configs/trx-exchange-default.jpeg',
    alt: 'TRX闪兑默认图片'
  }
}

export interface DefaultImage {
  url: string
  alt: string
}

export function useDefaultImages(configType?: string) {
  const selectedDefaultImage = ref<DefaultImage | null>(null)
  
  // 获取所有可用的默认图片
  const availableDefaultImages = computed(() => {
    return Object.entries(DEFAULT_IMAGES).map(([type, image]) => ({
      type,
      ...image,
      name: getImageDisplayName(type)
    }))
  })
  
  // 获取特定类型的默认图片
  const getDefaultImageForType = (type: string): DefaultImage | null => {
    return DEFAULT_IMAGES[type as keyof typeof DEFAULT_IMAGES] || null
  }
  
  // 检查是否为默认图片URL
  const isDefaultImage = (url: string): boolean => {
    return Object.values(DEFAULT_IMAGES).some(image => image.url === url)
  }
  
  // 获取图片显示名称
  function getImageDisplayName(type: string): string {
    const names: Record<string, string> = {
      energy_flash: '能量闪租',
      transaction_package: '交易套餐', 
      trx_exchange: 'TRX闪兑'
    }
    return names[type] || type
  }
  
  // 选择默认图片
  const selectDefaultImage = (type: string): DefaultImage | null => {
    const defaultImage = getDefaultImageForType(type)
    if (defaultImage) {
      selectedDefaultImage.value = defaultImage
    }
    return defaultImage
  }
  
  // 清除选择的默认图片
  const clearDefaultImage = () => {
    selectedDefaultImage.value = null
  }
  
  // 获取推荐的默认图片（基于配置类型）
  const recommendedDefaultImage = computed(() => {
    if (configType) {
      return getDefaultImageForType(configType)
    }
    return null
  })
  
  return {
    availableDefaultImages,
    selectedDefaultImage,
    recommendedDefaultImage,
    getDefaultImageForType,
    isDefaultImage,
    selectDefaultImage,
    clearDefaultImage,
    getImageDisplayName
  }
}
