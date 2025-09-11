/**
 * Telegram机器人主服务 - 精简重构版本
 * 主要作为协调器，具体功能通过模块属性访问
 */
import TelegramBot from 'node-telegram-bot-api';

// 核心模块
import { BotConfigManager } from './core/BotConfigManager.js';
import { BotInitializer, type InitializationResult } from './core/BotInitializer.js';
import { BotLifecycleManager } from './core/BotLifecycleManager.js';

// 功能模块
import { MessageSender } from './communication/MessageSender.js';
import { BotHealthChecker } from './monitoring/BotHealthChecker.js';
import { TelegramSyncService } from './sync/TelegramSyncService.js';
import { WebhookManager } from './webhook/WebhookManager.js';

// 集成组件
import { DatabaseAdapter } from './integrated/adapters/DatabaseAdapter.js';
import { BotOrchestrator } from './integrated/components/BotOrchestrator.js';
import { ModuleManager } from './integrated/components/ModuleManager.js';
import type { BotConfig } from './integrated/types/bot.types.js';

export class TelegramBotService {
  // 基础状态
  private bot: TelegramBot | null = null;
  private config: BotConfig | null = null;
  private isInitialized: boolean = false;
  private botId: string | null = null;

  // 核心组件
  private initializer: BotInitializer;
  private databaseAdapter: DatabaseAdapter;
  private moduleManager: ModuleManager | null = null;
  private orchestrator: BotOrchestrator | null = null;
  private modules: any = {};

  // 公共模块接口 - 用户直接访问
  public readonly config_: BotConfigManager;
  public readonly lifecycle: BotLifecycleManager;
  public messaging: MessageSender | null = null;
  public webhook: WebhookManager | null = null;
  public sync: TelegramSyncService | null = null;
  public health: BotHealthChecker | null = null;

  constructor(config?: Partial<BotConfig>) {
    this.initializer = new BotInitializer();
    this.config_ = new BotConfigManager();
    this.lifecycle = new BotLifecycleManager();
    this.databaseAdapter = DatabaseAdapter.getInstance();

    if (config) {
      this.setupTemporaryInstance(config);
    }
  }

  /**
   * 从数据库初始化机器人
   */
  async initializeFromDatabase(token: string): Promise<void> {
    const initResult = await this.initializer.initializeFromDatabase(token);
    
    if (!initResult.success) {
      throw new Error(initResult.error || '初始化失败');
    }

    await this.setupFromInitResult(initResult);
  }

  /**
   * 启动机器人
   */
  async start(): Promise<void> {
    this.validateInitialized();
    await this.lifecycle.start(this.orchestrator!);
  }

  /**
   * 停止机器人
   */
  async stop(): Promise<void> {
    if (this.isInitialized && this.orchestrator && this.moduleManager) {
      await this.lifecycle.stop(this.orchestrator, this.moduleManager);
    }
  }

  /**
   * 重启机器人
   */
  async restart(): Promise<void> {
    this.validateInitialized();
    await this.lifecycle.restart(this.orchestrator!, this.moduleManager!);
  }

  // ==================== 核心向后兼容方法 ====================

  /**
   * 发送消息 (最常用的方法，保留兼容)
   */
  async sendMessage(chatId: number, text: string, options?: any): Promise<any> {
    if (!this.messaging) throw new Error('消息发送器未初始化');
    const result = await this.messaging.sendMessage(chatId, text, options);
    if (!result.success) throw new Error(result.error);
    return result.message;
  }

  /**
   * 获取机器人信息 (核心方法，保留兼容)
   */
  async getMe(): Promise<any> {
    if (!this.bot) throw new Error('机器人实例未初始化');
    return this.bot.getMe();
  }

  /**
   * 设置Webhook (常用方法，保留兼容)
   */
  async setWebhook(url: string, options?: any): Promise<boolean> {
    if (!this.webhook) throw new Error('Webhook 管理器未初始化');
    const result = await this.webhook.setWebhook({ url, ...options });
    if (!result.success) throw new Error(result.error);
    return result.success;
  }

  /**
   * 从Telegram同步机器人信息 (核心功能，保留兼容)
   */
  async syncFromTelegram(): Promise<{
    success: boolean;
    data?: { name: string | null; description: string | null; commands: any[] | null; botInfo: any };
    error?: string;
  }> {
    if (!this.sync) return { success: false, error: '同步服务未初始化' };
    const result = await this.sync.syncFromTelegram();
    return { success: result.success, data: result.data, error: result.error };
  }

  /**
   * 健康检查 (监控必需，保留兼容)
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    if (!this.health) {
      return { status: 'unhealthy', details: { error: '健康检查器未初始化' } };
    }
    const result = await this.health.performHealthCheck(
      this.orchestrator, this.moduleManager, this.lifecycle, this.webhook
    );
    return {
      status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
      details: result
    };
  }

  /**
   * 处理webhook更新 (核心功能，保留兼容)
   */
  async processWebhookUpdate(update: any): Promise<void> {
    if (!this.webhook || !this.orchestrator) {
      throw new Error('Webhook 管理器或协调器未初始化');
    }
    const result = await this.webhook.processWebhookUpdate(update, this.orchestrator);
    if (!result.success) throw new Error(result.error);
  }

  // ==================== 简化的访问器方法 ====================

  getConfig(): BotConfig | null { return this.config_.getCurrentConfig(); }
  getBotInstance(): TelegramBot | null { return this.bot; }
  isServiceInitialized(): boolean { return this.isInitialized; }
  isServiceRunning(): boolean { return this.lifecycle.isRunning(); }

  // 向后兼容的模块访问（通过 this.modules）
  getKeyboardBuilder(): any { return this.modules.keyboardBuilder; }
  getCommandHandler(): any { return this.modules.commandHandler; }
  getCallbackHandler(): any { return this.modules.callbackHandler; }

  // 方法别名（向后兼容）
  getBotInfo = this.getMe;
  getBotConfig = this.getConfig;

  // ==================== 私有辅助方法 ====================

  private async setupFromInitResult(initResult: InitializationResult): Promise<void> {
    this.bot = initResult.bot!;
    this.config = initResult.config!;
    this.moduleManager = initResult.moduleManager!;
    this.orchestrator = initResult.orchestrator!;
    this.botId = initResult.botId!;
    this.modules = await this.moduleManager.initializeModules();

    this.config_.setCurrentConfig(this.config);
    this.lifecycle.setBotContext(this.botId, this.config);
    this.initializeFunctionalModules();
    this.isInitialized = true;

    console.log(`✅ 机器人初始化成功: ${this.config.name} (@${this.config.username})`);
  }

  private setupTemporaryInstance(config: Partial<BotConfig>): void {
    this.config = {
      token: config.token || 'temp-token',
      polling: config.polling !== false,
      webhook: false,
      ...config
    } as BotConfig;
    this.bot = new TelegramBot(this.config.token, { polling: false });
    this.initializeFunctionalModules();
  }

  private initializeFunctionalModules(): void {
    if (!this.bot || !this.botId) return;
    this.messaging = new MessageSender(this.bot, this.botId);
    this.webhook = new WebhookManager(this.bot, this.botId);
    this.sync = new TelegramSyncService(this.bot, this.botId);
    this.health = new BotHealthChecker(this.bot, this.botId);
  }

  private validateInitialized(): void {
    if (!this.isInitialized || !this.orchestrator) {
      throw new Error('机器人未初始化，请先调用 initializeFromDatabase');
    }
  }
}

export default TelegramBotService;