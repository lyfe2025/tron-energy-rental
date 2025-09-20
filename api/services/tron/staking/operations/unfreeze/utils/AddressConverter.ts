/**
 * TRON地址转换工具类
 */
export class AddressConverter {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 智能地址格式转换 - 统一转换为Base58格式（T开头）
   */
  convertToBase58Address(address: string): string {
    if (!address) return '';
    
    try {
      // 如果已经是Base58格式（T开头），直接返回
      if (address.startsWith('T') && address.length === 34) {
        return address;
      }
      
      // 如果是十六进制格式（41开头），转换为Base58
      if (address.startsWith('41') && address.length === 42) {
        return this.tronWeb.address.fromHex(address);
      }
      
      // 尝试作为十六进制地址转换
      const base58Address = this.tronWeb.address.fromHex(address);
      if (base58Address && base58Address.startsWith('T')) {
        return base58Address;
      }
      
      // 如果转换失败，记录警告并返回原始地址
      console.warn('[AddressConverter] 地址转换失败:', address);
      return address;
      
    } catch (error) {
      console.warn('[AddressConverter] 地址转换异常:', error);
      return address;
    }
  }

  /**
   * Base58地址转换为十六进制格式
   */
  convertToHexAddress(address: string): string {
    if (!address) return '';
    
    try {
      return this.tronWeb.address.toHex(address);
    } catch (error) {
      console.warn('[AddressConverter] Base58转Hex失败:', error);
      return address;
    }
  }
}
