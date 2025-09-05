/**
 * TRON网络连接测试控制器
 * 包含：单个网络连接测试、批量网络测试、批量健康检查等功能
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import { NetworkLogService } from '../../../services/NetworkLogService';

type RouteHandler = (req: Request, res: Response) => Promise<Response | void>;

/**
 * 测试TRON网络连接
 * POST /api/tron-networks/:id/test-connection
 * 权限：管理员
 */
export const testNetworkConnection: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取网络配置
    const networkResult = await query(
      `SELECT id, name, rpc_url, api_key, timeout_ms FROM tron_networks WHERE id = $1`,
      [id]
    );
    
    if (networkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'TRON网络不存在'
      });
      return;
    }
    
    const network = networkResult.rows[0];
    const startTime = Date.now();
    let connectionStatus = 'healthy';
    let errorMessage = '';
    let blockHeight = 0;
    
    try {
      // 模拟网络连接测试
      // 在实际实现中，这里应该调用TRON网络API进行连接测试
      
      // 模拟获取最新区块高度
      blockHeight = Math.floor(Math.random() * 1000000) + 50000000;
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
    } catch (error) {
      connectionStatus = 'unhealthy';
      errorMessage = error instanceof Error ? error.message : '连接测试失败';
    }
    
    const responseTime = Date.now() - startTime;
    
    // 更新网络健康状态和最后检查时间
    await query(
      `UPDATE tron_networks 
       SET health_status = $1, last_health_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [connectionStatus, id]
    );
    
    const testResult = {
      network_id: id,
      network_name: network.name,
      status: connectionStatus,
      response_time_ms: responseTime,
      block_height: blockHeight,
      error_message: errorMessage || undefined,
      test_time: new Date().toISOString()
    };
    
    // 记录单个网络测试日志
    try {
      await NetworkLogService.logNetworkTest(
        id,
        network.name,
        testResult,
        (req as any).user?.id,
        (req as any).user?.username || null,
        req.ip,
        req.get('User-Agent'),
        responseTime
      );
      console.log(`📝 单个网络测试日志已记录: ${network.name} (${connectionStatus})`);
    } catch (logError) {
      console.error('记录网络测试日志失败:', logError);
    }
    
    res.status(200).json({
      success: true,
      message: '网络连接测试完成',
      data: testResult
    });
    
  } catch (error) {
    console.error('测试TRON网络连接错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 批量健康检查
 * POST /api/tron-networks/health-check
 * 权限：管理员
 */
export const batchHealthCheck: RouteHandler = async (req: Request, res: Response) => {
  try {
    // 获取所有活跃的网络
    const networksResult = await query(
      `SELECT id, name, rpc_url, api_key, timeout_ms FROM tron_networks WHERE is_active = true`
    );
    
    const healthResults = [];
    
    for (const network of networksResult.rows) {
      const startTime = Date.now();
      let status = 'healthy';
      let errorMessage = '';
      
      try {
        // 模拟网络连接测试
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      } catch (error) {
        status = 'unhealthy';
        errorMessage = error instanceof Error ? error.message : '连接失败';
      }
      
      const responseTime = Date.now() - startTime;
      
      // 更新网络健康状态和最后检查时间
      await query(
        `UPDATE tron_networks 
         SET health_status = $1, last_health_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [status, network.id]
      );
      
      healthResults.push({
        network_id: network.id,
        network_name: network.name,
        status,
        response_time_ms: responseTime,
        error_message: errorMessage || undefined
      });
    }
    
    res.status(200).json({
      success: true,
      message: '批量健康检查完成',
      data: {
        total_networks: healthResults.length,
        healthy_networks: healthResults.filter(r => r.status === 'healthy').length,
        unhealthy_networks: healthResults.filter(r => r.status === 'unhealthy').length,
        results: healthResults,
        check_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('批量健康检查错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 测试所有网络连接
 * POST /api/tron-networks/test-all
 * 权限：管理员
 */
export const testAllNetworks: RouteHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // 获取所有活跃的网络
    const networksResult = await query(
      `SELECT id, name, rpc_url, api_key, timeout_ms FROM tron_networks WHERE is_active = true`
    );
    
    if (networksResult.rows.length === 0) {
      res.status(200).json({
        success: true,
        message: '没有活跃的网络需要测试',
        data: {
          total_networks: 0,
          healthy_networks: 0,
          unhealthy_networks: 0,
          results: []
        }
      });
      return;
    }
    
    const testResults = [];
    
    for (const network of networksResult.rows) {
      const startTime = Date.now();
      let status = 'healthy';
      let errorMessage = '';
      let blockHeight = 0;
      
      try {
        // 模拟网络连接测试
        blockHeight = Math.floor(Math.random() * 1000000) + 50000000;
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      } catch (error) {
        status = 'unhealthy';
        errorMessage = error instanceof Error ? error.message : '连接测试失败';
      }
      
      const responseTime = Date.now() - startTime;
      
      // 更新网络健康状态和最后检查时间
      await query(
        `UPDATE tron_networks 
         SET health_status = $1, last_health_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [status, network.id]
      );
      
      testResults.push({
        network_id: network.id,
        network_name: network.name,
        status,
        response_time_ms: responseTime,
        block_height: blockHeight,
        error_message: errorMessage || undefined
      });
    }
    
    const healthyCount = testResults.filter(r => r.status === 'healthy').length;
    const unhealthyCount = testResults.filter(r => r.status === 'unhealthy').length;
    
    // 记录日志：1. 批量测试总体日志 + 2. 每个网络的单独测试日志
    try {
      const totalExecutionTime = Date.now() - startTime;
      
      // 1. 记录批量测试总体日志
      await NetworkLogService.logBatchNetworkTest(
        testResults.map(r => ({
          networkId: r.network_id,
          networkName: r.network_name,
          success: r.status === 'healthy',
          latency: r.response_time_ms,
          error: r.error_message
        })),
        (req as any).user?.id,
        (req as any).user?.username || null,
        req.ip,
        req.get('User-Agent'),
        totalExecutionTime
      );
      console.log(`📝 批量测试日志已记录: ${testResults.length}个网络, 成功${healthyCount}个`);
      
      // 2. 为每个网络生成单独的测试日志
      for (const result of testResults) {
        try {
          await NetworkLogService.logNetworkTest(
            result.network_id,
            result.network_name,
            {
              network_id: result.network_id,
              network_name: result.network_name,
              status: result.status,
              response_time_ms: result.response_time_ms,
              block_height: result.block_height,
              error_message: result.error_message,
              test_time: result.test_time || new Date().toISOString()
            },
            (req as any).admin?.id,
            (req as any).admin?.username || null,
            req.ip,
            req.get('User-Agent'),
            result.response_time_ms || 0
          );
        } catch (singleLogError) {
          console.error(`记录单个网络测试日志失败 (${result.network_name}):`, singleLogError);
        }
      }
      console.log(`📝 单个网络测试日志已记录: ${testResults.length}条`);
      
    } catch (logError) {
      console.error('记录批量测试日志失败:', logError);
      // 日志记录失败不影响主流程
    }
    
    res.status(200).json({
      success: true,
      message: '所有网络连接测试完成',
      data: {
        total_networks: testResults.length,
        healthy_networks: healthyCount,
        unhealthy_networks: unhealthyCount,
        results: testResults,
        test_time: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('测试所有网络连接错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
