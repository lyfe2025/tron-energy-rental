// 重新导出新的模块化DailyFeeService
export { DailyFeeService, dailyFeeService as default } from './daily-fee/DailyFeeService'
export { dailyFeeService }

// 兼容性导出
import { dailyFeeService } from './daily-fee/DailyFeeService'
