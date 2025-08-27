/**
 * 能量包数据访问层
 * 
 * 提供能量包相关的所有数据库操作方法
 * 封装SQL查询逻辑，提供统一的数据访问接口
 */

import { query } from '../../../config/database.js';
import type {
    BatchPriceUpdateItem,
    CreateEnergyPackageRequest,
    EnergyPackage,
    EnergyPackageOverview,
    EnergyPackageQuery,
    EnergyPackageStats,
    EnergyPackageWithStats,
    NameConflictCheck,
    PackageExistenceCheck,
    PaginatedEnergyPackages,
    PopularEnergyPackage,
    QueryBuilderParams,
    UpdateEnergyPackageRequest
} from '../types/energyPackages.types.js';

export class EnergyPackagesRepository {
  /**
   * 获取能量包列表（带分页和过滤）
   */
  async getEnergyPackages(params: EnergyPackageQuery): Promise<PaginatedEnergyPackages> {
    const {
      page = 1,
      limit = 20,
      is_active,
      min_energy,
      max_energy,
      min_price,
      max_price,
      search
    } = params;

    const offset = (Number(page) - 1) * Number(limit);
    const queryBuilder = this.buildQueryConditions(params);

    // 查询能量包列表
    const packagesQuery = `
      SELECT 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at, updated_at
      FROM energy_packages 
      ${queryBuilder.whereConditions.length > 0 ? `WHERE ${queryBuilder.whereConditions.join(' AND ')}` : ''}
      ORDER BY is_active DESC, energy_amount ASC
      LIMIT $${queryBuilder.paramIndex} OFFSET $${queryBuilder.paramIndex + 1}
    `;
    queryBuilder.queryParams.push(Number(limit), offset);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total FROM energy_packages 
      ${queryBuilder.whereConditions.length > 0 ? `WHERE ${queryBuilder.whereConditions.join(' AND ')}` : ''}
    `;
    const countParams = queryBuilder.queryParams.slice(0, -2); // 移除 limit 和 offset

    const [packagesResult, countResult] = await Promise.all([
      query(packagesQuery, queryBuilder.queryParams),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    return {
      packages: packagesResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * 根据ID获取单个能量包
   */
  async getPackageById(id: number): Promise<EnergyPackage | null> {
    const result = await query(
      `SELECT 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at, updated_at
       FROM energy_packages 
       WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取能量包详情（包含统计信息）
   */
  async getPackageWithStats(id: number): Promise<EnergyPackageWithStats | null> {
    const [packageResult, orderStatsResult] = await Promise.all([
      this.getPackageById(id),
      query(
        `SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as orders_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as orders_month,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN price END), 0) as total_revenue
         FROM orders 
         WHERE package_id = $1`,
        [id]
      )
    ]);

    if (!packageResult) {
      return null;
    }

    return {
      ...packageResult,
      stats: {
        orders: orderStatsResult.rows[0]
      }
    };
  }

  /**
   * 创建新能量包
   */
  async createPackage(packageData: CreateEnergyPackageRequest): Promise<EnergyPackage> {
    const {
      name,
      description,
      energy_amount,
      price,
      duration_hours = 24,
      is_active = true
    } = packageData;

    const result = await query(
      `INSERT INTO energy_packages (
        name, description, energy_amount, price, duration_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at`,
      [name, description, Number(energy_amount), Number(price), Number(duration_hours), is_active]
    );

    return result.rows[0];
  }

  /**
   * 更新能量包信息
   */
  async updatePackage(id: number, updateData: UpdateEnergyPackageRequest): Promise<EnergyPackage> {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // 动态构建更新字段
    const fieldsToUpdate = ['name', 'description', 'energy_amount', 'price', 'duration_hours'];
    
    fieldsToUpdate.forEach(field => {
      if (updateData[field as keyof UpdateEnergyPackageRequest] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        const value = updateData[field as keyof UpdateEnergyPackageRequest];
        updateValues.push(['energy_amount', 'price', 'duration_hours'].includes(field) ? Number(value) : value);
        paramIndex++;
      }
    });

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE energy_packages 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, updated_at
    `;

    const result = await query(updateQuery, updateValues);
    return result.rows[0];
  }

  /**
   * 更新能量包状态
   */
  async updatePackageStatus(id: number, isActive: boolean): Promise<EnergyPackage> {
    const result = await query(
      `UPDATE energy_packages 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, is_active, updated_at`,
      [isActive, id]
    );

    return result.rows[0];
  }

  /**
   * 批量更新能量包价格
   */
  async batchUpdatePrices(updates: BatchPriceUpdateItem[]): Promise<EnergyPackage[]> {
    const results = [];

    for (const update of updates) {
      try {
        const result = await query(
          `UPDATE energy_packages 
           SET price = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING id, name, price, updated_at`,
          [Number(update.price), update.id]
        );
        
        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      } catch (error) {
        // 跳过失败的更新
        continue;
      }
    }

    return results;
  }

  /**
   * 删除能量包
   */
  async deletePackage(id: number): Promise<void> {
    await query('DELETE FROM energy_packages WHERE id = $1', [id]);
  }

  /**
   * 复制能量包
   */
  async duplicatePackage(id: number, newName: string): Promise<EnergyPackage> {
    const originalResult = await query(
      `SELECT name, description, energy_amount, price, duration_hours 
       FROM energy_packages 
       WHERE id = $1`,
      [id]
    );

    if (originalResult.rows.length === 0) {
      throw new Error('原能量包不存在');
    }

    const original = originalResult.rows[0];
    
    const result = await query(
      `INSERT INTO energy_packages (
        name, description, energy_amount, price, duration_hours, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, name, description, energy_amount, price, 
        duration_hours, is_active, created_at`,
      [
        newName,
        original.description,
        original.energy_amount,
        original.price,
        original.duration_hours,
        false // 默认设为禁用状态
      ]
    );

    return result.rows[0];
  }

  /**
   * 检查能量包是否存在
   */
  async checkPackageExists(id: number): Promise<PackageExistenceCheck> {
    const result = await query(
      'SELECT * FROM energy_packages WHERE id = $1',
      [id]
    );

    return {
      exists: result.rows.length > 0,
      package: result.rows.length > 0 ? result.rows[0] : undefined
    };
  }

  /**
   * 检查名称冲突
   */
  async checkNameConflict(name: string, excludeId?: number): Promise<NameConflictCheck> {
    let sqlQuery = 'SELECT id FROM energy_packages WHERE name = $1';
    const params = [name];

    if (excludeId) {
      sqlQuery += ' AND id != $2';
      params.push(excludeId.toString());
    }

    const result = await query(sqlQuery, params);

    return {
      hasConflict: result.rows.length > 0,
      conflictingId: result.rows.length > 0 ? result.rows[0].id : undefined
    };
  }

  /**
   * 检查能量包是否有关联订单
   */
  async checkPackageHasOrders(id: number): Promise<boolean> {
    const result = await query(
      'SELECT COUNT(*) as count FROM orders WHERE package_id = $1',
      [id]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取能量包统计信息
   */
  async getPackageStats(): Promise<EnergyPackageStats> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_packages,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_packages,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_packages,
        COALESCE(AVG(price), 0) as average_price,
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(AVG(energy_amount), 0) as average_energy,
        COALESCE(SUM(energy_amount), 0) as total_energy_available,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_packages_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_packages_month
      FROM energy_packages
    `);

    return result.rows[0];
  }

  /**
   * 获取受欢迎的能量包
   */
  async getPopularPackages(limit = 5): Promise<PopularEnergyPackage[]> {
    const result = await query(`
      SELECT 
        ep.id, ep.name, ep.energy_amount, ep.price,
        COUNT(o.id) as order_count,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price END), 0) as total_revenue
      FROM energy_packages ep
      LEFT JOIN orders o ON ep.id = o.package_id
      WHERE ep.is_active = true
      GROUP BY ep.id, ep.name, ep.energy_amount, ep.price
      ORDER BY order_count DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * 获取能量包统计概览
   */
  async getPackageOverview(): Promise<EnergyPackageOverview> {
    const [stats, popularPackages] = await Promise.all([
      this.getPackageStats(),
      this.getPopularPackages()
    ]);

    return {
      stats,
      popular_packages: popularPackages
    };
  }

  /**
   * 构建查询条件
   */
  private buildQueryConditions(params: EnergyPackageQuery): QueryBuilderParams {
    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(params.is_active);
      paramIndex++;
    }

    if (params.min_energy) {
      whereConditions.push(`energy_amount >= $${paramIndex}`);
      queryParams.push(Number(params.min_energy));
      paramIndex++;
    }

    if (params.max_energy) {
      whereConditions.push(`energy_amount <= $${paramIndex}`);
      queryParams.push(Number(params.max_energy));
      paramIndex++;
    }

    if (params.min_price) {
      whereConditions.push(`price >= $${paramIndex}`);
      queryParams.push(Number(params.min_price));
      paramIndex++;
    }

    if (params.max_price) {
      whereConditions.push(`price <= $${paramIndex}`);
      queryParams.push(Number(params.max_price));
      paramIndex++;
    }

    if (params.search) {
      whereConditions.push(`(
        name ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    return {
      whereConditions,
      queryParams,
      paramIndex
    };
  }
}
