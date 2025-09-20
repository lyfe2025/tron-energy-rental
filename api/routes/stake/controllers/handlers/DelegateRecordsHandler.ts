/**
 * 委托记录处理器
 * 处理委托记录相关的业务逻辑
 */
import type { Request, Response } from 'express';
import { tronService } from '../../../../services/tron.js';
import type { DelegateRecord, StakeQueryParams } from '../../types/stake.types.js';
import { BaseRecordsHandler } from './BaseRecordsHandler.js';

export class DelegateRecordsHandler extends BaseRecordsHandler {
  /**
   * 获取委托记录
   */
  async getDelegateRecords(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[DelegateRecordsHandler] 🚀 ========== 开始处理代理记录请求 ==========`);
      console.log(`[DelegateRecordsHandler] 📋 原始请求参数:`, {
        query: req.query,
        url: req.url,
        method: req.method
      });

      // 解析地址参数
      const { targetAddress, networkId } = await this.parseAddressParams(req);
      console.log(`[DelegateRecordsHandler] 🏠 解析后地址信息:`, { targetAddress, networkId });
      
      // 解析分页参数
      const pagination = this.parsePaginationParams(req);
      console.log(`[DelegateRecordsHandler] 📄 分页参数:`, pagination);
      
      // 处理网络切换
      await this.switchNetwork(networkId);

      // 获取查询参数中的方向（用于前端过滤标识）
      const direction = req.query.direction as 'out' | 'in' | undefined;
      
      console.log(`[DelegateRecordsHandler] 🔍 关键业务参数:`, {
        targetAddress,
        direction: direction || '获取全部记录',
        limit: pagination.limit,
        page: pagination.page,
        strategy: '获取全部代理记录，前端根据direction过滤'
      });

      // 🎯 获取所有代理记录，前端负责方向过滤
      console.log(`[DelegateRecordsHandler] 📊 执行策略: 获取所有代理记录，前端智能过滤`);
      console.log(`[DelegateRecordsHandler] 💡 优势: 简单可靠，前端可以灵活控制显示逻辑`);
      
      const requestLimit = Math.min(pagination.limit * 3, 50);
      console.log(`[DelegateRecordsHandler] 🔄 API调用参数:`, {
        address: targetAddress,
        requestLimit,
        offset: pagination.offset,
        note: `获取全部记录，前端根据direction='${direction||'未指定'}'进行过滤`
      });
      
      const startTime = Date.now();
      const tronResult = await tronService.getDelegateTransactionHistory(
        targetAddress, 
        requestLimit,
        pagination.offset
      );
      const endTime = Date.now();
      
      console.log(`[DelegateRecordsHandler] ✅ API调用完成，耗时: ${endTime - startTime}ms`);
      console.log(`[DelegateRecordsHandler] 📊 返回结果:`, {
        success: tronResult.success,
        dataLength: tronResult.data?.length || 0,
        error: tronResult.error,
        hasData: !!tronResult.data,
        dataType: typeof tronResult.data,
        frontendFilterBy: direction || 'all'
      });
      
      if (!tronResult.success) {
        console.log(`[DelegateRecordsHandler] ❌ 交易历史API调用失败:`, {
          error: tronResult.error,
          targetAddress,
          direction
        });
        throw new Error(tronResult.error || '获取TRON委托记录失败');
      }

      let filteredRecords = tronResult.data || [];
      console.log(`[DelegateRecordsHandler] 🔍 原始数据处理:`, {
        rawDataLength: filteredRecords.length,
        isArray: Array.isArray(filteredRecords),
        dataType: typeof filteredRecords,
        firstRecord: filteredRecords[0] ? JSON.stringify(filteredRecords[0], null, 2) : 'N/A'
      });
      
      if (filteredRecords.length > 0) {
        console.log(`[DelegateRecordsHandler] 🔍 前3条原始记录详情:`, 
          filteredRecords.slice(0, 3).map((r, index) => ({
            序号: index + 1,
            txid: r.transaction_id?.substring(0, 12),
            operation_type: r.operation_type,
            status: r.status,
            from_address: r.from_address?.substring(0, 10) + '...',
            to_address: r.to_address?.substring(0, 10) + '...',
            amount: r.amount,
            resource_type: r.resource_type,
            created_at: r.created_at
          }))
        );
      } else {
        console.log(`[DelegateRecordsHandler] ⚠️ 没有获取到任何原始记录！`);
      }

      // 应用业务过滤条件
      const originalCount = filteredRecords.length;
      filteredRecords = this.applyBusinessFilters(filteredRecords, req);

      // 应用日期过滤
      filteredRecords = this.applyDateFilters(filteredRecords, req);

      console.log(`[DelegateRecordsHandler] 🔍 过滤条件总结:`, {
        originalCount,
        finalCount: filteredRecords.length,
        operation_type: req.query.operation_type,
        resource_type: req.query.resource_type,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: pagination.limit
      });

      // 分页处理
      const paginatedRecords = this.applyPagination(filteredRecords, pagination);
      console.log(`[DelegateRecordsHandler] 📄 分页处理:`, {
        beforePagination: filteredRecords.length,
        afterPagination: paginatedRecords.length,
        limit: pagination.limit,
        page: pagination.page,
        offset: pagination.offset
      });

      // 映射字段以支持前端的方向判断逻辑
      const delegateRecords = this.mapToDelegateRecords(paginatedRecords);
      console.log(`[DelegateRecordsHandler] 🔄 字段映射完成:`, {
        mappedRecordsCount: delegateRecords.length,
        sampleMappedRecord: delegateRecords[0] ? {
          id: delegateRecords[0].id,
          operation_type: delegateRecords[0].operation_type,
          status: delegateRecords[0].status,
          fromAddress: delegateRecords[0].fromAddress?.substring(0, 10) + '...',
          toAddress: delegateRecords[0].toAddress?.substring(0, 10) + '...',
          from_address: delegateRecords[0].from_address?.substring(0, 10) + '...',
          to_address: delegateRecords[0].to_address?.substring(0, 10) + '...',
          amount: delegateRecords[0].amount,
          resource_type: delegateRecords[0].resource_type
        } : 'N/A'
      });
      
      // 创建响应
      const response = this.createPaginatedResponse<DelegateRecord>(
        delegateRecords, 
        filteredRecords.length, 
        pagination
      );
      
      console.log(`[DelegateRecordsHandler] 🚀 最终响应数据:`, {
        success: response.success,
        dataCount: response.data.length,
        pagination: response.pagination,
        hasData: response.data.length > 0,
        firstRecordKeys: response.data[0] ? Object.keys(response.data[0]) : []
      });
      
      console.log(`[DelegateRecordsHandler] 🏁 ========== 代理记录请求处理完成 ==========`);
      
      res.json(response);
    } catch (error: any) {
      this.handleError(res, error, '获取委托记录');
    }
  }

  /**
   * 应用业务过滤条件
   */
  private applyBusinessFilters(records: any[], req: Request): any[] {
    const { operation_type, resource_type } = req.query as StakeQueryParams;
    let filteredRecords = records;
    
    if (operation_type) {
      const before = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => 
        record.operation_type === operation_type
      );
      console.log(`[DelegateRecordsHandler] 🔍 operation_type过滤: ${before} → ${filteredRecords.length}条 (过滤条件: ${operation_type})`);
    }

    if (resource_type) {
      const before = filteredRecords.length;
      filteredRecords = filteredRecords.filter(record => 
        record.resource_type === resource_type
      );
      console.log(`[DelegateRecordsHandler] 🔍 resource_type过滤: ${before} → ${filteredRecords.length}条 (过滤条件: ${resource_type})`);
    }

    return filteredRecords;
  }

  /**
   * 映射为委托记录格式
   */
  private mapToDelegateRecords(records: any[]): DelegateRecord[] {
    return records.map((record: any) => {
      const mappedRecord = {
        id: record.id,
        pool_account_id: record.pool_id || '',
        operation_type: record.operation_type,
        receiver_address: record.to_address || '',
        amount: record.amount,
        resource_type: record.resource_type,
        txid: record.transaction_id,
        status: record.status, // 保持原始状态，不做转换
        created_at: record.created_at,
        is_locked: false,
        lock_period: 0,
        confirmed_at: record.created_at,
        error_message: record.status === 'failed' ? 'Transaction failed' : undefined,
        // ✅ 关键修复：添加前端需要的字段用于方向判断
        // ✅ 标准映射：from_address=代理发起方，to_address=代理接收方
        fromAddress: record.from_address || '',  // 前端兼容性字段（代理发起方）
        toAddress: record.to_address || '',      // 前端兼容性字段（代理接收方）
        from_address: record.from_address || '', // 原始字段（代理发起方）
        to_address: record.to_address || ''      // 原始字段（代理接收方）
      } as DelegateRecord;
      
      // 调试日志：显示记录状态
      console.log(`[DelegateRecordsHandler] 🔍 代理记录映射:`, {
        txid: record.transaction_id?.substring(0, 12),
        operation_type: record.operation_type,
        status: record.status,
        amount: record.amount,
        from_address: record.from_address,
        to_address: record.to_address
      });
      
      return mappedRecord;
    });
  }
}
