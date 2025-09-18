/**
 * 复制地址功能 Composable
 * 提供地址复制到剪贴板的功能
 */
import { ref, readonly } from 'vue';
import type { CopyAddressOptions } from '../types/index.js';

export function useCopyAddress() {
  const copySuccess = ref(false);

  /**
   * 复制地址到剪贴板
   */
  const copyAddress = async (address: string, timeout: number = 2000): Promise<boolean> => {
    if (!address) return false;
    
    try {
      // 尝试使用现代剪贴板API
      await navigator.clipboard.writeText(address);
      copySuccess.value = true;
      
      // 设置超时后重置图标
      setTimeout(() => {
        copySuccess.value = false;
      }, timeout);
      
      return true;
    } catch (err) {
      console.error('现代剪贴板API复制失败:', err);
      
      // 如果现代API不可用，使用传统方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          copySuccess.value = true;
          setTimeout(() => {
            copySuccess.value = false;
          }, timeout);
          return true;
        } else {
          throw new Error('document.execCommand复制失败');
        }
      } catch (fallbackErr) {
        console.error('传统复制方法也失败:', fallbackErr);
        return false;
      }
    }
  };

  return {
    copySuccess: readonly(copySuccess),
    copyAddress
  };
}
