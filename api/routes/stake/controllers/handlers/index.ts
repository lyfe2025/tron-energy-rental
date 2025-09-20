/**
 * 记录处理器统一导出
 * 方便其他模块导入和使用
 */

// 基础处理器
export { BaseRecordsHandler } from './BaseRecordsHandler.js';

// 具体业务处理器
export { DelegateRecordsHandler } from './DelegateRecordsHandler.js';
export { RecordsSummaryHandler } from './RecordsSummaryHandler.js';
export { StakeRecordsHandler } from './StakeRecordsHandler.js';
export { UnfreezeRecordsHandler } from './UnfreezeRecordsHandler.js';

// 类型定义
export type { PaginationParams, ProcessedAddress } from './BaseRecordsHandler.js';
export type { RecordsSummary } from './RecordsSummaryHandler.js';

/*
 * 💡 使用说明：
 * 
 * 1. 统一导入：
 *    import { StakeRecordsHandler, DelegateRecordsHandler } from './handlers';
 * 
 * 2. 单独导入：
 *    import { StakeRecordsHandler } from './handlers/StakeRecordsHandler.js';
 * 
 * 3. 扩展处理器：
 *    - 继承 BaseRecordsHandler
 *    - 实现特定业务逻辑
 *    - 在此文件中添加导出
 */
