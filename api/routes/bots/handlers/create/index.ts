/**
 * 机器人创建处理器主控制器
 * 统一管理机器人创建流程
 */
import type { Request, Response } from 'express';
import { configService } from '../../../../services/config/ConfigService.js';
import { multiBotManager } from '../../../../services/telegram-bot.js';
import type { CreateBotData } from '../../types.js';
import { ConfigProcessor } from './services/ConfigProcessor.js';
import { InitializationService } from './services/InitializationService.js';
import { NetworkSetup } from './services/NetworkSetup.js';
import { CreateUtils } from './utils/createUtils.js';
import { CreateValidators } from './validators/createValidators.js';

export class BotCreateHandler {
  /**
   * 创建机器人的主要入口点
   */
  static async createBot(req: Request, res: Response): Promise<void> {
    try {
      console.log('开始创建机器人流程...');
      
      // 1. 解析和预处理请求数据
      const data = await BotCreateHandler.preprocessRequestData(req.body);
      
      // 2. 验证输入数据
      console.log('开始验证输入数据...');
      const validation = await CreateValidators.validateCreateData(data);
      if (!validation.isValid) {
        res.status(400).json(CreateUtils.createErrorResponse(
          '数据验证失败',
          validation.errors
        ));
        return;
      }

      // 3. 验证机器人Token
      console.log('验证机器人Token...');
      const tokenValidation = await CreateValidators.validateBotToken(data.token);
      if (!tokenValidation.isValid) {
        res.status(400).json(CreateUtils.createErrorResponse(
          tokenValidation.message || 'Token验证失败'
        ));
        return;
      }

      // 4. 生成机器人配置
      console.log('生成机器人配置...');
      const configs = await ConfigProcessor.generateBotConfig(data);

      // 5. 验证Token有效性（但不进行同步）
      console.log('验证Token有效性...');
      const tokenTest = await NetworkSetup.testBotConnection(data.token);
      if (!tokenTest.success) {
        res.status(400).json(CreateUtils.createErrorResponse(
          'Token验证失败，无法创建机器人',
          [tokenTest.error || 'Token无效']
        ));
        return;
      }

      // 设置创建结果（不进行实际的Telegram API同步）
      const networkSetupResult = {
        success: null, // 表示跳过同步
        skipped: true,
        message: '数据库保存成功，如需同步到Telegram请使用手动同步功能',
        results: {
          name: null,
          description: null,
          shortDescription: null,
          commands: null,
          webhook: null,
          menuButton: null,
          priceConfig: null
        },
        errors: [],
        summary: '机器人创建成功，未同步到Telegram'
      };

      // 6. 初始化机器人（数据库操作）
      console.log('初始化机器人...');
      const bot = await InitializationService.initializeBot(
        data,
        configs,
        networkSetupResult
      );

      // 7. 验证创建结果
      console.log('验证创建结果...');
      const verification = await InitializationService.verifyBotData(bot.id);
      if (!verification.isValid) {
        console.warn('机器人创建验证发现问题:', verification.missingData);
        // 这里不阻止创建，只是记录警告
      }

      // 8. 动态添加机器人到MultiBotManager（如果机器人是活跃的）
      if (bot.is_active) {
        try {
          console.log('开始动态添加机器人到MultiBotManager...');
          
          // 等待MultiBotManager初始化完成
          await multiBotManager.waitForInitialization();
          
          // 获取机器人配置
          const botConfig = await configService.getTelegramBotById(bot.id);
          if (botConfig) {
            // 动态添加新机器人
            const addResult = await multiBotManager.addBot(botConfig);
            if (addResult) {
              console.log('✅ 机器人已动态添动到运行实例:', bot.name, `(@${bot.username})`);
              networkSetupResult.message += ' - 机器人已自动启动';
            } else {
              console.warn('⚠️ 机器人添加到运行实例失败，需要重启服务');
              networkSetupResult.message += ' - 需要重启服务以启动机器人';
            }
          } else {
            console.warn('⚠️ 无法获取机器人配置，跳过动态添加');
          }
        } catch (error) {
          console.error('动态添加机器人失败:', error);
          // 不影响创建流程，只是记录错误
        }
      }

      // 9. 返回成功响应
      console.log('机器人创建成功:', bot.id);
      const response = CreateUtils.createSuccessResponse(bot, networkSetupResult);
      
      // 添加创建摘要到响应中
      if (req.query.include_summary === 'true') {
        (response as any).summary = CreateUtils.generateCreationSummary(
          data,
          bot,
          networkSetupResult
        );
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('创建机器人失败:', error);
      
      const errorMessage = CreateUtils.formatErrorMessage(error);
      res.status(500).json(CreateUtils.createErrorResponse(
        '创建机器人失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 验证机器人Token（独立接口）
   */
  static async verifyBotToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json(CreateUtils.createErrorResponse('Token为必填项'));
        return;
      }

      // 验证Token
      const validation = await CreateValidators.validateBotToken(token);
      
      if (validation.isValid && validation.botInfo) {
        // 测试连接
        const connectionTest = await NetworkSetup.testBotConnection(token);
        
        res.json({
          success: true,
          message: 'Token验证成功',
          data: {
            bot_info: validation.botInfo,
            connection_test: connectionTest
          }
        });
      } else {
        res.status(400).json(CreateUtils.createErrorResponse(
          validation.message || 'Token验证失败'
        ));
      }
    } catch (error) {
      console.error('Token验证失败:', error);
      const errorMessage = CreateUtils.formatErrorMessage(error);
      res.status(500).json(CreateUtils.createErrorResponse(
        'Token验证失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 检查名称和用户名可用性
   */
  static async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { name, username } = req.query;

      if (!name || !username) {
        res.status(400).json(CreateUtils.createErrorResponse(
          '名称和用户名为必填项'
        ));
        return;
      }

      const availability = await InitializationService.checkAvailability(
        String(name),
        String(username)
      );

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      console.error('检查可用性失败:', error);
      const errorMessage = CreateUtils.formatErrorMessage(error);
      res.status(500).json(CreateUtils.createErrorResponse(
        '检查可用性失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 获取默认配置模板
   */
  static async getDefaultConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { network_id = '07e9d3d0-8431-41b0-b96b-ab94d5d55a63', variant = 'full' } = req.query;
      const networkId = String(network_id);

      // 生成默认配置
      const keyboardConfig = ConfigProcessor.generateDefaultKeyboardConfig(networkId);
      const priceConfig = ConfigProcessor.generateDefaultPriceConfig(networkId);

      // 根据变体调整配置
      const adjustedKeyboardConfig = CreateUtils.generateConfigVariant(
        keyboardConfig,
        variant as 'minimal' | 'full' | 'business'
      );

      // 计算配置复杂度
      const complexity = CreateUtils.calculateConfigComplexity(adjustedKeyboardConfig);

      res.json({
        success: true,
        data: {
          keyboard_config: adjustedKeyboardConfig,
          price_config: priceConfig,
          complexity,
          network_id: networkId
        }
      });
    } catch (error) {
      console.error('获取默认配置失败:', error);
      const errorMessage = CreateUtils.formatErrorMessage(error);
      res.status(500).json(CreateUtils.createErrorResponse(
        '获取默认配置失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 预览机器人配置
   */
  static async previewBotConfig(req: Request, res: Response): Promise<void> {
    try {
      const data = await BotCreateHandler.preprocessRequestData(req.body);

      // 生成配置预览
      const configs = await ConfigProcessor.generateBotConfig(data);

      // 检查配置冲突
      const conflicts = ConfigProcessor.checkConfigConflicts(
        configs.keyboardConfig
      );

      // 计算复杂度
      const complexity = CreateUtils.calculateConfigComplexity(configs.keyboardConfig);

      res.json({
        success: true,
        data: {
          configs,
          conflicts,
          complexity,
          preview: {
            description: configs.description,
            short_description: configs.shortDescription,
            menu_commands: configs.menuCommands,
            custom_commands: configs.customCommands
          }
        }
      });
    } catch (error) {
      console.error('预览配置失败:', error);
      const errorMessage = CreateUtils.formatErrorMessage(error);
      res.status(500).json(CreateUtils.createErrorResponse(
        '预览配置失败',
        [errorMessage]
      ));
    }
  }

  /**
   * 预处理请求数据
   */
  private static async preprocessRequestData(body: any): Promise<CreateBotData> {
    // 格式化用户名和Token
    const username = CreateUtils.formatUsername(body.username || '');
    const token = CreateUtils.formatToken(body.token || '');

    // 生成Webhook密钥（如果需要）
    const webhookSecret = body.work_mode === 'webhook' && !body.webhook_secret
      ? CreateUtils.generateWebhookSecret()
      : body.webhook_secret;

    // 处理Webhook URL
    let webhookUrl = body.webhook_url;
    if (body.work_mode === 'webhook') {
      if (!webhookUrl && process.env.WEBHOOK_BASE_URL) {
        // 如果没有提供URL但有环境变量，生成默认URL
        webhookUrl = CreateUtils.generateWebhookUrl(process.env.WEBHOOK_BASE_URL, username);
      } else if (webhookUrl && !webhookUrl.includes(`/${username}`)) {
        // 如果提供了URL但不包含username，添加username
        webhookUrl = CreateUtils.generateWebhookUrl(webhookUrl, username);
      }
    }

    return {
      name: body.name || '',
      username,
      token,
      description: body.description || null,
      short_description: body.short_description || null,
      work_mode: body.work_mode || 'polling',
      webhook_url: webhookUrl || null,
      webhook_secret: webhookSecret || null,
      network_id: body.network_id || '07e9d3d0-8431-41b0-b96b-ab94d5d55a63', // 默认使用TRON Mainnet
      keyboard_config: body.keyboard_config || null,
      price_config: body.price_config || null,
      menu_commands: body.menu_commands || null,
      custom_commands: body.custom_commands || null
    };
  }

  /**
   * 健康检查接口
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: '机器人创建服务运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json(CreateUtils.createErrorResponse('服务异常'));
    }
  }
}

// 兼容性导出，支持原始函数调用方式
export const createBot = BotCreateHandler.createBot;
export const verifyBotToken = BotCreateHandler.verifyBotToken;
