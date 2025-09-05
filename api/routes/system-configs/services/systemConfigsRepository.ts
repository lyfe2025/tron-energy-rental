/**
 * 系统配置数据访问层
 * 
 * 提供系统配置相关的所有数据库操作方法
 * 封装SQL查询逻辑，提供统一的数据访问接口
 */

import { query } from '../../../config/database.js';
import type {
    BatchConfigItem,
    ConfigCategoryStats,
    CreateSystemConfigRequest,
    PaginatedConfigHistory,
    PaginatedSystemConfigs,
    QueryBuilderParams,
    SystemConfig,
    SystemConfigQuery,
    UpdateSystemConfigRequest
} from '../types/systemConfigs.types.js';

export class SystemConfigsRepository {
  /**
   * 获取系统配置列表（带分页和过滤）
   */
  async getSystemConfigs(params: SystemConfigQuery, userRole?: string): Promise<PaginatedSystemConfigs> {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      is_public,
      is_editable
    } = params;

    const offset = (Number(page) - 1) * Number(limit);
    const queryBuilder = this.buildQueryConditions(params, userRole);

    // 查询配置列表
    const configsQuery = `
      SELECT 
        id, config_key, config_value, config_type, category, 
        description, is_public, is_editable, validation_rules, 
        default_value, created_at, updated_at
      FROM system_configs 
      ${queryBuilder.whereConditions.length > 0 ? `WHERE ${queryBuilder.whereConditions.join(' AND ')}` : ''}
      ORDER BY category, config_key
      LIMIT $${queryBuilder.paramIndex} OFFSET $${queryBuilder.paramIndex + 1}
    `;
    queryBuilder.queryParams.push(Number(limit), offset);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) FROM system_configs 
      ${queryBuilder.whereConditions.length > 0 ? `WHERE ${queryBuilder.whereConditions.join(' AND ')}` : ''}
    `;
    const countParams = queryBuilder.queryParams.slice(0, -2); // 移除 limit 和 offset

    const [configsResult, countResult] = await Promise.all([
      query(configsQuery, queryBuilder.queryParams),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    return {
      configs: configsResult.rows,
      pagination: {
        current_page: Number(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: Number(limit)
      }
    };
  }

  /**
   * 根据配置键获取单个配置
   */
  async getConfigByKey(configKey: string, userRole?: string): Promise<SystemConfig | null> {
    let sqlQuery = `
      SELECT 
        id, config_key, config_value, config_type, category, 
        description, is_public, is_editable, validation_rules, 
        default_value, created_at, updated_at
      FROM system_configs 
      WHERE config_key = $1
    `;

    const params = [configKey];

    // 非管理员只能查看公开配置
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      sqlQuery += ' AND is_public = true';
    }

    const result = await query(sqlQuery, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 创建新配置
   */
  async createConfig(configData: CreateSystemConfigRequest, userId: string): Promise<SystemConfig> {
    const {
      config_key,
      config_value,
      config_type = 'string',
      category = 'general',
      description,
      is_public = false,
      is_editable = true,
      validation_rules,
      default_value
    } = configData;

    const result = await query(
      `INSERT INTO system_configs 
       (config_key, config_value, config_type, category, description, 
        is_public, is_editable, validation_rules, default_value, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING *`,
      [
        config_key,
        config_value,
        config_type,
        category,
        description,
        is_public,
        is_editable,
        validation_rules ? JSON.stringify(validation_rules) : null,
        default_value,
        userId
      ]
    );

    return result.rows[0];
  }

  /**
   * 更新配置
   */
  async updateConfig(
    configKey: string, 
    updateData: UpdateSystemConfigRequest, 
    userId: string
  ): Promise<SystemConfig> {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // 动态构建更新字段
    const fieldsToUpdate = [
      'config_value', 'config_type', 'category', 'description',
      'is_public', 'is_editable', 'default_value'
    ];

    fieldsToUpdate.forEach(field => {
      if (updateData[field as keyof UpdateSystemConfigRequest] !== undefined) {
        if (field === 'validation_rules') {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData.validation_rules ? JSON.stringify(updateData.validation_rules) : null);
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(updateData[field as keyof UpdateSystemConfigRequest]);
        }
        paramIndex++;
      }
    });

    if (updateData.validation_rules !== undefined) {
      updateFields.push(`validation_rules = $${paramIndex}`);
      updateValues.push(updateData.validation_rules ? JSON.stringify(updateData.validation_rules) : null);
      paramIndex++;
    }

    updateFields.push(`updated_by = $${paramIndex}`, `updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(userId);
    paramIndex++;

    updateValues.push(configKey); // WHERE 条件的参数

    const updateQuery = `
      UPDATE system_configs 
      SET ${updateFields.join(', ')}
      WHERE config_key = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    return result.rows[0];
  }

  /**
   * 删除配置
   */
  async deleteConfig(configKey: string): Promise<void> {
    await query('DELETE FROM system_configs WHERE config_key = $1', [configKey]);
  }

  /**
   * 重置配置为默认值
   */
  async resetConfigToDefault(configKey: string, userId: string): Promise<SystemConfig> {
    const result = await query(
      `UPDATE system_configs 
       SET config_value = default_value, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE config_key = $2
       RETURNING *`,
      [userId, configKey]
    );

    return result.rows[0];
  }

  /**
   * 检查配置是否存在
   */
  async configExists(configKey: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM system_configs WHERE config_key = $1',
      [configKey]
    );
    return result.rows.length > 0;
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    configs: BatchConfigItem[], 
    userId: string, 
    changeReason?: string
  ): Promise<SystemConfig[]> {
    const results = [];

    for (const config of configs) {
      const result = await query(
        `UPDATE system_configs 
         SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE config_key = $3
         RETURNING *`,
        [config.config_value, userId, config.config_key]
      );
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    return results;
  }

  /**
   * 获取配置历史记录
   */
  async getConfigHistory(configKey: string, page = 1, limit = 20): Promise<PaginatedConfigHistory> {
    const offset = (Number(page) - 1) * Number(limit);

    // 先获取配置ID
    const configResult = await query(
      'SELECT id FROM system_configs WHERE config_key = $1',
      [configKey]
    );

    if (configResult.rows.length === 0) {
      throw new Error('配置不存在');
    }

    const configId = configResult.rows[0].id;

    // 查询历史记录
    const historyQuery = `
      SELECT 
        h.id, h.old_value, h.new_value, h.change_reason, h.created_at,
        u.username as changed_by_username
      FROM system_config_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.entity_type = 'system_config' AND h.entity_id = $1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM system_config_history WHERE entity_type = 'system_config' AND entity_id = $1
    `;

    const [historyResult, countResult] = await Promise.all([
      query(historyQuery, [configId, Number(limit), offset]),
      query(countQuery, [configId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / Number(limit));

    return {
      history: historyResult.rows,
      pagination: {
        current_page: Number(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: Number(limit)
      }
    };
  }

  /**
   * 记录配置历史
   */
  async recordConfigHistory(
    configId: number,
    oldValue: string,
    newValue: string,
    changeReason: string,
    userId: string
  ): Promise<void> {
    await query(
      `INSERT INTO system_config_history 
       (entity_type, entity_id, operation_type, old_value, new_value, change_reason, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['system_config', configId, 'update', oldValue, newValue, changeReason, userId]
    );
  }

  /**
   * 获取配置分类列表
   */
  async getConfigCategories(userRole?: string): Promise<ConfigCategoryStats[]> {
    let sqlQuery = `
      SELECT 
        category,
        COUNT(*) as config_count,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_count
      FROM system_configs
    `;

    // 非管理员只能查看公开配置
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      sqlQuery += ' WHERE is_public = true';
    }

    sqlQuery += `
      GROUP BY category
      ORDER BY category
    `;

    const result = await query(sqlQuery);
    return result.rows;
  }

  /**
   * 构建查询条件
   */
  private buildQueryConditions(params: SystemConfigQuery, userRole?: string): QueryBuilderParams {
    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (params.category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(params.category);
      paramIndex++;
    }

    if (params.search) {
      whereConditions.push(`(config_key ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.is_public !== undefined) {
      whereConditions.push(`is_public = $${paramIndex}`);
      queryParams.push(params.is_public);
      paramIndex++;
    }

    if (params.is_editable !== undefined) {
      whereConditions.push(`is_editable = $${paramIndex}`);
      queryParams.push(params.is_editable);
      paramIndex++;
    }

    // 非管理员只能查看公开配置
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereConditions.push(`is_public = true`);
    }

    return {
      whereConditions,
      queryParams,
      paramIndex
    };
  }
}
