/**
 * 记录查询控制器 (重构版)
 * 委托具体实现给专门的处理器，保持接口不变
 */
import type { Request, Response } from 'express';
import type { RouteHandler } from '../types/stake.types.ts';

// 导入专门的处理器
import { DelegateRecordsHandler } from './handlers/DelegateRecordsHandler.ts';
import { RecordsSummaryHandler } from './handlers/RecordsSummaryHandler.ts';
import { StakeRecordsHandler } from './handlers/StakeRecordsHandler.ts';
import { UnfreezeRecordsHandler } from './handlers/UnfreezeRecordsHandler.ts';

export class RecordsController {
  // 初始化处理器实例
  private static stakeHandler = new StakeRecordsHandler();
  private static delegateHandler = new DelegateRecordsHandler();
  private static unfreezeHandler = new UnfreezeRecordsHandler();
  private static summaryHandler = new RecordsSummaryHandler();

  /**
   * 获取质押记录 (从TRON网络API)
   * 
   * 委托给 StakeRecordsHandler 处理
   */
  static getStakeRecords: RouteHandler = async (req: Request, res: Response) => {
    console.log('[RecordsController] 委托质押记录请求给 StakeRecordsHandler');
    return RecordsController.stakeHandler.getStakeRecords(req, res);
  };

  /**
   * 获取委托记录 (从TRON网络API)
   * 
   * 委托给 DelegateRecordsHandler 处理
   */
  static getDelegateRecords: RouteHandler = async (req: Request, res: Response) => {
    console.log('[RecordsController] 委托代理记录请求给 DelegateRecordsHandler');
    return RecordsController.delegateHandler.getDelegateRecords(req, res);
  };

  /**
   * 获取解冻记录 (从TRON网络API)
   * 
   * 委托给 UnfreezeRecordsHandler 处理
   */
  static getUnfreezeRecords: RouteHandler = async (req: Request, res: Response) => {
    console.log('[RecordsController] 委托解冻记录请求给 UnfreezeRecordsHandler');
    return RecordsController.unfreezeHandler.getUnfreezeRecords(req, res);
  };

  /**
   * 获取综合记录摘要
   * 
   * 委托给 RecordsSummaryHandler 处理
   */
  static getRecordsSummary: RouteHandler = async (req: Request, res: Response) => {
    console.log('[RecordsController] 委托记录摘要请求给 RecordsSummaryHandler');
    return RecordsController.summaryHandler.getRecordsSummary(req, res);
  };
}

/*
 * 💡 重构说明：
 * 
 * 1. 保持相同接口：所有静态方法保持原有签名，确保路由兼容性
 * 2. 委托模式：主控制器只负责委托请求给相应的专门处理器
 * 3. 职责分离：每个处理器专注于特定业务逻辑
 * 4. 易于维护：新功能添加到对应的处理器中
 * 5. 易于测试：可以独立测试每个处理器
 * 
 * 目录结构：
 * controllers/
 * ├── RecordsController.ts (主控制器 - 68行)
 * ├── handlers/
 * │   ├── BaseRecordsHandler.ts (基础处理器 - 共用逻辑)
 * │   ├── StakeRecordsHandler.ts (质押记录处理)
 * │   ├── DelegateRecordsHandler.ts (委托记录处理)  
 * │   ├── UnfreezeRecordsHandler.ts (解冻记录处理)
 * │   └── RecordsSummaryHandler.ts (摘要处理)
 * └── types/
 *     └── stake.types.ts (类型定义)
 */