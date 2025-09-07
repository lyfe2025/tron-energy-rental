/**
 * TRON网络控制器 - 分离版本
 * 整合所有网络管理功能的统一入口
 */

// 从查询控制器导入
export { 
  getNetworksList, 
  getNetworkDetails 
} from './NetworkQueryController.js';

// 从CRUD控制器导入
export { 
  createNetwork, 
  updateNetwork, 
  deleteNetwork 
} from './NetworkCRUDController.js';

// 从验证控制器导入（如果需要在路由中直接使用）
export {
  validateBasicFields,
  validateNetworkNameUniqueness,
  validateNetworkExists,
  validateNetworkDeletable,
  validateAndMapFields,
  validateUpdateFields
} from './NetworkValidationController.js';
