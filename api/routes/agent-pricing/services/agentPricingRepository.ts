/**
 * 代理商价格配置数据访问层
 * 负责数据库操作
 */
import { query } from '../../../config/database.js';
import type {
    AgentPricingConfig,
    AgentPricingQuery,
    AgentPricingWithDetails,
    CreateAgentPricingRequest,
    UpdateAgentPricingRequest
} from '../types/agentPricing.types.js';

export class AgentPricingRepository {
  /**
   * 获取代理商价格配置列表
   */
  async findMany(queryParams: AgentPricingQuery): Promise<{ configs: AgentPricingWithDetails[], total: number }> {
    const {
      page = 1,
      limit = 20,
      agent_id,
      package_id,
      status,
      search,
      level
    } = queryParams;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereConditions = ['pc.agent_id IS NOT NULL'];
    const queryValues = [];
    let paramIndex = 1;
    
    if (agent_id) {
      whereConditions.push(`pc.agent_id = $${paramIndex}`);
      queryValues.push(agent_id);
      paramIndex++;
    }
    
    if (package_id) {
      whereConditions.push(`pc.package_id = $${paramIndex}`);
      queryValues.push(String(package_id));
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`pc.status = $${paramIndex}`);
      queryValues.push(status);
      paramIndex++;
    }
    
    if (level) {
      whereConditions.push(`a.level = $${paramIndex}`);
      queryValues.push(level);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(a.agent_name ILIKE $${paramIndex} OR ep.package_name ILIKE $${paramIndex})`);
      queryValues.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // 查询配置列表
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
    
    queryValues.push(Number(limit), offset);
    
    const configsResult = await query(configsQuery, queryValues);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM price_configs pc
      LEFT JOIN agents a ON pc.agent_id = a.id
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
   * 根据代理商ID获取价格配置
   */
  async findByAgentId(agentId: string, packageId?: string): Promise<AgentPricingWithDetails[]> {
    const whereConditions = ['pc.agent_id = $1'];
    const queryParams = [agentId];
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
  async findDefaultConfigs(): Promise<AgentPricingWithDetails[]> {
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
  async create(data: CreateAgentPricingRequest, createdBy: string): Promise<AgentPricingConfig> {
    const insertQuery = `
      INSERT INTO price_configs (
        agent_id, package_id, template_id, price, discount_percentage,
        min_price, max_price, quantity_discounts, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await query(insertQuery, [
      data.agent_id,
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
  async update(id: string, data: UpdateAgentPricingRequest): Promise<AgentPricingConfig> {
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
  async findById(id: string): Promise<AgentPricingConfig | null> {
    const result = await query(
      'SELECT * FROM price_configs WHERE id = $1 AND agent_id IS NOT NULL',
      [id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 检查配置是否已存在
   */
  async existsByAgentAndPackage(agentId: string, packageId: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM price_configs WHERE agent_id = $1 AND package_id = $2',
      [agentId, packageId]
    );
    
    return result.rows.length > 0;
  }

  /**
   * 获取代理商等级统计
   */
  async getLevelStats(packageId?: string): Promise<any[]> {
    let whereCondition = '';
    const queryParams = [];
    
    if (packageId) {
      whereCondition = 'WHERE pc.package_id = $1';
      queryParams.push(packageId);
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
      LEFT JOIN price_configs pc ON a.id = pc.agent_id ${packageId ? 'AND pc.package_id = $1' : ''}
      WHERE a.status = 'active'
      GROUP BY a.level
      ORDER BY a.level DESC
    `;
    
    const result = await query(levelsQuery, queryParams);
    return result.rows;
  }

  /**
   * 获取等级示例代理商
   */
  async getLevelExamples(level: string, packageId?: string): Promise<any[]> {
    const examplesQuery = `
      SELECT 
        a.id,
        a.agent_name,
        a.commission_rate,
        COUNT(pc.id) as config_count
      FROM agents a
      LEFT JOIN price_configs pc ON a.id = pc.agent_id ${packageId ? 'AND pc.package_id = $1' : ''}
      WHERE a.level = $${packageId ? '2' : '1'} AND a.status = 'active'
      GROUP BY a.id, a.agent_name, a.commission_rate
      ORDER BY config_count DESC
      LIMIT 5
    `;
    
    const params = packageId ? [packageId, level] : [level];
    const result = await query(examplesQuery, params);
    return result.rows;
  }

  /**
   * 批量创建或更新配置
   */
  async batchUpsert(agentId: string, packageId: string, data: CreateAgentPricingRequest, userId: string): Promise<{ action: 'created' | 'updated', config: AgentPricingConfig }> {
    // 检查是否已存在
    const existing = await query(
      'SELECT id FROM price_configs WHERE agent_id = $1 AND package_id = $2',
      [agentId, packageId]
    );
    
    if (existing.rows.length > 0) {
      // 更新现有配置
      const updateQuery = `
        UPDATE price_configs 
        SET template_id = $3, price = $4, discount_percentage = $5,
            min_price = $6, max_price = $7, quantity_discounts = $8,
            status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = $1 AND package_id = $2
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        agentId,
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
          agent_id, package_id, template_id, price, discount_percentage,
          min_price, max_price, quantity_discounts, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        agentId,
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
}
