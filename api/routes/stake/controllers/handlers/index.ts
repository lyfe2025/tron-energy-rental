/**
 * 记录处理器统一导出
 * 方便其他模块导入和使用
 */

// 基础处理器
export { BaseRecordsHandler } from './BaseRecordsHandler.ts';

// 具体业务处理器
export { DelegateRecordsHandler } from './DelegateRecordsHandler.ts';
export { RecordsSummaryHandler } from './RecordsSummaryHandler.ts';
export { StakeRecordsHandler } from './StakeRecordsHandler.ts';
export { UnfreezeRecordsHandler } from './UnfreezeRecordsHandler.ts';

// 类型定义
export type { PaginationParams, ProcessedAddress } from './BaseRecordsHandler.ts';
export type { RecordsSummary } from './RecordsSummaryHandler.ts';

/*
 * 💡 使用说明：
 * 
 * 1. 统一导入：
 *    import { StakeRecordsHandler, DelegateRecordsHandler } from './handlers';
 * 
 * 2. 单独导入：
 *    import { StakeRecordsHandler } from './handlers/StakeRecordsHandler.ts';
 * 
 * 3. 扩展处理器：
 *    - 继承 BaseRecordsHandler
 *    - 实现特定业务逻辑
 *    - 在此文件中添加导出
 */
