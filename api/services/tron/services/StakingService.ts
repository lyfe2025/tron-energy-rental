/**
 * TRON 质押服务
 * 
 * 此文件是新分离架构的入口点，将原来的大文件分离为多个专门的操作类。
 * 
 * 分离架构包括：
 * - StakingService: 主服务入口，使用门面模式组合所有操作
 * - FreezeOperation: 质押操作
 * - UnfreezeOperation: 解质押操作  
 * - DelegateOperation: 委托操作
 * - NetworkProvider: 网络配置管理
 * - TronGridProvider: TronGrid API调用
 * 
 * 保持完全向后兼容，所有原有的接口和方法签名不变。
 */
export { StakingService } from '../staking/StakingService';

// 导出类型以保持兼容性
export type {
    FreezeBalanceV2Params,
    ServiceResponse,
    StakeOverview,
    StakeTransactionParams,
    TransactionResult,
    UnfreezeBalanceV2Params,
    WithdrawExpireUnfreezeParams
} from '../types/tron.types';

