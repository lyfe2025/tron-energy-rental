/**
 * 机器人差异化定价配置API路由
 * 支持不同机器人的个性化价格设置和管理
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import PriceCalculator from '../utils/price-calculator.js';

const router: Router = Router();

/**
 * 获取机器人价格配置列表
 * GET /api/robot-pricing
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      bot_id,
      package_id,
      status,
      search
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (bot_id) {
      whereConditions.push(`pc.bot_id = $${paramIndex}`);
      queryParams.push(bot_id);
      paramIndex++;
    }
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryParams.push(package_id);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`pc.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(b.bot_name ILIKE $${paramIndex} OR ep.package_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // 只查询机器人相关的价格配置
    whereConditions.push('pc.bot_id IS NOT NULL');
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询机器人价格配置
    const configsQuery = `
      SELECT 
        pc.*,
        b.bot_name,
        b.bot_type,
        b.status as bot_status,
        ep.package_name,
        ep.energy_amount,
        ep.duration_hours,
        pt.template_name,
        pt.base_price as template_base_price,
        u.username as created_by_name
      FROM price_configs pc
      LEFT JOIN bots b ON pc.bot_id = b.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      LEFT JOIN users u ON pc.created_by = u.id
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const configsResult = await query(configsQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_configs pc
      LEFT JOIN bots b ON pc.bot_id = b.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // 计算实际价格
    const configsWithPrices = await Promise.all(
      configsResult.rows.map(async (config) => {
        try {
          const calculatedPrice = await PriceCalculator.calculatePrice(
            config.package_id,
            1, // 数量为1
            config.bot_id,
            null // 无代理商
          );
          
          return {
            ...config,
            calculated_price: calculatedPrice.finalPrice,
            discount_applied: calculatedPrice.discount > 0,
            price_breakdown: calculatedPrice
          };
        } catch (error) {
          console.error(`计算价格失败 - 配置ID: ${config.id}`, error);
          return {
            ...config,
            calculated_price: config.price || 0,
            discount_applied: 0,
            price_breakdown: null
          };
        }
      })
    );
    
    res.status(200).json({
      success: true,
      message: '获取机器人价格配置成功',
      data: {
        configs: configsWithPrices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('获取机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取特定机器人的价格配置
 * GET /api/robot-pricing/bot/:botId
 */
router.get('/bot/:botId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { botId } = req.params;
    const { package_id } = req.query;
    
    // 验证机器人是否存在
    const botResult = await query('SELECT * FROM bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    const bot = botResult.rows[0];
    
    // 构建查询条件
    let whereConditions = ['pc.bot_id = $1'];
    let queryParams = [botId];
    let paramIndex = 2;
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryParams.push(String(package_id));
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询机器人的价格配置
    const configsQuery = `
      SELECT 
        pc.*,
        ep.package_name,
        ep.energy_amount,
        ep.duration_hours,
        pt.template_name,
        pt.base_price as template_base_price
      FROM price_configs pc
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      ${whereClause}
      ORDER BY pc.created_at DESC
    `;
    
    const configsResult = await query(configsQuery, queryParams);
    
    // 如果没有特定配置，获取默认配置
    let defaultConfigs = [];
    if (configsResult.rows.length === 0 || !package_id) {
      const defaultQuery = `
        SELECT 
          pc.*,
          ep.package_name,
          ep.energy_amount,
          ep.duration_hours,
          pt.template_name,
          pt.base_price as template_base_price
        FROM price_configs pc
        LEFT JOIN energy_packages ep ON pc.package_id = ep.id
        LEFT JOIN price_templates pt ON pc.template_id = pt.id
        WHERE pc.bot_id IS NULL AND pc.agent_id IS NULL
        ORDER BY pc.created_at DESC
      `;
      
      const defaultResult = await query(defaultQuery);
      defaultConfigs = defaultResult.rows;
    }
    
    // 计算实际价格
    const configsWithPrices = await Promise.all(
      configsResult.rows.map(async (config) => {
        const calculatedPrice = await PriceCalculator.calculatePrice(
          config.package_id,
          1,
          botId,
          null
        );
        
        return {
          ...config,
          calculated_price: calculatedPrice.finalPrice,
          price_breakdown: calculatedPrice
        };
      })
    );
    
    res.status(200).json({
      success: true,
      message: '获取机器人价格配置成功',
      data: {
        bot: {
          id: bot.id,
          bot_name: bot.bot_name,
          bot_type: bot.bot_type,
          status: bot.status
        },
        configs: configsWithPrices,
        defaultConfigs: defaultConfigs,
        hasCustomPricing: configsResult.rows.length > 0
      }
    });
    
  } catch (error) {
    console.error('获取机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建机器人价格配置
 * POST /api/robot-pricing
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      bot_id,
      package_id,
      template_id,
      price,
      discount_percentage,
      min_price,
      max_price,
      quantity_discounts,
      status = 'active',
      notes
    } = req.body;
    
    // 验证必填字段
    if (!bot_id || !package_id) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：bot_id, package_id'
      });
      return;
    }
    
    // 验证机器人是否存在
    const botResult = await query('SELECT id FROM bots WHERE id = $1', [bot_id]);
    if (botResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 验证能量包是否存在
    const packageResult = await query('SELECT id FROM energy_packages WHERE id = $1', [package_id]);
    if (packageResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '能量包不存在'
      });
      return;
    }
    
    // 验证模板是否存在（如果提供）
    if (template_id) {
      const templateResult = await query('SELECT id FROM price_templates WHERE id = $1', [template_id]);
      if (templateResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '价格模板不存在'
        });
        return;
      }
    }
    
    // 检查是否已存在相同的配置
    const existingResult = await query(
      'SELECT id FROM price_configs WHERE bot_id = $1 AND package_id = $2',
      [bot_id, package_id]
    );
    
    if (existingResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: '该机器人和能量包的价格配置已存在'
      });
      return;
    }
    
    // 验证价格数据
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      res.status(400).json({
        success: false,
        message: '价格必须是非负数'
      });
      return;
    }
    
    if (discount_percentage !== undefined && (typeof discount_percentage !== 'number' || discount_percentage < 0 || discount_percentage > 100)) {
      res.status(400).json({
        success: false,
        message: '折扣百分比必须在0-100之间'
      });
      return;
    }
    
    // 验证数量折扣格式
    if (quantity_discounts && !Array.isArray(quantity_discounts)) {
      res.status(400).json({
        success: false,
        message: '数量折扣必须是数组格式'
      });
      return;
    }
    
    // 记录旧价格（用于历史记录）
    let oldPrice = 0;
    try {
      const defaultPrice = await PriceCalculator.calculatePrice(package_id, 1, null, null);
      oldPrice = defaultPrice.finalPrice;
    } catch (error) {
      console.warn('无法获取默认价格:', error);
    }
    
    // 创建价格配置
    const insertQuery = `
      INSERT INTO price_configs (
        bot_id, package_id, template_id, price, discount_percentage,
        min_price, max_price, quantity_discounts, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const insertResult = await query(insertQuery, [
      bot_id,
      package_id,
      template_id,
      price,
      discount_percentage,
      min_price,
      max_price,
      quantity_discounts ? JSON.stringify(quantity_discounts) : null,
      status,
      notes,
      req.user?.userId
    ]);
    
    const newConfig = insertResult.rows[0];
    
    // 计算新价格
    const newPrice = await PriceCalculator.calculatePrice(package_id, 1, bot_id, null);
    
    // 记录价格历史
    if (oldPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'bot',
        bot_id,
        oldPrice,
        newPrice.finalPrice,
        `创建机器人价格配置 - 配置ID: ${newConfig.id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(201).json({
      success: true,
      message: '机器人价格配置创建成功',
      data: {
        config: newConfig,
        calculated_price: newPrice.finalPrice,
        price_breakdown: newPrice
      }
    });
    
  } catch (error) {
    console.error('创建机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新机器人价格配置
 * PUT /api/robot-pricing/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      template_id,
      price,
      discount_percentage,
      min_price,
      max_price,
      quantity_discounts,
      status,
      notes
    } = req.body;
    
    // 验证配置是否存在且为机器人配置
    const existingResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人价格配置不存在'
      });
      return;
    }
    
    const existingConfig = existingResult.rows[0];
    
    // 验证模板是否存在（如果提供）
    if (template_id) {
      const templateResult = await query('SELECT id FROM price_templates WHERE id = $1', [template_id]);
      if (templateResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '价格模板不存在'
        });
        return;
      }
    }
    
    // 验证价格数据
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      res.status(400).json({
        success: false,
        message: '价格必须是非负数'
      });
      return;
    }
    
    if (discount_percentage !== undefined && (typeof discount_percentage !== 'number' || discount_percentage < 0 || discount_percentage > 100)) {
      res.status(400).json({
        success: false,
        message: '折扣百分比必须在0-100之间'
      });
      return;
    }
    
    // 验证数量折扣格式
    if (quantity_discounts && !Array.isArray(quantity_discounts)) {
      res.status(400).json({
        success: false,
        message: '数量折扣必须是数组格式'
      });
      return;
    }
    
    // 计算旧价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );
    
    // 构建更新字段
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (template_id !== undefined) {
      updateFields.push(`template_id = $${paramIndex}`);
      updateValues.push(template_id);
      paramIndex++;
    }
    
    if (price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(price);
      paramIndex++;
    }
    
    if (discount_percentage !== undefined) {
      updateFields.push(`discount_percentage = $${paramIndex}`);
      updateValues.push(discount_percentage);
      paramIndex++;
    }
    
    if (min_price !== undefined) {
      updateFields.push(`min_price = $${paramIndex}`);
      updateValues.push(min_price);
      paramIndex++;
    }
    
    if (max_price !== undefined) {
      updateFields.push(`max_price = $${paramIndex}`);
      updateValues.push(max_price);
      paramIndex++;
    }
    
    if (quantity_discounts !== undefined) {
      updateFields.push(`quantity_discounts = $${paramIndex}`);
      updateValues.push(quantity_discounts ? JSON.stringify(quantity_discounts) : null);
      paramIndex++;
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    // 更新配置
    const updateQuery = `
      UPDATE price_configs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const updateResult = await query(updateQuery, updateValues);
    const updatedConfig = updateResult.rows[0];
    
    // 计算新价格
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );
    
    // 记录价格历史（如果价格有变化）
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'bot',
        existingConfig.bot_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `更新机器人价格配置 - 配置ID: ${id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(200).json({
      success: true,
      message: '机器人价格配置更新成功',
      data: {
        config: updatedConfig,
        calculated_price: newPrice.finalPrice,
        price_breakdown: newPrice
      }
    });
    
  } catch (error) {
    console.error('更新机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除机器人价格配置
 * DELETE /api/robot-pricing/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 验证配置是否存在且为机器人配置
    const existingResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人价格配置不存在'
      });
      return;
    }
    
    const existingConfig = existingResult.rows[0];
    
    // 计算删除前的价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      existingConfig.bot_id,
      null
    );
    
    // 删除配置
    await query('DELETE FROM price_configs WHERE id = $1', [id]);
    
    // 计算删除后的价格（回到默认价格）
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null, // 无机器人，使用默认价格
      null
    );
    
    // 记录价格历史
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'bot',
        existingConfig.bot_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `删除机器人价格配置 - 配置ID: ${id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(200).json({
      success: true,
      message: '机器人价格配置删除成功'
    });
    
  } catch (error) {
    console.error('删除机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量设置机器人价格配置
 * POST /api/robot-pricing/batch
 */
router.post('/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      res.status(400).json({
        success: false,
        message: '配置数据必须是非空数组'
      });
      return;
    }
    
    if (configs.length > 100) {
      res.status(400).json({
        success: false,
        message: '批量操作最多支持100个配置'
      });
      return;
    }
    
    const results = [];
    const errors = [];
    
    // 开始事务
    await query('BEGIN');
    
    try {
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        const {
          bot_id,
          package_id,
          template_id,
          price,
          discount_percentage,
          min_price,
          max_price,
          quantity_discounts,
          status = 'active',
          notes
        } = config;
        
        try {
          // 验证必填字段
          if (!bot_id || !package_id) {
            errors.push({
              index: i,
              error: '缺少必填字段：bot_id, package_id'
            });
            continue;
          }
          
          // 检查是否已存在
          const existingResult = await query(
            'SELECT id FROM price_configs WHERE bot_id = $1 AND package_id = $2',
            [bot_id, package_id]
          );
          
          if (existingResult.rows.length > 0) {
            // 更新现有配置
            const updateQuery = `
              UPDATE price_configs 
              SET template_id = $3, price = $4, discount_percentage = $5,
                  min_price = $6, max_price = $7, quantity_discounts = $8,
                  status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
              WHERE bot_id = $1 AND package_id = $2
              RETURNING *
            `;
            
            const updateResult = await query(updateQuery, [
              bot_id,
              package_id,
              template_id,
              price,
              discount_percentage,
              min_price,
              max_price,
              quantity_discounts ? JSON.stringify(quantity_discounts) : null,
              status,
              notes
            ]);
            
            results.push({
              index: i,
              action: 'updated',
              config: updateResult.rows[0]
            });
          } else {
            // 创建新配置
            const insertQuery = `
              INSERT INTO price_configs (
                bot_id, package_id, template_id, price, discount_percentage,
                min_price, max_price, quantity_discounts, status, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *
            `;
            
            const insertResult = await query(insertQuery, [
              bot_id,
              package_id,
              template_id,
              price,
              discount_percentage,
              min_price,
              max_price,
              quantity_discounts ? JSON.stringify(quantity_discounts) : null,
              status,
              notes,
              req.user?.userId
            ]);
            
            results.push({
              index: i,
              action: 'created',
              config: insertResult.rows[0]
            });
          }
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }
      
      // 提交事务
      await query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: '批量操作完成',
        data: {
          successful: results.length,
          failed: errors.length,
          results,
          errors
        }
      });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('批量设置机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 复制机器人价格配置
 * POST /api/robot-pricing/:id/copy
 */
router.post('/:id/copy', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { target_bot_ids, target_package_ids } = req.body;
    
    // 验证源配置是否存在
    const sourceResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [id]
    );
    
    if (sourceResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '源机器人价格配置不存在'
      });
      return;
    }
    
    const sourceConfig = sourceResult.rows[0];
    
    if (!Array.isArray(target_bot_ids) || target_bot_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: '目标机器人ID列表不能为空'
      });
      return;
    }
    
    const results = [];
    const errors = [];
    
    // 开始事务
    await query('BEGIN');
    
    try {
      for (const targetBotId of target_bot_ids) {
        // 如果指定了目标能量包，使用指定的；否则使用源配置的能量包
        const packageIds = target_package_ids && target_package_ids.length > 0 
          ? target_package_ids 
          : [sourceConfig.package_id];
        
        for (const packageId of packageIds) {
          try {
            // 检查是否已存在
            const existingResult = await query(
              'SELECT id FROM price_configs WHERE bot_id = $1 AND package_id = $2',
              [targetBotId, packageId]
            );
            
            if (existingResult.rows.length > 0) {
              errors.push({
                bot_id: targetBotId,
                package_id: packageId,
                error: '配置已存在'
              });
              continue;
            }
            
            // 创建新配置
            const insertQuery = `
              INSERT INTO price_configs (
                bot_id, package_id, template_id, price, discount_percentage,
                min_price, max_price, quantity_discounts, status, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *
            `;
            
            const insertResult = await query(insertQuery, [
              targetBotId,
              packageId,
              sourceConfig.template_id,
              sourceConfig.price,
              sourceConfig.discount_percentage,
              sourceConfig.min_price,
              sourceConfig.max_price,
              sourceConfig.quantity_discounts,
              sourceConfig.status,
              `复制自配置ID: ${id}`,
              req.user?.userId
            ]);
            
            results.push({
              bot_id: targetBotId,
              package_id: packageId,
              config: insertResult.rows[0]
            });
            
          } catch (error) {
            errors.push({
              bot_id: targetBotId,
              package_id: packageId,
              error: error instanceof Error ? error.message : '未知错误'
            });
          }
        }
      }
      
      // 提交事务
      await query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: '复制配置完成',
        data: {
          successful: results.length,
          failed: errors.length,
          results,
          errors
        }
      });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('复制机器人价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;