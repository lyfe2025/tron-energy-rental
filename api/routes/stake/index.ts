/**
 * 质押管理路由 - 模块化整合入口
 * 重新导出拆分后的路由模块
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

// 导入控制器
import { DelegateController } from './controllers/DelegateController.js';
import { OverviewController } from './controllers/OverviewController.js';
import { RecordsController } from './controllers/RecordsController.js';
import { StakeController } from './controllers/StakeController.js';
import { WithdrawController } from './controllers/WithdrawController.js';

const router: ExpressRouter = Router();

// ========================
// 概览和统计路由
// ========================

// 获取质押概览
router.get('/overview', authenticateToken, OverviewController.getOverview);

// 获取质押统计信息
router.get('/statistics', authenticateToken, OverviewController.getStatistics);

// 获取账户资源信息
router.get('/account-resources/:address', authenticateToken, OverviewController.getAccountResources);

// 获取账户信息
router.get('/account-info/:address', authenticateToken, OverviewController.getAccountInfo);

// ========================
// 质押操作路由
// ========================

// 测试路由 - 检查路由是否工作
router.post('/test', (req, res) => {
  console.log('==================== 测试路由被调用 ====================');
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  res.json({ success: true, message: '测试路由工作正常', data: req.body });
});

// 质押TRX
router.post('/freeze', authenticateToken, StakeController.freeze);

// 解质押TRX
router.post('/unfreeze', authenticateToken, StakeController.unfreeze);

// 批量质押操作（扩展功能）
router.post('/batch-freeze', authenticateToken, StakeController.batchFreeze);

// ========================
// 委托操作路由
// ========================

// 委托资源
router.post('/delegate', authenticateToken, DelegateController.delegate);

// 取消委托资源
router.post('/undelegate', authenticateToken, DelegateController.undelegate);

// 批量委托操作（扩展功能）
router.post('/batch-delegate', authenticateToken, DelegateController.batchDelegate);

// ========================
// 提取操作路由
// ========================

// 提取已解冻的资金
router.post('/withdraw', authenticateToken, WithdrawController.withdraw);

// 获取可提取资金信息
router.get('/withdrawable-info', authenticateToken, WithdrawController.getWithdrawableInfo);

// 批量提取操作（扩展功能）
router.post('/batch-withdraw', authenticateToken, WithdrawController.batchWithdraw);

// ========================
// 记录查询路由
// ========================

// 获取质押记录
router.get('/records', authenticateToken, RecordsController.getStakeRecords);

// 获取委托记录
router.get('/delegates', authenticateToken, RecordsController.getDelegateRecords);

// 获取解冻记录
router.get('/unfreezes', authenticateToken, RecordsController.getUnfreezeRecords);

// 获取综合记录摘要
router.get('/records-summary', authenticateToken, RecordsController.getRecordsSummary);

export default router;
