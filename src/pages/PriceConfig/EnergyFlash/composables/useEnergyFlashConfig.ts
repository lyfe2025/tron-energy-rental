/**
 * 能量闪租配置管理逻辑
 * 简化后只处理页面实际需要的配置
 */

import type { EnergyFlashConfig } from '../types/energy-flash.types'

export function useEnergyFlashConfig(config: EnergyFlashConfig | null) {
  /**
   * 初始化默认配置
   */
  const initializeConfig = () => {
    if (config?.config) {
      // 能量闪租配置已简化，只需要确保基本字段存在
      // 所有配置都通过页面界面直接编辑，无需额外处理
    }
  }

  return {
    initializeConfig
  }
}
