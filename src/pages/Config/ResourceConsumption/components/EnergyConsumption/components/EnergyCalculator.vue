<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-green-100 rounded-lg">
        <Calculator class="w-6 h-6 text-green-600" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">能量消耗计算器</h3>
        <p class="text-sm text-gray-600">基于当前配置计算USDT转账的实际能量消耗</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 左侧：参数选择 -->
      <div class="space-y-4">
        <!-- 计算模式选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">计算模式</label>
          <el-radio-group v-model="calculator.calculationMode" class="flex flex-col gap-2">
            <el-radio value="static" class="mb-2">
              <span class="ml-2">静态计算</span>
              <span class="text-xs text-blue-600 ml-2">(基于配置数据)</span>
            </el-radio>
            <el-radio value="api">
              <span class="ml-2">实时API查询</span>
              <span class="text-xs text-green-600 ml-2">(TRON官方API实时查询)</span>
            </el-radio>
          </el-radio-group>
          
        </div>

        <!-- 转账类型 -->
        <div v-if="calculator.calculationMode === 'static'">
          <label class="block text-sm font-medium text-gray-700 mb-2">转账类型</label>
          <el-radio-group v-model="calculator.transferType" class="flex flex-col gap-2">
            <el-radio value="existing" class="mb-2">
              <span class="ml-2">已有USDT地址转账</span>
              <span class="text-xs text-blue-600 ml-2" v-if="getCurrentStandardEnergy() > 0">
                (约{{ getCurrentStandardEnergy().toLocaleString() }}基础能量)
              </span>
              <span class="text-xs text-gray-400 ml-2" v-else>(加载中...)</span>
            </el-radio>
            <el-radio value="new">
              <span class="ml-2">新地址首次转账</span>
              <span class="text-xs text-orange-600 ml-2" v-if="getCurrentStandardEnergy() > 0">
                (约{{ (getCurrentStandardEnergy() * 2).toLocaleString() }}基础能量)
              </span>
              <span class="text-xs text-gray-400 ml-2" v-else>(加载中...)</span>
            </el-radio>
          </el-radio-group>
        </div>

        <!-- API模式的地址输入 -->
        <div v-if="calculator.calculationMode === 'api'" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              发送地址
              <span class="text-xs text-gray-500">(必填)</span>
            </label>
            <el-input 
              v-model="calculator.fromAddress"
              placeholder="输入TRON地址 (T开头)"
              class="w-full"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              接收地址
              <span class="text-xs text-gray-500">(必填)</span>
            </label>
            <el-input 
              v-model="calculator.toAddress"
              placeholder="输入TRON地址 (T开头)"
              class="w-full"
            />
            <div class="flex gap-2 mt-2">
              <button 
                @click="useDefaultAddresses"
                class="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                使用测试地址
              </button>
              <button 
                @click="queryBothScenarios"
                class="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                查询两种场景
              </button>
            </div>
          </div>
        </div>

        <!-- 转账数量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">转账数量（USDT）</label>
          <el-input-number 
            v-model="calculator.amount" 
            :min="0.000001" 
            :max="1000000"
            :precision="6"
            :step="1"
            class="w-full"
            placeholder="转账数量"
          />
          <p class="text-xs text-gray-500 mt-1">注意：能量消耗与转账数量无关</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button 
            @click="calculateEnergy"
            :disabled="calculator.isLoading || (calculator.calculationMode === 'api' && (!calculator.fromAddress || !calculator.toAddress))"
            class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <div v-if="calculator.isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ calculator.isLoading ? '查询中...' : '计算能量消耗' }}
          </button>
          <button 
            @click="resetCalculator"
            :disabled="calculator.isLoading"
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            重置
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="calculator.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ calculator.error }}</p>
        </div>
      </div>

      <!-- 右侧：计算结果 -->
      <div class="space-y-4" v-if="calculator.result || calculator.apiResult">
        <!-- 静态计算结果 -->
        <div v-if="calculator.result && calculator.calculationMode === 'static'" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
            静态计算结果
          </h4>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">基础能量消耗：</span>
              <span class="font-mono font-medium">{{ calculator.result.baseEnergy.toLocaleString() }} 能量</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600" v-if="getCurrentBufferPercentage() > 0">
                安全缓冲 ({{ getCurrentBufferPercentage() }}%)：
              </span>
              <span class="text-sm text-gray-600" v-else>安全缓冲 (加载中...)：</span>
              <span class="font-mono font-medium">{{ calculator.result.bufferEnergy.toLocaleString() }} 能量</span>
            </div>
            
            <div class="border-t border-gray-200 pt-3">
              <div class="flex justify-between items-center">
                <span class="text-sm font-semibold text-gray-900">总能量消耗：</span>
                <span class="font-mono font-bold text-lg text-green-600">{{ calculator.result.totalEnergy.toLocaleString() }} 能量</span>
              </div>
            </div>

            <div class="bg-blue-50 rounded-lg p-3 mt-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-blue-800">预估TRX燃烧成本：</span>
                <span class="font-mono font-semibold text-blue-900">{{ calculator.result.trxCost.toFixed(4) }} TRX</span>
              </div>
              <p class="text-xs text-blue-600">
                * 基于TRON网络标准：1 TRX = 10,000 能量，实际成本可能有所不同
              </p>
            </div>

            <div class="bg-yellow-50 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <div class="w-4 h-4 mt-0.5">
                  <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-yellow-800">建议</p>
                  <p class="text-xs text-yellow-700">
                    使用能量租赁服务可显著降低成本，租赁{{ calculator.result.totalEnergy.toLocaleString() }}能量约需{{ (calculator.result.totalEnergy * 0.000007).toFixed(3) }} TRX
                  </p>
                  <p class="text-xs text-yellow-600 mt-1">
                    市场价格：0.000005-0.00001 TRX/能量，相比直接燃烧节省90%+成本
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- API查询结果 -->
        <div v-if="calculator.apiResult && calculator.calculationMode === 'api'" class="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            TRON API查询结果
            <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">实时数据</span>
          </h4>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">API节点：</span>
              <span class="font-mono text-sm text-gray-500">{{ calculator.apiResult.api_node?.replace('https://', '') }}</span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">实际能量消耗：</span>
              <span class="font-mono font-bold text-lg text-green-600">{{ calculator.apiResult.energy_used?.toLocaleString() }} 能量</span>
            </div>

            <div v-if="calculator.apiResult.estimated_cost" class="space-y-2">
              <div class="bg-white/70 rounded-lg p-3">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm text-gray-700">直接燃烧TRX成本：</span>
                  <span class="font-mono font-semibold text-red-600">{{ calculator.apiResult.estimated_cost.trx_burn.toFixed(4) }} TRX</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-700">能量租赁成本：</span>
                  <span class="font-mono font-semibold text-green-600">{{ calculator.apiResult.estimated_cost.energy_rental.toFixed(4) }} TRX</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  市场价格：0.000005-0.00001 TRX/能量 | 节省90%+成本
                </div>
              </div>
            </div>

            <div v-if="calculator.apiResult.transaction_info" class="bg-white/50 rounded-lg p-3">
              <h5 class="text-sm font-medium text-gray-700 mb-2">交易信息</h5>
              <div class="space-y-1 text-xs text-gray-600">
                <div>合约：{{ calculator.apiResult.transaction_info.contract_address.slice(0, 10) }}...</div>
                <div>函数：{{ calculator.apiResult.transaction_info.function_name }}</div>
                <div>数量：{{ (parseInt(calculator.apiResult.transaction_info.amount) / 1000000).toFixed(6) }} USDT</div>
              </div>
            </div>

            <div class="bg-green-100 rounded-lg p-3 border border-green-200">
              <div class="flex items-start gap-2">
                <div class="w-4 h-4 mt-0.5">
                  <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-green-800">实时数据优势</p>
                  <p class="text-xs text-green-700">
                    此数据来自TRON官方API实时查询，比静态估算更精确，考虑了当前网络状态和合约优化
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未计算时的提示 -->
      <div class="flex items-center justify-center bg-gray-50 rounded-lg p-8" v-else>
        <div class="text-center">
          <Calculator class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p class="text-gray-500">
            {{ calculator.calculationMode === 'api' ? '输入地址并点击计算' : '选择转账类型并点击计算' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calculator } from 'lucide-vue-next'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import type { CalculatorState } from '../types/energy-calculator.types'

interface Props {
  calculator: CalculatorState
  localConfig: EnergyConfig
  energyConfig: { standard_energy: number; buffer_percentage: number; calculated_energy_per_unit: number }
  isConfigLoaded: boolean
  calculateEnergy: () => Promise<void>
  resetCalculator: () => void
  useDefaultAddresses: () => void
  queryBothScenarios: () => Promise<void>
}

const props = defineProps<Props>()

// 获取当前有效的标准能量值（优先使用用户输入）
const getCurrentStandardEnergy = () => {
  return props.localConfig.usdt_standard_energy || props.energyConfig.standard_energy || 0
}

// 获取当前有效的缓冲百分比（优先使用用户输入）
const getCurrentBufferPercentage = () => {
  return props.localConfig.usdt_buffer_percentage || props.energyConfig.buffer_percentage || 0
}
</script>
