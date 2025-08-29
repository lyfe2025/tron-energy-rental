import express, { type Request, type Response } from 'express'
import { PriceConfigService } from '../services/PriceConfigService'
import { logger } from '../utils/logger'

export class PriceConfigController {
  private priceConfigService: PriceConfigService

  constructor() {
    this.priceConfigService = new PriceConfigService()
  }

  // 获取所有价格配置
  getAllConfigs = async (req: Request, res: Response) => {
    try {
      const configs = await this.priceConfigService.getAllConfigs()
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
      const { mode_type, name, description, config, is_active } = req.body
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
      const { config, name, description } = req.body

      const updatedConfig = await this.priceConfigService.updateConfig(modeType, {
        config,
        name,
        description
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

  // 切换配置状态
  toggleConfigStatus = async (req: Request, res: Response) => {
    try {
      const { modeType } = req.params
      const { is_active } = req.body

      const updatedConfig = await this.priceConfigService.updateConfigStatus(modeType, is_active)

      if (!updatedConfig) {
        return res.status(404).json({ error: 'Price config not found' })
      }

      res.json(updatedConfig)
    } catch (error) {
      logger.error('Toggle config status error:', error)
      res.status(500).json({ 
        error: 'Failed to toggle config status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
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