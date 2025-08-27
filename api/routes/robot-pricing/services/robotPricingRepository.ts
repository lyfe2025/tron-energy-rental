/**
 * 机器人价格配置数据访问层
 * 负责数据库操作
 */
import { query } from '../../../config/database.js';
import type {
    CreateRobotPricingRequest,
    RobotPricingConfig,
    RobotPricingQuery,
    RobotPricingWithDetails,
    UpdateRobotPricingRequest
} from '../types/robotPricing.types.js';

export class RobotPricingRepository {
  /**
   * 获取机器人价格配置列表
   */
  async findMany(queryParams: RobotPricingQuery): Promise<{ configs: RobotPricingWithDetails[], total: number }> {
    const {
      page = 1,
      limit = 20,
      bot_id,
      package_id,
      status,
      search
    } = queryParams;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = ['pc.bot_id IS NOT NULL'];
    const queryValues = [];
    let paramIndex = 1;
    
    if (bot_id) {
      whereConditions.push(`pc.bot_id = $${paramIndex}`);
      queryValues.push(bot_id);
      paramIndex++;
    }
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryValues.push(package_id);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`pc.status = $${paramIndex}`);
      queryValues.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(b.bot_name ILIKE $${paramIndex} OR ep.package_name ILIKE $${paramIndex})`);
      queryValues.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询配置列表
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
    
    queryValues.push(Number(limit), offset);
    
    const configsResult = await query(configsQuery, queryValues);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_configs pc
      LEFT JOIN bots b ON pc.bot_id = b.id
      LEFT JOIN energy_packages ep ON pc.package_id = ep.id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryValues.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    return {
      configs: configsResult.rows,
      total
    };
  }

  /**
   * 根据机器人ID获取价格配置
   */
  async findByBotId(botId: string, packageId?: string): Promise<RobotPricingWithDetails[]> {
    const whereConditions = ['pc.bot_id = $1'];
    const queryParams = [botId];
    let paramIndex = 2;
    
    if (packageId) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryParams.push(String(packageId));
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
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
    
    const result = await query(configsQuery, queryParams);
    return result.rows;
  }

  /**
   * 获取默认价格配置
   */
  async findDefaultConfigs(): Promise<RobotPricingWithDetails[]> {
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
    
    const result = await query(defaultQuery);
    return result.rows;
  }

  /**
   * 创建价格配置
   */
  async create(data: CreateRobotPricingRequest, createdBy: string): Promise<RobotPricingConfig> {
    const insertQuery = `
      INSERT INTO price_configs (
        bot_id, package_id, template_id, price, discount_percentage,
        min_price, max_price, quantity_discounts, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      data.bot_id,
      data.package_id,
      data.template_id,
      data.price,
      data.discount_percentage,
      data.min_price,
      data.max_price,
      data.quantity_discounts ? JSON.stringify(data.quantity_discounts) : null,
      data.status || 'active',
      data.notes,
      createdBy
    ]);
    
    return result.rows[0];
  }

  /**
   * 更新价格配置
   */
  async update(id: string, data: UpdateRobotPricingRequest): Promise<RobotPricingConfig> {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (data.template_id !== undefined) {
      updateFields.push(`template_id = $${paramIndex}`);
      updateValues.push(data.template_id);
      paramIndex++;
    }
    
    if (data.price !== undefined) {
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(data.price);
      paramIndex++;
    }
    
    if (data.discount_percentage !== undefined) {
      updateFields.push(`discount_percentage = $${paramIndex}`);
      updateValues.push(data.discount_percentage);
      paramIndex++;
    }
    
    if (data.min_price !== undefined) {
      updateFields.push(`min_price = $${paramIndex}`);
      updateValues.push(data.min_price);
      paramIndex++;
    }
    
    if (data.max_price !== undefined) {
      updateFields.push(`max_price = $${paramIndex}`);
      updateValues.push(data.max_price);
      paramIndex++;
    }
    
    if (data.quantity_discounts !== undefined) {
      updateFields.push(`quantity_discounts = $${paramIndex}`);
      updateValues.push(data.quantity_discounts ? JSON.stringify(data.quantity_discounts) : null);
      paramIndex++;
    }
    
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(data.status);
      paramIndex++;
    }
    
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(data.notes);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE price_configs 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await query(updateQuery, updateValues);
    return result.rows[0];
  }

  /**
   * 删除价格配置
   */
  async delete(id: string): Promise<void> {
    await query('DELETE FROM price_configs WHERE id = $1', [id]);
  }

  /**
   * 检查配置是否存在
   */
  async findById(id: string): Promise<RobotPricingConfig | null> {
    const result = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 检查配置是否已存在
   */
  async existsByBotAndPackage(botId: string, packageId: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM price_configs WHERE bot_id = $1 AND package_id = $2',
      [botId, packageId]
    );
    
    return result.rows.length > 0;
  }

  /**
   * 批量创建或更新配置
   */
  async batchUpsert(botId: string, packageId: string, data: CreateRobotPricingRequest, userId: string): Promise<{ action: 'created' | 'updated', config: RobotPricingConfig }> {
    // 检查是否已存在
    const existing = await query(
      'SELECT id FROM price_configs WHERE bot_id = $1 AND package_id = $2',
      [botId, packageId]
    );
    
    if (existing.rows.length > 0) {
      // 更新现有配置
      const updateQuery = `
        UPDATE price_configs 
        SET template_id = $3, price = $4, discount_percentage = $5,
            min_price = $6, max_price = $7, quantity_discounts = $8,
            status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
        WHERE bot_id = $1 AND package_id = $2
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        botId,
        packageId,
        data.template_id,
        data.price,
        data.discount_percentage,
        data.min_price,
        data.max_price,
        data.quantity_discounts ? JSON.stringify(data.quantity_discounts) : null,
        data.status || 'active',
        data.notes
      ]);
      
      return { action: 'updated', config: result.rows[0] };
    } else {
      // 创建新配置
      const insertQuery = `
        INSERT INTO price_configs (
          bot_id, package_id, template_id, price, discount_percentage,
          min_price, max_price, quantity_discounts, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        botId,
        packageId,
        data.template_id,
        data.price,
        data.discount_percentage,
        data.min_price,
        data.max_price,
        data.quantity_discounts ? JSON.stringify(data.quantity_discounts) : null,
        data.status || 'active',
        data.notes,
        userId
      ]);
      
      return { action: 'created', config: result.rows[0] };
    }
  }

  /**
   * 复制配置
   */
  async copyConfig(sourceConfigId: string, targetBotId: string, targetPackageId: string, userId: string): Promise<RobotPricingConfig> {
    // 获取源配置
    const sourceResult = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND bot_id IS NOT NULL',
      [sourceConfigId]
    );
    
    if (sourceResult.rows.length === 0) {
      throw new Error('源配置不存在');
    }
    
    const sourceConfig = sourceResult.rows[0];
    
    // 创建新配置
    const insertQuery = `
      INSERT INTO price_configs (
        bot_id, package_id, template_id, price, discount_percentage,
        min_price, max_price, quantity_discounts, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      targetBotId,
      targetPackageId,
      sourceConfig.template_id,
      sourceConfig.price,
      sourceConfig.discount_percentage,
      sourceConfig.min_price,
      sourceConfig.max_price,
      sourceConfig.quantity_discounts,
      sourceConfig.status,
      `复制自配置ID: ${sourceConfigId}`,
      userId
    ]);
    
    return result.rows[0];
  }
}
