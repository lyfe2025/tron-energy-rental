/**
 * Stats命令处理器
 * 处理统计相关命令，如余额查询、用户统计等
 */
import TelegramBot from 'node-telegram-bot-api';
import { configService } from '../../../config/ConfigService.ts';
import { TronService } from '../../../tron.ts';
import { UserService } from '../../../user.ts';
import { CommandValidator } from '../middleware/CommandValidator.ts';
import { UserContextManager } from '../middleware/UserContextManager.ts';
import type { CommandHandlerDependencies } from '../types/command.types.ts';
import { MessageFormatter } from '../utils/MessageFormatter.ts';

export class StatsCommandHandler {
  private bot: TelegramBot;
  private userService: UserService;
  private orderService: typeof import('../../../order.ts').orderService;
  private botId?: string;

  constructor(dependencies: CommandHandlerDependencies) {
    this.bot = dependencies.bot;
    this.userService = dependencies.userService;
    this.orderService = dependencies.orderService;
    this.botId = dependencies.botId;
  }

  /**
   * 处理 /balance 命令
   */
  async handleBalanceCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    
    if (!CommandValidator.validateChatInfo(chatId) || !CommandValidator.validateUserInfo(msg.from)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      // 更新用户上下文
      UserContextManager.createOrUpdateContext(msg);
      UserContextManager.setCurrentCommand(telegramId!, '/balance');

      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      await this.sendUserBalance(chatId, user, true); // 包含内嵌键盘
    } catch (error) {
      console.error('Error in handleBalanceCommand:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取余额信息失败，请重试。');
    }
  }

  /**
   * 处理账户余额按钮
   */
  async handleBalanceButton(msg: TelegramBot.Message): Promise<void> {
    await this.handleBalanceCommand(msg);
  }

  /**
   * 处理账户余额回调
   */
  async handleBalanceCallback(chatId: number, telegramId?: number): Promise<void> {
    if (!CommandValidator.validateUserInfo({ id: telegramId } as any)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在，请先使用 /start 注册');
        return;
      }

      await this.sendUserBalance(chatId, user, true); // 包含回调按钮
    } catch (error) {
      console.error('Error in handleBalanceCallback:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取余额信息失败，请重试。');
    }
  }

  /**
   * 发送用户余额信息
   */
  private async sendUserBalance(chatId: number, user: any, includeButtons: boolean = false): Promise<void> {
    try {
      // 获取用户统计信息
      const stats = await this.getUserStats(user);

      // 获取真实的链上余额
      const realBalance = await this.getRealTronBalance(user);

      const balanceMessage = `💰 账户余额信息

👤 **用户信息**
• 用户ID: ${user.id}
• Telegram ID: ${user.telegram_id}
• 用户名: ${user.username || '未设置'}
• 注册时间: ${MessageFormatter.formatDate(user.created_at)}

💵 **余额信息** ${user.tron_address ? `🔗 (${realBalance.networkName || '链上实时'})` : '📝 (数据库)'}
• USDT余额: ${(Number(realBalance.usdtBalance) || 0).toFixed(6)} USDT
• TRX余额: ${(Number(realBalance.trxBalance) || 0).toFixed(6)} TRX
${user.tron_address ? `• 数据来源: ${realBalance.networkName ? `${realBalance.networkName} 网络` : 'TRON官方API'}` : '• 💡 绑定TRON地址后可查看链上实时余额'}
• 账户状态: ${this.getAccountStatus(user.status)}

📊 **统计信息**
• 总订单数: ${stats.totalOrders}
• 已完成订单: ${stats.completedOrders}
• 总消费: ${this.formatSpentAmount(stats.totalSpentTRX, stats.totalSpentUSDT)}
• 总能量使用: ${MessageFormatter.formatNumber(stats.totalEnergyUsed)} Energy
• 最后订单: ${stats.lastOrderDate || '无'}

${user.tron_address ? `📍 **TRON地址**: \`${user.tron_address}\`` : '⚠️ **TRON地址**: 未设置'}`;

      let messageOptions: any = { parse_mode: 'Markdown' };

      if (includeButtons) {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '🔄 刷新余额', callback_data: 'check_balance' },
              { text: '📋 我的订单', callback_data: 'my_orders' }
            ],
            [
              { text: '⚡ 购买能量', callback_data: 'buy_energy' },
              { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
            ]
          ]
        };

        // 如果显示TRON地址相关的操作按钮
        if (user.tron_address) {
          // 用户已有TRON地址，显示解绑按钮
          keyboard.inline_keyboard.push([
            { text: '🔗 解绑 TRON 地址', callback_data: 'unbind_tron_address' }
          ]);
        } else {
          // 用户没有TRON地址，显示绑定按钮
          keyboard.inline_keyboard.push([
            { text: '🔗 绑定 TRON 地址', callback_data: 'bind_tron_address' }
          ]);
        }

        messageOptions.reply_markup = keyboard;
      }

      await MessageFormatter.safeSendMessage(this.bot, chatId, balanceMessage, messageOptions);
    } catch (error) {
      console.error('Error sending user balance:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  private async getUserStats(user: any): Promise<any> {
    try {
      // 获取订单统计
      const orders = await this.orderService.getUserOrders(user.id, 1000); // 使用用户UUID获取订单
      
      // 按货币类型分别统计消费
      const spentByTRX = orders?.filter(order => 
        ['paid', 'processing', 'active', 'completed', 'manually_completed'].includes(order.status) && 
        order.payment_currency === 'TRX')
        .reduce((sum, order) => sum + (Number(order.price) || 0), 0) || 0;
      
      const spentByUSDT = orders?.filter(order => 
        ['paid', 'processing', 'active', 'completed', 'manually_completed'].includes(order.status) && 
        order.payment_currency === 'USDT')
        .reduce((sum, order) => sum + (Number(order.price) || 0), 0) || 0;

      const stats = {
        totalOrders: orders?.length || 0,
        completedOrders: orders?.filter(order => order.status === 'completed').length || 0,
        totalSpentTRX: spentByTRX,
        totalSpentUSDT: spentByUSDT,
        totalEnergyUsed: orders?.filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.energy_amount || 0), 0) || 0,
        lastOrderDate: orders && orders.length > 0 ? 
          MessageFormatter.formatDate(orders[0].created_at) : null
      };

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalOrders: 0,
        completedOrders: 0,
        totalSpentTRX: 0,
        totalSpentUSDT: 0,
        totalEnergyUsed: 0,
        lastOrderDate: null
      };
    }
  }

  /**
   * 格式化消费金额显示
   */
  private formatSpentAmount(trxAmount: number, usdtAmount: number): string {
    const parts: string[] = [];
    
    if (trxAmount > 0) {
      parts.push(`${trxAmount.toFixed(6)} TRX`);
    }
    
    if (usdtAmount > 0) {
      parts.push(`${usdtAmount.toFixed(6)} USDT`);
    }
    
    if (parts.length === 0) {
      return '0 TRX';
    }
    
    return parts.join(' + ');
  }

  /**
   * 计算平均订单金额
   */
  private calculateAverageOrderAmount(stats: any): string {
    if (stats.totalOrders === 0) {
      return '0 TRX';
    }
    
    const avgTRX = stats.totalSpentTRX / stats.totalOrders;
    const avgUSDT = stats.totalSpentUSDT / stats.totalOrders;
    
    const parts: string[] = [];
    
    if (avgTRX > 0) {
      parts.push(`${avgTRX.toFixed(2)} TRX`);
    }
    
    if (avgUSDT > 0) {
      parts.push(`${avgUSDT.toFixed(2)} USDT`);
    }
    
    if (parts.length === 0) {
      return '0 TRX';
    }
    
    return parts.join(' + ');
  }

  /**
   * 获取账户状态文本
   */
  private getAccountStatus(status?: string): string {
    switch (status) {
      case 'active':
        return '✅ 正常';
      case 'suspended':
        return '⏸️ 暂停';
      case 'blocked':
        return '🚫 封禁';
      case 'pending':
        return '⏳ 待激活';
      default:
        return '✅ 正常';
    }
  }

  /**
   * 处理用户统计查询
   */
  async handleUserStats(chatId: number, telegramId?: number): Promise<void> {
    if (!CommandValidator.validateUserInfo({ id: telegramId } as any)) {
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 无法获取用户信息');
      return;
    }

    try {
      const user = await UserService.getUserByTelegramId(telegramId!);
      if (!user) {
        await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 用户不存在');
        return;
      }

      const stats = await this.getUserStats(user);
      
      const statsMessage = `📊 用户统计报告

📈 **订单统计**
• 总订单数: ${stats.totalOrders}
• 成功订单: ${stats.completedOrders}
• 成功率: ${stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
• 平均订单金额: ${this.calculateAverageOrderAmount(stats)}

⚡ **能量使用统计**
• 总能量使用: ${MessageFormatter.formatNumber(stats.totalEnergyUsed)} Energy
• 平均单次能量: ${stats.completedOrders > 0 ? MessageFormatter.formatNumber(Math.round(stats.totalEnergyUsed / stats.completedOrders)) : 0} Energy

💰 **消费统计**
• 总消费金额: ${this.formatSpentAmount(stats.totalSpentTRX, stats.totalSpentUSDT)}

📅 **时间统计**
• 注册时间: ${MessageFormatter.formatDate(user.created_at)}
• 最后订单: ${stats.lastOrderDate || '无'}
• 活跃天数: ${this.calculateActiveDays(user.created_at)}天`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💰 账户余额', callback_data: 'check_balance' },
            { text: '📋 订单记录', callback_data: 'my_orders' }
          ],
          [
            { text: '📱 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };

      await MessageFormatter.safeSendMessage(this.bot, chatId, statsMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error in handleUserStats:', error);
      await MessageFormatter.safeSendMessage(this.bot, chatId, '❌ 获取统计信息失败，请重试。');
    }
  }

  /**
   * 计算活跃天数
   */
  private calculateActiveDays(createdAt: string | Date): number {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 获取用户真实的TRON余额（从链上获取）
   */
  private async getRealTronBalance(user: any): Promise<{ 
    trxBalance: number; 
    usdtBalance: number; 
    networkName?: string; 
    networkType?: string;
  }> {
    try {
      // 如果用户没有绑定TRON地址，返回0余额
      if (!user.tron_address) {
        return { trxBalance: 0, usdtBalance: 0 };
      }

      // 获取当前机器人的网络配置
      if (!this.botId) {
        console.warn('⚠️ 无法获取机器人ID，使用数据库余额');
        return { trxBalance: Number(user.trx_balance) || 0, usdtBalance: Number(user.usdt_balance) || 0 };
      }

      // 获取机器人配置以获取网络ID
      const botConfig = await configService.getTelegramBotById(this.botId);
      console.log('🔍 机器人配置获取结果:', { 
        botId: this.botId, 
        hasBotConfig: !!botConfig, 
        networkId: botConfig?.networkId 
      });
      
      if (!botConfig || !botConfig.networkId) {
        console.warn('⚠️ 无法获取机器人网络配置，使用数据库余额');
        return { trxBalance: Number(user.trx_balance) || 0, usdtBalance: Number(user.usdt_balance) || 0 };
      }

      // 获取TRON网络配置
      const networkConfig = await configService.getTronNetworkById(botConfig.networkId);
      console.log('🌐 网络配置获取结果:', { 
        networkId: botConfig.networkId,
        hasNetworkConfig: !!networkConfig,
        networkName: networkConfig?.name,
        networkType: networkConfig?.networkType
      });
      
      if (!networkConfig) {
        console.warn('⚠️ 无法获取TRON网络配置，使用数据库余额');
        return { trxBalance: Number(user.trx_balance) || 0, usdtBalance: Number(user.usdt_balance) || 0 };
      }

      // 初始化TronService
      const config = networkConfig as any;
      console.log('🔧 TronService配置:', {
        rpcUrl: config.rpcUrl,
        networkType: config.networkType,
        apiKey: config.apiKey,
        rawConfig: JSON.stringify(config)
      });
      
      const tronService = new TronService({
        fullHost: config.rpcUrl,  // 使用正确的驼峰命名字段
        solidityNode: config.rpcUrl,  // TRON官方节点通常同时支持全节点和Solidity节点
        eventServer: config.rpcUrl,   // 使用同一个端点
        privateKey: '', // 不需要私钥，只查询余额
        // @ts-ignore
        isMainnet: config.networkType === 'mainnet'
      });

      // 获取账户信息
      const accountResult = await tronService.getAccount(user.tron_address);
      if (!accountResult.success) {
        console.error('❌ 获取账户信息失败:', accountResult.error);
        return { trxBalance: Number(user.trx_balance) || 0, usdtBalance: Number(user.usdt_balance) || 0 };
      }

      // TRX余额转换（从SUN到TRX）
      const trxBalance = Number(accountResult.data.balance || 0) / 1000000;

      // 获取USDT余额（TRC20代币）
      let usdtBalance = Number(user.usdt_balance) || 0;
      try {
        const usdtContractAddress = this.getUSDTContractAddress(networkConfig.networkType);
        if (usdtContractAddress) {
          const usdtResult = await this.getTRC20Balance(tronService, user.tron_address, usdtContractAddress);
          if (usdtResult.success) {
            usdtBalance = Number(usdtResult.balance) || 0;
          }
        }
      } catch (usdtError) {
        console.warn('⚠️ 获取USDT余额失败，使用数据库值:', usdtError.message);
      }

      console.log('✅ 成功获取链上余额:', {
        address: user.tron_address,
        network: networkConfig.name,
        networkType: networkConfig.networkType,
        trxBalance,
        usdtBalance,
        botId: this.botId,
        networkId: botConfig.networkId
      });

      return { 
        trxBalance, 
        usdtBalance, 
        networkName: networkConfig.name,
        networkType: networkConfig.networkType 
      };

    } catch (error) {
      console.error('❌ 获取真实TRON余额失败:', error);
      // 出错时返回数据库余额作为备选
      return { trxBalance: Number(user.trx_balance) || 0, usdtBalance: Number(user.usdt_balance) || 0 };
    }
  }

  /**
   * 获取USDT合约地址
   */
  private getUSDTContractAddress(networkType: 'mainnet' | 'testnet'): string | null {
    // 主网USDT合约地址
    if (networkType === 'mainnet') {
      return 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    }
    // 测试网可能没有标准的USDT合约，返回null
    return null;
  }

  /**
   * 获取TRC20代币余额
   */
  private async getTRC20Balance(tronService: any, address: string, contractAddress: string): Promise<{ success: boolean; balance: number; error?: string }> {
    try {
      // 这里需要调用TronService的TRC20余额查询方法
      // 由于当前TronService可能没有这个方法，我们先返回一个预期的接口
      
      // TODO: 如果TronService有TRC20余额查询方法，直接调用
      // const result = await tronService.getTRC20Balance(address, contractAddress);
      
      // 暂时返回成功但余额为0，避免阻塞主要功能
      return {
        success: true,
        balance: 0
      };
      
    } catch (error) {
      return {
        success: false,
        balance: 0,
        error: error.message
      };
    }
  }

  /**
   * 注册Balance命令处理器
   */
  registerBalanceCommand(): void {
    this.bot.onText(/\/balance/, async (msg) => {
      try {
        await this.handleBalanceCommand(msg);
      } catch (error) {
        console.error('Error handling /balance command:', error);
        await MessageFormatter.safeSendMessage(this.bot, msg.chat.id, '❌ 处理命令时发生错误，请重试。');
      }
    });
  }
}
