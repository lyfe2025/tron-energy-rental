/**
 * 能量计算器逻辑
 */

import {
    getDefaultTestAddresses,
    queryUsdtEnergyConsumptionScenarios,
    queryUsdtTransferEnergyConsumption
} from '@/services/tronApiService'
import { ElMessage } from 'element-plus'
import { reactive } from 'vue'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import type { CalculatorState } from '../types/energy-calculator.types'

export function useEnergyCalculator(localConfig: EnergyConfig) {
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

  // 计算能量消耗
  const calculateEnergy = async () => {
    calculator.error = null
    
    if (calculator.calculationMode === 'static') {
      // 静态计算
      try {
        // 根据转账类型确定基础能量消耗
        const baseEnergy = calculator.transferType === 'existing' ? 65000 : 130000
        
        // 计算缓冲能量
        const bufferPercentage = localConfig.usdt_buffer_percentage || 10
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
        
        ElMessage.success('静态计算完成！')
      } catch (error) {
        console.error('静态计算能量消耗时出错:', error)
        calculator.error = '计算失败，请检查配置参数'
        ElMessage.error('计算失败，请检查配置参数')
      }
    } else {
      // API查询模式
      if (!calculator.fromAddress || !calculator.toAddress) {
        calculator.error = '请输入发送地址和接收地址'
        ElMessage.warning('请输入发送地址和接收地址')
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
          ElMessage.success('API查询完成！')
        } else {
          calculator.error = result.error || 'API查询失败'
          ElMessage.error(result.error || 'API查询失败')
        }
      } catch (error: any) {
        console.error('API查询能量消耗时出错:', error)
        calculator.error = error.message || 'API查询失败，请稍后重试'
        ElMessage.error('API查询失败，请稍后重试')
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
    ElMessage.info('计算器已重置')
  }

  // 使用默认测试地址
  const useDefaultAddresses = () => {
    const defaultAddresses = getDefaultTestAddresses()
    calculator.fromAddress = defaultAddresses.fromAddress
    calculator.toAddress = defaultAddresses.existingUsdtAddress
    ElMessage.success('已填入测试地址')
  }

  // 查询两种场景（新地址和已有USDT地址）
  const queryBothScenarios = async () => {
    if (!calculator.fromAddress) {
      calculator.error = '请先输入发送地址'
      ElMessage.warning('请先输入发送地址')
      return
    }

    calculator.isLoading = true
    calculator.error = null

    try {
      const scenarios = await queryUsdtEnergyConsumptionScenarios(calculator.fromAddress)
      
      if (scenarios.error) {
        calculator.error = scenarios.error
        ElMessage.error(scenarios.error)
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

      ElMessage.success({
        message: message,
        duration: 5000,
        showClose: true
      })
    } catch (error: any) {
      console.error('查询场景时出错:', error)
      calculator.error = error.message || '场景查询失败'
      ElMessage.error('场景查询失败，请稍后重试')
    } finally {
      calculator.isLoading = false
    }
  }

  return {
    calculator,
    calculateEnergy,
    resetCalculator,
    useDefaultAddresses,
    queryBothScenarios
  }
}
