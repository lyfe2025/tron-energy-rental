/**
 * 记录处理器基类
 * 提供通用的参数解析、验证和分页处理逻辑
 */
import type { Request, Response } from 'express';
import { query } from '../../../../database/index.ts';
import { tronService } from '../../../../services/tron.ts';
import type { PaginatedResponse, StakeQueryParams } from '../../types/stake.types.ts';

export interface ProcessedAddress {
  targetAddress: string;
  networkId: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export abstract class BaseRecordsHandler {
  /**
   * 解析和验证地址参数
   */
  protected async parseAddressParams(req: Request): Promise<ProcessedAddress> {
    const { 
      address, 
      poolId,
      pool_id, 
      networkId: queryNetworkId,
    } = req.query as StakeQueryParams;
    
    const targetPoolId = poolId || pool_id;
    let targetAddress = address as string;
    let networkId: string | null = queryNetworkId as string || null;
    
    // 如果提供了poolId，从数据库获取对应的地址和网络配置
    if (targetPoolId && typeof targetPoolId === 'string') {
      const poolQuery = 'SELECT tron_address FROM energy_pools WHERE id = $1';
      const poolResult = await query(poolQuery, [targetPoolId]);
      
      if (poolResult.rows.length === 0) {
        throw new Error(`能量池不存在: 未找到ID为 ${targetPoolId} 的能量池`);
      }
      
      targetAddress = poolResult.rows[0].tron_address;
      // 账户支持所有网络，使用传入的networkId参数
    }
    
    if (!targetAddress || typeof targetAddress !== 'string') {
      throw new Error('缺少必要参数: 请提供 address 或 poolId 参数');
    }

    return { targetAddress, networkId };
  }

  /**
   * 处理网络切换
   */
  protected async switchNetwork(networkId: string | null): Promise<void> {
    if (networkId) {
      try {
        await tronService.switchToNetwork(networkId);
        console.log(`[BaseHandler] ✅ 网络切换成功 - 当前网络: ${tronService.getCurrentNetwork()?.name}`);
      } catch (error: any) {
        console.warn(`[BaseHandler] 切换到网络 ${networkId} 失败，使用默认网络:`, error.message);
      }
    } else {
      console.log(`[BaseHandler] ⚠️ 没有提供networkId，使用默认网络`);
    }
  }

  /**
   * 解析分页参数
   */
  protected parsePaginationParams(req: Request): PaginationParams {
    const { page = '1', limit = '20' } = req.query as StakeQueryParams;
    
    return {
      page: parseInt(page),
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
  }

  /**
   * 应用日期过滤
   */
  protected applyDateFilters(records: any[], req: Request): any[] {
    const { startDate, endDate } = req.query as StakeQueryParams;
    let filteredRecords = records;

    if (startDate) {
      const startTime = new Date(startDate as string);
      filteredRecords = filteredRecords.filter(record => 
        new Date(record.created_at) >= startTime
      );
    }

    if (endDate) {
      const endTime = new Date(endDate as string);
      filteredRecords = filteredRecords.filter(record => 
        new Date(record.created_at) <= endTime
      );
    }

    return filteredRecords;
  }

  /**
   * 应用分页处理
   */
  protected applyPagination<T>(records: T[], pagination: PaginationParams): T[] {
    const startIndex = 0;
    const endIndex = pagination.limit;
    return records.slice(startIndex, endIndex);
  }

  /**
   * 创建分页响应
   */
  protected createPaginatedResponse<T>(
    data: T[], 
    totalRecords: number, 
    pagination: PaginationParams
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / pagination.limit)
      }
    };
  }

  /**
   * 标准错误处理
   */
  protected handleError(res: Response, error: any, context: string): void {
    console.error(`${context}失败:`, error);
    
    const statusCode = error.message.includes('能量池不存在') || error.message.includes('缺少必要参数') ? 400 : 500;
    const errorType = statusCode === 400 ? '请求参数错误' : '服务器内部错误';
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorType,
      details: error.message 
    });
  }
}
