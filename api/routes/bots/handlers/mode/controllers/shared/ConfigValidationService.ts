/**
 * 配置验证服务
 * 提供键盘类型和价格配置的验证方法
 */
import { KeyboardSyncService } from './KeyboardSyncService.ts';

export class ConfigValidationService {
  /**
   * 验证键盘类型配置
   */
  static async validateKeyboardType(
    formData: any, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始验证键盘类型配置`);
      
      const keyboardConfig = formData.keyboard_config;
      if (!keyboardConfig || !keyboardConfig.main_menu) {
        logs.push(`⚠️ ${modePrefix} 键盘配置为空，跳过验证`);
        return { success: true };
      }
      
      const validation = KeyboardSyncService.validateKeyboardConfig(keyboardConfig);
      const { isValid, keyboardType, totalButtons, errors } = validation;
      
      logs.push(`🎹 ${modePrefix} 检测到键盘类型: ${keyboardType === 'reply' ? '回复键盘' : '内嵌键盘'}`);
      
      if (isValid) {
        logs.push(`✅ ${modePrefix} 键盘类型配置验证通过`);
        logs.push(`📊 ${modePrefix} 键盘统计: ${keyboardType === 'reply' ? '回复键盘' : '内嵌键盘'} - ${totalButtons}个按钮`);
        return { success: true };
      } else {
        logs.push(`❌ ${modePrefix} 键盘类型配置验证失败`);
        errors.forEach(error => logs.push(`❌ ${modePrefix} ${error}`));
        return { success: false, error: errors.join('; ') };
      }
    } catch (error: any) {
      const errorMsg = `键盘类型配置验证失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 验证价格配置
   */
  static async validatePriceConfig(
    formData: any, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始验证价格配置`);
      
      const { PriceConfigService } = await import('../../../../../../services/PriceConfigService.ts');
      const priceConfigService = new PriceConfigService();
      
      // 获取所有价格配置
      const allConfigs = await priceConfigService.getAllConfigs();
      logs.push(`📋 ${modePrefix} 系统中共有 ${allConfigs.length} 个价格配置`);
      
      // 检查激活的配置
      const activeConfigs = allConfigs.filter((config: any) => config.is_active);
      logs.push(`✅ ${modePrefix} 已激活 ${activeConfigs.length} 个价格配置`);
      
      let validationPassed = true;
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // 验证每个激活配置的完整性
      for (const config of activeConfigs) {
        const mode = config.mode_type;
        logs.push(`🔍 ${modePrefix} 检查配置: ${config.name} (${mode})`);
        
        // 检查配置数据的完整性
        if (!config.config || typeof config.config !== 'object') {
          validationPassed = false;
          errors.push(`价格配置 "${config.name}" 的配置数据为空或无效`);
          logs.push(`❌ ${modePrefix} ${mode} 配置数据无效`);
          continue;
        }
        
        const configData = config.config;
        
        // 根据不同类型验证配置结构
        const configValidation = this.validateConfigByType(mode, configData, logs, modePrefix);
        if (!configValidation.isValid) {
          validationPassed = false;
          errors.push(...configValidation.errors);
        }
        
        // 检查内嵌键盘配置
        const keyboardValidation = this.validateInlineKeyboardConfig(config, logs, modePrefix);
        warnings.push(...keyboardValidation.warnings);
      }
      
      // 检查键盘配置中的价格依赖
      const dependencyValidation = this.validatePriceDependencies(
        formData, activeConfigs, logs, modePrefix
      );
      if (!dependencyValidation.isValid) {
        validationPassed = false;
        errors.push(...dependencyValidation.errors);
      }
      
      // 输出警告信息
      if (warnings.length > 0) {
        warnings.forEach(warning => logs.push(`⚠️ ${modePrefix} 警告: ${warning}`));
      }
      
      // 检查是否有足够的配置
      if (activeConfigs.length === 0) {
        validationPassed = false;
        errors.push('系统中没有激活的价格配置，机器人将无法提供服务');
        logs.push(`❌ ${modePrefix} 严重错误: 没有激活的价格配置`);
      }
      
      if (validationPassed) {
        logs.push(`✅ ${modePrefix} 价格配置验证通过`);
        logs.push(`📊 ${modePrefix} 配置统计: ${activeConfigs.length}个激活配置，${warnings.length}个警告`);
        return { success: true };
      } else {
        logs.push(`❌ ${modePrefix} 价格配置验证失败`);
        return { success: false, error: errors.join('; ') };
      }
    } catch (error: any) {
      const errorMsg = `价格配置验证失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 根据类型验证配置结构
   */
  private static validateConfigByType(
    mode: string, 
    configData: any, 
    logs: string[], 
    modePrefix: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    switch (mode) {
      case 'energy_flash':
        if (!configData.single_price || typeof configData.single_price !== 'number' || configData.single_price <= 0) {
          errors.push(`能量闪租配置缺少有效的单价设置`);
          logs.push(`❌ ${modePrefix} 能量闪租: 缺少单价配置`);
        } else {
          logs.push(`✅ ${modePrefix} 能量闪租: 单价 ${configData.single_price} ${configData.currency || 'TRX'}`);
        }
        
        if (!configData.max_amount || typeof configData.max_amount !== 'number' || configData.max_amount <= 0) {
          errors.push(`能量闪租配置缺少有效的最大数量设置`);
          logs.push(`❌ ${modePrefix} 能量闪租: 缺少最大数量配置`);
        } else {
          logs.push(`✅ ${modePrefix} 能量闪租: 最大数量 ${configData.max_amount}`);
        }
        break;
        
      case 'transaction_package':
        if (!configData.packages || !Array.isArray(configData.packages) || configData.packages.length === 0) {
          errors.push(`笔数套餐配置缺少有效的套餐选项`);
          logs.push(`❌ ${modePrefix} 笔数套餐: 缺少套餐选项`);
        } else {
          logs.push(`✅ ${modePrefix} 笔数套餐: ${configData.packages.length} 个套餐选项`);
        }
        break;
        
      case 'trx_exchange':
        if (!configData.usdt_to_trx_rate || !configData.trx_to_usdt_rate) {
          errors.push(`TRX兑换配置缺少汇率设置`);
          logs.push(`❌ ${modePrefix} TRX兑换: 缺少汇率配置`);
        } else {
          logs.push(`✅ ${modePrefix} TRX兑换: USDT→TRX ${configData.usdt_to_trx_rate}, TRX→USDT ${configData.trx_to_usdt_rate}`);
        }
        
        // 验证汇率是否为有效数值
        if (configData.usdt_to_trx_rate && (typeof configData.usdt_to_trx_rate !== 'number' || configData.usdt_to_trx_rate <= 0)) {
          errors.push(`USDT到TRX汇率设置无效`);
          logs.push(`❌ ${modePrefix} TRX兑换: USDT→TRX汇率无效`);
        }
        
        if (configData.trx_to_usdt_rate && (typeof configData.trx_to_usdt_rate !== 'number' || configData.trx_to_usdt_rate <= 0)) {
          errors.push(`TRX到USDT汇率设置无效`);
          logs.push(`❌ ${modePrefix} TRX兑换: TRX→USDT汇率无效`);
        }
        break;
        
      default:
        logs.push(`⚠️ ${modePrefix} 未知配置类型: ${mode}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证内嵌键盘配置
   */
  private static validateInlineKeyboardConfig(
    config: any, 
    logs: string[], 
    modePrefix: string
  ): { warnings: string[] } {
    const warnings: string[] = [];
    const mode = config.mode_type;
    
    if (config.inline_keyboard_config) {
      const keyboardConfig = config.inline_keyboard_config;
      if (keyboardConfig.enabled && keyboardConfig.buttons && Array.isArray(keyboardConfig.buttons)) {
        logs.push(`✅ ${modePrefix} ${mode}: 内嵌键盘配置完整 (${keyboardConfig.buttons.length}行按钮)`);
      } else if (keyboardConfig.enabled) {
        warnings.push(`${config.name} 启用了内嵌键盘但按钮配置为空`);
        logs.push(`⚠️ ${modePrefix} ${mode}: 内嵌键盘配置不完整`);
      }
    }
    
    return { warnings };
  }

  /**
   * 验证价格依赖关系
   */
  private static validatePriceDependencies(
    formData: any, 
    activeConfigs: any[], 
    logs: string[], 
    modePrefix: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const keyboardConfig = formData.keyboard_config;
    if (keyboardConfig && keyboardConfig.main_menu) {
      const activeConfigTypes = activeConfigs.map((c: any) => c.mode_type);
      
      for (const row of keyboardConfig.main_menu.rows) {
        if (row.is_enabled && row.buttons) {
          for (const button of row.buttons) {
            if (button.is_enabled && button.price_config_dependency) {
              if (!activeConfigTypes.includes(button.price_config_dependency)) {
                errors.push(`按钮 "${button.text}" 依赖的价格配置 "${button.price_config_dependency}" 未激活`);
                logs.push(`❌ ${modePrefix} 按钮依赖验证失败: ${button.text} -> ${button.price_config_dependency}`);
              } else {
                logs.push(`✅ ${modePrefix} 按钮依赖正常: ${button.text} -> ${button.price_config_dependency}`);
              }
            }
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
