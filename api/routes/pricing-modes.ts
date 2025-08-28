import { Router, type Request, type Response } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = Router();

// 能量闪租模式配置验证模式
const energyFlashModeSchema = z.object({
  unit_price: z.number().min(0.1).max(10),
  max_quantity: z.number().int().min(1).max(10),
  expiry_hours: z.number().int().min(1).max(24),
  double_energy_for_no_usdt: z.boolean().optional().default(true),
  collection_address: z.string().regex(/^T[A-Za-z1-9]{33}$/)
});

// 笔数套餐模式配置验证模式
const transactionPackageModeSchema = z.object({
  packages: z.array(z.object({
    transactions: z.number().int().min(1),
    price: z.number().min(0.1)
  })).min(1),
  occupation_fee_hours: z.number().int().min(1).max(168),
  occupation_fee_amount: z.number().int().min(1).max(10),
  transfer_enabled: z.boolean().optional().default(true)
});

const updateModeConfigSchema = z.object({
  config: z.union([energyFlashModeSchema, transactionPackageModeSchema]),
  is_enabled: z.boolean().optional()
});

// 获取所有定价模式
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id,
        mode_type,
        config_schema,
        default_config,
        is_enabled,
        created_at,
        updated_at
      FROM pricing_modes
      ORDER BY 
        CASE mode_type 
          WHEN 'energy_flash' THEN 1
          WHEN 'transaction_package' THEN 2
          ELSE 3
        END
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取定价模式失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定价模式失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取特定定价模式
router.get('/:mode_type', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    const query = `
      SELECT 
        id,
        mode_type,
        config_schema,
        default_config,
        is_enabled,
        created_at,
        updated_at
      FROM pricing_modes
      WHERE mode_type = $1
    `;

    const result = await pool.query(query, [mode_type]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '定价模式不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取定价模式失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定价模式失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 更新定价模式配置
router.put('/:mode_type', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;
    const validatedData = updateModeConfigSchema.parse(req.body);

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    // 验证配置数据格式
    if (mode_type === 'energy_flash') {
      energyFlashModeSchema.parse(validatedData.config);
    } else {
      transactionPackageModeSchema.parse(validatedData.config);
    }

    // 检查模式是否存在
    const existingQuery = 'SELECT id FROM pricing_modes WHERE mode_type = $1';
    const existingResult = await pool.query(existingQuery, [mode_type]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '定价模式不存在'
      });
    }

    // 构建更新查询
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    updateFields.push(`default_config = $${paramIndex}`);
    updateValues.push(JSON.stringify(validatedData.config));
    paramIndex++;

    if (validatedData.is_enabled !== undefined) {
      updateFields.push(`is_enabled = $${paramIndex}`);
      updateValues.push(validatedData.is_enabled);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(mode_type);

    const updateQuery = `
      UPDATE pricing_modes 
      SET ${updateFields.join(', ')}
      WHERE mode_type = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      data: result.rows[0],
      message: '定价模式配置更新成功'
    });
  } catch (error) {
    console.error('更新定价模式配置失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }

    res.status(500).json({
      success: false,
      message: '更新定价模式配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 切换定价模式启用状态
router.patch('/:mode_type/toggle', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    const toggleQuery = `
      UPDATE pricing_modes 
      SET is_enabled = NOT is_enabled, updated_at = NOW()
      WHERE mode_type = $1
      RETURNING *
    `;

    const result = await pool.query(toggleQuery, [mode_type]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '定价模式不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `${mode_type === 'energy_flash' ? '能量闪租' : '笔数套餐'}模式已${result.rows[0].is_enabled ? '启用' : '禁用'}`
    });
  } catch (error) {
    console.error('切换定价模式状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换定价模式状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 重置定价模式为默认配置
router.post('/:mode_type/reset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    // 获取默认配置
    let defaultConfig;
    if (mode_type === 'energy_flash') {
      defaultConfig = {
        unit_price: 2.6,
        max_quantity: 5,
        expiry_hours: 1,
        double_energy_for_no_usdt: true,
        collection_address: "TWdcgk9NEsV1nt5yPrNfSYktbA12345678"
      };
    } else {
      defaultConfig = {
        packages: [
          { transactions: 10, price: 25 },
          { transactions: 50, price: 120 },
          { transactions: 100, price: 230 }
        ],
        occupation_fee_hours: 24,
        occupation_fee_amount: 1,
        transfer_enabled: true
      };
    }

    const resetQuery = `
      UPDATE pricing_modes 
      SET default_config = $1, updated_at = NOW()
      WHERE mode_type = $2
      RETURNING *
    `;

    const result = await pool.query(resetQuery, [JSON.stringify(defaultConfig), mode_type]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '定价模式不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `${mode_type === 'energy_flash' ? '能量闪租' : '笔数套餐'}模式已重置为默认配置`
    });
  } catch (error) {
    console.error('重置定价模式失败:', error);
    res.status(500).json({
      success: false,
      message: '重置定价模式失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 验证定价模式配置
router.post('/:mode_type/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;
    const { config } = req.body;

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    if (!config) {
      return res.status(400).json({
        success: false,
        message: '请提供配置数据'
      });
    }

    // 验证配置数据格式
    try {
      if (mode_type === 'energy_flash') {
        energyFlashModeSchema.parse(config);
      } else {
        transactionPackageModeSchema.parse(config);
      }

      res.json({
        success: true,
        message: '配置验证通过',
        data: {
          valid: true,
          config
        }
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: '配置验证失败',
          data: {
            valid: false,
            errors: validationError.issues
          }
        });
      }
      throw validationError;
    }
  } catch (error) {
    console.error('验证定价模式配置失败:', error);
    res.status(500).json({
      success: false,
      message: '验证定价模式配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 获取定价模式使用统计
router.get('/:mode_type/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { mode_type } = req.params;

    if (!['energy_flash', 'transaction_package'].includes(mode_type)) {
      return res.status(400).json({
        success: false,
        message: '无效的定价模式类型'
      });
    }

    const statsQuery = `
      SELECT 
        COUNT(ps.id) as strategy_count,
        COUNT(CASE WHEN ps.is_active = true THEN 1 END) as active_strategy_count,
        0 as bot_config_count,
        0 as active_bot_config_count
      FROM pricing_strategies ps
      WHERE ps.type = $1
    `;

    const result = await pool.query(statsQuery, [mode_type]);
    const stats = result.rows[0];

    // 获取最近更新时间
    const lastUpdateQuery = `
      SELECT MAX(updated_at) as last_updated
      FROM pricing_strategies
      WHERE type = $1
    `;

    const lastUpdateResult = await pool.query(lastUpdateQuery, [mode_type]);
    const lastUpdated = lastUpdateResult.rows[0]?.last_updated;

    res.json({
      success: true,
      data: {
        mode_type,
        strategy_count: Number(stats.strategy_count),
        active_strategy_count: Number(stats.active_strategy_count),
        bot_config_count: 0, // 旧的机器人配置表已移除
        active_bot_config_count: 0, // 旧的机器人配置表已移除
        last_updated: lastUpdated
      }
    });
  } catch (error) {
    console.error('获取定价模式统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定价模式统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;