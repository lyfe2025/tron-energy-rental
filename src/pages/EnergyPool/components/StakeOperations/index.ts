/**
 * 质押操作组件统一导出
 * 提供四个核心质押操作组件的统一入口
 */

// 导出组件
export { default as DelegateModal } from './DelegateModal.vue'
export { default as StakeModal } from './StakeModal.vue'
export { default as StakeSuccessModal } from './StakeSuccessModal.vue'
export { default as TransactionConfirmModal } from './TransactionConfirmModal.vue'
export { default as UnstakeSuccessModal } from './UnstakeSuccessModal.vue'
// 注意：UnstakeModal 和 UnstakeTransactionConfirmModal 的默认导出在下面的选择性导出中处理
export { default as WithdrawModal } from './WithdrawModal.vue'

// 导出共享的类型和工具
export * from './shared/types'
export { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

// 导出分离后的子组件模块 - 选择性导出避免冲突
export {
    UnstakeAccountInfo, UnstakeAmountInput, UnstakeDelegatingResources, UnstakeExplanation, UnstakeForm,
    // UnstakeModal 组件和类型
    UnstakeModal, UnstakePreview, UnstakeResourceSelector, UnstakeWithdrawableResources,
    // UnstakeModal composables
    useUnstakeForm,
    useUnstakeModal,
    useUnstakeResources,
    useUnstakeSubmit,
    useUnstakeValidation, type ResourceInfo, type UnstakeAccountBalance,
    // UnstakeModal 类型 (避免与shared冲突)
    type UnstakeFormData, type UnstakeModalState,
    type UnstakeTransactionData
} from './UnstakeModal'

export {
    TransactionActions, TransactionDetails,
    TransactionFees, TransactionHeader,
    TransactionIcon,
    // UnstakeTransactionConfirmModal 组件和类型
    UnstakeTransactionConfirmModal,
    // UnstakeTransactionConfirmModal composables
    useTransactionConfirm,
    useTransactionFees, type FeeDetailInfo, type TransactionConfirmState,
    type TransactionDetailInfo, type TransactionFeeState, type UnstakeTransactionConfirmEmits,
    // UnstakeTransactionConfirmModal 类型
    type UnstakeTransactionConfirmProps
} from './UnstakeTransactionConfirmModal'

// 操作类型枚举，用于统一管理操作类型
export enum StakeOperation {
  STAKE = 'stake',
  UNSTAKE = 'unstake', 
  DELEGATE = 'delegate',
  WITHDRAW = 'withdraw'
}

// 操作标题映射
export const operationTitles = {
  [StakeOperation.STAKE]: '质押TRX',
  [StakeOperation.UNSTAKE]: '解质押TRX',
  [StakeOperation.DELEGATE]: '代理资源',
  [StakeOperation.WITHDRAW]: '提取TRX'
}

// 操作描述映射
export const operationDescriptions = {
  [StakeOperation.STAKE]: '质押TRX获取能量、带宽和投票权',
  [StakeOperation.UNSTAKE]: '解质押TRX，释放已质押的资源',
  [StakeOperation.DELEGATE]: '将您的资源代理给其他用户使用',
  [StakeOperation.WITHDRAW]: '提取已完成解质押等待期的TRX'
}

// 操作图标映射
export const operationIcons = {
  [StakeOperation.STAKE]: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  [StakeOperation.UNSTAKE]: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  [StakeOperation.DELEGATE]: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  [StakeOperation.WITHDRAW]: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
}

// 操作颜色主题映射
export const operationColors = {
  [StakeOperation.STAKE]: {
    primary: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700'
  },
  [StakeOperation.UNSTAKE]: {
    primary: 'red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700'
  },
  [StakeOperation.DELEGATE]: {
    primary: 'green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700'
  },
  [StakeOperation.WITHDRAW]: {
    primary: 'emerald',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700'
  }
}
