/**
 * 价格历史记录管理器
 * 负责价格历史记录的查询、保存和管理功能
 */
import { query } from '../../../config/database.js';
import type {
    CalculationInput,
    HistoryQueryOptions,
    PriceCalculationResult,
    PriceHistoryRecord
} from '../types/index.js';

export class HistoryManager {
  /**
   * 获取价格历史记录
   * @param entityTypeOrOptions 实体类型或查询选项
   * @param entityId 实体ID（可选）
   * @param limit 限制数量（可选）
   * @returns 历史记录数组
   */
  static async getPriceHistory(
    entityTypeOrOptions?: string | HistoryQueryOptions,
    entityId?: string,
    limit?: number
  ): Promise<PriceHistoryRecord[]> {
    // 兼容性处理：支持旧的调用方式和新的选项对象方式
    let options: HistoryQueryOptions = {};
    
    if (typeof entityTypeOrOptions === 'string') {
      // 旧的调用方式：getPriceHistory(entityType, entityId, limit)
      options = {
        entityType: entityTypeOrOptions,
        entityId: entityId,
        limit: limit
      };
    } else if (entityTypeOrOptions) {
      // 新的调用方式：getPriceHistory(options)
      options = entityTypeOrOptions;
    }
    try {
      let sql = `
        SELECT 
          id,
          entity_type,
          entity_id,
          old_price,
          new_price,
          change_reason,
          changed_by,
          changed_at,
          metadata
        FROM price_history
        WHERE 1=1
      `;
      const params: any[] = [];

      // 添加筛选条件
      if (options.entityType) {
        sql += ' AND entity_type = ?';
        params.push(options.entityType);
      }

      if (options.entityId) {
        sql += ' AND entity_id = ?';
        params.push(options.entityId);
      }

      if (options.dateRange) {
        sql += ' AND changed_at BETWEEN ? AND ?';
        params.push(options.dateRange.start, options.dateRange.end);
      }

      // 排序
      const orderBy = options.orderBy || 'changed_at';
      const orderDirection = options.orderDirection || 'desc';
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      // 分页
      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          sql += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const result = await query(sql, params);
      
      return result.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        oldPrice: parseFloat(row.old_price),
        newPrice: parseFloat(row.new_price),
        changeReason: row.change_reason,
        changedBy: row.changed_by,
        changedAt: new Date(row.changed_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('获取价格历史失败:', error);
      return [];
    }
  }

  /**
   * 保存价格历史记录
   * @param oldPrice 旧价格
   * @param newPrice 新价格
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param changeReason 变更原因
   * @param changedBy 操作人
   * @param metadata 元数据
   */
  static async savePriceHistory(
    oldPrice: number,
    newPrice: number,
    entityType: string,
    entityId: string,
    changeReason: string,
    changedBy: string,
    metadata?: any
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO price_history (
          entity_type,
          entity_id,
          old_price,
          new_price,
          change_reason,
          changed_by,
          changed_at,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
      `, [
        entityType,
        entityId,
        oldPrice,
        newPrice,
        changeReason,
        changedBy,
        metadata ? JSON.stringify(metadata) : null
      ]);
    } catch (error) {
      console.error('保存价格历史失败:', error);
    }
  }

  /**
   * 记录价格历史（兼容性方法）
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @param oldPrice 旧价格
   * @param newPrice 新价格
   * @param reason 变更原因
   * @param userId 用户ID
   */
  static async recordPriceHistory(
    entityType: string,
    entityId: string,
    oldPrice: number,
    newPrice: number,
    reason: string,
    userId: string
  ): Promise<void> {
    return this.savePriceHistory(oldPrice, newPrice, entityType, entityId, reason, userId);
  }

  /**
   * 保存计算历史
   */
  static async saveCalculationHistory(
    input: CalculationInput,
    result: PriceCalculationResult
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO calculation_history (
          entity_type,
          entity_id,
          input_data,
          base_price,
          final_price,
          applied_rules,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        input.type,
        input.packageId || 'default',
        JSON.stringify(input),
        result.basePrice,
        result.finalPrice,
        JSON.stringify(result.appliedRules)
      ]);
    } catch (error) {
      console.error('保存计算历史失败:', error);
    }
  }
}
