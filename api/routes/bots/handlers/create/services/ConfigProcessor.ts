/**
 * 配置处理器
 * 负责处理机器人创建时的各种配置生成和处理
 */
import { query } from '../../../../../config/database.js';
import type { CreateBotData } from '../../../types.js';

export class ConfigProcessor {
  /**
   * 生成默认键盘配置
   */
  static generateDefaultKeyboardConfig(networkId: number): object {
    return {
      main_menu: {
        rows: [
          {
            buttons: [
              { text: '💰 购买能量', action: 'buy_energy' },
              { text: '📊 查询余额', action: 'check_balance' }
            ]
          },
          {
            buttons: [
              { text: '📈 价格查询', action: 'check_price' },
              { text: '❓ 帮助', action: 'help' }
            ]
          }
        ]
      },
      commands: [
        { command: 'start', description: '开始使用机器人' },
        { command: 'help', description: '获取帮助信息' },
        { command: 'balance', description: '查询账户余额' },
        { command: 'price', description: '查询当前价格' }
      ],
      network_id: networkId
    };
  }

  /**
   * 生成默认价格配置
   */
  static generateDefaultPriceConfig(networkId: number): object {
    return {
      energy_flash: {
        enabled: true,
        title: '⚡ 闪电能量',
        description: '快速获取能量，支持秒到账',
        price_per_energy: 0.00002,
        min_energy: 32000,
        max_energy: 1000000,
        duration_hours: 1,
        telegram_config: {
          message_template: '⚡ 闪电能量\n\n快速获取能量，支持秒到账\n价格：{price} TRX\n最小能量：{min_energy}\n最大能量：{max_energy}',
          inline_keyboard: {
            buttons: [
              { text: '32K 能量', data: 'buy_energy_32000' },
              { text: '65K 能量', data: 'buy_energy_65000' },
              { text: '100K 能量', data: 'buy_energy_100000' }
            ]
          }
        }
      },
      transaction_package: {
        enabled: true,
        title: '📦 交易套餐',
        description: '经济实惠的交易套餐，适合频繁交易',
        packages: [
          {
            name: '基础套餐',
            energy_amount: 65000,
            duration_hours: 3,
            price: 1.5,
            description: '适合普通交易使用'
          },
          {
            name: '标准套餐',
            energy_amount: 130000,
            duration_hours: 6,
            price: 2.8,
            description: '适合中等频率交易'
          },
          {
            name: '高级套餐',
            energy_amount: 260000,
            duration_hours: 12,
            price: 5.2,
            description: '适合高频交易用户'
          }
        ],
        telegram_config: {
          message_template: '📦 交易套餐\n\n经济实惠的交易套餐，适合频繁交易\n\n请选择适合您的套餐：',
          inline_keyboard: {
            buttons: [
              { text: '基础套餐 - 1.5 TRX', data: 'buy_package_basic' },
              { text: '标准套餐 - 2.8 TRX', data: 'buy_package_standard' },
              { text: '高级套餐 - 5.2 TRX', data: 'buy_package_premium' }
            ]
          }
        }
      },
      trx_exchange: {
        enabled: true,
        title: '💱 TRX兑换',
        description: 'TRX与能量之间的兑换服务',
        exchange_rate: 0.00002,
        min_trx: 1,
        max_trx: 1000,
        telegram_config: {
          message_template: '💱 TRX兑换\n\n当前汇率：1 TRX = 50000 能量\n最小兑换：{min_trx} TRX\n最大兑换：{max_trx} TRX',
          inline_keyboard: {
            buttons: [
              { text: '兑换 10 TRX', data: 'exchange_trx_10' },
              { text: '兑换 50 TRX', data: 'exchange_trx_50' },
              { text: '兑换 100 TRX', data: 'exchange_trx_100' },
              { text: '自定义金额', data: 'exchange_trx_custom' }
            ]
          }
        }
      },
      network_id: networkId
    };
  }

  /**
   * 处理自定义键盘配置
   */
  static processKeyboardConfig(customConfig: object | null, networkId: number): object {
    if (!customConfig) {
      return this.generateDefaultKeyboardConfig(networkId);
    }

    // 合并自定义配置和默认配置
    const defaultConfig = this.generateDefaultKeyboardConfig(networkId);
    return {
      ...defaultConfig,
      ...customConfig,
      network_id: networkId
    };
  }

  /**
   * 处理自定义价格配置
   */
  static processPriceConfig(customConfig: object | null, networkId: number): object {
    if (!customConfig) {
      return this.generateDefaultPriceConfig(networkId);
    }

    // 合并自定义配置和默认配置
    const defaultConfig = this.generateDefaultPriceConfig(networkId);
    return {
      ...defaultConfig,
      ...customConfig,
      network_id: networkId
    };
  }

  /**
   * 处理菜单命令
   */
  static processMenuCommands(menuCommands: any[] | null): any[] {
    if (!menuCommands || !Array.isArray(menuCommands)) {
      return [
        { command: 'start', description: '开始使用机器人' },
        { command: 'help', description: '获取帮助信息' },
        { command: 'balance', description: '查询账户余额' },
        { command: 'price', description: '查询当前价格' }
      ];
    }

    return menuCommands;
  }

  /**
   * 处理自定义命令
   */
  static processCustomCommands(customCommands: any[] | null): any[] {
    if (!customCommands || !Array.isArray(customCommands)) {
      return [];
    }

    return customCommands.map(cmd => ({
      command: cmd.command.replace('/', ''), // 移除斜杠前缀
      response_message: cmd.response_message,
      response_type: cmd.response_type || 'text',
      keyboard_config: cmd.keyboard_config || null
    }));
  }

  /**
   * 生成机器人描述
   */
  static generateBotDescription(data: CreateBotData): string {
    if (data.description) {
      return data.description;
    }

    return `🤖 ${data.name}\n\n这是一个专业的TRON能量租赁机器人，为您提供快速、安全、便捷的能量租赁服务。\n\n✨ 主要功能：\n• 💰 闪电能量租赁\n• 📦 经济交易套餐\n• 💱 TRX兑换服务\n• 📊 实时价格查询\n• 🔍 账户余额查询\n\n💡 使用 /start 开始体验我们的服务！`;
  }

  /**
   * 生成短描述
   */
  static generateShortDescription(data: CreateBotData): string {
    if (data.short_description) {
      return data.short_description;
    }

    return `${data.name} - 专业的TRON能量租赁服务`;
  }

  /**
   * 获取网络配置
   */
  static async getNetworkConfig(networkId: number): Promise<any> {
    try {
      const result = await query(
        'SELECT * FROM tron_networks WHERE id = $1',
        [networkId]
      );

      if (result.rows.length === 0) {
        throw new Error(`网络配置不存在: ${networkId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('获取网络配置失败:', error);
      throw new Error('获取网络配置失败');
    }
  }

  /**
   * 验证网络配置
   */
  static async validateNetworkConfig(networkId: number): Promise<{ isValid: boolean; message?: string }> {
    try {
      const networkConfig = await this.getNetworkConfig(networkId);
      
      if (!networkConfig.api_url || !networkConfig.api_key) {
        return {
          isValid: false,
          message: '网络配置不完整，缺少API配置'
        };
      }

      if (!networkConfig.is_active) {
        return {
          isValid: false,
          message: '网络配置已禁用'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        message: error instanceof Error ? error.message : '网络配置验证失败'
      };
    }
  }

  /**
   * 生成完整的机器人配置
   */
  static async generateBotConfig(data: CreateBotData): Promise<{
    keyboardConfig: object;
    priceConfig: object;
    menuCommands: any[];
    customCommands: any[];
    description: string;
    shortDescription: string;
  }> {
    // 使用默认网络ID或从数据中获取
    const networkId = typeof data.network_id === 'string' ? parseInt(data.network_id) : (data.network_id || 1);

    // 验证网络配置
    const networkValidation = await this.validateNetworkConfig(networkId);
    if (!networkValidation.isValid) {
      throw new Error(networkValidation.message);
    }

    return {
      keyboardConfig: this.processKeyboardConfig(data.keyboard_config || null, networkId),
      priceConfig: this.processPriceConfig(data.price_config || null, networkId),
      menuCommands: this.processMenuCommands(data.menu_commands || null),
      customCommands: this.processCustomCommands(data.custom_commands || null),
      description: this.generateBotDescription(data),
      shortDescription: this.generateShortDescription(data)
    };
  }

  /**
   * 更新配置到数据库
   */
  static async updateBotConfigs(
    botId: number,
    keyboardConfig: object,
    priceConfig: object
  ): Promise<void> {
    try {
      // 更新键盘配置
      await query(
        'UPDATE telegram_bots SET keyboard_config = $1 WHERE id = $2',
        [JSON.stringify(keyboardConfig), botId]
      );

      // 更新价格配置
      await query(
        'UPDATE telegram_bots SET price_config = $1 WHERE id = $2',
        [JSON.stringify(priceConfig), botId]
      );

      console.log(`机器人 ${botId} 配置更新成功`);
    } catch (error) {
      console.error('更新机器人配置失败:', error);
      throw new Error('更新机器人配置失败');
    }
  }

  /**
   * 检查配置冲突
   */
  static checkConfigConflicts(keyboardConfig: any, priceConfig: any): string[] {
    const conflicts: string[] = [];

    // 检查键盘按钮与价格配置的一致性
    if (keyboardConfig.main_menu && keyboardConfig.main_menu.rows) {
      for (const row of keyboardConfig.main_menu.rows) {
        for (const button of row.buttons || []) {
          if (button.action === 'buy_energy' && !priceConfig.energy_flash?.enabled) {
            conflicts.push('键盘包含购买能量按钮，但能量闪购功能未启用');
          }
          if (button.action === 'check_price' && (!priceConfig.energy_flash?.enabled && !priceConfig.transaction_package?.enabled)) {
            conflicts.push('键盘包含价格查询按钮，但价格相关功能均未启用');
          }
        }
      }
    }

    // 检查命令与配置的一致性
    if (keyboardConfig.commands) {
      for (const cmd of keyboardConfig.commands) {
        if (cmd.command === 'price' && (!priceConfig.energy_flash?.enabled && !priceConfig.transaction_package?.enabled)) {
          conflicts.push('包含价格查询命令，但价格相关功能均未启用');
        }
      }
    }

    return conflicts;
  }
}
