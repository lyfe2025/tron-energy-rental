/**
 * TRON解质押操作 - 安全分离版本
 * 
 * 此文件是分离重构后的入口点，将原来的大文件分离为多个专门的操作类。
 * 
 * 分离架构包括：
 * - UnfreezeOperation: 主服务入口，使用门面模式组合所有操作
 * - UnfreezeBalanceHandler: 解质押交易执行处理器
 * - UnfreezeRecordHandler: 解质押记录管理处理器
 * - UnfreezeWithdrawHandler: 资金提取处理器
 * - UnfreezeValidator: 参数验证器
 * - UnfreezeCalculator: 计算工具类
 * - AddressConverter: 地址转换工具类
 * 
 * 保持完全向后兼容，所有原有的接口和方法签名不变。
 */
export { UnfreezeOperation } from './unfreeze/UnfreezeOperation';

// 导出分离后的子组件（可选，用于高级用法）
export { UnfreezeBalanceHandler } from './unfreeze/handlers/UnfreezeBalanceHandler';
export { UnfreezeRecordHandler } from './unfreeze/handlers/UnfreezeRecordHandler';
export { UnfreezeWithdrawHandler } from './unfreeze/handlers/UnfreezeWithdrawHandler';
export { AddressConverter } from './unfreeze/utils/AddressConverter';
export { UnfreezeCalculator } from './unfreeze/utils/UnfreezeCalculator';
export { UnfreezeValidator } from './unfreeze/validators/UnfreezeValidator';

// 导出类型以保持兼容性
export type {
  FormattedUnfreezeRecord,
  ServiceResponse,
  TransactionResult,
  UnfreezeBalanceV2Params,
  UnfreezeOperationResult,
  WithdrawExpireUnfreezeParams
} from '../types/staking.types';

