<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-yellow-100 rounded-lg">
        <Zap class="w-6 h-6 text-yellow-600" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">USDT-TRC20转账配置</h3>
        <p class="text-sm text-gray-600">配置USDT转账的能量消耗参数</p>
      </div>
    </div>

    <!-- 官方能量消耗参考信息 -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-start gap-3">
        <div class="p-1 bg-blue-100 rounded">
          <Zap class="w-4 h-4 text-blue-600" />
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-semibold text-blue-900 mb-2">TRON官方USDT转账能量消耗参考</h4>
          <div class="space-y-2 text-xs text-blue-800">
            <div class="flex justify-between items-center">
              <span>接收地址已有USDT余额：</span>
              <span class="font-mono font-semibold">~65,000 能量</span>
            </div>
            <div class="flex justify-between items-center">
              <span>接收地址无USDT余额：</span>
              <span class="font-mono font-semibold">~130,000 能量</span>
            </div>
            <div class="pt-2 border-t border-blue-200">
              <p class="text-blue-700">
                <strong>注意：</strong>能量消耗与转账金额无关，仅与接收地址的USDT持有状态相关。
                数据来源：TRON官方开发者文档 (developers.tron.network)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 基础能量消耗配置 -->
    <div class="space-y-4">
      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          标准转账能量消耗
          <el-tooltip content="基于TRON官方数据：接收地址已有USDT约65,000能量，无USDT约130,000能量" placement="top">
            <HelpCircle class="w-4 h-4 text-gray-400" />
          </el-tooltip>
        </label>
        <div class="flex items-center gap-3">
          <el-input-number 
            v-model="localConfig.usdt_standard_energy" 
            :min="getFieldMin('usdt_standard_energy', config.validation_rules) || 1000" 
            :max="getFieldMax('usdt_standard_energy', config.validation_rules) || 100000"
            :step="getFieldStep('usdt_standard_energy')"
            class="flex-1"
            :class="{ 'is-error': fieldErrors.usdt_standard_energy }"
            @change="() => { validateField('usdt_standard_energy'); emitUpdate(); }"
            @blur="() => validateField('usdt_standard_energy')"
          />
          <span class="text-sm text-gray-500 min-w-[50px]">能量</span>
        </div>
        <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.usdt_standard_energy">
          {{ fieldErrors.usdt_standard_energy }}
        </p>
        <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('usdt_standard_energy', config.validation_rules)">
          {{ formatConfigRange('usdt_standard_energy', config.validation_rules) }}
        </p>
        <p class="text-xs text-gray-500 mt-1" v-else>
          官方参考：新地址130,000能量，已有USDT地址65,000能量
        </p>
      </div>

      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          安全缓冲百分比
          <el-tooltip content="USDT转账为应对网络波动增加的安全缓冲" placement="top">
            <HelpCircle class="w-4 h-4 text-gray-400" />
          </el-tooltip>
        </label>
        <div class="flex items-center gap-3">
          <el-input-number 
            v-model="localConfig.usdt_buffer_percentage" 
            :min="getFieldMin('usdt_buffer_percentage', config.validation_rules) || 5" 
            :max="getFieldMax('usdt_buffer_percentage', config.validation_rules) || 50"
            :step="getFieldStep('usdt_buffer_percentage')"
            class="flex-1"
            :class="{ 'is-error': fieldErrors.usdt_buffer_percentage }"
            @change="() => { validateField('usdt_buffer_percentage'); emitUpdate(); }"
            @blur="() => validateField('usdt_buffer_percentage')"
          />
          <span class="text-sm text-gray-500 min-w-[20px]">%</span>
        </div>
        <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.usdt_buffer_percentage">
          {{ fieldErrors.usdt_buffer_percentage }}
        </p>
        <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('usdt_buffer_percentage', config.validation_rules)">
          {{ formatConfigRange('usdt_buffer_percentage', config.validation_rules) }}
        </p>
        <p class="text-xs text-gray-500 mt-1" v-else>
          实际消耗 = 标准消耗 × (1 + 缓冲百分比)
        </p>
      </div>

      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          最大能量上限
          <el-tooltip content="单笔USDT转账的最大能量限制" placement="top">
            <HelpCircle class="w-4 h-4 text-gray-400" />
          </el-tooltip>
        </label>
        <div class="flex items-center gap-3">
          <el-input-number 
            v-model="localConfig.usdt_max_energy" 
            :min="getFieldMin('usdt_max_energy', config.validation_rules) || 5000" 
            :max="getFieldMax('usdt_max_energy', config.validation_rules) || 200000"
            :step="getFieldStep('usdt_max_energy')"
            class="flex-1"
            :class="{ 'is-error': fieldErrors.usdt_max_energy }"
            @change="() => { validateField('usdt_max_energy'); emitUpdate(); }"
            @blur="() => validateField('usdt_max_energy')"
          />
          <span class="text-sm text-gray-500 min-w-[50px]">能量</span>
        </div>
        <p class="text-xs text-red-500 mt-1" v-if="fieldErrors.usdt_max_energy">
          {{ fieldErrors.usdt_max_energy }}
        </p>
        <p class="text-xs text-blue-600 mt-1" v-else-if="formatConfigRange('usdt_max_energy', config.validation_rules)">
          {{ formatConfigRange('usdt_max_energy', config.validation_rules) }}
        </p>
        <p class="text-xs text-gray-500 mt-1" v-else>
          防止异常情况下的过度消耗
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HelpCircle, Zap } from 'lucide-vue-next'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import { formatConfigRange, getFieldMax, getFieldMin, getFieldStep } from '../../../utils/rangeDisplay'

interface Props {
  config: EnergyConfig
  localConfig: EnergyConfig
  fieldErrors: Record<string, string>
  validateField: (fieldName: keyof EnergyConfig) => void
  emitUpdate: () => Promise<void>
}

defineProps<Props>()
</script>

<style scoped>
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
