/**
 * 能量回调处理器
 * 处理能量相关的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import type { CallbackHandlerDependencies } from '../types/callback.types.js';
import { CallbackValidator } from '../utils/CallbackValidator.js';
import { ResponseFormatter } from '../utils/ResponseFormatter.js';

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
        `🔸 即时委托，无需等待\n` +
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

      const message = `💱 TRX闪兑服务\n\n` +
        `🔸 快速兑换TRX\n` +
        `🔸 实时汇率，价格透明\n` +
        `🔸 支持多种主流币种\n\n` +
        `💡 请选择兑换方式：`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: 'USDT → TRX', callback_data: 'exchange_usdt_trx' },
          { text: 'TRX → USDT', callback_data: 'exchange_trx_usdt' }
        ],
        [
          { text: '查看当前汇率', callback_data: 'exchange_rates' },
          { text: '兑换历史', callback_data: 'exchange_history' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理TRX闪兑失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理TRX闪兑请求时发生错误，请重试。');
    }
  }

  /**
   * 处理委托状态查询
   */
  async handleDelegationStatus(chatId: number, delegationId: string): Promise<void> {
    if (!CallbackValidator.validateDelegationId(delegationId)) {
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 委托ID格式无效');
      return;
    }

    try {
      // 这里应该查询委托状态
      const statusMessage = `📊 委托状态查询\n\n` +
        `📋 委托ID: ${delegationId}\n` +
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
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 查询委托状态时发生错误，请重试。');
    }
  }
}
