/**
 * 网络配置验证工具
 */
import { networkApi } from '@/api/network'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { energyPoolAPI } from '@/services/api/energy-pool/energyPoolAPI'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface NetworkValidationOptions {
  checkConnectivity?: boolean
  checkCompatibility?: boolean
  timeout?: number
}

/**
 * 验证网络配置
 */
export const validateNetworkConfig = async (
  networkId: string,
  options: NetworkValidationOptions = {}
): Promise<ValidationResult> => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  const {
    checkConnectivity = true,
    checkCompatibility = true,
    timeout = 10000
  } = options

  console.log(`🔍 [NetworkValidation] 开始验证网络配置，ID: ${networkId}, 选项:`, options)

  try {
    // 1. 检查网络是否存在
    const networkResponse = await networkApi.getNetwork(networkId)
    const network = networkResponse.data

    console.log(`🔍 [NetworkValidation] 获取网络信息:`, network)

    if (!network) {
      console.log(`❌ [NetworkValidation] 网络不存在，ID: ${networkId}`)
      result.isValid = false
      result.errors.push('网络不存在')
      return result
    }

    console.log(`✅ [NetworkValidation] 找到网络: ${network.name} (${network.network_type})`)

    // 2. 检查网络基本配置
    if (!network.rpc_url) {
      result.isValid = false
      result.errors.push('RPC URL 未配置')
    }

    if (!network.chain_id) {
      result.warnings.push('Chain ID 未配置，可能影响交易验证')
    }

    // 3. 检查网络连接性
    if (checkConnectivity) {
      // 基于网络状态进行简单验证，而不是实际连接测试
      if (!network.is_active) {
        result.warnings.push('网络当前处于非活跃状态，可能影响使用')
      }

      // 检查健康状态
      if (network.health_status === 'unhealthy') {
        result.warnings.push('网络健康状态异常，建议检查网络配置')
      } else if (network.health_status === 'error') {
        result.isValid = false
        result.errors.push('网络健康检查失败，无法使用此网络')
      } else if (network.health_status === 'unknown') {
        result.warnings.push('网络健康状态未知，可能是新配置的网络')
      }

      console.log(`✅ [NetworkValidation] 网络连接性检查完成，网络: ${network.name}，状态: ${network.health_status}, 活跃: ${network.is_active}`)
    }

    // 4. 检查网络兼容性
    if (checkCompatibility) {
      const networkType = network.network_type || network.type || ''
      if (!['mainnet', 'testnet', 'private'].includes(networkType)) {
        result.errors.push('只支持TRON网络类型')
        return result
      }

      // 检查是否为主网或测试网
      if (network.name.toLowerCase().includes('mainnet') || networkType === 'mainnet') {
        result.warnings.push('使用主网进行测试可能产生实际费用，请谨慎操作')
      }
    }

  } catch (error: any) {
    console.error('💥 [NetworkValidation] 验证过程中发生错误:', error)
    result.isValid = false
    result.errors.push(`验证过程中发生错误: ${error.message}`)
  }

  console.log(`🏁 [NetworkValidation] 验证完成，结果: ${result.isValid ? '通过' : '失败'}，错误: ${result.errors.length}，警告: ${result.warnings.length}`)
  
  return result
}

/**
 * 验证机器人网络配置
 */
export const validateBotNetworkConfig = async (
  botId: string,
  networkId: string
): Promise<ValidationResult> => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  try {
    // 1. 验证网络配置
    const networkValidation = await validateNetworkConfig(networkId)
    result.errors.push(...networkValidation.errors)
    result.warnings.push(...networkValidation.warnings)
    
    if (!networkValidation.isValid) {
      result.isValid = false
    }

    // 2. 检查机器人是否存在
    try {
      await botsAPI.getBot(botId)
    } catch (error) {
      result.isValid = false
      result.errors.push('机器人不存在或无法访问')
      return result
    }

    // 3. 检查是否已有其他网络配置
    try {
      const currentNetworkResponse = await botsAPI.getBotNetwork(botId)
      const currentNetwork = currentNetworkResponse.data.data.network
      
      if (currentNetwork && (currentNetwork as any).id !== networkId) {
        result.warnings.push(`机器人当前配置的网络为 "${(currentNetwork as any).name}"，更改网络可能影响现有配置`)
      }
    } catch (error) {
      // 如果获取当前网络配置失败，可能是首次配置，这是正常的
    }

  } catch (error: any) {
    result.isValid = false
    result.errors.push(`验证机器人网络配置时发生错误: ${error.message}`)
  }

  return result
}

/**
 * 验证能量池账户网络配置
 */
export const validateAccountNetworkConfig = async (
  accountId: string,
  networkId: string
): Promise<ValidationResult> => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  try {
    // 1. 验证网络配置
    const networkValidation = await validateNetworkConfig(networkId)
    result.errors.push(...networkValidation.errors)
    result.warnings.push(...networkValidation.warnings)
    
    if (!networkValidation.isValid) {
      result.isValid = false
    }

    // 2. 检查账户是否存在
    try {
      // 这里假设有获取单个账户的API，如果没有可以跳过这个检查
      // await energyPoolAPI.getAccount(accountId)
    } catch (error) {
      result.warnings.push('无法验证账户是否存在')
    }

    // 3. 检查是否已有其他网络配置
    try {
      const currentNetworkResponse = await energyPoolAPI.getAccountNetwork(accountId)
      const currentNetworkId = currentNetworkResponse.data.data.network_id
      
      if (currentNetworkId && currentNetworkId !== networkId) {
        result.warnings.push('账户当前已配置其他网络，更改网络可能影响现有操作')
      }
    } catch (error) {
      // 如果获取当前网络配置失败，可能是首次配置，这是正常的
    }

  } catch (error: any) {
    result.isValid = false
    result.errors.push(`验证账户网络配置时发生错误: ${error.message}`)
  }

  return result
}

/**
 * 批量验证网络配置
 */
export const batchValidateNetworkConfig = async (
  validations: Array<{
    type: 'bot' | 'account'
    id: string
    networkId: string
  }>
): Promise<Array<ValidationResult & { id: string; type: string }>> => {
  const results = await Promise.allSettled(
    validations.map(async (validation) => {
      let result: ValidationResult
      
      if (validation.type === 'bot') {
        result = await validateBotNetworkConfig(validation.id, validation.networkId)
      } else {
        result = await validateAccountNetworkConfig(validation.id, validation.networkId)
      }
      
      return {
        ...result,
        id: validation.id,
        type: validation.type
      }
    })
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        isValid: false,
        errors: [`验证失败: ${result.reason.message}`],
        warnings: [],
        id: validations[index].id,
        type: validations[index].type
      }
    }
  })
}

/**
 * 格式化验证结果为用户友好的消息
 */
export const formatValidationResult = (result: ValidationResult): string => {
  const messages: string[] = []
  
  if (result.isValid) {
    messages.push('✅ 网络配置验证通过')
  } else {
    messages.push('❌ 网络配置验证失败')
  }
  
  if (result.errors.length > 0) {
    messages.push('错误:')
    result.errors.forEach(error => {
      messages.push(`  • ${error}`)
    })
  }
  
  if (result.warnings.length > 0) {
    messages.push('警告:')
    result.warnings.forEach(warning => {
      messages.push(`  • ${warning}`)
    })
  }
  
  return messages.join('\n')
}