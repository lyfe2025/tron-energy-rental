/**
 * API服务 - 兼容性入口
 * 重新导出拆分后的API模块，保持向后兼容
 */

// 重新导出所有内容
export * from './api/index.js';

// 为了保持向后兼容，也创建一个默认导出
import * as apiModules from './api/index.js';

export default apiModules;