/**
 * TRON地址验证器
 * 从PriceConfigMessageHandler中分离出的地址验证逻辑
 */

export interface AddressValidationResult {
  isValid: boolean;
  error?: string;
}

export class AddressValidator {
  /**
   * 验证 TRON 地址格式
   */
  static validateTronAddress(address: string): AddressValidationResult {
    if (!address) {
      return { isValid: false, error: '地址不能为空' };
    }
    
    // 检查Base58格式
    if (address.startsWith('T') && address.length === 34) {
      return { isValid: true };
    }
    
    // 检查Hex格式
    if (address.startsWith('41') && address.length === 42) {
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      error: '无效的TRON地址格式。地址应为Base58格式（以T开头，34位字符）或Hex格式（以41开头，42位字符）' 
    };
  }
}
