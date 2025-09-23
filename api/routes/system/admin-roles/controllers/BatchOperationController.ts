/**
 * 批量操作和审批控制器
 * 处理批量角色分配、导入导出、审批等操作
 */
import { type Request, type Response } from 'express';
import { query } from '../../../../config/database.ts';

export class BatchOperationController {
  /**
   * 批量分配角色
   * POST /api/system/admin-roles/batch
   */
  static async batchAssign(req: Request, res: Response) {
    try {
      const { assignments } = req.body;
      const operatorId = req.user?.id;

      // 验证所有管理员和角色是否存在
      const adminIds = assignments.map((a: any) => a.adminId);
      const allRoleIds = Array.from(new Set(assignments.flatMap((a: any) => a.roleIds)));

      const [adminCheck, roleCheck] = await Promise.all([
        query('SELECT id FROM admins WHERE id = ANY($1)', [adminIds]),
        query('SELECT id FROM roles WHERE id = ANY($1)', [allRoleIds])
      ]);

      if (adminCheck.rows.length !== adminIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分管理员不存在'
        });
      }

      if (roleCheck.rows.length !== allRoleIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分角色不存在'
        });
      }

      // 开始事务
      await query('BEGIN');

      try {
        const results: any[] = [];

        for (const assignment of assignments) {
          const { adminId, roleIds } = assignment;

          // 删除现有角色分配
          await query('DELETE FROM admin_roles WHERE admin_id = $1', [adminId]);

          // 添加新的角色分配
          if (roleIds.length > 0) {
            const insertValues = roleIds.map((_: number, index: number) => {
              const baseIndex = index * 2;
              return `($${baseIndex + 1}, $${baseIndex + 2})`;
            }).join(', ');

            const insertParams = roleIds.flatMap((roleId: number) => [adminId, roleId]);

            await query(
              `INSERT INTO admin_roles (admin_id, role_id) VALUES ${insertValues}`,
              insertParams
            );
          }

          results.push({
            adminId,
            roleIds,
            status: 'success'
          });
        }

        // 记录操作日志
        const logData = {
          assignments,
          results,
          operator: operatorId
        };

        await query(
          'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
          [operatorId, 'batch_assign_roles', JSON.stringify(logData)]
        );

        await query('COMMIT');

        res.json({
          success: true,
          message: '批量分配成功',
          data: results
        });
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('批量分配角色失败:', error);
      res.status(500).json({
        success: false,
        message: '批量分配角色失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 导出角色分配数据
   * GET /api/system/admin-roles/export
   */
  static async exportData(req: Request, res: Response) {
    try {
      // 获取所有管理员角色分配数据
      const exportSql = `
        SELECT 
          a.username,
          a.email,
          a.name,
          d.name as department_name,
          p.name as position_name,
          STRING_AGG(r.name, ';') as roles,
          a.status,
          a.created_at
        FROM admins a
        LEFT JOIN positions p ON a.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN admin_roles ar ON a.id = ar.admin_id
        LEFT JOIN roles r ON ar.role_id = r.id
        GROUP BY a.id, a.username, a.email, a.name, d.name, p.name, a.status, a.created_at
        ORDER BY a.username ASC
      `;

      const exportResult = await query(exportSql);

      // 设置响应头为CSV下载
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=admin-roles-export.csv');

      // 添加BOM以支持Excel中的中文显示
      res.write('\ufeff');

      // CSV标题行
      const headers = [
        '用户名',
        '邮箱',
        '姓名',
        '部门',
        '职位',
        '角色',
        '状态',
        '创建时间'
      ];
      res.write(headers.join(',') + '\n');

      // 写入数据行
      exportResult.rows.forEach(row => {
        const csvRow = [
          row.username || '',
          row.email || '',
          row.name || '',
          row.department_name || '',
          row.position_name || '',
          row.roles || '',
          row.status || '',
          row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`);
        
        res.write(csvRow.join(',') + '\n');
      });

      res.end();

      // 记录操作日志
      const operatorId = req.user?.id;
      if (operatorId) {
        await query(
          'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
          [operatorId, 'export_admin_roles', JSON.stringify({ count: exportResult.rows.length })]
        );
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出数据失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 导入角色分配数据
   * POST /api/system/admin-roles/import
   */
  static async importData(req: Request, res: Response) {
    try {
      // 这里应该处理文件上传和CSV解析
      // 由于文件上传需要multer中间件，这里只提供基本结构
      
      res.status(501).json({
        success: false,
        message: '导入功能待实现'
      });
    } catch (error) {
      console.error('导入数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导入数据失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取审批列表
   * GET /api/system/admin-roles/approvals
   */
  static async getApprovals(req: Request, res: Response) {
    try {
      // 这里应该从审批表获取待审批的角色分配申请
      // 暂时返回空列表
      
      res.json({
        success: true,
        data: {
          approvals: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
          }
        }
      });
    } catch (error) {
      console.error('获取审批列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取审批列表失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 处理审批
   * POST /api/system/admin-roles/approvals/:id/process
   */
  static async processApproval(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, comment } = req.body;
      const operatorId = req.user?.id;

      // 这里应该处理具体的审批逻辑
      // 包括更新审批状态、执行或拒绝角色分配等
      
      const logData = {
        approvalId: id,
        action,
        comment,
        operator: operatorId
      };

      await query(
        'INSERT INTO admin_operation_logs (admin_id, operation, details, created_at) VALUES ($1, $2, $3, NOW())',
        [operatorId, 'process_approval', JSON.stringify(logData)]
      );

      res.json({
        success: true,
        message: `审批${action === 'approve' ? '通过' : '拒绝'}成功`
      });
    } catch (error) {
      console.error('处理审批失败:', error);
      res.status(500).json({
        success: false,
        message: '处理审批失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
