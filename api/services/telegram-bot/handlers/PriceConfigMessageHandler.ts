/**
 * 价格配置消息处理器
 * 处理价格配置相关的回复键盘按钮和文本消息
 */
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { query } from '../../../config/database.ts';
import { StateManager } from '../core/StateManager.ts';
import { WebhookURLService } from '../utils/WebhookURLService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PriceConfigMessageHandler {
  private bot: TelegramBot;
  private botId: string;
  private stateManager?: StateManager;

  constructor(bot: TelegramBot, botId: string, stateManager?: StateManager) {
    this.bot = bot;
    this.botId = botId;
    this.stateManager = stateManager;
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
        return await this.handleAddressInput(message, text, userSession);
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
        message = this.formatEnergyFlashMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'transaction_package':
        message = this.formatTransactionPackageMessage(priceConfig.name, config, keyboardConfig);
        break;
      case 'trx_exchange':
        message = this.formatTrxExchangeMessage(priceConfig.name, config, keyboardConfig);
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
          inlineKeyboard = this.groupButtonsIntoRows(keyboardConfig.buttons, keyboardConfig.buttons_per_row || 3);
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
        const projectRoot = path.resolve(__dirname, '../../../../');
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

  /**
   * 格式化能量闪租消息（使用数据库中的main_message_template）
   */
  private formatEnergyFlashMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        price: config.single_price || 0,
        hours: config.expiry_hours || 0,
        maxTransactions: config.max_transactions || 0,
        paymentAddress: config.payment_address || ''
      });
    }

    // 默认消息（如果没有模板）
    return `⚡ ${name}\n\n价格：${config.single_price || 0} TRX/笔\n有效期：${config.expiry_hours || 0} 小时\n最大：${config.max_transactions || 0} 笔`;
  }

  /**
   * 格式化主消息模板，支持占位符替换和计算表达式
   */
  private formatMainMessageTemplate(template: string, variables: { [key: string]: any }): string {
    let result = template;
    
    // 先处理计算表达式（price*2, price*3等）
    result = result.replace(/\{price\*(\d+)\}/g, (match, multiplier) => {
      const price = variables.price || 0;
      const result = price * parseInt(multiplier);
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\/(\d+)\}/g, (match, divisor) => {
      const price = variables.price || 0;
      const div = parseInt(divisor);
      const result = div > 0 ? price / div : price;
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\+(\d+)\}/g, (match, addend) => {
      const price = variables.price || 0;
      return (price + parseInt(addend)).toString();
    });
    
    result = result.replace(/\{price\-(\d+)\}/g, (match, subtrahend) => {
      const price = variables.price || 0;
      return (price - parseInt(subtrahend)).toString();
    });
    
    // 处理其他变量的计算表达式
    result = result.replace(/\{maxTransactions\*(\d+)\}/g, (match, multiplier) => {
      const maxTransactions = variables.maxTransactions || 0;
      return (maxTransactions * parseInt(multiplier)).toString();
    });
    
    // 最后处理基础变量替换
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      let replacementValue = value?.toString() || '0';
      
      // 特殊处理支付地址 - 在Telegram中使用monospace格式让用户可以点击复制
      if (key === 'paymentAddress' && replacementValue && replacementValue !== '0') {
        replacementValue = `\`${replacementValue}\``;
      }
      
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacementValue);
    }
    
    return result;
  }

  /**
   * 生成指定数量的换行符
   */
  private generateLineBreaks(count: number): string {
    return count > 0 ? '\n'.repeat(count) : '';
  }


  /**
   * 格式化笔数套餐消息（使用数据库中的main_message_template）
   */
  private formatTransactionPackageMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        dailyFee: config.daily_fee || 0
      });
    }

    // 默认消息（如果没有模板）
    let message = `🔥 ${name}\n\n`;
    
    if (config.daily_fee) {
      message += `（24小时不使用，则扣${config.daily_fee}笔占用费）\n\n`;
    }

    if (config.packages && config.packages.length > 0) {
      message += `📦 可选套餐：\n`;
      config.packages.forEach((pkg: any) => {
        message += `• ${pkg.name}: ${pkg.transaction_count}笔 - ${pkg.price} ${pkg.currency || 'TRX'}\n`;
      });
    }

    return message;
  }

  /**
   * 将按钮数组按照每行按钮数分组，并处理特殊按钮（全宽）
   */
  private groupButtonsIntoRows(buttons: any[], buttonsPerRow: number = 2): any[][] {
    const rows: any[][] = [];
    
    // 识别特殊按钮（标记为isSpecial或者是最后一个按钮）
    let regularButtons = [];
    let specialButtons = [];
    
    buttons.forEach((button, index) => {
      if (button.isSpecial || (index === buttons.length - 1 && buttons.length > 4)) {
        // 特殊按钮：明确标记的或者是最后一个按钮且总数大于4个
        specialButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      } else {
        regularButtons.push({
          text: button.text,
          callback_data: button.callback_data
        });
      }
    });
    
    // 先处理常规按钮，按照每行指定数量分组
    for (let i = 0; i < regularButtons.length; i += buttonsPerRow) {
      const row = regularButtons.slice(i, i + buttonsPerRow);
      rows.push(row);
    }
    
    // 然后处理特殊按钮，每个单独一行
    specialButtons.forEach(button => {
      rows.push([button]);
    });
    
    return rows;
  }

  /**
   * 格式化TRX闪兑消息（使用数据库中的main_message_template）
   */
  private formatTrxExchangeMessage(name: string, config: any, keyboardConfig: any): string {
    // 使用数据库中的 main_message_template
    if (config.main_message_template && config.main_message_template.trim() !== '') {
      return this.formatMainMessageTemplate(config.main_message_template, {
        usdtToTrxRate: config.usdt_to_trx_rate || 0,
        trxToUsdtRate: config.trx_to_usdt_rate || 0,
        minAmount: config.min_amount || 0,
        maxAmount: config.max_amount || 0,
        paymentAddress: config.payment_address || ''
      });
    }

    // 默认消息（如果没有模板）
    let message = `🔄 ${name}\n\n`;
    
    if (config.usdt_to_trx_rate) {
      message += `💱 USDT→TRX汇率: 1 USDT = ${config.usdt_to_trx_rate} TRX\n`;
    }
    
    if (config.trx_to_usdt_rate) {
      message += `💱 TRX→USDT汇率: 1 TRX = ${config.trx_to_usdt_rate} USDT\n`;
    }

    if (config.min_amount) {
      message += `💰 最小兑换: ${config.min_amount} USDT起\n`;
    }

    if (config.payment_address) {
      message += `📍 兑换地址: ${config.payment_address}\n`;
    }

    return message;
  }

  /**
   * 处理地址输入
   */
  private async handleAddressInput(message: any, address: string, userSession: any): Promise<boolean> {
    try {
      console.log('🏠 处理地址输入 (PriceConfigMessageHandler):', address);

      // 验证 TRON 地址格式
      const addressValidation = this.validateTronAddress(address);
      if (!addressValidation.isValid) {
        // 地址格式无效，提示用户重新输入
        await this.bot.sendMessage(
          message.chat.id,
          `❌ ${addressValidation.error}\n\n请重新输入正确的TRON地址：`
        );

        return true; // 已处理该消息
      }

      // 地址验证通过，生成订单确认信息
      await this.generateOrderConfirmation(message, address, userSession);
      
      // 保存地址信息到临时状态，用于货币切换
      if (this.stateManager && message.from?.id) {
        this.stateManager.setUserState(message.from.id, 'order_confirmation', {
          userAddress: address,
          orderType: userSession.contextData.orderType,
          transactionCount: userSession.contextData.transactionCount
        });
      }

      return true; // 已处理该消息

    } catch (error) {
      console.error('❌ 处理地址输入失败 (PriceConfigMessageHandler):', error);
      
      // 清除用户状态
      this.stateManager?.clearUserSession(message.from.id);

      await this.bot.sendMessage(
        message.chat.id,
        '❌ 处理地址时发生错误，请重试。'
      );

      return true; // 已处理该消息
    }
  }

  /**
   * 验证 TRON 地址格式
   */
  private validateTronAddress(address: string): { isValid: boolean; error?: string } {
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

  /**
   * 生成订单确认信息
   */
  private async generateOrderConfirmation(message: any, address: string, userSession: any): Promise<void> {
    try {
      const contextData = userSession.contextData;
      console.log('📋 生成订单确认信息 (PriceConfigMessageHandler):', {
        orderType: contextData.orderType,
        transactionCount: contextData.transactionCount,
        address: address.substring(0, 10) + '...'
      });

      // 从数据库获取订单确认模板
      const configResult = await query(
        'SELECT config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        [contextData.orderType]
      );

      if (configResult.rows.length === 0) {
        await this.bot.sendMessage(
          message.chat.id,
          '❌ 服务配置不可用，请稍后再试。'
        );
        return;
      }

      const config = configResult.rows[0].config;
      
      // 确认模板在 config.order_config.confirmation_template 中
      const confirmationTemplate = config?.order_config?.confirmation_template;
      
      console.log('📋 数据库配置检查:', {
        hasConfig: !!config,
        hasOrderConfig: !!config?.order_config,
        hasConfirmationTemplate: !!confirmationTemplate,
        transactionCount: contextData.transactionCount,
        template: confirmationTemplate?.substring(0, 100) + '...'
      });

      let confirmationText = '';

      // 根据订单类型生成确认信息
      if (contextData.orderType === 'transaction_package') {
        // 笔数套餐确认信息
        confirmationText = this.formatTransactionPackageConfirmation(config, contextData, address, confirmationTemplate);
      } else {
        // 其他订单类型的确认信息
        confirmationText = confirmationTemplate || '✅ 订单确认信息';
      }

      // 检查是否需要添加内嵌键盘
      const messageOptions: any = { parse_mode: 'Markdown' };
      
      if (config?.order_config?.inline_keyboard?.enabled) {
        // 补充contextData中的用户信息
        const extendedContextData = {
          ...contextData,
          userId: message.from?.id,
          chatId: message.chat.id
        };
        
        const keyboard = this.buildConfirmationInlineKeyboard(config.order_config.inline_keyboard, extendedContextData);
        if (keyboard && keyboard.length > 0) {
          messageOptions.reply_markup = {
            inline_keyboard: keyboard
          };
        }
      }

      await this.bot.sendMessage(message.chat.id, confirmationText, messageOptions);

    } catch (error) {
      console.error('❌ 生成订单确认信息失败 (PriceConfigMessageHandler):', error);
      
      await this.bot.sendMessage(
        message.chat.id,
        '❌ 生成订单确认信息时发生错误，请重试。'
      );
    }
  }

  /**
   * 格式化笔数套餐确认信息
   */
  private formatTransactionPackageConfirmation(config: any, contextData: any, address: string, confirmationTemplate?: string): string {
    // 直接使用传入的确认模板
    if (!confirmationTemplate) {
      console.error('❌ 数据库中未配置订单确认模板');
      return '❌ 订单确认信息配置缺失，请联系管理员。';
    }

    // 从套餐配置中找到对应的套餐信息
    const transactionCount = parseInt(contextData.transactionCount);
    const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === transactionCount);
    
    if (!selectedPackage) {
      console.error('❌ 未找到对应的套餐配置:', transactionCount);
      return '❌ 套餐配置错误，请重新选择。';
    }

    console.log('📦 找到的套餐信息:', {
      name: selectedPackage.name,
      price: selectedPackage.price,
      unitPrice: selectedPackage.unit_price,
      transactionCount: selectedPackage.transaction_count
    });

    let template = confirmationTemplate;

    // 替换基础占位符
    template = template.replace(/{transactionCount}/g, contextData.transactionCount || '');
    template = template.replace(/{address}/g, address || '');
    template = template.replace(/{userAddress}/g, address || '');
    
    // 替换价格相关占位符
    template = template.replace(/{unitPrice}/g, selectedPackage.unit_price?.toString() || '0');
    template = template.replace(/{price}/g, selectedPackage.price?.toString() || '0');
    // 添加monospace格式让金额可以在Telegram中点击复制
    template = template.replace(/{totalAmount}/g, `\`${selectedPackage.price?.toString() || '0'}\``);

    // 替换支付地址（添加monospace格式）
    const paymentAddress = config.order_config?.payment_address;
    if (paymentAddress) {
      template = template.replace(/{paymentAddress}/g, `\`${paymentAddress}\``);
    }

    // 计算过期时间
    const expireMinutes = config.order_config?.expire_minutes || 30;
    const expireTime = new Date(Date.now() + expireMinutes * 60 * 1000);
    const expireTimeString = expireTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    template = template.replace(/{expireTime}/g, expireTimeString);

    return template;
  }

  /**
   * 构建订单确认内嵌键盘
   */
  private buildConfirmationInlineKeyboard(keyboardConfig: any, contextData: any): any[] {
    if (!keyboardConfig?.buttons || !Array.isArray(keyboardConfig.buttons)) {
      return [];
    }

    const keyboard: any[] = [];
    const buttonsPerRow = keyboardConfig.buttons_per_row || 2;
    
    for (let i = 0; i < keyboardConfig.buttons.length; i += buttonsPerRow) {
      const row: any[] = [];
      
      for (let j = 0; j < buttonsPerRow && (i + j) < keyboardConfig.buttons.length; j++) {
        const buttonConfig = keyboardConfig.buttons[i + j];
        
        // 构建callback_data，添加用户和订单信息
        const callbackData = this.buildCallbackData(buttonConfig.callback_data, contextData);
        
        row.push({
          text: buttonConfig.text,
          callback_data: callbackData
        });
      }
      
      keyboard.push(row);
    }

    return keyboard;
  }

  /**
   * 构建回调数据
   */
  private buildCallbackData(baseCallback: string, contextData: any): string {
    const timestamp = Date.now();
    const userId = contextData.userId || '';
    const transactionCount = contextData.transactionCount || '';
    
    // 生成一个简单的订单ID（时间戳 + 用户ID后4位 + 笔数）
    const orderId = `${timestamp.toString().slice(-6)}${userId.toString().slice(-4)}${transactionCount}`;
    
    return `${baseCallback}_${orderId}_${userId}_${transactionCount}`;
  }

}
