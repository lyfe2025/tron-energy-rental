/**
 * 质押管理API路由 - 兼容性入口
 * 重新导出拆分后的路由模块，保持向后兼容
 */

// 重新导出拆分后的路由模块
export { default } from './stake/index.ts';

// 导出类型定义
export type * from './stake/types/stake.types.ts';
