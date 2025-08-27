/**
 * 代理商优惠价格配置API路由
 * 管理代理商的特殊价格和折扣
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import PriceCalculator from '../utils/price-calculator.js';

const router: Router = Router();

/**
 * 获取代理商价格配置列表
 * GET /api/agent-pricing
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      agent_id,
      package_id,
      status,
      search,
      level
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    if (agent_id) {
      whereConditions.push(`pc.agent_id = $${paramIndex}`);
      queryParams.push(agent_id);
      paramIndex++;
    }
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryParams.push(String(package_id));
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`pc.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (level) {
      whereConditions.push(`a.level = $${paramIndex}`);
      queryParams.push(level);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(a.agent_name ILIKE $${paramIndex} OR ep.package_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // 只查询代理商相关的价格配置
    whereConditions.push('pc.agent_id IS NOT NULL');
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询代理商价格配置
    const configsQuery = `
      SELECT 
        pc.*,
        a.agent_name,
        a.level as agent_level,
        a.status as agent_status,
        a.commission_rate,
        ep.package_name,
        ep.energy_amount,
        ep.duration_hours,
        pt.template_name,
        pt.base_price as template_base_price,
        u.username as created_by_name
      FROM price_configs pc
      LEFT JOIN agents a ON pc.agent_id = a.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      LEFT JOIN price_templates pt ON pc.template_id = pt.id
      LEFT JOIN users u ON pc.created_by = u.id
      ${whereClause}
      ORDER BY a.level DESC, pc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(Number(limit), offset);
    
    const configsResult = await query(configsQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_configs pc
      LEFT JOIN agents a ON pc.agent_id = a.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // 计算实际价格和佣金
    const configsWithPrices = await Promise.all(
      configsResult.rows.map(async (config) => {
        try {
          const calculatedPrice = await PriceCalculator.calculatePrice(
            config.package_id,
            1, // 数量为1
            null, // 无机器人
            config.agent_id
          );
          
          // 计算代理商佣金
          const commission = calculatedPrice.finalPrice * (config.commission_rate / 100);
          const agentPrice = calculatedPrice.finalPrice - commission;
          
          return {
            ...config,
            calculated_price: calculatedPrice.finalPrice,
            agent_price: agentPrice,
            commission_amount: commission,
            discount_applied: calculatedPrice.discount > 0,
            price_breakdown: calculatedPrice
          };
        } catch (error) {
          console.error(`计算价格失败 - 配置ID: ${config.id}`, error);
          return {
            ...config,
            calculated_price: config.price || 0,
            agent_price: config.price || 0,
            commission_amount: 0,
            discount_applied: 0,
            price_breakdown: null
          };
        }
      })
    );
    
    res.status(200).json({
      success: true,
      message: '获取代理商价格配置成功',
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
    console.error('获取代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取特定代理商的价格配置
 * GET /api/agent-pricing/agent/:agentId
 */
router.get('/agent/:agentId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { package_id } = req.query;
    
    // 验证代理商是否存在
    const agentResult = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
    if (agentResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    const agent = agentResult.rows[0];
    
    // 构建查询条件
    const whereConditions = ['pc.agent_id = $1'];
    const queryParams = [agentId];
    let paramIndex = 2;
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryParams.push(String(package_id));
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询代理商的价格配置
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
    
    // 计算实际价格和佣金
    const configsWithPrices = await Promise.all(
      configsResult.rows.map(async (config) => {
        const calculatedPrice = await PriceCalculator.calculatePrice(
          config.package_id,
          1,
          null,
          agentId
        );
        
        const commission = calculatedPrice.finalPrice * (agent.commission_rate / 100);
        const agentPrice = calculatedPrice.finalPrice - commission;
        
        return {
          ...config,
          calculated_price: calculatedPrice.finalPrice,
          agent_price: agentPrice,
          commission_amount: commission,
          price_breakdown: calculatedPrice
        };
      })
    );
    
    // 计算默认配置的价格
    const defaultConfigsWithPrices = await Promise.all(
      defaultConfigs.map(async (config) => {
        const calculatedPrice = await PriceCalculator.calculatePrice(
          config.package_id,
          1,
          null,
          null // 默认价格
        );
        
        const commission = calculatedPrice.finalPrice * (agent.commission_rate / 100);
        const agentPrice = calculatedPrice.finalPrice - commission;
        
        return {
          ...config,
          calculated_price: calculatedPrice.finalPrice,
          agent_price: agentPrice,
          commission_amount: commission,
          price_breakdown: calculatedPrice
        };
      })
    );
    
    res.status(200).json({
      success: true,
      message: '获取代理商价格配置成功',
      data: {
        agent: {
          id: agent.id,
          agent_name: agent.agent_name,
          level: agent.level,
          commission_rate: agent.commission_rate,
          status: agent.status
        },
        configs: configsWithPrices,
        defaultConfigs: defaultConfigsWithPrices,
        hasCustomPricing: configsResult.rows.length > 0
      }
    });
    
  } catch (error) {
    console.error('获取代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建代理商价格配置
 * POST /api/agent-pricing
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      agent_id,
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
    if (!agent_id || !package_id) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段：agent_id, package_id'
      });
      return;
    }
    
    // 验证代理商是否存在
    const agentResult = await query('SELECT id, status FROM agents WHERE id = $1', [agent_id]);
    if (agentResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商不存在'
      });
      return;
    }
    
    const agent = agentResult.rows[0];
    if (agent.status !== 'active') {
      res.status(400).json({
        success: false,
        message: '代理商状态不活跃，无法设置价格配置'
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
      'SELECT id FROM price_configs WHERE agent_id = $1 AND package_id = $2',
      [agent_id, package_id]
    );
    
    if (existingResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: '该代理商和能量包的价格配置已存在'
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
        agent_id, package_id, template_id, price, discount_percentage,
        min_price, max_price, quantity_discounts, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const insertResult = await query(insertQuery, [
      agent_id,
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
    const newPrice = await PriceCalculator.calculatePrice(package_id, 1, null, agent_id);
    
    // 记录价格历史
    if (oldPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'agent',
        agent_id,
        oldPrice,
        newPrice.finalPrice,
        `创建代理商价格配置 - 配置ID: ${newConfig.id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(201).json({
      success: true,
      message: '代理商价格配置创建成功',
      data: {
        config: newConfig,
        calculated_price: newPrice.finalPrice,
        price_breakdown: newPrice
      }
    });
    
  } catch (error) {
    console.error('创建代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新代理商价格配置
 * PUT /api/agent-pricing/:id
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
    
    // 验证配置是否存在且为代理商配置
    const existingResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND agent_id IS NOT NULL',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商价格配置不存在'
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
      null,
      existingConfig.agent_id
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
      null,
      existingConfig.agent_id
    );
    
    // 记录价格历史（如果价格有变化）
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'agent',
        existingConfig.agent_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `更新代理商价格配置 - 配置ID: ${id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(200).json({
      success: true,
      message: '代理商价格配置更新成功',
      data: {
        config: updatedConfig,
        calculated_price: newPrice.finalPrice,
        price_breakdown: newPrice
      }
    });
    
  } catch (error) {
    console.error('更新代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除代理商价格配置
 * DELETE /api/agent-pricing/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 验证配置是否存在且为代理商配置
    const existingResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND agent_id IS NOT NULL',
      [id]
    );
    
    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '代理商价格配置不存在'
      });
      return;
    }
    
    const existingConfig = existingResult.rows[0];
    
    // 计算删除前的价格
    const oldPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      existingConfig.agent_id
    );
    
    // 删除配置
    await query('DELETE FROM price_configs WHERE id = $1', [id]);
    
    // 计算删除后的价格（回到默认价格）
    const newPrice = await PriceCalculator.calculatePrice(
      existingConfig.package_id,
      1,
      null,
      null // 无代理商，使用默认价格
    );
    
    // 记录价格历史
    if (oldPrice.finalPrice !== newPrice.finalPrice) {
      await PriceCalculator.recordPriceHistory(
        'agent',
        existingConfig.agent_id,
        oldPrice.finalPrice,
        newPrice.finalPrice,
        `删除代理商价格配置 - 配置ID: ${id}`,
        req.user?.userId || ''
      );
    }
    
    res.status(200).json({
      success: true,
      message: '代理商价格配置删除成功'
    });
    
  } catch (error) {
    console.error('删除代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取代理商等级价格配置
 * GET /api/agent-pricing/levels
 */
router.get('/levels', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { package_id } = req.query;
    
    // 获取所有代理商等级的统计信息
    let whereCondition = '';
    const queryParams = [];
    
    if (package_id) {
      whereCondition = 'WHERE pc.package_id = $1';
      queryParams.push(package_id);
    }
    
    const levelsQuery = `
      SELECT 
        a.level,
        COUNT(DISTINCT a.id) as agent_count,
        COUNT(pc.id) as config_count,
        AVG(pc.discount_percentage) as avg_discount,
        MIN(pc.price) as min_price,
        MAX(pc.price) as max_price,
        AVG(pc.price) as avg_price
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id ${package_id ? 'AND pc.package_id = $1' : ''}
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC
    `;
    
    const levelsResult = await query(levelsQuery, queryParams);
    
    // 获取每个等级的示例代理商
    const levelsWithExamples = await Promise.all(
      levelsResult.rows.map(async (levelData) => {
        const examplesQuery = `
          SELECT 
            a.id,
            a.agent_name,
            a.commission_rate,
            COUNT(pc.id) as config_count
          FROM agents a
          LEFT JOIN price_configs pc ON a.id = pc.agent_id ${package_id ? 'AND pc.package_id = $1' : ''}
          WHERE a.level = $${queryParams.length + 1} AND a.status = 'active'
          GROUP BY a.id, a.agent_name, a.commission_rate
          ORDER BY config_count DESC
          LIMIT 5
        `;
        
        const exampleParams = package_id ? [package_id, levelData.level] : [levelData.level];
        const examplesResult = await query(examplesQuery, exampleParams);
        
        return {
          ...levelData,
          examples: examplesResult.rows
        };
      })
    );
    
    res.status(200).json({
      success: true,
      message: '获取代理商等级价格配置成功',
      data: {
        levels: levelsWithExamples,
        package_filter: package_id || null
      }
    });
    
  } catch (error) {
    console.error('获取代理商等级价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 批量设置代理商价格配置
 * POST /api/agent-pricing/batch
 */
router.post('/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { configs, apply_to_level } = req.body;
    
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
      // 如果指定了等级，获取该等级的所有代理商
      let targetAgents = [];
      if (apply_to_level) {
        const agentsResult = await query(
          'SELECT id FROM agents WHERE level = $1 AND status = $2',
          [apply_to_level, 'active']
        );
        targetAgents = agentsResult.rows.map(row => row.id);
      }
      
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        const {
          agent_id,
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
          if (!package_id) {
            errors.push({
              index: i,
              error: '缺少必填字段：package_id'
            });
            continue;
          }
          
          // 确定目标代理商列表
          const agentsToProcess = agent_id ? [agent_id] : targetAgents;
          
          if (agentsToProcess.length === 0) {
            errors.push({
              index: i,
              error: '没有指定代理商ID且未设置等级过滤'
            });
            continue;
          }
          
          // 为每个代理商创建或更新配置
          for (const currentAgentId of agentsToProcess) {
            // 检查是否已存在
            const existingResult = await query(
              'SELECT id FROM price_configs WHERE agent_id = $1 AND package_id = $2',
              [currentAgentId, package_id]
            );
            
            if (existingResult.rows.length > 0) {
              // 更新现有配置
              const updateQuery = `
                UPDATE price_configs 
                SET template_id = $3, price = $4, discount_percentage = $5,
                    min_price = $6, max_price = $7, quantity_discounts = $8,
                    status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
                WHERE agent_id = $1 AND package_id = $2
                RETURNING *
              `;
              
              const updateResult = await query(updateQuery, [
                currentAgentId,
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
                agent_id: currentAgentId,
                action: 'updated',
                config: updateResult.rows[0]
              });
            } else {
              // 创建新配置
              const insertQuery = `
                INSERT INTO price_configs (
                  agent_id, package_id, template_id, price, discount_percentage,
                  min_price, max_price, quantity_discounts, status, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
              `;
              
              const insertResult = await query(insertQuery, [
                currentAgentId,
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
                agent_id: currentAgentId,
                action: 'created',
                config: insertResult.rows[0]
              });
            }
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
          errors,
          applied_to_level: apply_to_level || null
        }
      });
      
    } catch (error) {
      // 回滚事务
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('批量设置代理商价格配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取代理商等级价格配置统计
 * GET /api/agent-pricing/level-stats
 */
router.get('/level-stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取各等级代理商的价格配置统计
    const levelStatsResult = await query(
      `SELECT 
        a.level,
        COUNT(DISTINCT a.id) as agent_count,
        COUNT(pc.id) as config_count,
        AVG(pc.price) as avg_price,
        MIN(pc.price) as min_price,
        MAX(pc.price) as max_price,
        AVG(pc.discount_percentage) as avg_discount,
        AVG(a.commission_rate) as avg_commission_rate
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id AND pc.status = 'active'
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC`
    );
    
    // 获取总体统计
    const overallStatsResult = await query(
      `SELECT 
        COUNT(DISTINCT a.id) as total_agents,
        COUNT(pc.id) as total_configs,
        AVG(pc.price) as overall_avg_price,
        SUM(CASE WHEN pc.discount_percentage > 0 THEN 1 ELSE 0 END) as configs_with_discount
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id AND pc.status = 'active'
      WHERE a.status = 'active'`
    );
    
    // 获取最近价格变更统计
    const recentChangesResult = await query(
      `SELECT 
        a.level,
        COUNT(ph.id) as recent_changes
      FROM agents a
      LEFT JOIN price_history ph ON a.id = ph.entity_id 
        AND ph.entity_type = 'agent' 
        AND ph.changed_at >= NOW() - INTERVAL '30 days'
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC`
    );
    
    const levelStats = levelStatsResult.rows.map(level => {
      const recentChange = recentChangesResult.rows.find(rc => rc.level === level.level);
      return {
        ...level,
        recent_changes: parseInt(recentChange?.recent_changes || '0')
      };
    });
    
    res.status(200).json({
      success: true,
      message: '获取代理商等级统计成功',
      data: {
        levelStats,
        overall: overallStatsResult.rows[0]
      }
    });
    
  } catch (error) {
    console.error('获取代理商等级统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;