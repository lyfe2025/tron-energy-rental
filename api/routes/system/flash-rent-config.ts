import type { Request, Response, Router } from 'express';
import express from 'express';
import { query } from '../../database/index';
// import { validateRequest } from '../../middleware/validation';
import { authenticateToken, requirePermission } from '../../middleware/rbac';

const router: Router = express.Router();

// 统一应用认证中间件
router.use(authenticateToken);

/**
 * 获取能量闪租配置
 * GET /api/system/flash-rent-config
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { network_id } = req.query;
    

    let queryStr = `
      SELECT 
        pc.id,
        pc.mode_type,
        pc.name,
        pc.description,
        pc.config,
        pc.is_active,
        pc.network_id,
        pc.enable_image,
        pc.image_url,
        pc.image_alt,
        tn.name as network_name,
        pc.created_at,
        pc.updated_at
      FROM price_configs pc
      JOIN tron_networks tn ON pc.network_id = tn.id
      WHERE pc.mode_type = 'energy_flash'
    `;
    
    const queryParams: any[] = [];
    
    if (network_id) {
      queryStr += ' AND pc.network_id = $1::uuid';
      queryParams.push(network_id);
    }
    
    queryStr += ' ORDER BY pc.created_at DESC';

    const result = await query(queryStr, queryParams);

    const configs = result.rows.map(row => ({
      id: row.id,
      mode_type: row.mode_type,
      name: row.name,
      description: row.description,
      network_id: row.network_id,
      network_name: row.network_name,
      is_active: row.is_active,
      enable_image: row.enable_image,
      image_url: row.image_url,
      image_alt: row.image_alt,
      config: {
        ...row.config,
        // 确保敏感信息不被暴露
        payment_address: row.config?.payment_address || '',
        single_price: row.config?.single_price || 0,
        max_amount: row.config?.max_amount || 0,
        expiry_hours: row.config?.expiry_hours || 1,
      },
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('获取闪租配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 更新能量闪租配置
 * PUT /api/system/flash-rent-config/:id
 */
router.put('/:id', 
  requirePermission('system_config_write'),
  validateFlashRentConfig,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, config, is_active, enable_image, image_url, image_alt } = req.body;

      // 验证配置格式
      const validationError = validateFlashRentConfigData(config);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: '配置验证失败',
          message: validationError
        });
      }

      // 检查配置是否存在
      const existingResult = await query(
        'SELECT id FROM price_configs WHERE id = $1 AND mode_type = $2',
        [id, 'energy_flash']
      );

      if (!existingResult.rows || existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '配置不存在'
        });
      }

      // 更新配置
      const updateResult = await query(
        `UPDATE price_configs 
         SET name = $1, description = $2, config = $3, is_active = $4, 
             enable_image = $5, image_url = $6, image_alt = $7, updated_at = $8
         WHERE id = $9 AND mode_type = 'energy_flash'
         RETURNING *`,
        [name, description, JSON.stringify(config), is_active, enable_image, image_url, image_alt, new Date(), id]
      );

      const updatedConfig = updateResult.rows[0];

      res.json({
        success: true,
        message: '配置更新成功',
        data: {
          id: updatedConfig.id,
          name: updatedConfig.name,
          description: updatedConfig.description,
          config: updatedConfig.config,
          is_active: updatedConfig.is_active,
          enable_image: updatedConfig.enable_image,
          image_url: updatedConfig.image_url,
          image_alt: updatedConfig.image_alt,
          updated_at: updatedConfig.updated_at
        }
      });

      console.log(`闪租配置已更新: ${id}`, { name, is_active });
    } catch (error) {
      console.error('更新闪租配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新配置失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
);

/**
 * 创建能量闪租配置
 * POST /api/system/flash-rent-config
 */
router.post('/', 
  requirePermission('system_config_write'),
  validateFlashRentConfig,
  async (req: Request, res: Response) => {
    try {
      const { name, description, config, network_id } = req.body;

      // 验证配置格式
      const validationError = validateFlashRentConfigData(config);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: '配置验证失败',
          message: validationError
        });
      }

      // 检查网络是否存在
      const networkResult = await query(
        'SELECT id FROM tron_networks WHERE id = $1',
        [network_id]
      );

      if (!networkResult.rows || networkResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: '指定的网络不存在'
        });
      }

      // 检查该网络是否已有闪租配置
      const existingResult = await query(
        'SELECT id FROM price_configs WHERE mode_type = $1 AND network_id = $2',
        ['energy_flash', network_id]
      );

      if (existingResult.rows && existingResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '该网络已存在闪租配置'
        });
      }

      // 创建配置
      const createResult = await query(
        `INSERT INTO price_configs 
         (mode_type, name, description, config, network_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          'energy_flash',
          name,
          description,
          JSON.stringify(config),
          network_id,
          true,
          new Date(),
          new Date()
        ]
      );

      const newConfig = createResult.rows[0];

      res.status(201).json({
        success: true,
        message: '配置创建成功',
        data: {
          id: newConfig.id,
          mode_type: newConfig.mode_type,
          name: newConfig.name,
          description: newConfig.description,
          config: newConfig.config,
          network_id: newConfig.network_id,
          is_active: newConfig.is_active,
          created_at: newConfig.created_at,
          updated_at: newConfig.updated_at
        }
      });

      console.log(`新闪租配置已创建:`, { 
        id: newConfig.id, 
        name, 
        network_id 
      });
    } catch (error) {
      console.error('创建闪租配置失败:', error);
      
      // 处理唯一约束错误
      if (error instanceof Error && error.message.includes('unique')) {
        return res.status(400).json({
          success: false,
          error: '该网络已存在闪租配置',
          message: '请检查网络配置是否重复'
        });
      }

      res.status(500).json({
        success: false,
        error: '创建配置失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
);

/**
 * 获取可用网络列表
 * GET /api/system/flash-rent-config/networks
 */
router.get('/networks', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
         tn.id, 
         tn.name,
         tn.network_type,
         tn.is_active,
         CASE 
           WHEN pc.id IS NOT NULL THEN true 
           ELSE false 
         END as has_flash_config
       FROM tron_networks tn
       LEFT JOIN price_configs pc ON tn.id = pc.network_id AND pc.mode_type = 'energy_flash'
       WHERE tn.is_active = true
       ORDER BY tn.name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取网络列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取网络列表失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 验证闪租配置请求中间件
 */
function validateFlashRentConfig(req: Request, res: Response, next: any) {
  const { name, description, config } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: '配置名称不能为空'
    });
  }

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      success: false,
      error: '配置内容格式错误'
    });
  }

  next();
}

/**
 * 验证闪租配置数据格式
 */
function validateFlashRentConfigData(config: any): string | null {
  if (!config.payment_address || typeof config.payment_address !== 'string') {
    return '收款地址不能为空';
  }

  // 验证TRON地址格式
  if (!/^T[A-Za-z1-9]{33}$/.test(config.payment_address)) {
    return '收款地址格式不正确';
  }

  if (!config.single_price || typeof config.single_price !== 'number' || config.single_price <= 0) {
    return '单价必须大于0';
  }

  // 支持 max_amount 或 max_transactions 字段（兼容性考虑）
  const maxValue = config.max_amount || config.max_transactions;
  if (!maxValue || typeof maxValue !== 'number' || maxValue <= 0) {
    return '最大笔数必须大于0';
  }

  if (config.expiry_hours !== undefined && 
      (typeof config.expiry_hours !== 'number' || config.expiry_hours < 0)) {
    return '过期时间必须为非负数';
  }

  return null;
}

export default router;
