/**
 * 岗位管理服务
 * 处理岗位相关的业务逻辑
 */

import { query } from '../../config/database.ts';

export interface Position {
  id: number;
  name: string;
  code: string;
  department_id: number;
  level: number;
  sort_order: number;
  status: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
  department_name?: string;
}

export interface CreatePositionData {
  name: string;
  code: string;
  department_id: number;
  level?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface UpdatePositionData {
  name?: string;
  code?: string;
  department_id?: number;
  level?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface PositionQuery {
  department_id?: number;
  status?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export class PositionService {
  /**
   * 获取岗位列表
   */
  static async getPositions(params: PositionQuery = {}): Promise<{
    positions: Position[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.id, p.name, p.code, p.department_id, p.level, p.sort_order, 
             p.status, p.description, p.created_at, p.updated_at,
             d.name as department_name
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE 1=1
    `;
    
    let countSql = `
      SELECT COUNT(*) as total
      FROM positions p
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramIndex = 1;

    if (params.department_id !== undefined) {
      const condition = ` AND p.department_id = $${paramIndex++}`;
      sql += condition;
      countSql += condition;
      values.push(params.department_id);
    }

    if (params.status !== undefined) {
      const condition = ` AND p.status = $${paramIndex++}`;
      sql += condition;
      countSql += condition;
      values.push(params.status);
    }

    if (params.search) {
      const condition = ` AND (p.name ILIKE $${paramIndex++} OR p.code ILIKE $${paramIndex++})`;
      sql += condition;
      countSql += condition;
      const searchPattern = `%${params.search}%`;
      values.push(searchPattern, searchPattern);
    }

    sql += ` ORDER BY p.sort_order ASC, p.id ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const [positionsResult, countResult] = await Promise.all([
      query(sql, values),
      query(countSql, values.slice(0, -2)) // 移除 limit 和 offset 参数
    ]);

    return {
      positions: positionsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  }

  /**
   * 根据ID获取岗位详情
   */
  static async getPositionById(id: number): Promise<Position | null> {
    const sql = `
      SELECT p.id, p.name, p.code, p.department_id, p.level, p.sort_order, 
             p.status, p.description, p.created_at, p.updated_at,
             d.name as department_name
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * 创建岗位
   */
  static async createPosition(data: CreatePositionData): Promise<Position> {
    // 检查岗位编码是否已存在
    const existingCode = await query(
      'SELECT id FROM positions WHERE code = $1',
      [data.code]
    );
    
    if (existingCode.rows.length > 0) {
      throw new Error('岗位编码已存在');
    }

    // 检查部门是否存在
    const department = await query(
      'SELECT id FROM departments WHERE id = $1',
      [data.department_id]
    );
    
    if (department.rows.length === 0) {
      throw new Error('所属部门不存在');
    }

    const sql = `
      INSERT INTO positions (name, code, department_id, level, sort_order, status, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, code, department_id, level, sort_order, status, description, created_at, updated_at
    `;
    
    const values = [
      data.name,
      data.code,
      data.department_id,
      data.level || 1,
      data.sort_order || 0,
      data.status ?? 1,
      data.description || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新岗位
   */
  static async updatePosition(id: number, data: UpdatePositionData): Promise<Position | null> {
    // 检查岗位是否存在
    const existing = await this.getPositionById(id);
    if (!existing) {
      return null;
    }

    // 检查岗位编码是否已被其他岗位使用
    if (data.code) {
      const existingCode = await query(
        'SELECT id FROM positions WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      
      if (existingCode.rows.length > 0) {
        throw new Error('岗位编码已存在');
      }
    }

    // 检查部门是否存在
    if (data.department_id) {
      const department = await query(
        'SELECT id FROM departments WHERE id = $1',
        [data.department_id]
      );
      
      if (department.rows.length === 0) {
        throw new Error('所属部门不存在');
      }
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      values.push(data.code);
    }
    if (data.department_id !== undefined) {
      updateFields.push(`department_id = $${paramIndex++}`);
      values.push(data.department_id);
    }
    if (data.level !== undefined) {
      updateFields.push(`level = $${paramIndex++}`);
      values.push(data.level);
    }
    if (data.sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex++}`);
      values.push(data.sort_order);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const sql = `
      UPDATE positions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, code, department_id, level, sort_order, status, description, created_at, updated_at
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * 删除岗位
   */
  static async deletePosition(id: number): Promise<boolean> {
    // 检查是否有关联的用户
    const users = await query(
      'SELECT id FROM admins WHERE position_id = $1',
      [id]
    );
    
    if (users.rows.length > 0) {
      throw new Error('岗位下存在用户，无法删除');
    }

    const result = await query('DELETE FROM positions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 根据部门ID获取岗位列表
   */
  static async getPositionsByDepartment(departmentId: number): Promise<Position[]> {
    const sql = `
      SELECT p.id, p.name, p.code, p.department_id, p.level, p.sort_order, 
             p.status, p.description, p.created_at, p.updated_at,
             d.name as department_name
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.department_id = $1 AND p.status = 1
      ORDER BY p.sort_order ASC, p.id ASC
    `;
    
    const result = await query(sql, [departmentId]);
    return result.rows;
  }

  /**
   * 获取岗位选项（用于下拉选择）
   */
  static async getPositionOptions(): Promise<{ id: number; name: string; code: string; department_id: number }[]> {
    const sql = `
      SELECT id, name, code, department_id
      FROM positions
      WHERE status = 1
      ORDER BY sort_order ASC, id ASC
    `;
    
    const result = await query(sql);
    return result.rows;
  }
}