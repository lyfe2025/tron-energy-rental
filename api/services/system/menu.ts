/**
 * 菜单管理服务
 * 处理菜单相关的业务逻辑
 */

import { query } from '../../config/database.js';

export interface Menu {
  id: number;
  name: string;
  permission?: string;
  type: number;
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order: number;
  status: number;
  visible?: boolean;
  created_at: Date;
  updated_at: Date;
  children?: Menu[];
}

export interface CreateMenuData {
  name: string;
  permission?: string;
  type: number;
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order?: number;
  status?: number;
  visible?: boolean;
}

export interface UpdateMenuData {
  name?: string;
  permission?: string;
  type?: number;
  parent_id?: number;
  path?: string;
  component?: string;
  icon?: string;
  sort_order?: number;
  status?: number;
  visible?: boolean;
  description?: string;
}

export interface MenuQuery {
  type?: number;
  status?: number;
}

export class MenuService {
  /**
   * 获取菜单树形结构
   */
  static async getMenuTree(params: MenuQuery = {}): Promise<Menu[]> {
    let sql = `
      SELECT id, name, permission, type, parent_id, path, component, icon, 
             sort_order, status, visible, created_at, updated_at
      FROM menus
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (params.type !== undefined) {
      sql += ` AND type = $${paramIndex++}`;
      values.push(params.type);
    }

    if (params.status !== undefined) {
      sql += ` AND status = $${paramIndex++}`;
      values.push(params.status);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const result = await query(sql, values);
    const menus = result.rows as Menu[];

    // 构建树形结构
    return this.buildTree(menus);
  }

  /**
   * 获取用户菜单权限
   */
  static async getUserMenus(userId: string): Promise<Menu[]> {
    const sql = `
      SELECT DISTINCT m.id, m.name, m.permission, m.type, m.parent_id, m.path, 
             m.component, m.icon, m.sort_order, m.status, m.visible,
             m.created_at, m.updated_at
      FROM menus m
      INNER JOIN role_permissions rp ON m.id = rp.menu_id
      INNER JOIN admin_roles ar ON rp.role_id = ar.role_id
       INNER JOIN roles r ON ar.role_id = r.id
       WHERE ar.admin_id = $1 AND m.status = 1 AND r.status = 1
      ORDER BY m.sort_order ASC, m.id ASC
    `;
    
    const result = await query(sql, [userId]);
    const menus = result.rows as Menu[];

    // 构建树形结构
    return this.buildTree(menus);
  }

  /**
   * 根据ID获取菜单详情
   */
  static async getMenuById(id: number): Promise<Menu | null> {
    const sql = `
      SELECT id, name, permission, type, parent_id, path, component, icon, 
             sort_order, status, visible, created_at, updated_at
      FROM menus
      WHERE id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * 创建菜单
   */
  static async createMenu(data: CreateMenuData): Promise<Menu> {
    // 检查菜单权限码是否已存在
    if (data.permission) {
      const existingPermission = await query(
        'SELECT id FROM menus WHERE permission = $1',
        [data.permission]
      );
      
      if (existingPermission.rows.length > 0) {
        throw new Error('菜单权限码已存在');
      }
    }

    // 检查上级菜单是否存在
    if (data.parent_id) {
      const parent = await this.getMenuById(data.parent_id);
      if (!parent) {
        throw new Error('上级菜单不存在');
      }
    }

    const sql = `
      INSERT INTO menus (name, permission, type, parent_id, path, component, icon, sort_order, status, visible)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, permission, type, parent_id, path, component, icon, sort_order, status, visible, created_at, updated_at
    `;
    
    const values = [
      data.name,
      data.permission || null,
      data.type,
      data.parent_id || null,
      data.path || null,
      data.component || null,
      data.icon || null,
      data.sort_order || 0,
      data.status ?? 1,
      data.visible ?? 1
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新菜单
   */
  static async updateMenu(id: number, data: UpdateMenuData): Promise<Menu | null> {
    // 检查菜单是否存在
    const existing = await this.getMenuById(id);
    if (!existing) {
      return null;
    }

    // 检查菜单权限码是否已被其他菜单使用
    if (data.permission) {
      const existingPermission = await query(
        'SELECT id FROM menus WHERE permission = $1 AND id != $2',
        [data.permission, id]
      );
      
      if (existingPermission.rows.length > 0) {
        throw new Error('菜单权限码已存在');
      }
    }

    // 检查上级菜单
    if (data.parent_id !== undefined) {
      if (data.parent_id === id) {
        throw new Error('不能将自己设为上级菜单');
      }
      
      if (data.parent_id) {
        const parent = await this.getMenuById(data.parent_id);
        if (!parent) {
          throw new Error('上级菜单不存在');
        }
      }
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.permission !== undefined) {
      updateFields.push(`permission = $${paramIndex++}`);
      values.push(data.permission);
    }
    if (data.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(data.type);
    }
    if (data.parent_id !== undefined) {
      updateFields.push(`parent_id = $${paramIndex++}`);
      values.push(data.parent_id);
    }
    if (data.path !== undefined) {
      updateFields.push(`path = $${paramIndex++}`);
      values.push(data.path);
    }
    if (data.component !== undefined) {
      updateFields.push(`component = $${paramIndex++}`);
      values.push(data.component);
    }
    if (data.icon !== undefined) {
      updateFields.push(`icon = $${paramIndex++}`);
      values.push(data.icon);
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
      UPDATE menus
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, permission, type, parent_id, path, component, icon, sort_order, status, visible, created_at, updated_at
    `;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * 删除菜单
   */
  static async deleteMenu(id: number): Promise<boolean> {
    // 检查是否有子菜单
    const children = await query(
      'SELECT id FROM menus WHERE parent_id = $1',
      [id]
    );
    
    if (children.rows.length > 0) {
      throw new Error('存在子菜单，无法删除');
    }

    // 检查是否有角色权限关联
    const permissions = await query(
      'SELECT id FROM role_permissions WHERE menu_id = $1',
      [id]
    );
    
    if (permissions.rows.length > 0) {
      throw new Error('菜单已分配给角色，无法删除');
    }

    const result = await query('DELETE FROM menus WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * 检查用户是否有菜单权限
   */
  static async checkUserMenuPermission(userId: number, menuCode: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count
      FROM menus m
      INNER JOIN role_permissions rp ON m.id = rp.menu_id
      INNER JOIN admin_roles ar ON rp.role_id = ar.role_id
      INNER JOIN roles r ON ar.role_id = r.id
      WHERE ar.admin_id = $1 AND m.permission = $2 AND m.status = 1 AND r.status = 1
    `;
    
    const result = await query(sql, [userId, menuCode]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取用户所有权限代码
   */
  static async getUserPermissionCodes(userId: number): Promise<string[]> {
    const sql = `
      SELECT DISTINCT m.permission
      FROM menus m
      INNER JOIN role_permissions rp ON m.id = rp.menu_id
      INNER JOIN admin_roles ar ON rp.role_id = ar.role_id
      INNER JOIN roles r ON ar.role_id = r.id
      WHERE ar.admin_id = $1 AND m.status = 1 AND r.status = 1 AND m.permission IS NOT NULL
    `;
    
    const result = await query(sql, [userId]);
    return result.rows.map(row => row.permission).filter(permission => permission);
  }

  /**
   * 获取菜单选项（用于下拉框等）
   */
  static async getMenuOptions(excludeId?: number): Promise<Array<{id: number, name: string, parent_id?: number}>> {
    let sql = `
      SELECT id, name, parent_id
      FROM menus
      WHERE status = 1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (excludeId) {
      sql += ` AND id != $${paramIndex++}`;
      values.push(excludeId);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * 构建树形结构
   */
  private static buildTree(menus: Menu[], parentId: number | null = null): Menu[] {
    const tree: Menu[] = [];
    
    for (const menu of menus) {
      if (menu.parent_id === parentId) {
        const children = this.buildTree(menus, menu.id);
        if (children.length > 0) {
          menu.children = children;
        }
        tree.push(menu);
      }
    }
    
    return tree;
  }
}