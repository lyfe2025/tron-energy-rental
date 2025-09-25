/**
 * 动态键盘服务
 * 根据价格配置状态动态生成Telegram机器人键盘
 */
import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../../../utils/logger.ts';
import { PriceConfigService } from '../../PriceConfigService.ts';
import type {
  BotKeyboardConfiguration,
  InlineKeyboard,
  KeyboardButtonConfig,
  KeyboardRowConfig,
  MessageWithInlineKeyboard
} from '../types/bot.types.ts';

export class DynamicKeyboardService {
  private priceConfigService: PriceConfigService;

  constructor() {
    this.priceConfigService = PriceConfigService.getInstance();
  }

  /**
   * 根据机器人配置和价格配置状态动态生成主菜单键盘
   */
  async generateMainMenuKeyboard(botId: string, keyboardConfig: BotKeyboardConfiguration): Promise<InlineKeyboard> {
    try {
      const mainMenuConfig = keyboardConfig.main_menu;
      
      if (!mainMenuConfig.is_enabled) {
        return this.getEmptyKeyboard();
      }

      // 获取所有活跃的价格配置
      const activeConfigs = await this.priceConfigService.getActiveConfigs();
      const activeModeTypes = new Set(activeConfigs.map(config => config.mode_type));

      // 构建动态键盘行
      const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];

      for (const row of mainMenuConfig.rows) {
        if (!row.is_enabled) continue;

        const buttonRow = await this.buildKeyboardRow(row, activeModeTypes);
        if (buttonRow.length > 0) {
          keyboardRows.push(buttonRow);
        }
      }

      return {
        inline_keyboard: keyboardRows
      };
    } catch (error) {
      logger.error(`生成主菜单键盘失败 [Bot ID: ${botId}]:`, error);
      return this.getFallbackKeyboard();
    }
  }

  /**
   * 构建键盘行
   */
  private async buildKeyboardRow(
    rowConfig: KeyboardRowConfig, 
    activeModeTypes: Set<string>
  ): Promise<TelegramBot.InlineKeyboardButton[]> {
    const buttons: TelegramBot.InlineKeyboardButton[] = [];

    for (const buttonConfig of rowConfig.buttons) {
      if (!buttonConfig.is_enabled) continue;

      // 如果按钮依赖价格配置，检查配置是否激活
      if (buttonConfig.price_config_dependency) {
        if (!activeModeTypes.has(buttonConfig.price_config_dependency)) {
          // 价格配置未激活时，显示灰色按钮或跳过
          logger.debug(`跳过按钮 "${buttonConfig.text}"：价格配置 "${buttonConfig.price_config_dependency}" 未激活`);
          continue;
        }
      }

      const telegramButton = this.convertToTelegramButton(buttonConfig);
      if (telegramButton) {
        buttons.push(telegramButton);
      }
    }

    return buttons;
  }

  /**
   * 将配置按钮转换为Telegram按钮
   */
  private convertToTelegramButton(buttonConfig: KeyboardButtonConfig): TelegramBot.InlineKeyboardButton | null {
    const button: TelegramBot.InlineKeyboardButton = {
      text: buttonConfig.text
    };

    // 设置按钮动作
    if (buttonConfig.callback_data) {
      button.callback_data = buttonConfig.callback_data;
    } else if (buttonConfig.url) {
      button.url = buttonConfig.url;
    } else if (buttonConfig.switch_inline_query) {
      button.switch_inline_query = buttonConfig.switch_inline_query;
    } else if (buttonConfig.switch_inline_query_current_chat) {
      button.switch_inline_query_current_chat = buttonConfig.switch_inline_query_current_chat;
    } else if (buttonConfig.custom_action) {
      // 处理自定义动作
      button.callback_data = `custom:${buttonConfig.custom_action}`;
    } else {
      logger.warn(`按钮 "${buttonConfig.text}" 没有设置有效的动作`);
      return null;
    }

    return button;
  }

  /**
   * 根据价格配置类型生成专用键盘
   */
  async generatePriceConfigKeyboard(modeType: string, botId: string): Promise<InlineKeyboard> {
    try {
      const config = await this.priceConfigService.getConfigByMode(modeType);
      
      if (!config || !config.is_active) {
        return {
          inline_keyboard: [[
            {
              text: '❌ 该服务暂不可用',
              callback_data: 'service_unavailable'
            }
          ], [
            {
              text: '🔙 返回主菜单',
              callback_data: 'main_menu'
            }
          ]]
        };
      }

      // 检查是否有自定义的内嵌键盘配置
      if (config.inline_keyboard_config?.enabled) {
        // TRX闪兑不使用内嵌键盘
        if (modeType === 'trx_exchange') {
          return { inline_keyboard: [] };
        }
        return this.generateCustomInlineKeyboard(config.inline_keyboard_config, modeType);
      }

      // 如果没有自定义配置，使用默认的生成方式
      switch (modeType) {
        case 'energy_flash':
          return this.generateEnergyFlashKeyboard(config.config);
        case 'transaction_package':
          return this.generateTransactionPackageKeyboard(config.config);
        case 'trx_exchange':
          // TRX闪兑不使用内嵌键盘，返回空键盘
          return { inline_keyboard: [] };
        default:
          return this.getFallbackKeyboard();
      }
    } catch (error) {
      logger.error(`生成价格配置键盘失败 [Mode: ${modeType}, Bot ID: ${botId}]:`, error);
      return this.getFallbackKeyboard();
    }
  }

  /**
   * 生成能量闪租键盘
   */
  private generateEnergyFlashKeyboard(config: any): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [
      [
        {
          text: `⚡ 单笔价格: ${config.single_price} TRX`,
          callback_data: 'energy_flash_info'
        }
      ],
      [
        {
          text: `📊 最大租用: ${config.max_transactions} 笔`,
          callback_data: 'energy_flash_limit'
        }
      ],
      [
        {
          text: `⏰ 有效期: ${config.expiry_hours} 小时`,
          callback_data: 'energy_flash_duration'
        }
      ],
      [
        {
          text: '🔋 立即租用',
          callback_data: 'energy_flash_rent'
        }
      ],
      [
        {
          text: '🔙 返回主菜单',
          callback_data: 'main_menu'
        }
      ]
    ];

    return { inline_keyboard: keyboardRows };
  }

  /**
   * 生成笔数套餐键盘
   */
  private generateTransactionPackageKeyboard(config: any): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];

    // 添加套餐选择按钮
    if (config.packages && Array.isArray(config.packages)) {
      config.packages.forEach((pkg: any, index: number) => {
        keyboardRows.push([{
          text: `📦 ${pkg.transaction_count}笔 - ${pkg.price} TRX`,
          callback_data: `transaction_package:${index}`
        }]);
      });
    }

    // 添加返回按钮
    keyboardRows.push([{
      text: '🔙 返回主菜单',
      callback_data: 'main_menu'
    }]);

    return { inline_keyboard: keyboardRows };
  }


  /**
   * 生成TRX闪兑键盘
   */
  private generateTrxExchangeKeyboard(config: any): InlineKeyboard {
    const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [
      [
        {
          text: `💱 USDT → TRX (${config.usdt_to_trx_rate})`,
          callback_data: 'trx_exchange_usdt_to_trx'
        }
      ],
      [
        {
          text: `💱 TRX → USDT (${config.trx_to_usdt_rate})`,
          callback_data: 'trx_exchange_trx_to_usdt'
        }
      ],
      [
        {
          text: `💰 最小金额: ${config.min_amount} USDT`,
          callback_data: 'trx_exchange_info'
        }
      ],
      [
        {
          text: '🔄 开始兑换',
          callback_data: 'trx_exchange_start'
        }
      ],
      [
        {
          text: '🔙 返回主菜单',
          callback_data: 'main_menu'
        }
      ]
    ];

    return { inline_keyboard: keyboardRows };
  }

  /**
   * 获取空键盘
   */
  private getEmptyKeyboard(): InlineKeyboard {
    return { inline_keyboard: [] };
  }

  /**
   * 获取后备键盘（出错时使用）
   */
  private getFallbackKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [[
        {
          text: '🔄 刷新菜单',
          callback_data: 'main_menu'
        }
      ]]
    };
  }

  /**
   * 检查价格配置是否发生变化
   */
  async hasConfigChanged(lastUpdate: Date): Promise<boolean> {
    try {
      const configs = await this.priceConfigService.getAllConfigs();
      return configs.some(config => new Date(config.updated_at) > lastUpdate);
    } catch (error) {
      logger.error('检查配置变化失败:', error);
      return false;
    }
  }

  /**
   * 获取所有活跃配置的摘要信息
   */
  async getActiveConfigsSummary(): Promise<{ [key: string]: boolean }> {
    try {
      const activeConfigs = await this.priceConfigService.getActiveConfigs();
      const summary: { [key: string]: boolean } = {};
      
      activeConfigs.forEach(config => {
        summary[config.mode_type] = config.is_active;
      });
      
      return summary;
    } catch (error) {
      logger.error('获取活跃配置摘要失败:', error);
      return {};
    }
  }

  /**
   * 根据价格配置中的内嵌键盘配置生成自定义键盘
   */
  private generateCustomInlineKeyboard(keyboardConfig: any, modeType: string): InlineKeyboard {
    try {
      const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];

      // 从配置中的buttons数组生成按钮
      if (keyboardConfig.buttons && Array.isArray(keyboardConfig.buttons)) {
        const buttonsPerRow = keyboardConfig.buttons_per_row || 3;
        
        // 按照配置的每行按钮数进行布局
        for (let i = 0; i < keyboardConfig.buttons.length; i += buttonsPerRow) {
          const row: TelegramBot.InlineKeyboardButton[] = [];
          
          for (let j = 0; j < buttonsPerRow && i + j < keyboardConfig.buttons.length; j++) {
            const buttonConfig = keyboardConfig.buttons[i + j];
            const button: TelegramBot.InlineKeyboardButton = {
              text: buttonConfig.text,
              callback_data: buttonConfig.callback_data
            };
            row.push(button);
          }
          
          keyboardRows.push(row);
        }
      }

      // 添加通用的返回按钮
      keyboardRows.push([{
        text: '🔙 返回主菜单',
        callback_data: 'main_menu'
      }]);

      return { inline_keyboard: keyboardRows };
    } catch (error) {
      logger.error(`生成自定义内嵌键盘失败 [Mode: ${modeType}]:`, error);
      return this.getFallbackKeyboard();
    }
  }

  /**
   * 根据价格配置类型生成完整的消息（包含文本和内嵌键盘）
   * 按照Telegram官方标准，文本显示在上方，内嵌键盘显示在下方
   */
  async generatePriceConfigMessage(modeType: string, botId: string): Promise<MessageWithInlineKeyboard | null> {
    try {
      const config = await this.priceConfigService.getConfigByMode(modeType);
      
      if (!config || !config.is_active) {
        return {
          text: '❌ 该服务暂时不可用，请稍后再试',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🔙 返回主菜单',
                callback_data: 'main_menu'
              }
            ]]
          }
        };
      }

      // 检查是否有自定义的内嵌键盘配置
      if (config.inline_keyboard_config?.enabled) {
        // TRX闪兑不使用内嵌键盘
        if (modeType === 'trx_exchange') {
          return {
            text: config.inline_keyboard_config.title || '🔄 TRX闪兑服务',
            reply_markup: { inline_keyboard: [] }
          };
        }
        return this.generateCustomInlineKeyboardMessage(config.inline_keyboard_config, modeType);
      }

      // 如果没有自定义配置，使用默认的生成方式
      const defaultKeyboard = await this.generatePriceConfigKeyboard(modeType, botId);
      let defaultText = '';
      
      switch (modeType) {
        case 'energy_flash':
          defaultText = '⚡ **能量闪租服务**\n\n选择您需要的能量套餐：';
          break;
        case 'transaction_package':
          defaultText = '🔥 **笔数套餐服务**\n\n选择您需要的笔数套餐：';
          break;
        case 'trx_exchange':
          defaultText = '🔄 **TRX闪兑服务**\n\n选择您需要的兑换方向：';
          break;
        default:
          defaultText = '请选择您需要的服务：';
      }

      return {
        text: defaultText,
        reply_markup: defaultKeyboard,
        parse_mode: 'Markdown'
      };
    } catch (error) {
      logger.error(`生成价格配置消息失败 [Mode: ${modeType}, Bot ID: ${botId}]:`, error);
      return {
        text: '🔄 服务暂时不可用，请稍后重试',
        reply_markup: this.getFallbackKeyboard()
      };
    }
  }

  /**
   * 根据自定义内嵌键盘配置生成完整的消息
   */
  private generateCustomInlineKeyboardMessage(keyboardConfig: any, modeType: string): MessageWithInlineKeyboard {
    try {
      const keyboardRows: TelegramBot.InlineKeyboardButton[][] = [];

      // 构建消息文本
      let messageText = keyboardConfig.title || '请选择您需要的选项：';
      if (keyboardConfig.description) {
        messageText += `\n\n${keyboardConfig.description}`;
      }

      // 从配置中的buttons数组生成按钮
      if (keyboardConfig.buttons && Array.isArray(keyboardConfig.buttons)) {
        const buttonsPerRow = keyboardConfig.buttons_per_row || 3;
        
        // 按照配置的每行按钮数进行布局
        for (let i = 0; i < keyboardConfig.buttons.length; i += buttonsPerRow) {
          const row: TelegramBot.InlineKeyboardButton[] = [];
          
          for (let j = 0; j < buttonsPerRow && i + j < keyboardConfig.buttons.length; j++) {
            const buttonConfig = keyboardConfig.buttons[i + j];
            const button: TelegramBot.InlineKeyboardButton = {
              text: buttonConfig.text,
              callback_data: buttonConfig.callback_data
            };
            row.push(button);
          }
          
          keyboardRows.push(row);
        }
      }

      // 添加通用的返回按钮
      keyboardRows.push([{
        text: '🔙 返回主菜单',
        callback_data: 'main_menu'
      }]);

      return {
        text: messageText,
        reply_markup: { inline_keyboard: keyboardRows },
        parse_mode: 'Markdown'
      };
    } catch (error) {
      logger.error(`生成自定义内嵌键盘消息失败 [Mode: ${modeType}]:`, error);
      return {
        text: '🔄 服务暂时不可用，请稍后重试',
        reply_markup: this.getFallbackKeyboard()
      };
    }
  }
}
