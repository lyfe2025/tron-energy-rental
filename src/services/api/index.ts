/**
 * API服务 - 模块化整合入口
 * 重新导出所有拆分后的API模块
 */

// 核心配置和类型
export { apiClient } from './core/apiClient';
export type { ApiResponse, PaginatedResponse, QueryParams } from './core/types';

// 认证API
export { authAPI } from './auth/authAPI';
export type {
    LoginCredentials,
    LoginResponse, RefreshTokenResponse, VerifyTokenResponse
} from './auth/authAPI';

// 用户管理API
export { usersAPI } from './users/usersAPI';
export type {
    ResetPasswordResponse, UserQueryParams
} from './users/usersAPI';

// 订单管理API
export { ordersAPI } from './orders/ordersAPI';
export type {
    OrderListResponse, OrderQueryParams, ProcessOrderResponse
} from './orders/ordersAPI';

// 机器人管理API
export { botsAPI } from './bots/botsAPI';
export type {
    BotDetailResponse, BotListResponse, BotMessageResponse, BotOperationResponse, BotQueryParams, BotTestResponse, CreateBotData
} from './bots/botsAPI';
// UpdateBotData 从 types/api 导入
export type { UpdateBotData } from '../../types/api';

// 能量包管理API已移除，现在使用price_configs

// 统计分析API
export { statisticsAPI } from './statistics/statisticsAPI';
export type {
    BotStatusStats, OrderTrendData, OverviewStats, RevenueAnalysisData
} from './statistics/statisticsAPI';

// 系统配置API
export { systemConfigsAPI } from './system-configs/systemConfigsAPI';
export type { ConfigQueryParams } from './system-configs/systemConfigsAPI';

// 定价管理API
export { pricingAPI } from './pricing/pricingAPI';

// 能量池管理API（使用扩展版本）
export type {
    CreateEnergyPoolData, EnergyPool, UpdateEnergyPoolData
} from './energy-pool/energyPoolAPI';
export { energyPoolExtendedAPI as energyPoolAPI } from './energy-pool/energyPoolExtendedAPI';
export type { EnergyAllocation, EnergyPoolAccount, EnergyPoolStatistics, OptimizationResult } from './energy-pool/energyPoolExtendedAPI';

// 质押管理API
export { stakeAPI } from './stake/stakeAPI';
export type {
    DelegateOperationData, StakeOperationData, StakeOperationResult, StakeOverview, StakeRecord,
    StakeRecordsResponse, StakeStatistics, WithdrawResult
} from './stake/stakeAPI';

// 设置管理API
export { settingsAPI } from './settings/settingsAPI';

// 配置缓存管理API
export { configCacheAPI } from './config-cache/configCacheAPI';
export type { ConfigHistoryQueryParams, ConfigHistoryRecord, ConfigHistoryResponse } from './config-cache/configCacheAPI';

// 重新导入所有API模块用于对象构建
import { authAPI as authAPIModule } from './auth/authAPI';
import { botsAPI as botsAPIModule } from './bots/botsAPI';
import { configCacheAPI as configCacheAPIModule } from './config-cache/configCacheAPI';
// energyPackagesAPI已移除
import { energyPoolExtendedAPI as energyPoolAPIModule } from './energy-pool/energyPoolExtendedAPI';
import { ordersAPI as ordersAPIModule } from './orders/ordersAPI';
import { pricingAPI as pricingAPIModule } from './pricing/pricingAPI';
import { settingsAPI as settingsAPIModule } from './settings/settingsAPI';
import { stakeAPI as stakeAPIModule } from './stake/stakeAPI';
import { statisticsAPI as statisticsAPIModule } from './statistics/statisticsAPI';
import { systemConfigsAPI as systemConfigsAPIModule } from './system-configs/systemConfigsAPI';
import { usersAPI as usersAPIModule } from './users/usersAPI';

// 默认导出 - 包含所有API模块的对象
const api = {
  auth: authAPIModule,
  users: usersAPIModule,
  orders: ordersAPIModule,
  bots: botsAPIModule,
  configCache: configCacheAPIModule,
  // energyPackages已移除
  statistics: statisticsAPIModule,
  systemConfigs: systemConfigsAPIModule,
  pricing: pricingAPIModule,
  energyPool: energyPoolAPIModule,
  stake: stakeAPIModule,
  settings: settingsAPIModule
};

export default api;

// 兼容性导出 - 保持与原有代码的兼容性
export {
    authAPIModule as authApi, botsAPIModule as botsApi, configCacheAPIModule as configCacheApi,
    energyPoolAPIModule as energyPoolApi, ordersAPIModule as ordersApi, pricingAPIModule as pricingApi, settingsAPIModule as settingsApi, stakeAPIModule as stakeApi, statisticsAPIModule as statisticsApi,
    systemConfigsAPIModule as systemConfigsApi, usersAPIModule as usersApi
};

