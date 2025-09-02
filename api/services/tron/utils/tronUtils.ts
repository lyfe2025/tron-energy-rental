import TronWeb from 'tronweb';
import type { TronConfig } from '../types/tron.types';

export class TronUtils {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  // 地址转换为十六进制 (为了兼容routes中的调用)
  addressToHex(address: string): string {
    return this.convertAddress(address, true) || '';
  }

  // 验证地址格式
  isValidAddress(address: string): boolean {
    try {
      return this.tronWeb.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  // 转换地址格式
  convertAddress(address: string, toHex: boolean = false) {
    try {
      if (toHex) {
        return this.tronWeb.address.toHex(address);
      } else {
        return this.tronWeb.address.fromHex(address);
      }
    } catch (error) {
      console.error('Failed to convert address:', error);
      return null;
    }
  }

  // 初始化TronWeb实例的静态方法
  static initializeTronWeb(config: TronConfig) {
    try {
      console.log('TronWeb type:', typeof TronWeb);
      console.log('TronWeb:', TronWeb);
      
      // 使用TronWeb.TronWeb构造函数
      if (TronWeb && TronWeb.TronWeb) {
        // 初始化时不设置私钥，后续根据需要设置
        const tronConfig: any = {
          fullHost: config.fullHost
        };
        
        if (config.solidityNode) {
          tronConfig.solidityNode = config.solidityNode;
        }
        
        if (config.eventServer) {
          tronConfig.eventServer = config.eventServer;
        }
        
        const tronWeb = new TronWeb.TronWeb(tronConfig);
        
        // 如果提供了有效的私钥，则设置
        if (config.privateKey && config.privateKey.length === 64) {
          tronWeb.setPrivateKey(config.privateKey);
        }
        
        console.log('TronWeb initialized successfully');
        return tronWeb;
      } else {
        throw new Error('TronWeb.TronWeb constructor not found');
      }
    } catch (error) {
      console.error('Failed to initialize TronWeb:', error);
      throw error;
    }
  }
}
