// 重新导出新的模块化BatchDelegationService
export { BatchDelegationService, default } from './batch-delegation/BatchDelegationService'
export { batchDelegationService }

// 兼容性导出
import BatchDelegationService from './batch-delegation/BatchDelegationService'
const batchDelegationService = BatchDelegationService.getInstance()

