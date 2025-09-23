/**
 * 部门管理服务
 * 处理部门相关的业务逻辑
 */

import { query } from '../../config/database.ts';

export interface Department {
  id: number;
  name: string;
  code: string;
  parent_id?: number;
  level: number;
  sort_order: number;
  status: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
  children?: Department[];
}

export interface CreateDepartmentData {
  name: string;
  code: string;
  parent_id?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  code?: string;
  parent_id?: number;
  sort_order?: number;
  status?: number;
  description?: string;
}

export interface DepartmentQuery {
  status?: number;
}

export class DepartmentService {
  /**
   * 获取部门树形结构
   */
  static async getDepartmentTree(params: DepartmentQuery = {}): Promise<Department[]> {
    let sql = `
      SELECT id, name, code, parent_id, level, sort_order, status, description, created_at, updated_at
      FROM departments
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (params.status !== undefined) {
      sql += ` AND status = $${paramIndex++}`;
      values.push(params.status);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const result = await query(sql, values);
    const departments = result.rows as Department[];

    // 构建树形结构
    return this.buildTree(departments);
  }

  /**
   * 根据ID获取部门详情
   */
  static async getDepartmentById(id: number): Promise<Department | null> {
    const sql = `
      SELECT id, name, code, parent_id, level, sort_order, status, description, created_at, updated_at
      FROM departments
      WHERE id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * 创建部门
   */
  static async createDepartment(data: CreateDepartmentData): Promise<Department> {
    // 检查部门编码是否已存在
    const existingCode = await query(
      'SELECT id FROM departments WHERE code = $1',
      [data.code]
    );
    
    if (existingCode.rows.length > 0) {
      throw new Error('部门编码已存在');
    }

    // 计算部门层级
    let level = 1;
    if (data.parent_id) {
      const parent = await this.getDepartmentById(data.parent_id);
      if (!parent) {
        throw new Error('上级部门不存在');
      }
      level = parent.level + 1;
    }

    const sql = `
      INSERT INTO departments (name, code, parent_id, level, sort_order, status, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, code, parent_id, level, sort_order, status, description, created_at, updated_at
    `;
    
    const values = [
      data.name,
      data.code,
      data.parent_id || null,
      level,
      data.sort_order || 0,
      data.status ?? 1,
      data.description || null
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新部门
   */
  static async updateDepartment(id: number, data: UpdateDepartmentData): Promise<Department | null> {
    // 检查部门是否存在
    const existing = await this.getDepartmentById(id);
    if (!existing) {
      return null;
    }

    // 检查部门编码是否已被其他部门使用
    if (data.code) {
      const existingCode = await query(
        'SELECT id FROM departments WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      
      if (existingCode.rows.length > 0) {
        throw new Error('部门编码已存在');
      }
    }

    // 如果修改了上级部门，需要重新计算层级
    let level = existing.level;
    if (data.parent_id !== undefined) {
      if (data.parent_id === id) {
        throw new Error('不能将自己设为上级部门');
      }
      
      if (data.parent_id) {
        const parent = await this.getDepartmentById(data.parent_id);
        if (!parent) {
          throw new Error('上级部门不存在');
        }
        level = parent.level + 1;
      } else {
        level = 1;
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
    if (data.parent_id !== undefined) {
      updateFields.push(`parent_id = $${paramIndex++}`);
      values.push(data.parent_id);
    }
    if (level !== existing.level) {
      updateFields.push(`level = $${paramIndex++}`);
      values.push(level);
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
      UPDATE departments
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, code, parent_id, level, sort_order, status, description, created_at, updated_at
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * 删除部门
   */
  static async deleteDepartment(id: number): Promise<boolean> {
    // 检查是否有子部门
    const children = await query(
      'SELECT id FROM departments WHERE parent_id = $1',
      [id]
    );
    
    if (children.rows.length > 0) {
      throw new Error('存在子部门，无法删除');
    }

    // 检查是否有关联的岗位
    const positions = await query(
      'SELECT id FROM positions WHERE department_id = $1',
      [id]
    );
    
    if (positions.rows.length > 0) {
      throw new Error('部门下存在岗位，无法删除');
    }

    // 检查是否有关联的用户
    const users = await query(
      'SELECT id FROM admins WHERE department_id = $1',
      [id]
    );
    
    if (users.rows.length > 0) {
      throw new Error('部门下存在用户，无法删除');
    }

    const result = await query('DELETE FROM departments WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 构建树形结构
   */
  private static buildTree(departments: Department[], parentId: number | null = null): Department[] {
    const tree: Department[] = [];
    
    for (const dept of departments) {
      if (dept.parent_id === parentId) {
        const children = this.buildTree(departments, dept.id);
        if (children.length > 0) {
          dept.children = children;
        }
        tree.push(dept);
      }
    }
    
    return tree;
  }
}