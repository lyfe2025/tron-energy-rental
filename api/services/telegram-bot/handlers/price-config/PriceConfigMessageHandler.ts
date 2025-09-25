/**
 * 价格配置消息处理器 - 重构版本
 * 处理价格配置相关的回复键盘按钮和文本消息
 * 
 * 重构说明：将原始621行代码拆分为多个模块，保持完全相同的功能
 */
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { query } from '../../../../config/database.ts';
import { StateManager } from '../../core/StateManager.ts';
import { WebhookURLService } from '../../utils/WebhookURLService.ts';

// 导入分离的模块
import { KeyboardBuilder } from './builders/KeyboardBuilder.ts';
import { EnergyFlashFormatter } from './formatters/EnergyFlashFormatter.ts';
import { TransactionPackageFormatter } from './formatters/TransactionPackageFormatter.ts';
import { TrxExchangeFormatter } from './formatters/TrxExchangeFormatter.ts';
import { AddressInputProcessor } from './processors/AddressInputProcessor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PriceConfigMessageHandler {
  private bot: TelegramBot;
  private botId: string;
  private stateManager?: StateManager;
  private addressInputProcessor: AddressInputProcessor;

  constructor(bot: TelegramBot, botId: string, stateManager?: StateManager) {
    this.bot = bot;
    this.botId = botId;
    this.stateManager = stateManager;
    this.addressInputProcessor = new AddressInputProcessor(bot, stateManager);
  }

  /**
   * 处理文本消息，检查是否为价格配置回复键盘按钮或地址输入
   */
  async handleMessage(message: any): Promise<boolean> {
    if (!message.text) {
      return false;
    }

    const text = message.text.trim();
    const chatId = message.chat.id;
    const userId = message.from?.id;

    // 首先检查用户是否在等待地址输入状态
    console.log('🔍 检查用户状态 (PriceConfigMessageHandler):', {
      userId: userId,
      text: text.substring(0, 20)
    });

    if (userId && this.stateManager) {
      const userSession = this.stateManager.getUserSession(userId);
      console.log('👤 用户会话状态 (PriceConfigMessageHandler):', {
        userId: userId,
        hasSession: !!userSession,
        currentState: userSession?.currentState,
        sessionData: userSession?.contextData
      });

      if (userSession && userSession.currentState === 'waiting_address_input') {
        console.log('🏠 开始处理地址输入 (PriceConfigMessageHandler):', text);
        return await this.addressInputProcessor.handleAddressInput(message, text, userSession);
      }
    }

    // 检查是否为价格配置相关的按钮
    const buttonMappings: { [key: string]: string } = {
      '⚡ 能量闪租': 'energy_flash',
      '🔥 笔数套餐': 'transaction_package',
      '🔄 TRX闪兑': 'trx_exchange'
    };

    const configType = buttonMappings[text];
    if (!configType) {
      return false; // 不是价格配置按钮，也不是地址输入
    }

    console.log(`💰 处理价格配置按钮: ${text} -> ${configType} (机器人: ${this.botId})`);

    try {
      await this.sendPriceConfigMessage(chatId, configType);
      return true;
    } catch (error) {
      console.error(`❌ 处理价格配置按钮失败 (${configType}):`, error);
      await this.bot.sendMessage(chatId, '❌ 获取服务信息失败，请稍后重试。');
      return true; // 即使失败也返回true，表示消息已被处理
    }
  }

  /**
   * 发送价格配置消息
   */
  private async sendPriceConfigMessage(chatId: number, modeType: string): Promise<void> {
    // 从数据库获取价格配置
    const priceConfigResult = await query(
      'SELECT name, description, config, inline_keyboard_config, image_url, image_alt, enable_image FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
      [modeType]
    );

    if (priceConfigResult.rows.length === 0) {
      await this.bot.sendMessage(chatId, '❌ 该服务暂不可用，请稍后再试。');
      return;
    }

    const priceConfig = priceConfigResult.rows[0];
    const config = priceConfig.config;
    const keyboardConfig = priceConfig.inline_keyboard_config;
    const enableImage = priceConfig.enable_image;
    const imageUrl = priceConfig.image_url;

    // 构建消息内容
    let message = '';
    switch (modeType) {
      case 'energy_flash':
        message = EnergyFlashFormatter.formatEnergyFlashMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'transaction_package':
        message = TransactionPackageFormatter.formatTransactionPackageMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'trx_exchange':
        message = TrxExchangeFormatter.formatTrxExchangeMessage(priceConfig.name, config, keyboardConfig);
        break;
      default:
        message = `${priceConfig.name}\n\n${priceConfig.description}`;
        break;
    }

    // 构建内嵌键盘（TRX闪兑不使用内嵌键盘）
    let replyMarkup = undefined;
    if (modeType !== 'trx_exchange' && keyboardConfig && keyboardConfig.enabled && keyboardConfig.buttons) {
      // 确保 inline_keyboard 是数组的数组格式 (rows)
      let inlineKeyboard;
      if (Array.isArray(keyboardConfig.buttons)) {
        // 如果 buttons 是数组，检查第一个元素是否也是数组
        if (keyboardConfig.buttons.length > 0 && Array.isArray(keyboardConfig.buttons[0])) {
          // 已经是正确的格式 (数组的数组)
          inlineKeyboard = keyboardConfig.buttons;
        } else {
          // 是按钮对象的数组，需要根据 buttons_per_row 配置分组
          inlineKeyboard = KeyboardBuilder.groupButtonsIntoRows(keyboardConfig.buttons, keyboardConfig.buttons_per_row || 3);
        }
      } else {
        // 不是数组，跳过
        inlineKeyboard = [];
      }
      
      replyMarkup = {
        inline_keyboard: inlineKeyboard
      };
    }

    // 发送消息 - 根据是否启用图片决定发送方式
    if (enableImage && imageUrl) {
      // 构建本地文件路径或使用远程URL
      let photoSource = imageUrl;
      
      if (WebhookURLService.needsFullUrl(imageUrl)) {
        // 如果是相对路径，使用本地文件
        const projectRoot = path.resolve(__dirname, '../../../../../');
        const localPath = path.join(projectRoot, 'public', imageUrl.replace(/^\//, ''));
        
        if (fs.existsSync(localPath)) {
          photoSource = localPath;
        } else {
          // 如果本地文件不存在，构建完整URL（备用方案）
          photoSource = await WebhookURLService.buildResourceUrl(this.botId, imageUrl);
        }
      }

      // 发送带图片的消息
      await this.bot.sendPhoto(chatId, photoSource, {
        caption: message,
        reply_markup: replyMarkup,
        parse_mode: 'Markdown'
      });
    } else {
      // 发送纯文本消息
      await this.bot.sendMessage(chatId, message, {
        reply_markup: replyMarkup,
        parse_mode: 'Markdown'
      });
    }
  }
}
