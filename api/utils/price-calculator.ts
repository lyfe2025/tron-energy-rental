/**
 * 价格计算器入口文件
 * 提供向后兼容的API接口
 */

// 导入新的模块化价格计算器
export {
    BandwidthCalculator, BaseCalculator,
    EnergyCalculator, PriceCalculator, PriceValidator
} from './price-calculator/index.js';

// 导入类型定义
export type {
    CalculationInput,
    CalculationOptions, HistoryQueryOptions, PriceCalculationResult, PriceHistoryRecord, PriceValidationResult
} from './price-calculator/types/index.js';

// 导入主计算器作为默认导出（保持向后兼容）
import { PriceCalculator } from './price-calculator/index.js';
export default PriceCalculator;
