/**
 * 能量计算器逻辑
 */

import { useToast } from '@/composables/useToast'
import { getEnergyConsumptionConfig } from '@/services/api/system/flashRentConfigAPI'
import {
  getDefaultTestAddresses,
  queryUsdtEnergyConsumptionScenarios,
  queryUsdtTransferEnergyConsumption
} from '@/services/tronApiService'
import { onMounted, reactive, ref, watch } from 'vue'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import type { CalculatorState } from '../types/energy-calculator.types'

export function useEnergyCalculator(localConfig: EnergyConfig) {
  const { success, error, warning } = useToast()
  
  // 动态能量配置 - 不使用硬编码初始值
  const energyConfig = ref({
    standard_energy: 0,
    buffer_percentage: 0,
    calculated_energy_per_unit: 0
  })

  // 配置加载状态
  const isConfigLoaded = ref(false)

  // 计算器状态
  const calculator = reactive<CalculatorState>({
    transferType: 'existing',
    amount: 100,
    calculationMode: 'static',
    fromAddress: '',
    toAddress: '',
    result: null,
    apiResult: null,
    isLoading: false,
    error: null
  })

  // 加载能量配置
  const loadEnergyConfig = async () => {
    try {
      const config = await getEnergyConsumptionConfig()
      energyConfig.value = config
      isConfigLoaded.value = true
    } catch (error) {
      console.warn('获取能量配置失败，使用默认值:', error)
      // 即使失败也设置默认值和加载状态
      energyConfig.value = {
        standard_energy: 65000,
        buffer_percentage: 2,
        calculated_energy_per_unit: 66300
      }
      isConfigLoaded.value = true
    }
  }

  // 初始化时加载配置
  onMounted(() => {
    loadEnergyConfig()
  })

  // 监听本地配置变化，自动重新计算（仅在静态模式且已有计算结果时）
  watch(
    () => [localConfig.usdt_standard_energy, localConfig.usdt_buffer_percentage],
    () => {
      // 如果是静态模式且已经有计算结果，则自动重新计算
      if (calculator.calculationMode === 'static' && calculator.result) {
        calculateEnergy()
      }
    },
    { deep: true }
  )

  // 计算能量消耗
  const calculateEnergy = async () => {
    calculator.error = null
    
    if (calculator.calculationMode === 'static') {
      // 静态计算
      try {
        // 优先使用用户当前输入的值，如果没有则使用从API获取的配置
        let currentStandardEnergy = localConfig.usdt_standard_energy || energyConfig.value.standard_energy
        let currentBufferPercentage = localConfig.usdt_buffer_percentage || energyConfig.value.buffer_percentage
        
        // 如果都没有值，则加载API配置
        if (!currentStandardEnergy && (!isConfigLoaded.value || energyConfig.value.standard_energy === 0)) {
          await loadEnergyConfig()
          currentStandardEnergy = energyConfig.value.standard_energy
          currentBufferPercentage = energyConfig.value.buffer_percentage
        }
        
        // 根据转账类型确定基础能量消耗
        const baseEnergy = calculator.transferType === 'existing' 
          ? currentStandardEnergy 
          : currentStandardEnergy * 2 // 新地址大约是已有地址的2倍
        
        // 计算缓冲能量 - 使用用户当前输入的值
        const bufferPercentage = currentBufferPercentage
        const bufferEnergy = Math.round(baseEnergy * (bufferPercentage / 100))
        
        // 计算总能量
        const totalEnergy = baseEnergy + bufferEnergy
        
        // 预估TRX燃烧成本（基于TRON网络标准：1 TRX = 10000 能量）
        const energyPerTrx = 10000
        const trxCost = totalEnergy / energyPerTrx
        
        calculator.result = {
          baseEnergy,
          bufferEnergy,
          totalEnergy,
          trxCost
        }
        calculator.apiResult = null
        
        success('静态计算完成')
      } catch (error) {
        console.error('静态计算能量消耗时出错:', error)
        calculator.error = '计算失败，请检查配置参数'
        error('计算失败，请检查配置')
      }
    } else {
      // API查询模式
      if (!calculator.fromAddress || !calculator.toAddress) {
        calculator.error = '请输入发送地址和接收地址'
        warning('请输入发送和接收地址')
        return
      }

      calculator.isLoading = true
      calculator.result = null
      calculator.apiResult = null

      try {
        // 调用TRON API查询实际能量消耗
        const result = await queryUsdtTransferEnergyConsumption(
          calculator.fromAddress,
          calculator.toAddress,
          (calculator.amount * 1000000).toString() // 转换为wei单位
        )

        if (result.success) {
          calculator.apiResult = result
          success('API查询完成')
        } else {
          calculator.error = result.error || 'API查询失败'
          error(result.error || 'API查询失败')
        }
      } catch (error: any) {
        console.error('API查询能量消耗时出错:', error)
        calculator.error = error.message || 'API查询失败，请稍后重试'
        error('API查询失败，请稍后重试')
      } finally {
        calculator.isLoading = false
      }
    }
  }

  // 重置计算器
  const resetCalculator = () => {
    calculator.transferType = 'existing'
    calculator.amount = 100
    calculator.calculationMode = 'static'
    calculator.fromAddress = ''
    calculator.toAddress = ''
    calculator.result = null
    calculator.apiResult = null
    calculator.error = null
    calculator.isLoading = false
    success('计算器已重置')
  }

  // 使用默认测试地址
  const useDefaultAddresses = () => {
    const defaultAddresses = getDefaultTestAddresses()
    calculator.fromAddress = defaultAddresses.fromAddress
    calculator.toAddress = defaultAddresses.existingUsdtAddress
    success('已填入测试地址')
  }

  // 查询两种场景（新地址和已有USDT地址）
  const queryBothScenarios = async () => {
    if (!calculator.fromAddress) {
      calculator.error = '请先输入发送地址'
      warning('请先输入发送地址')
      return
    }

    calculator.isLoading = true
    calculator.error = null

    try {
      const scenarios = await queryUsdtEnergyConsumptionScenarios(calculator.fromAddress)
      
      if (scenarios.error) {
        calculator.error = scenarios.error
        error(scenarios.error)
        return
      }

      // 显示结果对比
      let message = '场景查询完成：\n'
      if (scenarios.existingAddress?.success) {
        message += `已有USDT地址：${scenarios.existingAddress.energy_used?.toLocaleString()} 能量\n`
      }
      if (scenarios.newAddress?.success) {
        message += `新地址：${scenarios.newAddress.energy_used?.toLocaleString()} 能量`
      }

      // 使用已有USDT地址的结果作为默认显示
      if (scenarios.existingAddress?.success) {
        calculator.apiResult = scenarios.existingAddress
        calculator.toAddress = scenarios.existingAddress.transaction_info?.to_address || ''
      }

      success(message, { duration: 5000 })
    } catch (error: any) {
      console.error('查询场景时出错:', error)
      calculator.error = error.message || '场景查询失败'
      error('场景查询失败，请稍后重试')
    } finally {
      calculator.isLoading = false
    }
  }

  return {
    calculator,
    energyConfig,
    isConfigLoaded,
    calculateEnergy,
    resetCalculator,
    useDefaultAddresses,
    queryBothScenarios,
    loadEnergyConfig
  }
}
