/**
 * 能量回调处理器
 * 处理能量相关的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import type { CallbackHandlerDependencies } from '../types/callback.types.ts';
import { CallbackValidator } from '../utils/CallbackValidator.ts';
import { ResponseFormatter } from '../utils/ResponseFormatter.ts';

export class EnergyCallbackHandler {
  private bot: TelegramBot;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(dependencies: CallbackHandlerDependencies) {
    this.bot = dependencies.bot;
  }

  /**
   * 处理能量闪租功能
   */
  async handleEnergyFlash(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!CallbackValidator.validateUserInfo(telegramId)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      const message = `⚡ 能量闪租服务\n\n` +
        `🔸 快速获得TRON网络能量\n` +
        `🔸 即时代理，无需等待\n` +
        `🔸 多种套餐，价格优惠\n\n` +
        `💡 请选择您需要的能量套餐：`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '32,000 Energy (2.5 TRX)', callback_data: 'package_energy_1' },
          { text: '65,000 Energy (4.8 TRX)', callback_data: 'package_energy_2' }
        ],
        [
          { text: '130,000 Energy (9.2 TRX)', callback_data: 'package_energy_3' },
          { text: '260,000 Energy (18 TRX)', callback_data: 'package_energy_4' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理能量闪租失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理能量闪租请求时发生错误，请重试。');
    }
  }

  /**
   * 处理笔数套餐功能
   */
  async handleTransactionPackage(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!CallbackValidator.validateUserInfo(telegramId)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      const message = `🔥 笔数套餐服务\n\n` +
        `🔸 按交易笔数计费\n` +
        `🔸 适合频繁交易用户\n` +
        `🔸 每笔交易保证足够能量\n\n` +
        `💡 请选择您需要的交易笔数：`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '10笔交易 (5 TRX)', callback_data: 'package_tx_10' },
          { text: '50笔交易 (20 TRX)', callback_data: 'package_tx_50' }
        ],
        [
          { text: '100笔交易 (35 TRX)', callback_data: 'package_tx_100' },
          { text: '200笔交易 (65 TRX)', callback_data: 'package_tx_200' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理笔数套餐失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理笔数套餐请求时发生错误，请重试。');
    }
  }

  /**
   * 处理TRX闪兑功能
   */
  async handleTrxExchange(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!CallbackValidator.validateUserInfo(telegramId)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      // 动态导入数据库模块
      const { query } = await import('../../../../config/database.ts');

      // 从数据库获取 TRX 闪兑价格配置
      const priceConfigResult = await query(
        'SELECT name, description, config FROM price_configs WHERE mode_type = $1 AND is_active = true ORDER BY id DESC LIMIT 1',
        ['trx_exchange']
      );

      if (priceConfigResult.rows.length === 0) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ TRX闪兑服务暂不可用，请稍后再试。');
        return;
      }

      const priceConfig = priceConfigResult.rows[0];
      const config = priceConfig.config;

      // 格式化 TRX 闪兑消息
      const message = this.formatTrxExchangeMessage(priceConfig.name, config);

      // 发送纯文本消息（不包含内嵌键盘）
      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('处理TRX闪兑失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理TRX闪兑请求时发生错误，请重试。');
    }
  }

  /**
   * 处理代理状态查询
   */
  async handleDelegationStatus(chatId: number, delegationId: string): Promise<void> {
    if (!CallbackValidator.validateDelegationId(delegationId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 代理ID格式无效');
      return;
    }

    try {
      // 这里应该查询代理状态
      const statusMessage = `📊 代理状态查询\n\n` +
        `📋 代理ID: ${delegationId}\n` +
        `✅ 状态: 活跃中\n` +
        `⏰ 剩余时间: 计算中...\n` +
        `⚡ 可用能量: 计算中...\n\n` +
        `🔄 点击刷新获取最新状态`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '🔄 刷新状态', callback_data: `delegation_status_${delegationId}` }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, statusMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Failed to handle delegation status:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 查询代理状态时发生错误，请重试。');
    }
  }

  /**
   * 格式化TRX闪兑消息（使用数据库中的main_message_template）
   */
  private formatTrxExchangeMessage(name: string, config: any): string {
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

}
