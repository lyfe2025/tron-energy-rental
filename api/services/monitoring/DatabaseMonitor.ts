/**
 * 数据库监控模块
 * 负责数据库性能监控和统计分析
 */
import { query } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class DatabaseMonitor {
  /**
   * 获取数据库监控信息
   */
  async getDatabaseStats(page: number = 1, limit: number = 20) {
    try {
      // 获取数据库连接信息
      const connectionsResult = await query(
        'SELECT count(*) as total FROM pg_stat_activity WHERE state = \'active\''
      );

      // 获取数据库大小
      const sizeResult = await query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as size_bytes'
      );

      // 获取表总数（用于分页）
      const totalTablesCountResult = await query(
        'SELECT COUNT(*) as count FROM pg_stat_user_tables'
      );
      const totalTables = parseInt(totalTablesCountResult.rows[0].count);

      // 计算分页偏移量
      const offset = (page - 1) * limit;

      // 获取表统计信息（带分页）
      const tablesResult = await query(
        `SELECT 
          schemaname,
          relname as tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
          pg_total_relation_size(schemaname||'.'||relname) as table_size_bytes,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size,
          pg_indexes_size(schemaname||'.'||relname) as index_size_bytes
         FROM pg_stat_user_tables
         ORDER BY n_live_tup DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      // 获取用户总数
      const userCountResult = await query('SELECT COUNT(*) as count FROM admins');
      
      // 获取订单总数（如果有orders表的话）
      let orderCount = 0;
      try {
        const orderCountResult = await query('SELECT COUNT(*) as count FROM orders');
        orderCount = parseInt(orderCountResult.rows[0].count);
      } catch {
        // 如果orders表不存在，保持为0
      }

      // 获取能量池总数
      let energyPoolCount = 0;
      try {
        const energyPoolCountResult = await query('SELECT COUNT(*) as count FROM energy_pools');
        energyPoolCount = parseInt(energyPoolCountResult.rows[0].count);
      } catch {
        // 如果energy_pools表不存在，保持为0
      }

      // 将表数据转换为前端期望的格式
      const tables = tablesResult.rows.map(table => ({
        tableName: table.tablename,
        name: table.tablename, // 保持向后兼容
        schema: table.schemaname,
        rowCount: parseInt(table.live_tuples),
        recordCount: parseInt(table.live_tuples), // 前端期望的字段名
        tableSize: parseInt(table.table_size_bytes),
        indexSize: parseInt(table.index_size_bytes),
        size: table.table_size, // 前端期望的格式化大小
        tableSizeFormatted: table.table_size,
        indexSizeFormatted: table.index_size,
        inserts: parseInt(table.inserts),
        updates: parseInt(table.updates),
        deletes: parseInt(table.deletes),
        lastUpdated: new Date().toISOString() // 实际应该从pg_stat_user_tables获取
      }));

      return {
        // 前端期望的字段格式
        tableCount: totalTables,
        userCount: parseInt(userCountResult.rows[0].count),
        orderCount: orderCount,
        databaseSize: parseInt(sizeResult.rows[0].size_bytes),
        databaseSizeFormatted: sizeResult.rows[0].size,
        
        // 连接信息
        activeConnections: parseInt(connectionsResult.rows[0].total),
        maxConnections: 100, // 默认值，可以通过查询 SHOW max_connections 获取
        
        // 版本信息
        version: 'PostgreSQL 14.x',
        
        // 表详细信息
        tables: tables,
        
        // 添加tableStats字段以匹配前端期望
        tableStats: tables,
        
        // 分页信息
        pagination: {
          page,
          limit,
          total: totalTables,
          totalPages: Math.ceil(totalTables / limit)
        },
        
        // 慢查询日志（暂时为空）
        slowQueries: [],
        
        // 为了向后兼容，添加旧的数据结构
        database: {
          activeConnections: parseInt(connectionsResult.rows[0].total),
          size: sizeResult.rows[0].size,
          sizeBytes: parseInt(sizeResult.rows[0].size_bytes)
        },
        counts: {
          users: parseInt(userCountResult.rows[0].count),
          orders: orderCount,
          energyPools: energyPoolCount
        }
      };
    } catch (error) {
      logger.error('获取数据库统计失败:', error);
      throw error;
    }
  }

  /**
   * 分析表性能
   */
  async analyzeTable(tableName: string) {
    try {
      // 验证表名是否存在
      const tableExists = await query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        [tableName]
      );

      if (!tableExists.rows[0].exists) {
        throw new Error(`表 ${tableName} 不存在`);
      }

      // 获取表的基本信息
      const tableInfo = await query(
        `SELECT 
          schemaname,
          relname as tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze,
          vacuum_count,
          autovacuum_count,
          analyze_count,
          autoanalyze_count
         FROM pg_stat_user_tables 
         WHERE relname = $1`,
        [tableName]
      );

      if (tableInfo.rows.length === 0) {
        throw new Error(`找不到表 ${tableName} 的统计信息`);
      }

      // 获取表大小信息
      const sizeInfo = await query(
        `SELECT 
          pg_size_pretty(pg_total_relation_size($1)) as total_size,
          pg_total_relation_size($1) as total_size_bytes,
          pg_size_pretty(pg_relation_size($1)) as table_size,
          pg_relation_size($1) as table_size_bytes,
          pg_size_pretty(pg_indexes_size($1)) as indexes_size,
          pg_indexes_size($1) as indexes_size_bytes
         `,
        [tableName]
      );

      // 获取索引信息
      const indexInfo = await query(
        `SELECT 
          indexname,
          indexdef,
          pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
         FROM pg_indexes 
         WHERE tablename = $1`,
        [tableName]
      );

      // 获取列信息
      const columnInfo = await query(
        `SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [tableName]
      );

      const stats = tableInfo.rows[0];
      const sizeData = sizeInfo.rows[0];
      const indexes = indexInfo.rows;
      const columns = columnInfo.rows;

      // 计算健康度评分
      const healthScore = this.calculateHealthScore(stats, sizeData, indexes);
      
      // 生成优化建议
      const recommendations = this.generateRecommendations(stats, sizeData, indexes, columns);

      // 返回符合前端期望的 TableAnalysisResult 结构
      return {
        tableName,
        healthScore,
        recommendations,
        statistics: {
          live_tuples: stats.live_tuples || 0,
          dead_tuples: stats.dead_tuples || 0,
          inserts: stats.inserts || 0,
          updates: stats.updates || 0,
          deletes: stats.deletes || 0,
          last_vacuum: stats.last_vacuum,
          last_autovacuum: stats.last_autovacuum,
          last_analyze: stats.last_analyze,
          last_autoanalyze: stats.last_autoanalyze
        },
        tableInfo: stats,
        sizeInfo: sizeData,
        indexes,
        columns
      };
    } catch (error) {
      logger.error(`分析表 ${tableName} 失败:`, error);
      throw error;
    }
  }

  private calculateHealthScore(stats: any, sizeInfo: any, indexes: any[]): number {
    let score = 100;
    
    // 检查死元组比例
    const liveTuples = stats.live_tuples || 0;
    const deadTuples = stats.dead_tuples || 0;
    const totalTuples = liveTuples + deadTuples;
    
    if (totalTuples > 0) {
      const deadRatio = deadTuples / totalTuples;
      if (deadRatio > 0.2) score -= 30; // 死元组超过20%
      else if (deadRatio > 0.1) score -= 15; // 死元组超过10%
    }
    
    // 检查是否有索引
    if (indexes.length === 0 && liveTuples > 1000) {
      score -= 20; // 大表没有索引
    }
    
    // 检查最近是否进行过分析
    if (!stats.last_analyze && !stats.last_autoanalyze) {
      score -= 15; // 从未分析过
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  private generateRecommendations(stats: any, sizeInfo: any, indexes: any[], columns: any[]): string[] {
    const recommendations: string[] = [];
    
    // 检查死元组
    const liveTuples = stats.live_tuples || 0;
    const deadTuples = stats.dead_tuples || 0;
    const totalTuples = liveTuples + deadTuples;
    
    if (totalTuples > 0) {
      const deadRatio = deadTuples / totalTuples;
      if (deadRatio > 0.2) {
        recommendations.push('建议执行 VACUUM 清理死元组，死元组比例过高');
      }
    }
    
    // 检查索引
    if (indexes.length === 0 && liveTuples > 1000) {
      recommendations.push('建议为大表添加适当的索引以提高查询性能');
    }
    
    // 检查分析统计
    if (!stats.last_analyze && !stats.last_autoanalyze) {
      recommendations.push('建议执行 ANALYZE 更新表统计信息');
    }
    
    // 检查表大小
    const tableSizeBytes = sizeInfo.table_size_bytes || 0;
    if (tableSizeBytes > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('表大小较大，建议考虑分区或归档历史数据');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('表状态良好，无需特殊优化');
    }
    
    return recommendations;
  }

  /**
   * 获取数据库连接统计
   */
  async getConnectionStats() {
    try {
      const result = await query(
        `SELECT 
          state,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - query_start))) as avg_duration
         FROM pg_stat_activity 
         WHERE pid != pg_backend_pid()
         GROUP BY state
         ORDER BY count DESC`
      );

      const totalConnections = await query(
        'SELECT COUNT(*) as total FROM pg_stat_activity WHERE pid != pg_backend_pid()'
      );

      const maxConnections = await query(
        'SHOW max_connections'
      );

      return {
        byState: result.rows,
        total: parseInt(totalConnections.rows[0].total),
        maxConnections: parseInt(maxConnections.rows[0].max_connections)
      };
    } catch (error) {
      logger.error('获取数据库连接统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取慢查询日志
   */
  async getSlowQueries(limit: number = 10) {
    try {
      const result = await query(
        `SELECT 
          query,
          state,
          query_start,
          EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_seconds,
          client_addr,
          application_name
         FROM pg_stat_activity 
         WHERE state = 'active' 
           AND query != '<IDLE>'
           AND query NOT LIKE '%pg_stat_activity%'
           AND EXTRACT(EPOCH FROM (NOW() - query_start)) > 1
         ORDER BY query_start DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('获取慢查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库性能指标
   */
  async getPerformanceMetrics() {
    try {
      // 获取缓存命中率
      const cacheHitRate = await query(
        `SELECT 
          ROUND(
            (blks_hit::float / (blks_hit + blks_read)) * 100, 2
          ) as cache_hit_rate
         FROM pg_stat_database 
         WHERE datname = current_database()`
      );

      // 获取事务统计
      const transactionStats = await query(
        `SELECT 
          xact_commit,
          xact_rollback,
          ROUND(
            (xact_commit::float / (xact_commit + xact_rollback)) * 100, 2
          ) as success_rate
         FROM pg_stat_database 
         WHERE datname = current_database()`
      );

      // 获取锁统计
      const lockStats = await query(
        `SELECT 
          mode,
          COUNT(*) as count
         FROM pg_locks 
         GROUP BY mode 
         ORDER BY count DESC`
      );

      return {
        cacheHitRate: cacheHitRate.rows[0]?.cache_hit_rate || 0,
        transactions: transactionStats.rows[0] || {},
        locks: lockStats.rows
      };
    } catch (error) {
      logger.error('获取数据库性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取表空间使用情况
   */
  async getTablespaceUsage() {
    try {
      const result = await query(
        `SELECT 
          spcname as tablespace_name,
          pg_size_pretty(pg_tablespace_size(spcname)) as size,
          pg_tablespace_size(spcname) as size_bytes
         FROM pg_tablespace
         ORDER BY pg_tablespace_size(spcname) DESC`
      );

      return result.rows;
    } catch (error) {
      logger.error('获取表空间使用情况失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据库健康状态
   */
  async checkDatabaseHealth() {
    try {
      const checks = await Promise.allSettled([
        // 检查连接数
        this.getConnectionStats(),
        
        // 检查缓存命中率
        this.getPerformanceMetrics(),
        
        // 检查是否有长时间运行的查询
        this.getSlowQueries(5),
        
        // 检查数据库大小
        query('SELECT pg_database_size(current_database()) as size_bytes')
      ]);

      const results = checks.map((check, index) => ({
        check: ['connections', 'performance', 'slow_queries', 'database_size'][index],
        status: check.status,
        result: check.status === 'fulfilled' ? check.value : null,
        error: check.status === 'rejected' ? check.reason.message : null
      }));

      // 评估整体健康状态
      const failedChecks = results.filter(r => r.status === 'rejected').length;
      const healthStatus = failedChecks === 0 ? 'healthy' : 
                          failedChecks <= 1 ? 'warning' : 'critical';

      return {
        status: healthStatus,
        timestamp: new Date(),
        checks: results
      };
    } catch (error) {
      logger.error('检查数据库健康状态失败:', error);
      throw error;
    }
  }

  /**
   * 执行VACUUM分析
   */
  async performVacuumAnalyze(tableName?: string) {
    try {
      if (tableName) {
        // 验证表名
        const tableExists = await query(
          'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
          [tableName]
        );

        if (!tableExists.rows[0].exists) {
          throw new Error(`表 ${tableName} 不存在`);
        }

        await query(`VACUUM ANALYZE ${tableName}`);
        logger.info(`VACUUM ANALYZE 完成: ${tableName}`);
        
        return { message: `表 ${tableName} 的 VACUUM ANALYZE 操作完成` };
      } else {
        await query('VACUUM ANALYZE');
        logger.info('全库 VACUUM ANALYZE 完成');
        
        return { message: '全库 VACUUM ANALYZE 操作完成' };
      }
    } catch (error) {
      logger.error('执行 VACUUM ANALYZE 失败:', error);
      throw error;
    }
  }
}
