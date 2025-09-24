import { Router } from 'express'
import { PriceConfigController } from '../controllers/PriceConfigController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { validateModeType, validatePriceConfig, validatePriceConfigUpdate } from '../middleware/validation'

const router: Router = Router()
const priceConfigController = new PriceConfigController()

// 获取所有价格配置
router.get('/', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  priceConfigController.getAllConfigs
)

// 获取指定模式的价格配置
router.get('/:modeType', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  validateModeType,
  priceConfigController.getConfigByMode
)

// 创建新的价格配置
router.post('/', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  validatePriceConfig,
  priceConfigController.createConfig
)

// 更新价格配置（全局，不推荐使用）
router.put('/:modeType', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  validateModeType,
  validatePriceConfigUpdate,
  priceConfigController.updateConfig
)

// 更新特定网络的价格配置（推荐）
router.put('/:modeType/network/:networkId', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  validateModeType,
  validatePriceConfigUpdate,
  priceConfigController.updateConfigByNetwork
)

// 切换配置状态（所有同类型配置）
router.patch('/:modeType/toggle', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  priceConfigController.toggleConfigStatus
)

// 切换特定网络的配置状态
router.patch('/:modeType/:networkId/toggle', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  priceConfigController.toggleConfigStatusByNetwork
)

// 删除价格配置
router.delete('/:modeType', 
  authenticateToken,
  requireRole(['super_admin', 'admin']),
  priceConfigController.deleteConfig
)

// 获取活跃的价格配置（公开接口，用于前端展示）
router.get('/public/active', 
  priceConfigController.getActiveConfigs
)

export default router