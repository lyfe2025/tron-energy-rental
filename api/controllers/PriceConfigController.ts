import { type Request, type Response } from 'express'
import { PriceConfigService } from '../services/PriceConfigService'
import { logger } from '../utils/logger'

export class PriceConfigController {
  private priceConfigService: PriceConfigService

  constructor() {
    this.priceConfigService = new PriceConfigService()
  }

  // 获取所有价格配置（支持按网络ID筛选）
  getAllConfigs = async (req: Request, res: Response) => {
    try {
      const { network_id } = req.query
      const configs = await this.priceConfigService.getAllConfigs(
        typeof network_id === 'string' ? network_id : undefined
      )
      res.json(configs)
    } catch (error) {
      logger.error('Get all configs error:', error)
      res.status(500).json({ 
        error: 'Failed to get price configs',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 获取指定模式的价格配置
  getConfigByMode = async (req: Request, res: Response) => {
    try {
      const { modeType } = req.params
      const config = await this.priceConfigService.getConfigByMode(modeType)
      
      if (!config) {
        return res.status(404).json({ error: 'Price config not found' })
      }
      
      res.json(config)
    } catch (error) {
      logger.error('Get config by mode error:', error)
      res.status(500).json({ 
        error: 'Failed to get price config',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 创建新的价格配置
  createConfig = async (req: Request, res: Response) => {
    try {
      const { 
        mode_type, 
        name, 
        description, 
        config, 
        inline_keyboard_config, 
        image_url, 
        image_alt, 
        enable_image, 
        is_active 
      } = req.body
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // 检查是否已存在相同模式的配置
      const existingConfig = await this.priceConfigService.getConfigByMode(mode_type)
      if (existingConfig) {
        return res.status(409).json({ error: 'Config for this mode already exists' })
      }

      const newConfig = await this.priceConfigService.createConfig({
        mode_type,
        name,
        description,
        config,
        inline_keyboard_config,
        image_url,
        image_alt,
        enable_image: enable_image ?? false,
        is_active: is_active ?? true,
        created_by: userId
      })

      res.status(201).json(newConfig)
    } catch (error) {
      logger.error('Create config error:', error)
      res.status(500).json({ 
        error: 'Failed to create price config',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 更新价格配置
  updateConfig = async (req: Request, res: Response) => {
    try {
      const { modeType } = req.params
      const { 
        config, 
        name, 
        description, 
        inline_keyboard_config, 
        image_url, 
        image_alt, 
        enable_image 
      } = req.body

      const updatedConfig = await this.priceConfigService.updateConfig(modeType, {
        config,
        name,
        description,
        inline_keyboard_config,
        image_url,
        image_alt,
        enable_image
      })

      if (!updatedConfig) {
        return res.status(404).json({ error: 'Price config not found' })
      }

      res.json(updatedConfig)
    } catch (error) {
      logger.error('Update config error:', error)
      res.status(500).json({ 
        error: 'Failed to update price config',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 切换配置状态（所有同类型配置）
  toggleConfigStatus = async (req: Request, res: Response) => {
    try {
      const { modeType } = req.params
      const { is_active } = req.body


      const updatedConfig = await this.priceConfigService.updateConfigStatus(modeType, is_active)

      if (!updatedConfig) {
        return res.status(404).json({ error: 'Price config not found' })
      }

      // 🔥 当启用配置时，执行相应的启用逻辑
      await this.handleConfigToggle(modeType, is_active)

      res.json(updatedConfig)
    } catch (error) {
      logger.error('Toggle config status error:', error)
      res.status(500).json({ 
        error: 'Failed to toggle config status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 切换特定网络的配置状态
  toggleConfigStatusByNetwork = async (req: Request, res: Response) => {
    try {
      const { modeType, networkId } = req.params
      const { is_active } = req.body


      const updatedConfig = await this.priceConfigService.updateConfigStatusByNetwork(modeType, networkId, is_active)

      if (!updatedConfig) {
        return res.status(404).json({ error: 'Price config not found for this network' })
      }

      // 🔥 当启用配置时，执行相应的启用逻辑
      await this.handleConfigToggle(modeType, is_active, networkId)

      res.json(updatedConfig)
    } catch (error) {
      logger.error('Toggle config status by network error:', error)
      res.status(500).json({ 
        error: 'Failed to toggle config status for network',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 处理不同配置类型启用时的相关逻辑（提取为共用方法）
  private async handleConfigToggle(modeType: string, isActive: boolean, networkId?: string) {
    const logPrefix = networkId ? `网络 ${networkId.slice(0,8)}... 的` : ''
    
    switch (modeType) {
      case 'energy_flash':
        if (isActive) {
          await this.handleEnergyFlashEnable(logPrefix)
        }
        break
        
      case 'transaction_package':
        if (isActive) {
          logger.info(`🔄 ${logPrefix}笔数套餐已启用`)
          // TODO: 如果笔数套餐需要特殊处理，在这里添加
        }
        break
        
      case 'trx_exchange':  
        if (isActive) {
          logger.info(`🔄 ${logPrefix}TRX闪兑已启用`)
          // TODO: 如果TRX闪兑需要特殊处理，在这里添加
        }
        break
        
      default:
        if (isActive) {
          logger.info(`🔄 ${logPrefix}配置类型 ${modeType} 已启用`)
        }
        break
    }
  }

  // 处理能量闪租启用的专用逻辑
  private async handleEnergyFlashEnable(logPrefix: string) {
    try {
      // 导入TransactionMonitorService - 延迟导入避免循环依赖
      const { getTransactionMonitorInstance } = await import('../utils/transaction-monitor-singleton.ts')
      const transactionMonitor = getTransactionMonitorInstance()
      
      logger.info(`🔄 ${logPrefix}能量闪租已启用，重新加载交易监听地址...`)
      
      await transactionMonitor.reloadAddresses()
      
      const monitorStatus = transactionMonitor.getStatus()
      logger.info(`📡 监听状态更新: ${monitorStatus.isRunning ? '运行中' : '未运行'}, 监听地址数: ${monitorStatus.monitoredAddresses}`)
      
      // 如果有地址需要监听但监听服务未运行，则启动监听
      if (monitorStatus.monitoredAddresses > 0 && !monitorStatus.isRunning) {
        await transactionMonitor.startMonitoring()
        logger.info('✅ 交易监听服务已自动启动')
      }
    } catch (monitorError) {
      logger.error('交易监听服务重新加载失败:', monitorError)
      // 不阻断配置更新，只记录错误
    }
  }

  // 删除价格配置
  deleteConfig = async (req: Request, res: Response) => {
    try {
      const { modeType } = req.params

      const deleted = await this.priceConfigService.deleteConfig(modeType)

      if (!deleted) {
        return res.status(404).json({ error: 'Price config not found' })
      }

      res.json({ message: 'Price config deleted successfully' })
    } catch (error) {
      logger.error('Delete config error:', error)
      res.status(500).json({ 
        error: 'Failed to delete price config',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // 获取活跃的价格配置（公开接口）
  getActiveConfigs = async (req: Request, res: Response) => {
    try {
      const configs = await this.priceConfigService.getActiveConfigs()
      res.json(configs)
    } catch (error) {
      logger.error('Get active configs error:', error)
      res.status(500).json({ 
        error: 'Failed to get active price configs',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}