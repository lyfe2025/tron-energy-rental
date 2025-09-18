/**
 * TronGrid响应验证服务
 * 负责验证API响应数据的完整性和正确性
 */
export class TronGridValidator {
  /**
   * 验证账户信息响应
   */
  validateAccountInfo(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Account data is empty');
      return { isValid: false, errors };
    }

    // 验证必需字段
    const requiredFields = ['address'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // 验证地址格式
    if (data.address && !this.isValidTronAddress(data.address)) {
      errors.push('Invalid TRON address format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证账户资源响应
   */
  validateAccountResource(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Account resource data is empty');
      return { isValid: false, errors };
    }

    // 验证数值字段
    const numericFields = ['EnergyLimit', 'EnergyUsed', 'NetLimit', 'NetUsed'];
    numericFields.forEach(field => {
      if (data[field] !== undefined && (isNaN(data[field]) || data[field] < 0)) {
        errors.push(`Invalid numeric value for ${field}: ${data[field]}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证交易列表响应
   */
  validateTransactionList(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Transaction data should be an array');
      return { isValid: false, errors };
    }

    // 验证每个交易的基本结构
    data.forEach((tx: any, index: number) => {
      if (!tx.txID) {
        errors.push(`Transaction at index ${index} missing txID`);
      }
      
      if (!tx.raw_data) {
        errors.push(`Transaction at index ${index} missing raw_data`);
      } else if (!tx.raw_data.contract || !Array.isArray(tx.raw_data.contract)) {
        errors.push(`Transaction at index ${index} has invalid contract structure`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证链参数响应
   */
  validateChainParameters(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Chain parameters data is empty');
      return { isValid: false, errors };
    }

    if (!data.chainParameter || !Array.isArray(data.chainParameter)) {
      errors.push('Chain parameters should contain chainParameter array');
      return { isValid: false, errors };
    }

    // 验证参数结构
    data.chainParameter.forEach((param: any, index: number) => {
      if (!param.key) {
        errors.push(`Chain parameter at index ${index} missing key`);
      }
      if (param.value === undefined) {
        errors.push(`Chain parameter at index ${index} missing value`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证质押状态数据
   */
  validateStakeStatus(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Stake status data should be an object');
      return { isValid: false, errors };
    }

    // 验证必需的数值字段
    const numericFields = [
      'unlockingTrx',
      'withdrawableTrx', 
      'stakedEnergy',
      'stakedBandwidth',
      'delegatedEnergy',
      'delegatedBandwidth'
    ];

    numericFields.forEach(field => {
      if (typeof data[field] !== 'number' || data[field] < 0) {
        errors.push(`Invalid numeric value for ${field}: ${data[field]}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证搜索参数
   */
  validateSearchParams(params: {
    address?: string;
    limit?: number;
    contractType?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证地址
    if (params.address && !this.isValidTronAddress(params.address)) {
      errors.push('Invalid TRON address format');
    }

    // 验证限制数量
    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit <= 0 || params.limit > 200) {
        errors.push('Limit should be a positive integer between 1 and 200');
      }
    }

    // 验证合约类型
    if (params.contractType) {
      const validContractTypes = [
        'FreezeBalanceV2Contract',
        'UnfreezeBalanceV2Contract',
        'DelegateResourceContract',
        'UnDelegateResourceContract',
        'WithdrawExpireUnfreezeContract'
      ];
      
      if (!validContractTypes.includes(params.contractType)) {
        errors.push(`Invalid contract type: ${params.contractType}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Base58 格式检查
    if (address.startsWith('T') && address.length === 34) {
      return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{34}$/.test(address);
    }

    // Hex 格式检查
    if (address.startsWith('41') && address.length === 42) {
      return /^41[0-9a-fA-F]{40}$/.test(address);
    }

    return false;
  }

  /**
   * 验证时间戳
   */
  isValidTimestamp(timestamp: any): boolean {
    if (typeof timestamp !== 'number') {
      return false;
    }

    // 检查时间戳是否在合理范围内（2009年到2050年）
    const min = new Date('2009-01-01').getTime();
    const max = new Date('2050-01-01').getTime();
    
    // 处理秒和毫秒时间戳
    const tsMillis = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    
    return tsMillis >= min && tsMillis <= max;
  }

  /**
   * 清理和标准化响应数据
   */
  sanitizeResponseData<T>(data: T): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // 递归清理对象
    const sanitized = { ...data } as any;

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      // 清理空值
      if (value === null || value === undefined || value === '') {
        delete sanitized[key];
      }
      // 递归处理嵌套对象
      else if (typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeResponseData(value);
      }
      // 处理数组
      else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeResponseData(item) : item
        ).filter(item => item !== null && item !== undefined);
      }
    });

    return sanitized as T;
  }
}
