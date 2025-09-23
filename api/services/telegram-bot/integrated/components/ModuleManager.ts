/**
 * 模块管理器
 * 负责管理和协调所有机器人服务模块
 */
import TelegramBot from 'node-telegram-bot-api';
import { CallbackHandler } from '../../callbacks/CallbackHandler.ts';
import { CommandHandler } from '../../commands/CommandHandler.ts';
import { PriceConfigMessageHandler } from '../../handlers/PriceConfigMessageHandler.ts';
import { KeyboardBuilder } from '../../keyboards/KeyboardBuilder.ts';
import { BotAPIHandler } from '../../modules/BotAPIHandler.ts';
import { BotConfigManager } from '../../modules/BotConfigManager.ts';
import { BotInitializer } from '../../modules/BotInitializer.ts';
import { BotLogger } from '../../modules/BotLogger.ts';
import { BotWorkModeManager } from '../../modules/BotWorkModeManager.ts';
import { BotUtils } from '../../utils/BotUtils.ts';
import type { BotConfig } from '../types/bot.types.ts';

interface ModuleInstance {
  name: string;
  instance: any;
  dependencies: string[];
  initialized: boolean;
  health: 'healthy' | 'unhealthy' | 'unknown';
}

export class ModuleManager {
  private modules: Map<string, ModuleInstance> = new Map();
  private bot: TelegramBot;
  private config: BotConfig;
  private initializationOrder: string[] = [];

  constructor(bot: TelegramBot, config: BotConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * 初始化所有模块
   */
  async initializeModules(): Promise<{
    botInitializer: BotInitializer;
    botConfigManager: BotConfigManager;
    botLogger: BotLogger;
    botAPIHandler: BotAPIHandler;
    botWorkModeManager: BotWorkModeManager;
    commandHandler: CommandHandler;
    callbackHandler: CallbackHandler;
    keyboardBuilder: KeyboardBuilder;
    botUtils: BotUtils;
    priceConfigMessageHandler: PriceConfigMessageHandler;
  }> {
    try {
      // 1. 创建基础模块（无依赖）
      const botLogger = await this.createModule('botLogger', BotLogger, [], {
        botId: this.config.botId,
        logLevel: this.config.settings?.logLevel || 'info'
      });

      const botUtils = await this.createModule('botUtils', BotUtils, [], {});

      // 2. 创建配置和初始化模块
      const botConfigManager = await this.createModule('botConfigManager', BotConfigManager, ['botLogger'], {
        bot: this.bot,
        config: this.config,
        logger: botLogger
      });

      const botInitializer = await this.createModule('botInitializer', BotInitializer, ['botLogger'], {
        bot: this.bot,
        config: this.config,
        logger: botLogger
      });

      // 3. 创建API处理模块
      const botAPIHandler = await this.createModule('botAPIHandler', BotAPIHandler, ['botLogger'], {
        bot: this.bot,
        logger: botLogger
      });

      // 4. 创建工作模式管理器
      const botWorkModeManager = await this.createModule('botWorkModeManager', BotWorkModeManager, 
        ['botLogger', 'botAPIHandler'], {
          bot: this.bot,
          config: this.config,
          logger: botLogger,
          apiHandler: botAPIHandler
        }
      );

      // 5. 创建键盘构建器
      const keyboardBuilder = await this.createModule('keyboardBuilder', KeyboardBuilder, 
        ['botLogger', 'botConfigManager'], {
          config: this.config,
          logger: botLogger,
          configManager: botConfigManager
        }
      );

      // 6. 创建处理器模块
      const commandHandler = await this.createModule('commandHandler', CommandHandler, 
        ['botLogger', 'botConfigManager', 'keyboardBuilder'], {
          bot: this.bot,
          botId: this.config.botId
        }
      );

      const callbackHandler = await this.createModule('callbackHandler', CallbackHandler, 
        ['botLogger', 'botConfigManager', 'keyboardBuilder'], {
          bot: this.bot,
          config: this.config,
          logger: botLogger,
          configManager: botConfigManager,
          keyboardBuilder: keyboardBuilder
        }
      );

      // 创建价格配置消息处理器
      const priceConfigMessageHandler = new PriceConfigMessageHandler(this.bot, this.config.botId!);
      
      this.modules.set('priceConfigMessageHandler', {
        name: 'priceConfigMessageHandler',
        instance: priceConfigMessageHandler,
        dependencies: ['botLogger'],
        initialized: false,
        health: 'unknown'
      });

      console.log(`✅ 模块创建成功: priceConfigMessageHandler`);

      // 7. 初始化所有模块
      await this.initializeInOrder();

      return {
        botInitializer,
        botConfigManager,
        botLogger,
        botAPIHandler,
        botWorkModeManager,
        commandHandler,
        callbackHandler,
        keyboardBuilder,
        botUtils,
        priceConfigMessageHandler
      };

    } catch (error) {
      console.error('模块初始化失败:', error);
      throw new Error(`模块初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 创建模块
   */
  private async createModule<T>(
    name: string,
    ModuleClass: new (...args: any[]) => T,
    dependencies: string[],
    initArgs: any
  ): Promise<T> {
    try {
      const instance = new ModuleClass(initArgs);
      
      this.modules.set(name, {
        name,
        instance,
        dependencies,
        initialized: false,
        health: 'unknown'
      });

      console.log(`✅ 模块创建成功: ${name}`);
      return instance;
    } catch (error) {
      console.error(`❌ 模块创建失败: ${name}`, error);
      throw new Error(`模块创建失败 ${name}: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 按依赖顺序初始化模块
   */
  private async initializeInOrder(): Promise<void> {
    const initOrder = this.calculateInitializationOrder();
    
    for (const moduleName of initOrder) {
      const moduleInfo = this.modules.get(moduleName);
      if (!moduleInfo) continue;

      try {
        // 检查依赖是否已初始化
        const dependenciesReady = moduleInfo.dependencies.every(dep => {
          const depModule = this.modules.get(dep);
          return depModule && depModule.initialized;
        });

        if (!dependenciesReady) {
          throw new Error(`模块 ${moduleName} 的依赖未准备就绪`);
        }

        // 初始化模块（如果有initialize方法）
        if (typeof moduleInfo.instance.initialize === 'function') {
          await moduleInfo.instance.initialize();
        }

        moduleInfo.initialized = true;
        moduleInfo.health = 'healthy';
        
        console.log(`✅ 模块初始化成功: ${moduleName}`);
      } catch (error) {
        moduleInfo.health = 'unhealthy';
        console.error(`❌ 模块初始化失败: ${moduleName}`, error);
        throw new Error(`模块初始化失败 ${moduleName}: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }

  /**
   * 计算初始化顺序
   */
  private calculateInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (moduleName: string) => {
      if (visiting.has(moduleName)) {
        throw new Error(`检测到循环依赖: ${moduleName}`);
      }
      
      if (visited.has(moduleName)) {
        return;
      }

      visiting.add(moduleName);
      const moduleInfo = this.modules.get(moduleName);
      
      if (moduleInfo) {
        // 先访问依赖
        moduleInfo.dependencies.forEach(dep => visit(dep));
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      result.push(moduleName);
    };

    // 访问所有模块
    this.modules.forEach((_, moduleName) => {
      if (!visited.has(moduleName)) {
        visit(moduleName);
      }
    });

    return result;
  }

  /**
   * 关闭所有模块
   */
  async shutdownModules(): Promise<void> {
    const shutdownOrder = [...this.initializationOrder].reverse();

    for (const moduleName of shutdownOrder) {
      const moduleInfo = this.modules.get(moduleName);
      if (!moduleInfo || !moduleInfo.initialized) continue;

      try {
        // 关闭模块（如果有shutdown方法）
        if (typeof moduleInfo.instance.shutdown === 'function') {
          await moduleInfo.instance.shutdown();
        }

        moduleInfo.initialized = false;
        moduleInfo.health = 'unknown';
        
        console.log(`✅ 模块关闭成功: ${moduleName}`);
      } catch (error) {
        console.error(`❌ 模块关闭失败: ${moduleName}`, error);
        // 继续关闭其他模块，不抛出错误
      }
    }
  }

  /**
   * 重启模块
   */
  async restartModule(moduleName: string): Promise<void> {
    const moduleInfo = this.modules.get(moduleName);
    if (!moduleInfo) {
      throw new Error(`模块不存在: ${moduleName}`);
    }

    try {
      // 关闭模块
      if (typeof moduleInfo.instance.shutdown === 'function') {
        await moduleInfo.instance.shutdown();
      }

      // 重新初始化模块
      if (typeof moduleInfo.instance.initialize === 'function') {
        await moduleInfo.instance.initialize();
      }

      moduleInfo.initialized = true;
      moduleInfo.health = 'healthy';
      
      console.log(`✅ 模块重启成功: ${moduleName}`);
    } catch (error) {
      moduleInfo.health = 'unhealthy';
      console.error(`❌ 模块重启失败: ${moduleName}`, error);
      throw error;
    }
  }

  /**
   * 获取模块
   */
  getModule<T>(moduleName: string): T | null {
    const moduleInfo = this.modules.get(moduleName);
    return moduleInfo ? moduleInfo.instance : null;
  }

  /**
   * 检查模块健康状态
   */
  async checkModuleHealth(moduleName: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    const moduleInfo = this.modules.get(moduleName);
    if (!moduleInfo) {
      return 'unknown';
    }

    try {
      // 如果模块有healthCheck方法
      if (typeof moduleInfo.instance.healthCheck === 'function') {
        const healthResult = await moduleInfo.instance.healthCheck();
        moduleInfo.health = healthResult.healthy ? 'healthy' : 'unhealthy';
      } else if (moduleInfo.initialized) {
        moduleInfo.health = 'healthy';
      } else {
        moduleInfo.health = 'unhealthy';
      }

      return moduleInfo.health;
    } catch (error) {
      console.error(`模块健康检查失败: ${moduleName}`, error);
      moduleInfo.health = 'unhealthy';
      return 'unhealthy';
    }
  }

  /**
   * 获取所有模块的健康状态
   */
  async getAllModulesHealth(): Promise<Record<string, 'healthy' | 'unhealthy' | 'unknown'>> {
    const healthStatus: Record<string, 'healthy' | 'unhealthy' | 'unknown'> = {};

    const healthChecks = Array.from(this.modules.keys()).map(async moduleName => {
      healthStatus[moduleName] = await this.checkModuleHealth(moduleName);
    });

    await Promise.all(healthChecks);
    return healthStatus;
  }

  /**
   * 获取模块统计信息
   */
  getModuleStats(): {
    total: number;
    initialized: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  } {
    const stats = {
      total: this.modules.size,
      initialized: 0,
      healthy: 0,
      unhealthy: 0,
      unknown: 0
    };

    this.modules.forEach(moduleInfo => {
      if (moduleInfo.initialized) {
        stats.initialized++;
      }

      switch (moduleInfo.health) {
        case 'healthy':
          stats.healthy++;
          break;
        case 'unhealthy':
          stats.unhealthy++;
          break;
        case 'unknown':
          stats.unknown++;
          break;
      }
    });

    return stats;
  }

  /**
   * 获取模块依赖图
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    this.modules.forEach((moduleInfo, moduleName) => {
      graph[moduleName] = [...moduleInfo.dependencies];
    });

    return graph;
  }

  /**
   * 验证模块配置
   */
  validateModuleConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查循环依赖
    try {
      this.calculateInitializationOrder();
    } catch (error) {
      errors.push(`依赖配置错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 检查未满足的依赖
    this.modules.forEach((moduleInfo, moduleName) => {
      moduleInfo.dependencies.forEach(depName => {
        if (!this.modules.has(depName)) {
          errors.push(`模块 ${moduleName} 依赖不存在的模块: ${depName}`);
        }
      });
    });

    // 检查孤立模块
    const referencedModules = new Set<string>();
    this.modules.forEach(moduleInfo => {
      moduleInfo.dependencies.forEach(dep => referencedModules.add(dep));
    });

    this.modules.forEach((_, moduleName) => {
      if (!referencedModules.has(moduleName) && this.modules.size > 1) {
        warnings.push(`模块 ${moduleName} 没有被其他模块依赖，可能是孤立模块`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
