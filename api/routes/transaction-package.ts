// 重新导出新的模块化transaction-package路由
export { default } from './transaction-package/index'
export { transactionPackageRouter }

// 兼容性导出
import transactionPackageRouter from './transaction-package/index'

