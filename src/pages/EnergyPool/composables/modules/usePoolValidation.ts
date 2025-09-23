/**
 * 能源池验证逻辑模块
 * 负责数据验证、格式检查等验证相关逻辑
 */

import type { AccountAddData, AccountUpdateData, EnergyPoolAccount } from '../types/energy-pool.types';

export function usePoolValidation() {

  // 验证TRON地址格式
  const validateTronAddress = (address: string): { isValid: boolean; error?: string } => {
    if (!address) {
      return { isValid: false, error: 'TRON地址不能为空' }
    }

    // TRON地址基本格式检查（Base58格式，以T开头，34位长度）
    const tronAddressRegex = /^T[A-HJ-NP-Z1-9]{33}$/
    if (!tronAddressRegex.test(address)) {
      return { isValid: false, error: '无效的TRON地址格式' }
    }

    return { isValid: true }
  }

  // 验证私钥格式
  const validatePrivateKey = (privateKey: string): { isValid: boolean; error?: string } => {
    if (!privateKey) {
      return { isValid: false, error: '私钥不能为空' }
    }

    // 简单的十六进制格式检查（64位十六进制字符）
    const hexRegex = /^[0-9a-fA-F]{64}$/
    if (!hexRegex.test(privateKey)) {
      return { isValid: false, error: '私钥必须是64位十六进制字符' }
    }

    return { isValid: true }
  }

  // 验证账户名称
  const validateAccountName = (name: string): { isValid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: '账户名称不能为空' }
    }

    if (name.length > 50) {
      return { isValid: false, error: '账户名称不能超过50个字符' }
    }

    return { isValid: true }
  }

  // 验证能量值
  const validateEnergyAmount = (amount: number): { isValid: boolean; error?: string } => {
    if (amount < 0) {
      return { isValid: false, error: '能量值不能为负数' }
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
      return { isValid: false, error: '能量值超出最大限制' }
    }

    return { isValid: true }
  }

  // 验证优先级
  const validatePriority = (priority: number): { isValid: boolean; error?: string } => {
    if (priority < 1 || priority > 100) {
      return { isValid: false, error: '优先级必须在1-100之间' }
    }

    return { isValid: true }
  }

  // 验证添加账户数据
  const validateAccountAddData = (data: AccountAddData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 验证账户名称
    const nameValidation = validateAccountName(data.name)
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error!)
    }

    // 验证TRON地址
    const addressValidation = validateTronAddress(data.tron_address)
    if (!addressValidation.isValid) {
      errors.push(addressValidation.error!)
    }

    // 验证私钥
    const privateKeyValidation = validatePrivateKey(data.private_key_encrypted)
    if (!privateKeyValidation.isValid) {
      errors.push(privateKeyValidation.error!)
    }

    // 注意：能量值验证已移除，现在从TRON网络实时获取
    // const energyValidation = validateEnergyAmount(data.total_energy)
    // if (!energyValidation.isValid) {
    //   errors.push(energyValidation.error!)
    // }

    // 验证优先级（如果提供）
    if (data.priority !== undefined) {
      const priorityValidation = validatePriority(data.priority)
      if (!priorityValidation.isValid) {
        errors.push(priorityValidation.error!)
      }
    }

    // 验证限制值（如果提供）
    if (data.daily_limit !== undefined && data.daily_limit < 0) {
      errors.push('日限制值不能为负数')
    }

    if (data.monthly_limit !== undefined && data.monthly_limit < 0) {
      errors.push('月限制值不能为负数')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 验证更新账户数据
  const validateAccountUpdateData = (data: AccountUpdateData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 验证账户名称（如果提供）
    if (data.name !== undefined) {
      const nameValidation = validateAccountName(data.name)
      if (!nameValidation.isValid) {
        errors.push(nameValidation.error!)
      }
    }

    // 验证TRON地址（如果提供）
    if (data.tron_address !== undefined) {
      const addressValidation = validateTronAddress(data.tron_address)
      if (!addressValidation.isValid) {
        errors.push(addressValidation.error!)
      }
    }

    // 验证私钥（如果提供）
    if (data.private_key_encrypted !== undefined) {
      const privateKeyValidation = validatePrivateKey(data.private_key_encrypted)
      if (!privateKeyValidation.isValid) {
        errors.push(privateKeyValidation.error!)
      }
    }

    // 验证优先级（如果提供）
    if (data.priority !== undefined) {
      const priorityValidation = validatePriority(data.priority)
      if (!priorityValidation.isValid) {
        errors.push(priorityValidation.error!)
      }
    }

    // 验证限制值（如果提供）
    if (data.daily_limit !== undefined && data.daily_limit < 0) {
      errors.push('日限制值不能为负数')
    }

    if (data.monthly_limit !== undefined && data.monthly_limit < 0) {
      errors.push('月限制值不能为负数')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 检查账户是否可用
  const isAccountAvailable = (account: EnergyPoolAccount): boolean => {
    // 注意：能量检查已移除，现在仅检查状态
    return account.status === 'active'
    // 能量可用性需要通过实时API检查
  }

  // 检查账户是否需要维护
  const needsMaintenance = (account: EnergyPoolAccount): boolean => {
    // 注意：能量检查逻辑已移除，维护状态需要通过实时数据判断
    // 暂时返回false，实际使用时需要通过实时API获取能量数据
    return false
    // 实际逻辑: 如果可用能量低于总能量的10%，建议维护
    // const threshold = realTimeEnergy.total * 0.1
    // return realTimeEnergy.available < threshold
  }

  // 计算账户利用率
  const calculateUtilization = (account: EnergyPoolAccount): number => {
    // 注意：利用率计算已移除，需要通过实时API获取数据计算
    // 暂时返回0，实际使用时需要传入实时能量数据
    return 0
    // 实际逻辑:
    // if (realTimeEnergy.total === 0) return 0
    // const used = realTimeEnergy.total - realTimeEnergy.available
    // return (used / realTimeEnergy.total) * 100
  }

  return {
    validateTronAddress,
    validatePrivateKey,
    validateAccountName,
    validateEnergyAmount,
    validatePriority,
    validateAccountAddData,
    validateAccountUpdateData,
    isAccountAvailable,
    needsMaintenance,
    calculateUtilization
  }
}
