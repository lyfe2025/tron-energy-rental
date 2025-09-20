/**
 * 质押记录处理器
 * 处理质押记录相关的业务逻辑
 */
import type { Request, Response } from 'express';
import { tronService } from '../../../../services/tron.js';
import type { StakeQueryParams, StakeRecord } from '../../types/stake.types.js';
import { BaseRecordsHandler } from './BaseRecordsHandler.js';

export class StakeRecordsHandler extends BaseRecordsHandler {
  /**
   * 获取质押记录
   */
  async getStakeRecords(req: Request, res: Response): Promise<void> {
    try {
      // 解析地址参数
      const { targetAddress, networkId } = await this.parseAddressParams(req);
      
      // 解析分页参数
      const pagination = this.parsePaginationParams(req);
      
      // 处理网络切换
      await this.switchNetwork(networkId);

      console.log(`[StakeRecordsHandler] 开始获取质押记录，地址: ${targetAddress}, 限制: ${pagination.limit}`);
      
      // 从TRON网络获取真实的质押记录
      console.log('[StakeRecordsHandler] 调用参数:', { 
        targetAddress, 
        limit: pagination.limit * 2, 
        offset: pagination.offset,
        网络配置: tronService.getCurrentNetwork()?.name
      });
      
      const tronResult = await tronService.getStakeTransactionHistory(
        targetAddress, 
        pagination.limit * 2, // 获取更多记录以便过滤
        pagination.offset
      );
      
      console.log(`[StakeRecordsHandler] 🎯🎯🎯 TRON服务返回结果:`, { 
        success: tronResult.success, 
        dataLength: tronResult.data?.length, 
        error: tronResult.error,
        数据样本: tronResult.data?.slice(0, 2).map(item => ({
          id: item.id,
          operation_type: item.operation_type,
          resource_type: item.resource_type,
          amount: item.amount
        }))
      });
      
      if (!tronResult.success) {
        throw new Error(tronResult.error || '获取TRON质押记录失败');
      }

      let filteredRecords = tronResult.data || [];
      console.log(`[StakeRecordsHandler] 过滤前记录数量: ${filteredRecords.length}`);

      // 应用业务过滤条件
      filteredRecords = this.applyBusinessFilters(filteredRecords, req);

      // 应用日期过滤
      filteredRecords = this.applyDateFilters(filteredRecords, req);

      // 分页处理
      const paginatedRecords = this.applyPagination(filteredRecords, pagination);
      
      // 创建响应
      const response = this.createPaginatedResponse<StakeRecord>(
        paginatedRecords, 
        filteredRecords.length, 
        pagination
      );
      
      res.json(response);
    } catch (error: any) {
      this.handleError(res, error, '获取质押记录');
    }
  }

  /**
   * 应用业务过滤条件
   */
  private applyBusinessFilters(records: any[], req: Request): any[] {
    const { operation_type, resource_type } = req.query as StakeQueryParams;
    let filteredRecords = records;

    // 操作类型过滤
    if (operation_type) {
      filteredRecords = filteredRecords.filter(record => 
        record.operation_type === operation_type
      );
    }

    // 资源类型过滤
    if (resource_type) {
      filteredRecords = filteredRecords.filter(record => 
        record.resource_type === resource_type
      );
    }

    return filteredRecords;
  }
}
