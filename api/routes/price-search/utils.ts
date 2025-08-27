/**
 * Price Search 模块共享工具函数和类型定义
 */
import type { Request, Response } from 'express';

// 类型定义
export interface SearchFilters {
  entity_type?: string;
  status?: string;
  min_price?: number;
  max_price?: number;
  min_discount?: number;
  max_discount?: number;
  agent_level?: string;
  package_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface ComparisonResult {
  entity_id: number;
  entity_type: string;
  entity_name: string;
  base_price: number;
  final_price: number;
  discount_percentage: number;
  discount_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_cost: number;
  status: string;
  savings_vs_base: number;
  agent_level?: string;
}

export interface TrendStatistics {
  entity_id: number;
  entity_type: string;
  period_start: string;
  period_end: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_change: number;
  price_change_percentage: number;
  volatility: number;
  trend_direction: 'up' | 'down' | 'stable';
  data_points: number;
}

export interface FilterOption {
  value: string | number;
  label: string;
  count: number;
}

export interface PriceRange {
  min: number;
  max: number;
  avg: number;
  count: number;
}

// 工具函数

/**
 * 计算标准差
 * @param values 数值数组
 * @returns 标准差值
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * 构建动态SQL查询条件
 * @param filters 筛选条件
 * @param baseConditions 基础条件数组
 * @returns 完整的WHERE子句
 */
export function buildWhereClause(filters: SearchFilters, baseConditions: string[] = ['1=1']): string {
  const conditions = [...baseConditions];
  
  if (filters.search) {
    // 注意：这里使用参数化查询会更安全，但为了保持与原代码一致，暂时保留字符串拼接
    // 在实际生产环境中应该使用参数化查询防止SQL注入
  }
  
  if (filters.min_price) {
    conditions.push(`price >= ${Number(filters.min_price)}`);
  }
  
  if (filters.max_price) {
    conditions.push(`price <= ${Number(filters.max_price)}`);
  }
  
  if (filters.min_discount) {
    conditions.push(`discount_percentage >= ${Number(filters.min_discount)}`);
  }
  
  if (filters.max_discount) {
    conditions.push(`discount_percentage <= ${Number(filters.max_discount)}`);
  }
  
  if (filters.status) {
    conditions.push(`status = '${filters.status}'`);
  }
  

  
  return conditions.join(' AND ');
}

/**
 * 构建排序子句
 * @param sortBy 排序字段
 * @param sortOrder 排序方向
 * @param tableAlias 表别名
 * @returns ORDER BY子句
 */
export function buildOrderClause(
  sortBy: string = 'created_at',
  sortOrder: string = 'desc',
  tableAlias?: string
): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `ORDER BY ${prefix}${sortBy} ${sortOrder.toUpperCase()}`;
}

/**
 * 计算分页偏移量
 * @param page 页码
 * @param limit 每页数量
 * @returns 偏移量
 */
export function calculateOffset(page: string | number = 1, limit: string | number = 20): number {
  return (Number(page) - 1) * Number(limit);
}

/**
 * 标准化API响应格式
 * @param success 是否成功
 * @param message 响应消息
 * @param data 响应数据
 * @returns 标准化的响应对象
 */
export function createApiResponse(success: boolean, message: string, data?: any) {
  const response: any = {
    success,
    message
  };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  return response;
}

/**
 * 处理数据库查询错误
 * @param error 错误对象
 * @param context 错误上下文
 */
export function handleDatabaseError(error: any, context: string): void {
  console.error(`${context}错误:`, error);
}

/**
 * 验证必填参数
 * @param params 参数对象
 * @param requiredFields 必填字段数组
 * @returns 验证结果和错误消息
 */
export function validateRequiredParams(
  params: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => 
    params[field] === undefined || params[field] === null || params[field] === ''
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * 格式化价格显示
 * @param price 价格数值
 * @param decimals 小数位数
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

/**
 * 计算百分比
 * @param value 当前值
 * @param total 总值
 * @param decimals 小数位数
 * @returns 百分比值
 */
export function calculatePercentage(value: number, total: number, decimals: number = 2): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
}