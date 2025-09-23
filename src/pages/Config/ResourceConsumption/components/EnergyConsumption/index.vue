<template>
  <div class="energy-consumption-config">
    <div class="max-w-6xl">
      
      <!-- 左右分栏布局：配置和预设值 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- 左侧：USDT转账配置 -->
        <div class="space-y-6">
          <ConfigurationPanel
            :config="config"
            :local-config="localConfig"
            :field-errors="fieldErrors"
            :validate-field="validateField"
            :emit-update="emitUpdate"
          />
        </div>
        
        <!-- 右侧：预设值管理 -->
        <div class="space-y-6">
          <PresetManager
            :local-config="localConfig"
            :new-preset="newPreset"
            :is-saving="isSaving"
            :apply-preset="applyPreset"
            :add-preset="addPreset"
            :remove-preset="removePreset"
          />
        </div>
      </div>
      
      <!-- 能量消耗计算器 -->
      <EnergyCalculator
        :calculator="calculator"
        :local-config="localConfig"
        :energy-config="energyConfig"
        :is-config-loaded="isConfigLoaded"
        :calculate-energy="calculateEnergy"
        :reset-calculator="resetCalculator"
        :use-default-addresses="useDefaultAddresses"
        :query-both-scenarios="queryBothScenarios"
      />

      <!-- 保存按钮 -->
      <div class="flex justify-center mt-8">
        <button 
          @click="$emit('save')"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors min-w-[200px]"
        >
          保存能量配置
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
// 导入分离后的组件
import ConfigurationPanel from './components/ConfigurationPanel.vue'
import EnergyCalculator from './components/EnergyCalculator.vue'
import PresetManager from './components/PresetManager.vue'

// 导入分离后的composables
import { useEnergyCalculator } from './composables/useEnergyCalculator'
import { useEnergyConfig } from './composables/useEnergyConfig'
import { usePresetManager } from './composables/usePresetManager'

// 导入类型定义
import type { EnergyConfig } from '../../types/resource-consumption.types'

// Props
interface Props {
  config: EnergyConfig
}

const props = defineProps<Props>()

// Emits
const emits = defineEmits<{
  update: [config: Partial<EnergyConfig>]
  save: []
}>()

// 使用配置管理逻辑
const {
  localConfig,
  fieldErrors,
  validateField,
  emitUpdate
} = useEnergyConfig(props, emits)

// 使用预设值管理逻辑
const {
  newPreset,
  isSaving,
  applyPreset,
  addPreset,
  removePreset
} = usePresetManager(localConfig, emitUpdate)

// 使用计算器逻辑
const {
  calculator,
  energyConfig,
  isConfigLoaded,
  calculateEnergy,
  resetCalculator,
  useDefaultAddresses,
  queryBothScenarios
} = useEnergyCalculator(localConfig)
</script>

<style scoped>
.energy-consumption-config {
  @apply p-0;
}

/* 验证错误样式 */
:deep(.el-input-number.is-error .el-input__wrapper) {
  border-color: #f56565 !important;
  box-shadow: 0 0 0 1px #f56565 !important;
}

:deep(.el-input-number.is-error .el-input__wrapper:hover) {
  border-color: #e53e3e !important;
}

:deep(.el-input-number.is-error .el-input__wrapper.is-focus) {
  border-color: #f56565 !important;
  box-shadow: 0 0 0 1px #f56565 !important;
}
</style>
