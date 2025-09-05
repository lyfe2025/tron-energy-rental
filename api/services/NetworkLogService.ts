import pool from '../database';

interface NetworkLogData {
  admin_id?: string;
  username?: string;
  network_id?: string;
  network_name?: string;
  action: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: string;
  error_info?: string;
  request_params?: any;
  response_data?: any;
  ip_address?: string;
  user_agent?: string;
  execution_time?: number;
}

export class NetworkLogService {
  // 创建网络日志记录
  static async createLog(logData: NetworkLogData) {
    const {
      admin_id,
      username,
      network_id,
      network_name,
      action,
      level,
      message,
      details,
      error_info,
      request_params,
      response_data,
      ip_address,
      user_agent,
      execution_time
    } = logData;

    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO operation_logs (
          admin_id,
          username,
          module,
          operation,
          method,
          url,
          ip_address,
          user_agent,
          request_params,
          response_data,
          status,
          error_message,
          execution_time,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        admin_id,
        username,
        '网络配置',
        action,
        'POST',
        network_id ? `/api/tron-networks/${network_id}/test` : '/api/tron-networks/test-all',
        ip_address,
        user_agent,
        JSON.stringify({
          network_id,
          network_name,
          action,
          level,
          ...request_params
        }),
        JSON.stringify({
          success: level !== 'error',
          message,
          details,
          error_info,
          ...response_data
        }),
        level === 'error' ? 500 : level === 'warning' ? 200 : 200,
        error_info,
        execution_time
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('创建网络日志失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 批量创建日志记录（用于测试全部）
  static async createBatchLogs(logsData: NetworkLogData[]) {
    if (!logsData.length) return [];
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const logData of logsData) {
        const result = await this.createLogInternal(client, logData);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('批量创建网络日志失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 内部日志创建方法（用于事务）
  private static async createLogInternal(client: any, logData: NetworkLogData) {
    const {
      admin_id,
      username,
      network_id,
      network_name,
      action,
      level,
      message,
      details,
      error_info,
      request_params,
      response_data,
      ip_address,
      user_agent,
      execution_time
    } = logData;

    const query = `
      INSERT INTO operation_logs (
        admin_id,
        username,
        module,
        operation,
        method,
        url,
        ip_address,
        user_agent,
        request_params,
        response_data,
        status,
        error_message,
        execution_time,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      admin_id,
      username,
      '网络配置',
      action,
      'POST',
      network_id ? `/api/tron-networks/${network_id}/test` : '/api/tron-networks/test-all',
      ip_address,
      user_agent,
      JSON.stringify({
        network_id,
        network_name,
        action,
        level,
        ...request_params
      }),
      JSON.stringify({
        success: level !== 'error',
        message,
        details,
        error_info,
        ...response_data
      }),
      level === 'error' ? 500 : level === 'warning' ? 200 : 200,
      error_info,
      execution_time
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  }

  // 查询网络日志
  static async getLogs(params: {
    network_id?: string;
    level?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) {
    const client = await pool.connect();
    try {
      const {
        network_id,
        level,
        action,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = params;

      let query = `
        SELECT 
          id,
          admin_id,
          username,
          module,
          operation as action,
          request_params::json->>'network_id' as network_id,
          request_params::json->>'network_name' as network_name,
          request_params::json->>'level' as level,
          response_data::json->>'message' as message,
          response_data::json->>'details' as details,
          error_message as error_info,
          created_at,
          execution_time
        FROM operation_logs
        WHERE module = '网络配置'
      `;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (network_id) {
        conditions.push(`request_params::json->>'network_id' = $${paramIndex}`);
        values.push(network_id);
        paramIndex++;
      }

      if (level) {
        conditions.push(`request_params::json->>'level' = $${paramIndex}`);
        values.push(level);
        paramIndex++;
      }

      if (action) {
        conditions.push(`operation = $${paramIndex}`);
        values.push(action);
        paramIndex++;
      }

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(end_date);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // 计算总数
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // 添加分页和排序
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit);
      values.push((page - 1) * limit);

      const result = await client.query(query, values);
      
      return {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('查询网络日志失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 记录网络测试日志
  static async logNetworkTest(
    networkId: string,
    networkName: string,
    testResult: any,
    userId?: string,
    username?: string,
    ip?: string,
    userAgent?: string,
    executionTime?: number
  ) {
    const logData: NetworkLogData = {
      admin_id: userId,
      username: username || '系统',
      network_id: networkId,
      network_name: networkName,
      action: '连接测试',
      level: testResult.status === 'healthy' ? 'info' : 'error',
      message: testResult.status === 'healthy' ? '网络连接测试成功' : '网络连接测试失败',
      details: testResult.status === 'healthy' ? 
        `响应时间: ${testResult.response_time_ms}ms, 区块高度: ${testResult.block_height || 'N/A'}` :
        testResult.error_message || '网络连接失败',
      error_info: testResult.status !== 'healthy' ? testResult.error_message : undefined,
      request_params: {
        test_type: 'single_network'
      },
      response_data: testResult,
      ip_address: ip,
      user_agent: userAgent,
      execution_time: executionTime
    };

    return await this.createLog(logData);
  }

  // 记录批量测试日志
  static async logBatchNetworkTest(
    testResults: any[],
    userId?: string,
    username?: string,
    ip?: string,
    userAgent?: string,
    executionTime?: number
  ) {
    const successCount = testResults.filter(r => r.success).length;
    const failureCount = testResults.length - successCount;
    
    const logData: NetworkLogData = {
      admin_id: userId,
      username: username || '系统',
      action: '批量连接测试',
      level: failureCount === 0 ? 'info' : failureCount === testResults.length ? 'error' : 'warning',
      message: failureCount === 0 ? 
        '批量网络连接测试成功' : 
        failureCount === testResults.length ?
        '批量网络连接测试失败' :
        '批量网络连接测试部分成功',
      details: `测试网络: ${testResults.length}个, 成功: ${successCount}个, 失败: ${failureCount}个`,
      error_info: failureCount > 0 ? `${failureCount}个网络连接失败` : undefined,
      request_params: {
        test_type: 'batch_network',
        networks_count: testResults.length
      },
      response_data: {
        total: testResults.length,
        success_count: successCount,
        failure_count: failureCount,
        results: testResults
      },
      ip_address: ip,
      user_agent: userAgent,
      execution_time: executionTime
    };

    return await this.createLog(logData);
  }

  // 记录配置同步日志
  static async logConfigSync(
    networkId: string,
    networkName: string,
    syncResults: any,
    userId?: string,
    username?: string,
    ip?: string,
    userAgent?: string,
    executionTime?: number
  ) {
    const { successSteps, errorSteps, totalSteps } = syncResults;
    
    const logData: NetworkLogData = {
      admin_id: userId,
      username: username || '系统',
      network_id: networkId,
      network_name: networkName,
      action: '配置同步',
      level: errorSteps === 0 ? 'info' : errorSteps === totalSteps ? 'error' : 'warning',
      message: errorSteps === 0 ? 
        '配置同步完成' : 
        errorSteps === totalSteps ? 
        '配置同步失败' : 
        '配置同步部分失败',
      details: `同步步骤: ${totalSteps}个, 成功: ${successSteps}个, 失败: ${errorSteps}个`,
      error_info: errorSteps > 0 ? `${errorSteps}个同步步骤失败` : undefined,
      request_params: {
        sync_type: 'full_sync',
        steps: syncResults.steps || []
      },
      response_data: syncResults,
      ip_address: ip,
      user_agent: userAgent,
      execution_time: executionTime
    };

    return await this.createLog(logData);
  }
}
