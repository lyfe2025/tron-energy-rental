/**
 * 定价设置管理组合式函数
 * 从 useSettings.ts 中分离的定价设置逻辑
 */

import { reactive } from 'vue'

export interface PricingSettings {
  energyBasePrice: number
  bandwidthBasePrice: number
  emergencyFeeMultiplier: number
  minimumOrderAmount: number
  maximumOrderAmount: number
}

export function usePricingSettings() {
  const pricingSettings = reactive<PricingSettings>({
    energyBasePrice: 0.1,
    bandwidthBasePrice: 0.05,
    emergencyFeeMultiplier: 1.5,
    minimumOrderAmount: 10,
    maximumOrderAmount: 10000
  })

  const updatePricingSetting = (key: keyof PricingSettings, value: number) => {
    pricingSettings[key] = value
  }

  const validatePricingRange = (key: keyof PricingSettings, value: number): boolean => {
    switch (key) {
      case 'energyBasePrice':
      case 'bandwidthBasePrice':
        return value > 0 && value <= 1
      case 'emergencyFeeMultiplier':
        return value >= 1 && value <= 5
      case 'minimumOrderAmount':
        return value > 0 && value < pricingSettings.maximumOrderAmount
      case 'maximumOrderAmount':
        return value > pricingSettings.minimumOrderAmount && value <= 100000
      default:
        return false
    }
  }

  const resetPricingSettings = () => {
    Object.assign(pricingSettings, {
      energyBasePrice: 0.1,
      bandwidthBasePrice: 0.05,
      emergencyFeeMultiplier: 1.5,
      minimumOrderAmount: 10,
      maximumOrderAmount: 10000
    })
  }

  return {
    pricingSettings,
    updatePricingSetting,
    validatePricingRange,
    resetPricingSettings
  }
}
