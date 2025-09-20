/**
 * 解冻记录处理器
 * 处理解冻记录相关的业务逻辑
 */
import type { Request, Response } from 'express';
import { tronService } from '../../../../services/tron.js';
import type { UnfreezeRecord } from '../../types/stake.types.js';
import { BaseRecordsHandler } from './BaseRecordsHandler.js';

export class UnfreezeRecordsHandler extends BaseRecordsHandler {
  /**
   * 获取解冻记录
   */
  async getUnfreezeRecords(req: Request, res: Response): Promise<void> {
    try {
      // 解析地址参数
      const { targetAddress, networkId } = await this.parseAddressParams(req);
      
      // 解析分页参数
      const pagination = this.parsePaginationParams(req);
      
      // 处理网络切换
      await this.switchNetwork(networkId);

      console.log(`[UnfreezeRecordsHandler] 开始获取解冻记录，地址: ${targetAddress}, 限制: ${pagination.limit}`);

      // 从TRON网络获取真实的解质押记录
      const tronResult = await tronService.getUnfreezeTransactionHistory(
        targetAddress, 
        pagination.limit * 2, // 获取更多记录以便过滤
        pagination.offset
      );
      
      if (!tronResult.success) {
        throw new Error(tronResult.error || '获取TRON解质押记录失败');
      }

      let filteredRecords = tronResult.data || [];
      console.log(`[UnfreezeRecordsHandler] 原始获取到 ${filteredRecords.length} 条解冻记录`);

      // 应用日期过滤条件
      filteredRecords = this.applyDateFilters(filteredRecords, req);

      // 分页处理
      const paginatedRecords = this.applyPagination(filteredRecords, pagination);
      
      // 添加状态计算和格式转换
      const processedRecords = this.processUnfreezeRecords(paginatedRecords);
      
      // 创建响应
      const response = this.createPaginatedResponse<UnfreezeRecord>(
        processedRecords, 
        filteredRecords.length, 
        pagination
      );
      
      res.json(response);
    } catch (error: any) {
      this.handleError(res, error, '获取解冻记录');
    }
  }

  /**
   * 处理解冻记录，添加状态计算
   */
  private processUnfreezeRecords(records: any[]): UnfreezeRecord[] {
    return records.map((record: any) => {
      const withdrawableTime = record.withdrawable_time ? new Date(record.withdrawable_time) : null;
      const now = new Date();
      
      return {
        ...record,
        canWithdraw: record.status === 'withdrawable' || (withdrawableTime && withdrawableTime <= now),
        daysUntilWithdrawable: (withdrawableTime && withdrawableTime > now) 
          ? Math.ceil((withdrawableTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      };
    });
  }
}
