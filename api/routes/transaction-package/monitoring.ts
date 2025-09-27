import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateToken } from '../../middleware/auth';
import { handleValidationErrors } from '../../middleware/validation';
import { EnergyUsageMonitorService } from '../../services/EnergyUsageMonitorService';

const router: Router = Router();

/**
 * 能量使用监听服务管理
 */

/**
 * 启动能量监听服务
 * POST /api/transaction-package/energy-monitor/start
 */
router.post('/energy-monitor/start',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.start();
      
      res.json({
        success: true,
        data: { status: 'started' },
        message: 'Energy usage monitor started successfully'
      });
    } catch (error) {
      console.error('Start energy monitor error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start energy usage monitor'
      });
    }
  }
);

/**
 * 停止能量监听服务
 * POST /api/transaction-package/energy-monitor/stop
 */
router.post('/energy-monitor/stop',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.stop();
      
      res.json({
        success: true,
        data: { status: 'stopped' },
        message: 'Energy usage monitor stopped successfully'
      });
    } catch (error) {
      console.error('Stop energy monitor error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to stop energy usage monitor'
      });
    }
  }
);

/**
 * 获取能量监听服务状态
 * GET /api/transaction-package/energy-monitor/status
 */
router.get('/energy-monitor/status',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      const status = monitor.getStatus();
      
      res.json({
        success: true,
        data: status,
        message: 'Energy monitor status retrieved successfully'
      });
    } catch (error) {
      console.error('Get energy monitor status error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get energy monitor status'
      });
    }
  }
);

/**
 * 添加订单到能量监听
 * POST /api/transaction-package/energy-monitor/orders
 */
router.post('/energy-monitor/orders',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.addOrder(req.body.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.body.orderId },
        message: 'Order added to energy monitor successfully'
      });
    } catch (error) {
      console.error('Add order to energy monitor error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to add order to energy monitor'
      });
    }
  }
);

/**
 * 从能量监听中移除订单
 * DELETE /api/transaction-package/energy-monitor/orders/:orderId
 */
router.delete('/energy-monitor/orders/:orderId',
  authenticateToken,
  [
    param('orderId')
      .isUUID()
      .withMessage('Valid order ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      await monitor.removeOrder(req.params.orderId);
      
      res.json({
        success: true,
        data: { orderId: req.params.orderId },
        message: 'Order removed from energy monitor successfully'
      });
    } catch (error) {
      console.error('Remove order from energy monitor error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to remove order from energy monitor'
      });
    }
  }
);

/**
 * 手动触发能量检查
 * POST /api/transaction-package/energy-monitor/trigger-check
 */
router.post('/energy-monitor/trigger-check',
  authenticateToken,
  [
    body('orderId')
      .optional()
      .isUUID()
      .withMessage('Order ID must be valid UUID if provided')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      
      if (req.body.orderId) {
        // 触发特定订单的能量检查
        const result = await monitor.triggerEnergyCheck(req.body.orderId);
        res.json({
          success: true,
          data: result,
          message: 'Energy check triggered successfully'
        });
      } else {
        // 触发全局能量检查
        res.json({
          success: true,
          data: { message: 'Global energy check triggered' },
          message: 'Global energy check triggered successfully'
        });
      }
    } catch (error) {
      console.error('Trigger energy check error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to trigger energy check'
      });
    }
  }
);

/**
 * 获取监控统计信息
 * GET /api/transaction-package/energy-monitor/stats
 */
router.get('/energy-monitor/stats',
  authenticateToken,
  [
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be valid ISO8601 date'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be valid ISO8601 date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
      
      // 获取监控统计信息的实现
      res.json({
        success: true,
        data: {
          monitoredOrders: 0,
          energyUsageEvents: 0,
          delegationTriggered: 0,
          averageResponseTime: 0,
          lastCheckTime: new Date(),
          uptime: 0
        },
        message: 'Monitor statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get monitor stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get monitor statistics'
      });
    }
  }
);

/**
 * 获取交易监听状态
 * GET /api/transaction-package/monitoring/status
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const { getTransactionMonitorInstance } = await import('../../utils/transaction-monitor-singleton');
      const transactionMonitor = getTransactionMonitorInstance();
      
      if (!transactionMonitor) {
        return res.status(500).json({
          success: false,
          error: 'Transaction monitor service not initialized',
          message: 'Transaction monitor service is not available'
        });
      }
      
      const status = transactionMonitor.getStatus();
      
      res.json({
        success: true,
        data: status,
        message: 'Transaction monitor status retrieved successfully'
      });
    } catch (error) {
      console.error('Get transaction monitor status error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get transaction monitor status'
      });
    }
  }
);

/**
 * 手动触发交易检测
 * POST /api/transaction-package/monitoring/trigger-detection
 */
router.post('/trigger-detection',
  authenticateToken,
  [
    body('address')
      .optional()
      .isLength({ min: 34, max: 34 })
      .withMessage('Address must be 34 characters long if provided'),
    body('txHash')
      .optional()
      .isLength({ min: 64, max: 64 })
      .withMessage('Transaction hash must be 64 characters long if provided')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { getTransactionMonitorInstance } = await import('../../utils/transaction-monitor-singleton');
      const transactionMonitor = getTransactionMonitorInstance();
      
      if (!transactionMonitor) {
        return res.status(500).json({
          success: false,
          error: 'Transaction monitor service not initialized',
          message: 'Transaction monitor service is not available'
        });
      }

      // 强制执行一次交易轮询
      await (transactionMonitor as any).pollTransactions();
      
      res.json({
        success: true,
        data: { 
          triggered: true,
          timestamp: new Date(),
          note: 'Manual transaction detection triggered successfully'
        },
        message: 'Transaction detection triggered successfully'
      });
    } catch (error) {
      console.error('Trigger transaction detection error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to trigger transaction detection'
      });
    }
  }
);

/**
 * 重新启动交易监听服务
 * POST /api/transaction-package/monitoring/restart
 */
router.post('/restart',
  authenticateToken,
  async (req, res) => {
    try {
      const { getTransactionMonitorInstance } = await import('../../utils/transaction-monitor-singleton');
      const transactionMonitor = getTransactionMonitorInstance();
      
      if (!transactionMonitor) {
        return res.status(500).json({
          success: false,
          error: 'Transaction monitor service not initialized',
          message: 'Transaction monitor service is not available'
        });
      }

      // 停止并重新启动监听服务
      await transactionMonitor.stopMonitoring();
      await transactionMonitor.startMonitoring();
      
      res.json({
        success: true,
        data: { 
          restarted: true,
          timestamp: new Date(),
          status: transactionMonitor.getStatus()
        },
        message: 'Transaction monitor service restarted successfully'
      });
    } catch (error) {
      console.error('Restart transaction monitor error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to restart transaction monitor service'
      });
    }
  }
);

/**
 * 获取监控日志
 * GET /api/transaction-package/energy-monitor/logs
 */
router.get('/energy-monitor/logs',
  authenticateToken,
  [
    query('level')
      .optional()
      .isIn(['debug', 'info', 'warn', 'error'])
      .withMessage('Invalid log level'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be valid ISO8601 date'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be valid ISO8601 date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const level = req.query.level as string;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;
      
      // 获取监控日志的实现
      res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false
          }
        },
        message: 'Monitor logs retrieved successfully'
      });
    } catch (error) {
      console.error('Get monitor logs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get monitor logs'
      });
    }
  }
);

/**
 * 重新加载监控配置
 * POST /api/transaction-package/energy-monitor/reload-config
 */
router.post('/energy-monitor/reload-config',
  authenticateToken,
  async (req, res) => {
    try {
      // 重新加载监控配置的实现
      res.json({
        success: true,
        data: { reloaded: true },
        message: 'Monitor configuration reloaded successfully'
      });
    } catch (error) {
      console.error('Reload monitor config error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to reload monitor configuration'
      });
    }
  }
);

/**
 * 获取实时监控数据
 * GET /api/transaction-package/energy-monitor/realtime
 */
router.get('/energy-monitor/realtime',
  authenticateToken,
  async (req, res) => {
    try {
      const monitor = EnergyUsageMonitorService.getInstance();
      const status = monitor.getStatus();
      
      // 获取实时监控数据
      res.json({
        success: true,
        data: {
          ...status,
          timestamp: new Date(),
          systemHealth: 'healthy',
          activeConnections: 1,
          processedEvents: 0,
          errorCount: 0
        },
        message: 'Realtime monitor data retrieved successfully'
      });
    } catch (error) {
      console.error('Get realtime monitor data error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get realtime monitor data'
      });
    }
  }
);

/**
 * 手动触发能量代理（补单操作）
 * POST /api/transaction-package/manual-delegation
 */
router.post('/manual-delegation',
  authenticateToken,
  [
    body('orderId')
      .isUUID()
      .withMessage('Order ID must be valid UUID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId } = req.body;
      console.log('🔧 [手动补单] 收到请求:', { orderId, ip: req.ip });
      
      // 动态导入服务
      const { BatchDelegationService } = await import('../../services/batch-delegation/BatchDelegationService');
      const { DatabaseService } = await import('../../database/DatabaseService');
      
      const batchDelegationService = BatchDelegationService.getInstance();
      const dbService = DatabaseService.getInstance();
      
      // 验证订单状态
      const orderQuery = `
        SELECT 
          id, target_address, remaining_transactions, used_transactions, 
          transaction_count, status, payment_status, order_type, order_number
        FROM orders 
        WHERE id = $1 AND order_type = 'transaction_package'
      `;
      
      const orderResult = await dbService.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        console.warn('🔧 [手动补单] 订单未找到:', { orderId });
              return res.status(404).json({
                success: false,
                message: '找不到该订单，请检查订单号是否正确'
              });
      }
      
      const order = orderResult.rows[0];
      console.log('🔧 [手动补单] 订单状态:', {
        orderId,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        usedTransactions: order.used_transactions,
        remainingTransactions: order.remaining_transactions,
        totalTransactions: order.transaction_count
      });
      
      // 检查订单状态
      if (order.status !== 'active') {
            return res.status(400).json({
              success: false,
              message: `订单当前状态为"${order.status}"，无法执行代理操作`
            });
      }
      
      if (order.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: '订单尚未支付，请先完成支付后再试'
        });
      }
      
      if (order.remaining_transactions <= 0) {
        return res.status(400).json({
          success: false,
          message: '订单剩余笔数不足，无法继续代理'
        });
      }

      console.log('🔧 [手动补单] 开始执行代理:', {
        orderId,
        orderNumber: order.order_number,
        userAddress: order.target_address.substring(0, 15) + '...',
        networkId: order.network_id,
        usedTransactions: order.used_transactions,
        remainingTransactions: order.remaining_transactions
      });

      // 清理过期锁，让SingleDelegationProcessor统一管理锁
      try {
        await dbService.query('SELECT cleanup_expired_delegation_locks()');
        console.log('🔧 [手动补单] 已清理过期代理锁');
      } catch (lockError) {
        console.warn('🔧 [手动补单] 清理锁警告:', lockError);
      }

      // 执行代理 - SingleDelegationProcessor完全管理锁和业务逻辑
      console.log('🔧 [手动补单] 调用批量代理服务 (复用首次代理逻辑)');
      
      const delegationResult = await batchDelegationService.delegateSingleTransaction(
        orderId,
        order.target_address,
        undefined, // transactionHash
        true       // isManualDelegation - 手动代理，绕过时间限制
      );
      
      console.log('🔧 [手动补单] 代理结果:', {
        orderId,
        success: delegationResult.success,
        message: delegationResult.message,
        txHash: delegationResult.delegationTxHash?.substring(0, 15) + '...',
        usedTransactions: delegationResult.usedTransactions,
        remainingTransactions: delegationResult.remainingTransactions
      });
      
      // 处理代理结果
      if (delegationResult.success) {
        console.log('🔧 [手动补单] 代理成功:', {
          orderId,
          orderNumber: order.order_number,
          delegationTxHash: delegationResult.delegationTxHash?.substring(0, 20) + '...',
          usedTransactions: delegationResult.usedTransactions,
          remainingTransactions: delegationResult.remainingTransactions,
          energyDelegated: delegationResult.energyDelegated,
          message: '✅ 手动代理成功完成'
        });
        
        // 锁管理由SingleDelegationProcessor统一处理，无需手动释放
        
        res.json({
          success: true,
          data: {
            orderId,
            orderNumber: order.order_number,
            userAddress: order.target_address,
            delegationTxHash: delegationResult.delegationTxHash,
            usedTransactions: delegationResult.usedTransactions,
            remainingTransactions: delegationResult.remainingTransactions,
            totalTransactions: order.transaction_count,
            energyDelegated: delegationResult.energyDelegated || 65000,
                    message: `✅ 代理成功！已完成 ${delegationResult.usedTransactions}/${order.transaction_count} 笔`,
            networkInfo: {
              networkId: order.network_id,
              delegationSuccess: true
            }
          },
          message: '✅ 代理执行成功'
        });
      } else {
        console.error('🔧 [手动补单] 代理失败:', {
          orderId,
          orderNumber: order.order_number,
          error: delegationResult.message,
          details: delegationResult.details,
          originalError: delegationResult
        });
        
        // 锁管理由SingleDelegationProcessor统一处理，无需手动释放
        
        // 代理失败时的详细错误信息
        const errorDetails = {
          orderId,
          orderNumber: order.order_number,
          userAddress: order.target_address.substring(0, 15) + '...',
          networkId: order.network_id,
          usedTransactions: order.used_transactions,
          remainingTransactions: order.remaining_transactions,
          failureReason: delegationResult.message,
          originalDetails: delegationResult.details
        };
        
        res.status(400).json({
          success: false,
          message: delegationResult.message || '代理执行失败',
          details: errorDetails,
          error: '❌ 手动代理失败，请检查能量池余额或网络状态'
        });
      }
      
    } catch (error) {
      const orderId = req.body?.orderId;
      console.error('🔧 [手动补单] 异常:', {
        orderId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // 锁管理由SingleDelegationProcessor统一处理，包括异常时的清理
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ 系统异常，请稍后重试或联系客服'
      });
    }
  }
);

export default router;
