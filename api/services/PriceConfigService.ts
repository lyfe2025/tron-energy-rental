import pool from '../config/database'
import {
  validateEnergyFlashConfig,
  validateTransactionPackageConfig,
  validateTrxExchangeConfig
} from '../middleware/validation'
import { logger } from '../utils/logger'

export interface PriceConfig {
  id: string
  mode_type: 'energy_flash' | 'transaction_package' | 'trx_exchange'
  name: string
  description: string
  config: any
  inline_keyboard_config?: any
  is_active: boolean
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface CreatePriceConfigData {
  mode_type: string
  name: string
  description: string
  config: any
  inline_keyboard_config?: any
  is_active: boolean
  created_by: string
}

export interface UpdatePriceConfigData {
  name?: string
  description?: string
  config?: any
  inline_keyboard_config?: any
}

export class PriceConfigService {
  // 获取所有价格配置
  async getAllConfigs(): Promise<PriceConfig[]> {
    try {
      const query = `
        SELECT id, mode_type, name, description, config, inline_keyboard_config, 
               is_active, created_by, created_at, updated_at
        FROM price_configs
        ORDER BY created_at DESC
      `
      const result = await pool.query(query)
      return result.rows
    } catch (error) {
      logger.error('Get all configs error:', error)
      throw error
    }
  }

  // 根据模式类型获取配置
  async getConfigByMode(modeType: string): Promise<PriceConfig | null> {
    try {
      const query = `
        SELECT id, mode_type, name, description, config, inline_keyboard_config, 
               is_active, created_by, created_at, updated_at
        FROM price_configs
        WHERE mode_type = $1
      `
      const result = await pool.query(query, [modeType])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Get config by mode error:', error)
      throw error
    }
  }

  // 获取活跃的配置
  async getActiveConfigs(): Promise<PriceConfig[]> {
    try {
      const query = `
        SELECT id, mode_type, name, description, config, inline_keyboard_config, 
               is_active, created_by, created_at, updated_at
        FROM price_configs
        WHERE is_active = true
        ORDER BY mode_type
      `
      const result = await pool.query(query)
      return result.rows
    } catch (error) {
      logger.error('Get active configs error:', error)
      throw error
    }
  }

  // 创建新配置
  async createConfig(data: CreatePriceConfigData): Promise<PriceConfig> {
    try {
      const query = `
        INSERT INTO price_configs (mode_type, name, description, config, inline_keyboard_config, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, mode_type, name, description, config, inline_keyboard_config, 
                  is_active, created_by, created_at, updated_at
      `
      const values = [
        data.mode_type,
        data.name,
        data.description,
        JSON.stringify(data.config),
        data.inline_keyboard_config ? JSON.stringify(data.inline_keyboard_config) : null,
        data.is_active,
        data.created_by
      ]
      
      const result = await pool.query(query, values)
      return result.rows[0]
    } catch (error) {
      logger.error('Create config error:', error)
      throw error
    }
  }

  // 更新配置
  async updateConfig(modeType: string, data: UpdatePriceConfigData): Promise<PriceConfig | null> {
    try {
      const setParts: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`)
        values.push(data.name)
      }

      if (data.description !== undefined) {
        setParts.push(`description = $${paramIndex++}`)
        values.push(data.description)
      }

      if (data.config !== undefined) {
        setParts.push(`config = $${paramIndex++}`)
        values.push(JSON.stringify(data.config))
      }

      if (data.inline_keyboard_config !== undefined) {
        setParts.push(`inline_keyboard_config = $${paramIndex++}`)
        values.push(data.inline_keyboard_config ? JSON.stringify(data.inline_keyboard_config) : null)
      }

      if (setParts.length === 0) {
        throw new Error('No fields to update')
      }

      setParts.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(modeType)

      const query = `
        UPDATE price_configs 
        SET ${setParts.join(', ')}
        WHERE mode_type = $${paramIndex}
        RETURNING id, mode_type, name, description, config, inline_keyboard_config, 
                  is_active, created_by, created_at, updated_at
      `

      const result = await pool.query(query, values)
      return result.rows[0] || null
    } catch (error) {
      logger.error('Update config error:', error)
      throw error
    }
  }

  // 更新配置状态
  async updateConfigStatus(modeType: string, isActive: boolean): Promise<PriceConfig | null> {
    try {
      const query = `
        UPDATE price_configs 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE mode_type = $2
        RETURNING id, mode_type, name, description, config, inline_keyboard_config, 
                  is_active, created_by, created_at, updated_at
      `
      const result = await pool.query(query, [isActive, modeType])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Update config status error:', error)
      throw error
    }
  }

  // 删除配置
  async deleteConfig(modeType: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM price_configs WHERE mode_type = $1'
      const result = await pool.query(query, [modeType])
      return result.rowCount > 0
    } catch (error) {
      logger.error('Delete config error:', error)
      throw error
    }
  }

  // 根据模式类型获取特定配置数据
  async getEnergyFlashConfig(): Promise<any | null> {
    const config = await this.getConfigByMode('energy_flash')
    return config?.is_active ? config.config : null
  }

  async getTransactionPackageConfig(): Promise<any | null> {
    const config = await this.getConfigByMode('transaction_package')
    return config?.is_active ? config.config : null
  }

  async getTrxExchangeConfig(): Promise<any | null> {
    const config = await this.getConfigByMode('trx_exchange')
    return config?.is_active ? config.config : null
  }


  // 验证配置数据格式
  validateConfigData(modeType: string, config: any): boolean {
    try {
      let errors: string[] = []
      
      switch (modeType) {
        case 'energy_flash':
          errors = validateEnergyFlashConfig(config)
          break
        case 'transaction_package':
          errors = validateTransactionPackageConfig(config)
          break
        case 'trx_exchange':
          errors = validateTrxExchangeConfig(config)
          break
        default:
          return false
      }
      
      if (errors.length > 0) {
        logger.error('Config validation errors:', errors)
      }
      
      return errors.length === 0
    } catch (error) {
      logger.error('Config validation error:', error)
      return false
    }
  }

  // 获取指定模式类型的内嵌键盘配置
  async getInlineKeyboardConfig(modeType: string): Promise<any | null> {
    try {
      const config = await this.getConfigByMode(modeType)
      if (!config?.is_active || !config.inline_keyboard_config) {
        return null
      }
      return config.inline_keyboard_config
    } catch (error) {
      logger.error('Get inline keyboard config error:', error)
      throw error
    }
  }

  // 更新指定模式类型的内嵌键盘配置
  async updateInlineKeyboardConfig(modeType: string, keyboardConfig: any): Promise<PriceConfig | null> {
    try {
      return await this.updateConfig(modeType, { inline_keyboard_config: keyboardConfig })
    } catch (error) {
      logger.error('Update inline keyboard config error:', error)
      throw error
    }
  }

  // 检查内嵌键盘是否启用
  async isInlineKeyboardEnabled(modeType: string): Promise<boolean> {
    try {
      const keyboardConfig = await this.getInlineKeyboardConfig(modeType)
      return keyboardConfig?.enabled === true
    } catch (error) {
      logger.error('Check inline keyboard enabled error:', error)
      return false
    }
  }

  // 获取所有启用内嵌键盘的配置
  async getConfigsWithInlineKeyboard(): Promise<PriceConfig[]> {
    try {
      const query = `
        SELECT id, mode_type, name, description, config, inline_keyboard_config, 
               is_active, created_by, created_at, updated_at
        FROM price_configs
        WHERE is_active = true 
          AND inline_keyboard_config IS NOT NULL 
          AND inline_keyboard_config->>'enabled' = 'true'
        ORDER BY mode_type
      `
      const result = await pool.query(query)
      return result.rows
    } catch (error) {
      logger.error('Get configs with inline keyboard error:', error)
      throw error
    }
  }
}