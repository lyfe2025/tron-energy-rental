/**
 * 日志管理API路由 - 兼容性入口
 * 重新导出拆分后的路由模块，保持向后兼容
 */

// 重新导出拆分后的路由模块
import logsRouter from './logs/index.js';

export default logsRouter;

// 导出类型定义
export type * from './logs/types/logs.types.js';
