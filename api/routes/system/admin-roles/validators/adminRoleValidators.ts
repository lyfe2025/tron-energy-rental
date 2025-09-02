/**
 * 管理员角色路由验证器
 */
import { body, param, query } from 'express-validator';

export const adminRoleValidators = {
  // 管理员角色列表查询验证
  list: [
    query('username').optional().isString().withMessage('用户名必须是字符串'),
    query('department_id').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
    query('role_id').optional().isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('page_size').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],

  // 获取单个管理员验证
  getAdmin: [
    param('adminId').isUUID().withMessage('管理员ID格式无效')
  ],

  // 管理员角色分配验证
  assign: [
    body('adminId').isUUID().withMessage('管理员ID格式无效'),
    body('roleIds').isArray({ min: 1 }).withMessage('角色ID列表不能为空'),
    body('roleIds.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
  ],

  // 批量管理员角色分配验证
  batchAssign: [
    body('assignments').isArray({ min: 1 }).withMessage('分配列表不能为空'),
    body('assignments.*.adminId').isUUID().withMessage('管理员ID格式无效'),
    body('assignments.*.roleIds').isArray({ min: 1 }).withMessage('角色ID列表不能为空'),
    body('assignments.*.roleIds.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
  ],

  // 移除角色验证
  removeRole: [
    body('adminId').isUUID().withMessage('管理员ID格式无效'),
    body('roleId').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
  ],

  // 历史记录查询验证
  history: [
    query('adminId').optional().isUUID().withMessage('管理员ID格式无效'),
    query('roleId').optional().isInt({ min: 1 }).withMessage('角色ID必须是正整数'),
    query('operation').optional().isString().withMessage('操作类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始时间格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束时间格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],

  // 配置更新验证
  updateConfig: [
    body('allowMultipleRoles').optional().isBoolean().withMessage('多角色设置必须是布尔值'),
    body('requireApproval').optional().isBoolean().withMessage('审批设置必须是布尔值'),
    body('defaultRole').optional().isInt({ min: 1 }).withMessage('默认角色必须是正整数'),
    body('maxRolesPerAdmin').optional().isInt({ min: 1, max: 10 }).withMessage('每个管理员最大角色数量必须在1-10之间')
  ],

  // 冲突检查验证
  checkConflicts: [
    body('adminId').isUUID().withMessage('管理员ID格式无效'),
    body('roleIds').isArray({ min: 1 }).withMessage('角色ID列表不能为空'),
    body('roleIds.*').isInt({ min: 1 }).withMessage('角色ID必须是正整数')
  ],

  // 审批处理验证
  processApproval: [
    param('id').isUUID().withMessage('审批ID格式无效'),
    body('action').isIn(['approve', 'reject']).withMessage('操作必须是approve或reject'),
    body('comment').optional().isString().withMessage('备注必须是字符串')
  ]
};
