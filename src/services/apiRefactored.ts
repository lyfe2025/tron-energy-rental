/**
 * API服务 - 兼容性入口
 * 重新导出拆分后的API模块，保持向后兼容
 */

// 重新导出核心配置和所有API模块
export * from './api';

// 重新导出不冲突的类型定义（排除已在./api中导出的类型）
export type {
  // 基础类型
  User, Order, Bot, EnergyPackage, SystemConfig,
  // 创建/更新数据类型（排除已导出的）
  CreateUserData, CreateEnergyPackageData,
  UpdateUserData, UpdateEnergyPackageData, UpdateOrderStatusData,
  // 价格模板相关
  PriceTemplate, CreatePriceTemplateData, UpdatePriceTemplateData,
  // 机器人定价相关
  BotPricing, UpdateBotPricingData,
  // 代理商价格相关
  AgentPricing, UpdateAgentPricingData,
  // 系统配置相关
  UpdateSystemConfigData,
  // 统计相关
  StatisticsParams, OrderStats, RevenueStats, UserActivityStats,
  // 系统设置相关
  SystemSettings, UpdateSettingsData,
  // 操作日志相关
  OperationLog
} from '../types/api';

// 为了保持完全的向后兼容性，重新导出原有的导出名称
import {
    apiClient,
    authAPI,
    botsAPI,
    energyPackagesAPI,
    energyPoolAPI,
    ordersAPI,
    pricingAPI,
    settingsAPI,
    stakeAPI,
    statisticsAPI,
    systemConfigsAPI,
    usersAPI
} from './api';

// 导出apiClient实例
export { apiClient };

// 导出所有API模块
    export {
        authAPI, botsAPI,
        energyPackagesAPI, energyPoolAPI, ordersAPI, pricingAPI, settingsAPI, stakeAPI, statisticsAPI,
        systemConfigsAPI, usersAPI
    };

// 默认导出包含所有API的对象
export default {
  client: apiClient,
  auth: authAPI,
  users: usersAPI,
  orders: ordersAPI,
  bots: botsAPI,
  energyPackages: energyPackagesAPI,
  statistics: statisticsAPI,
  systemConfigs: systemConfigsAPI,
  pricing: pricingAPI,
  energyPool: energyPoolAPI,
  stake: stakeAPI,
  settings: settingsAPI
};
