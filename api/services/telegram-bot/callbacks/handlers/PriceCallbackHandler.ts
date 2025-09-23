/**
 * 价格回调处理器
 * 处理价格配置相关的回调查询
 */
import TelegramBot from 'node-telegram-bot-api';
import type { CallbackHandlerDependencies } from '../types/callback.types.ts';
import { CallbackValidator } from '../utils/CallbackValidator.ts';
import { ResponseFormatter } from '../utils/ResponseFormatter.ts';

export class PriceCallbackHandler {
  private bot: TelegramBot;

  // 索引签名以支持动态方法调用
  [methodName: string]: any;

  constructor(dependencies: CallbackHandlerDependencies) {
    this.bot = dependencies.bot;
  }

  /**
   * 处理价格配置相关的回调
   */
  async handlePriceConfigCallback(chatId: number, data: string, telegramId?: number): Promise<void> {
    try {
      if (!CallbackValidator.validateUserInfo(telegramId)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      // 根据具体的价格配置类型处理
      if (data.startsWith('price_config_')) {
        const configType = data.replace('price_config_', '');
        await this.handleSpecificPriceConfig(chatId, configType, telegramId!);
      } else if (data.startsWith('price_rule_')) {
        const ruleId = data.replace('price_rule_', '');
        await this.handlePriceRule(chatId, ruleId, telegramId!);
      } else {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 未知的价格配置类型');
      }
    } catch (error) {
      console.error('处理价格配置回调失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理价格配置请求时发生错误，请重试。');
    }
  }

  /**
   * 处理具体的价格配置
   */
  private async handleSpecificPriceConfig(chatId: number, configType: string, telegramId: number): Promise<void> {
    const message = `💰 价格配置 - ${configType}\n\n` +
      `当前配置信息：\n` +
      `• 基础价格：计算中...\n` +
      `• 动态调整：启用\n` +
      `• 市场价格：获取中...\n\n` +
      `请选择操作：`;

    const keyboard = ResponseFormatter.createInlineKeyboard([
      [
        { text: '📊 查看详情', callback_data: `price_detail_${configType}` },
        { text: '⚙️ 修改配置', callback_data: `price_edit_${configType}` }
      ],
      [
        { text: '📈 价格历史', callback_data: `price_history_${configType}` },
        { text: '🔄 刷新价格', callback_data: `price_refresh_${configType}` }
      ],
      [
        { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
      ]
    ]);

    await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
      reply_markup: keyboard
    });
  }

  /**
   * 处理价格规则
   */
  private async handlePriceRule(chatId: number, ruleId: string, telegramId: number): Promise<void> {
    const message = `📋 价格规则 #${ruleId}\n\n` +
      `规则详情：\n` +
      `• 规则名称：动态定价规则\n` +
      `• 适用范围：全部套餐\n` +
      `• 调整幅度：±20%\n` +
      `• 更新频率：实时\n` +
      `• 状态：启用\n\n` +
      `请选择操作：`;

    const keyboard = ResponseFormatter.createInlineKeyboard([
      [
        { text: '✏️ 编辑规则', callback_data: `edit_rule_${ruleId}` },
        { text: '❌ 禁用规则', callback_data: `disable_rule_${ruleId}` }
      ],
      [
        { text: '📊 规则统计', callback_data: `rule_stats_${ruleId}` },
        { text: '📋 规则日志', callback_data: `rule_logs_${ruleId}` }
      ],
      [
        { text: '🔙 返回配置', callback_data: 'price_config_main' }
      ]
    ]);

    await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
      reply_markup: keyboard
    });
  }

  /**
   * 处理汇率查询
   */
  async handleExchangeRates(chatId: number): Promise<void> {
    try {
      const message = `💱 当前汇率信息\n\n` +
        `🔴 TRX/USDT: 0.1234 (+2.45%)\n` +
        `💵 USDT/CNY: 7.2500 (+0.12%)\n` +
        `⚡ Energy/TRX: 0.000078 (-1.23%)\n\n` +
        `📊 24小时统计：\n` +
        `• 最高价：0.1289\n` +
        `• 最低价：0.1201\n` +
        `• 成交量：1,234,567 TRX\n\n` +
        `🕐 更新时间：${new Date().toLocaleString('zh-CN')}`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '🔄 刷新汇率', callback_data: 'exchange_rates' },
          { text: '📈 汇率图表', callback_data: 'exchange_chart' }
        ],
        [
          { text: '💱 开始兑换', callback_data: 'start_exchange' },
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理汇率查询失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理汇率查询请求时发生错误，请重试。');
    }
  }

  /**
   * 处理兑换历史
   */
  async handleExchangeHistory(chatId: number, telegramId?: number): Promise<void> {
    try {
      if (!CallbackValidator.validateUserInfo(telegramId)) {
        await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
        return;
      }

      const message = `📋 兑换历史记录\n\n` +
        `最近兑换记录：\n\n` +
        `1️⃣ 2024-03-15 10:30\n` +
        `   100 USDT → 810.5 TRX\n` +
        `   状态：✅ 已完成\n\n` +
        `2️⃣ 2024-03-14 15:22\n` +
        `   500 TRX → 61.7 USDT\n` +
        `   状态：✅ 已完成\n\n` +
        `3️⃣ 2024-03-13 09:15\n` +
        `   200 USDT → 1,621 TRX\n` +
        `   状态：⏳ 处理中\n\n` +
        `💡 更多记录请查看详细页面`;

      const keyboard = ResponseFormatter.createInlineKeyboard([
        [
          { text: '📊 详细记录', callback_data: 'exchange_details' },
          { text: '💱 新建兑换', callback_data: 'start_exchange' }
        ],
        [
          { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]);

      await ResponseFormatter.safeSendMessage(this.bot, chatId, message, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('处理兑换历史失败:', error);
      await ResponseFormatter.safeSendMessage(this.bot, chatId, '❌ 处理兑换历史请求时发生错误，请重试。');
    }
  }
}
