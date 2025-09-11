/**
 * 机器人健康检查器
 * 负责检查机器人各个组件的健康状态
 */
import TelegramBot from 'node-telegram-bot-api';
import { BotLifecycleManager } from '../core/BotLifecycleManager.js';
import { DatabaseAdapter } from '../integrated/adapters/DatabaseAdapter.js';
import { BotOrchestrator } from '../integrated/components/BotOrchestrator.js';
import { ModuleManager } from '../integrated/components/ModuleManager.js';
import { WebhookManager } from '../webhook/WebhookManager.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'warning';
  component: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface OverallHealthStatus {
  status: 'healthy' | 'unhealthy' | 'warning';
  score: number; // 0-100
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    unhealthy: number;
  };
  lastCheck: string;
}

export class BotHealthChecker {
  private bot: TelegramBot;
  private databaseAdapter: DatabaseAdapter;
  private botId: string | null = null;

  constructor(bot: TelegramBot, botId?: string) {
    this.bot = bot;
    this.databaseAdapter = DatabaseAdapter.getInstance();
    this.botId = botId || null;
  }

  /**
   * 设置机器人 ID
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * 执行完整的健康检查
   */
  async performHealthCheck(
    orchestrator?: BotOrchestrator,
    moduleManager?: ModuleManager,
    lifecycleManager?: BotLifecycleManager,
    webhookManager?: WebhookManager
  ): Promise<OverallHealthStatus> {
    const checks: HealthCheckResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. 检查机器人 API 连接
    checks.push(await this.checkBotApi());

    // 2. 检查数据库连接
    checks.push(await this.checkDatabase());

    // 3. 检查协调器状态
    if (orchestrator) {
      checks.push(await this.checkOrchestrator(orchestrator));
    }

    // 4. 检查模块管理器
    if (moduleManager) {
      checks.push(await this.checkModuleManager(moduleManager));
    }

    // 5. 检查生命周期管理器
    if (lifecycleManager) {
      checks.push(await this.checkLifecycleManager(lifecycleManager));
    }

    // 6. 检查 Webhook 状态
    if (webhookManager) {
      checks.push(await this.checkWebhook(webhookManager));
    }

    // 7. 检查内存使用
    checks.push(await this.checkMemoryUsage());

    // 8. 检查响应时间
    checks.push(await this.checkResponseTime());

    // 计算整体健康状态
    const summary = this.calculateSummary(checks);
    const overallStatus = this.determineOverallStatus(summary);
    const score = this.calculateHealthScore(summary);

    return {
      status: overallStatus,
      score,
      checks,
      summary,
      lastCheck: timestamp
    };
  }

  /**
   * 检查机器人 API 连接
   */
  async checkBotApi(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const botInfo = await this.bot.getMe();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        component: 'Bot API',
        message: `API 连接正常 (${responseTime}ms)`,
        details: {
          username: botInfo.username,
          firstName: botInfo.first_name,
          responseTime
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Bot API',
        message: 'API 连接失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查数据库连接
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    try {
      const dbHealth = await this.databaseAdapter.healthCheck();
      
      if (dbHealth.connected) {
        return {
          status: 'healthy',
          component: 'Database',
          message: '数据库连接正常',
          details: dbHealth,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'unhealthy',
          component: 'Database',
          message: '数据库连接失败',
          details: dbHealth,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Database',
        message: '数据库检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查协调器状态
   */
  async checkOrchestrator(orchestrator: BotOrchestrator): Promise<HealthCheckResult> {
    try {
      const orchestratorHealth = await orchestrator.healthCheck();
      
      return {
        status: orchestratorHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        component: 'Orchestrator',
        message: orchestratorHealth.status === 'healthy' ? '协调器运行正常' : '协调器状态异常',
        details: orchestratorHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Orchestrator',
        message: '协调器检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查模块管理器
   */
  async checkModuleManager(moduleManager: ModuleManager): Promise<HealthCheckResult> {
    try {
      const moduleHealth = await moduleManager.getAllModulesHealth();
      const unhealthyModules = Object.entries(moduleHealth)
        .filter(([_, health]) => health !== 'healthy')
        .map(([name, _]) => name);

      if (unhealthyModules.length === 0) {
        return {
          status: 'healthy',
          component: 'Module Manager',
          message: '所有模块运行正常',
          details: moduleHealth,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'warning',
          component: 'Module Manager',
          message: `部分模块异常: ${unhealthyModules.join(', ')}`,
          details: {
            unhealthyModules,
            allModules: moduleHealth
          },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Module Manager',
        message: '模块管理器检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查生命周期管理器
   */
  async checkLifecycleManager(lifecycleManager: BotLifecycleManager): Promise<HealthCheckResult> {
    try {
      const state = lifecycleManager.getState();
      const statusInfo = lifecycleManager.getStatusInfo();

      let status: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
      let message = '生命周期管理正常';

      if (state.status === 'error') {
        status = 'unhealthy';
        message = `生命周期错误: ${state.lastError}`;
      } else if (!state.isRunning) {
        status = 'warning';
        message = '机器人未运行';
      } else if (state.restartCount > 5) {
        status = 'warning';
        message = `重启次数过多: ${state.restartCount}`;
      }

      return {
        status,
        component: 'Lifecycle Manager',
        message,
        details: statusInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Lifecycle Manager',
        message: '生命周期管理器检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查 Webhook 状态
   */
  async checkWebhook(webhookManager: WebhookManager): Promise<HealthCheckResult> {
    try {
      const webhookStatus = await webhookManager.checkWebhookStatus();
      
      let status: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
      let message = 'Webhook 运行正常';

      if (!webhookStatus.isActive) {
        status = 'warning';
        message = 'Webhook 未激活';
      } else if (webhookStatus.issues && webhookStatus.issues.length > 0) {
        status = 'warning';
        message = `Webhook 存在问题: ${webhookStatus.issues.join(', ')}`;
      }

      return {
        status,
        component: 'Webhook',
        message,
        details: webhookStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Webhook',
        message: 'Webhook 检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查内存使用
   */
  async checkMemoryUsage(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const totalMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      let status: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
      let message = `内存使用正常 (${totalMB}MB)`;

      if (totalMB > 1000) { // 超过 1GB
        status = 'warning';
        message = `内存使用较高 (${totalMB}MB)`;
      } else if (totalMB > 2000) { // 超过 2GB
        status = 'unhealthy';
        message = `内存使用过高 (${totalMB}MB)`;
      }

      return {
        status,
        component: 'Memory',
        message,
        details: {
          rss: totalMB,
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Memory',
        message: '内存检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查响应时间
   */
  async checkResponseTime(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      
      // 执行一个简单的 API 调用
      await this.bot.getMe();
      
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
      let message = `响应时间正常 (${responseTime}ms)`;

      if (responseTime > 2000) { // 超过 2 秒
        status = 'warning';
        message = `响应时间较慢 (${responseTime}ms)`;
      } else if (responseTime > 5000) { // 超过 5 秒
        status = 'unhealthy';
        message = `响应时间过慢 (${responseTime}ms)`;
      }

      return {
        status,
        component: 'Response Time',
        message,
        details: {
          responseTime,
          threshold: {
            warning: 2000,
            unhealthy: 5000
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'Response Time',
        message: '响应时间检查失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 计算健康检查摘要
   */
  private calculateSummary(checks: HealthCheckResult[]): {
    total: number;
    healthy: number;
    warning: number;
    unhealthy: number;
  } {
    return {
      total: checks.length,
      healthy: checks.filter(check => check.status === 'healthy').length,
      warning: checks.filter(check => check.status === 'warning').length,
      unhealthy: checks.filter(check => check.status === 'unhealthy').length
    };
  }

  /**
   * 确定整体健康状态
   */
  private determineOverallStatus(summary: {
    total: number;
    healthy: number;
    warning: number;
    unhealthy: number;
  }): 'healthy' | 'warning' | 'unhealthy' {
    if (summary.unhealthy > 0) {
      return 'unhealthy';
    } else if (summary.warning > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(summary: {
    total: number;
    healthy: number;
    warning: number;
    unhealthy: number;
  }): number {
    if (summary.total === 0) return 0;
    
    const healthyScore = summary.healthy * 100;
    const warningScore = summary.warning * 50;
    const unhealthyScore = summary.unhealthy * 0;
    
    return Math.round((healthyScore + warningScore + unhealthyScore) / summary.total);
  }
}
