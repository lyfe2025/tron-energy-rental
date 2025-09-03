/**
 * 价格计算器主入口文件（向后兼容）
 * 重新导出新的模块化结构
 */

// 导出主计算器类（向后兼容的默认导出）
export { PriceCalculator } from './PriceCalculator.js';

// 导出管理器类
export { HistoryManager } from './managers/HistoryManager.js';
export { StatsManager } from './managers/StatsManager.js';
export { ValidationManager } from './managers/ValidationManager.js';

// 导出计算器类
export { BandwidthPriceCalculator } from './calculators/BandwidthPriceCalculator.js';
export { EnergyPriceCalculator } from './calculators/EnergyPriceCalculator.js';

// 导出工具类
export { ConfigHelper } from './utils/ConfigHelper.js';
export { FormatHelper } from './utils/FormatHelper.js';

// 导出核心模块（保持兼容性）
export { BandwidthCalculator } from './core/BandwidthCalculator.js';
export { BaseCalculator } from './core/BaseCalculator.js';
export { EnergyCalculator } from './core/EnergyCalculator.js';
export { PriceValidator } from './validators/PriceValidator.js';

// 导出类型定义
export type {
    CalculationInput,
    CalculationOptions,
    HistoryQueryOptions,
    PriceCalculationResult,
    PriceHistoryRecord,
    PriceValidationResult
} from './types/index.js';

// 向后兼容的默认导出
import { PriceCalculator } from './PriceCalculator.js';
export default PriceCalculator;
