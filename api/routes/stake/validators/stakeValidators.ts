/**
 * 质押相关验证器
 */
import type {
    DelegateOperationRequest,
    StakeOperationRequest,
    WithdrawRequest
} from '../types/stake.types.js';

export class StakeValidators {
  /**
   * 验证质押操作参数
   */
  static validateStakeOperation(data: StakeOperationRequest): string | null {
    const { ownerAddress, frozenBalance, unfreezeBalance, resource } = data;
    
    if (!ownerAddress) {
      return 'ownerAddress is required';
    }
    
    if (!resource) {
      return 'resource is required';
    }
    
    if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
      return 'resource must be ENERGY or BANDWIDTH';
    }
    
    const balance = frozenBalance || unfreezeBalance;
    if (!balance) {
      return 'frozenBalance or unfreezeBalance is required';
    }
    
    if (balance <= 0) {
      return 'balance must be greater than 0';
    }
    
    // 验证地址格式（基础检查）
    if (!this.isValidTronAddress(ownerAddress)) {
      return 'Invalid TRON address format';
    }
    
    return null;
  }

  /**
   * 验证委托操作参数
   */
  static validateDelegateOperation(data: DelegateOperationRequest): string | null {
    const { ownerAddress, receiverAddress, balance, resource, lockPeriod } = data;
    
    if (!ownerAddress) {
      return 'ownerAddress is required';
    }
    
    if (!receiverAddress) {
      return 'receiverAddress is required';
    }
    
    if (!balance) {
      return 'balance is required';
    }
    
    if (!resource) {
      return 'resource is required';
    }
    
    if (!['ENERGY', 'BANDWIDTH'].includes(resource)) {
      return 'resource must be ENERGY or BANDWIDTH';
    }
    
    if (balance <= 0) {
      return 'balance must be greater than 0';
    }
    
    if (lockPeriod !== undefined && (lockPeriod < 0.01 || lockPeriod > 365)) {
      return 'lockPeriod must be between 0.01 and 365 days';
    }
    
    // 验证地址格式
    if (!this.isValidTronAddress(ownerAddress)) {
      return 'Invalid owner TRON address format';
    }
    
    if (!this.isValidTronAddress(receiverAddress)) {
      return 'Invalid receiver TRON address format';
    }
    
    // 检查是否委托给自己
    if (ownerAddress === receiverAddress) {
      return 'Cannot delegate to the same address';
    }
    
    return null;
  }

  /**
   * 验证提取操作参数
   */
  static validateWithdrawOperation(data: WithdrawRequest): string | null {
    const { ownerAddress } = data;
    
    if (!ownerAddress) {
      return 'ownerAddress is required';
    }
    
    // 验证地址格式
    if (!this.isValidTronAddress(ownerAddress)) {
      return 'Invalid TRON address format';
    }
    
    return null;
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(page?: string, limit?: string): { page: number; limit: number; error?: string } {
    const defaultPage = 1;
    const defaultLimit = 20;
    const maxLimit = 100;
    
    let parsedPage = defaultPage;
    let parsedLimit = defaultLimit;
    
    if (page) {
      parsedPage = parseInt(page, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return { page: defaultPage, limit: defaultLimit, error: 'page must be a positive integer' };
      }
    }
    
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return { page: parsedPage, limit: defaultLimit, error: 'limit must be a positive integer' };
      }
      if (parsedLimit > maxLimit) {
        return { page: parsedPage, limit: defaultLimit, error: `limit cannot exceed ${maxLimit}` };
      }
    }
    
    return { page: parsedPage, limit: parsedLimit };
  }

  /**
   * 验证日期参数
   */
  static validateDateParams(startDate?: string, endDate?: string): string | null {
    if (startDate && !this.isValidDateString(startDate)) {
      return 'Invalid startDate format, expected ISO 8601 format';
    }
    
    if (endDate && !this.isValidDateString(endDate)) {
      return 'Invalid endDate format, expected ISO 8601 format';
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return 'startDate cannot be later than endDate';
      }
      
      // 限制查询范围不超过1年
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        return 'Date range cannot exceed one year';
      }
    }
    
    return null;
  }

  /**
   * 验证资源类型
   */
  static validateResourceType(resourceType?: string): string | null {
    if (resourceType && !['ENERGY', 'BANDWIDTH'].includes(resourceType)) {
      return 'resourceType must be ENERGY or BANDWIDTH';
    }
    return null;
  }

  /**
   * 验证操作类型
   */
  static validateOperationType(validTypes: string[], operationType?: string): string | null {
    if (operationType && !validTypes.includes(operationType)) {
      return `operationType must be one of: ${validTypes.join(', ')}`;
    }
    return null;
  }

  /**
   * 验证批量操作参数
   */
  static validateBatchOperations(operations: any[]): string | null {
    if (!Array.isArray(operations)) {
      return 'operations must be an array';
    }
    
    if (operations.length === 0) {
      return 'operations array cannot be empty';
    }
    
    if (operations.length > 50) {
      return 'operations array cannot exceed 50 items';
    }
    
    return null;
  }

  /**
   * 基础TRON地址验证
   * 注意: 这是简单的格式检查，实际应用中可能需要更严格的验证
   */
  private static isValidTronAddress(address: string): boolean {
    // TRON地址以'T'开头，长度为34字符
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  /**
   * 验证日期字符串格式
   */
  private static isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString.substring(0, 10));
  }

  /**
   * 清理和标准化参数
   */
  static sanitizeParams(params: any): any {
    const sanitized = { ...params };
    
    // 移除空值
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === '' || sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    // 转换资源类型为大写
    if (sanitized.resource) {
      sanitized.resource = sanitized.resource.toUpperCase();
    }
    if (sanitized.resourceType) {
      sanitized.resourceType = sanitized.resourceType.toUpperCase();
    }
    
    // 确保数值类型
    ['balance', 'frozenBalance', 'unfreezeBalance', 'lockPeriod'].forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = Number(sanitized[field]);
      }
    });
    
    return sanitized;
  }
}
