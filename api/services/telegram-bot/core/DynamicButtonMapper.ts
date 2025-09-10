/**
 * 动态按钮映射器
 * 从数据库读取按钮配置，支持动态映射按钮文本到回调数据
 */
import { query } from '../../../config/database.js';

export interface ButtonMapping {
  text: string;
  callbackData: string;
  actionType: string;
  isEnabled: boolean;
  description?: string;
  params?: any;
}

export interface KeyboardButtonConfig {
  id: string;
  text: string;
  callback_data: string;
  action_type: string;
  is_enabled: boolean;
  button_type: 'reply' | 'inline';
  description?: string;
  params?: any;
  order_index: number;
}

export class DynamicButtonMapper {
  private buttonMappings: Map<string, ButtonMapping> = new Map();
  private lastUpdated: Date | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.loadButtonMappings();
  }

  /**
   * 从数据库加载按钮映射配置
   */
  async loadButtonMappings(): Promise<void> {
    try {
      // 查询回复键盘按钮配置
      const result = await query(`
        SELECT 
          id,
          text,
          callback_data,
          action_type,
          is_enabled,
          button_type,
          description,
          params,
          order_index
        FROM keyboard_button_configs 
        WHERE is_enabled = true 
        ORDER BY button_type, order_index ASC
      `);

      this.buttonMappings.clear();

      for (const row of result.rows) {
        const buttonConfig: KeyboardButtonConfig = {
          id: row.id,
          text: row.text,
          callback_data: row.callback_data,
          action_type: row.action_type,
          is_enabled: row.is_enabled,
          button_type: row.button_type,
          description: row.description,
          params: row.params,
          order_index: row.order_index
        };

        const mapping: ButtonMapping = {
          text: buttonConfig.text,
          callbackData: buttonConfig.callback_data,
          actionType: buttonConfig.action_type,
          isEnabled: buttonConfig.is_enabled,
          description: buttonConfig.description,
          params: buttonConfig.params
        };

        this.buttonMappings.set(buttonConfig.text, mapping);
      }

      this.lastUpdated = new Date();
      console.log(`📋 加载了 ${this.buttonMappings.size} 个按钮映射配置`);

    } catch (error) {
      console.error('加载按钮映射配置失败:', error);
      // 如果数据库加载失败，使用默认配置
      this.loadDefaultMappings();
    }
  }

  /**
   * 加载默认按钮映射（兼容性支持）
   */
  private loadDefaultMappings(): void {
    const defaultMappings: Array<[string, ButtonMapping]> = [
      ['⚡ 能量闪租', {
        text: '⚡ 能量闪租',
        callbackData: 'price:showEnergyFlash',
        actionType: 'price',
        isEnabled: true,
        description: '显示能量闪租价格配置'
      }],
      ['🔥 笔数套餐', {
        text: '🔥 笔数套餐',
        callbackData: 'price:showTransactionPackage',
        actionType: 'price',
        isEnabled: true,
        description: '显示笔数套餐价格配置'
      }],
      ['🔄 TRX闪兑', {
        text: '🔄 TRX闪兑',
        callbackData: 'price:showTrxExchange',
        actionType: 'price',
        isEnabled: true,
        description: '显示TRX闪兑价格配置'
      }],
      ['📋 我的订单', {
        text: '📋 我的订单',
        callbackData: 'order:showUserOrders',
        actionType: 'order',
        isEnabled: true,
        description: '显示用户订单'
      }],
      ['💰 账户余额', {
        text: '💰 账户余额',
        callbackData: 'user:showBalance',
        actionType: 'user',
        isEnabled: true,
        description: '显示账户余额'
      }],
      ['❓ 帮助支持', {
        text: '❓ 帮助支持',
        callbackData: 'help:showHelp',
        actionType: 'help',
        isEnabled: true,
        description: '显示帮助信息'
      }],
      ['🔄 刷新菜单', {
        text: '🔄 刷新菜单',
        callbackData: 'menu:showMainMenu',
        actionType: 'menu',
        isEnabled: true,
        description: '刷新主菜单'
      }]
    ];

    for (const [text, mapping] of defaultMappings) {
      this.buttonMappings.set(text, mapping);
    }

    console.log(`📋 加载了 ${defaultMappings.length} 个默认按钮映射配置`);
  }

  /**
   * 根据按钮文本获取回调数据
   */
  getCallbackData(buttonText: string): string | null {
    // 检查缓存是否过期
    if (this.shouldRefreshCache()) {
      this.loadButtonMappings();
    }

    const mapping = this.buttonMappings.get(buttonText);
    return mapping?.isEnabled ? mapping.callbackData : null;
  }

  /**
   * 获取按钮映射信息
   */
  getButtonMapping(buttonText: string): ButtonMapping | null {
    if (this.shouldRefreshCache()) {
      this.loadButtonMappings();
    }

    return this.buttonMappings.get(buttonText) || null;
  }

  /**
   * 获取所有启用的按钮映射
   */
  getAllEnabledMappings(): ButtonMapping[] {
    if (this.shouldRefreshCache()) {
      this.loadButtonMappings();
    }

    return Array.from(this.buttonMappings.values()).filter(mapping => mapping.isEnabled);
  }

  /**
   * 检查是否需要刷新缓存
   */
  private shouldRefreshCache(): boolean {
    if (!this.lastUpdated) return true;
    return Date.now() - this.lastUpdated.getTime() > this.cacheExpiry;
  }

  /**
   * 强制刷新缓存
   */
  async refreshCache(): Promise<void> {
    await this.loadButtonMappings();
  }

  /**
   * 检查按钮文本是否为已知的回复键盘按钮
   */
  isReplyKeyboardButton(text: string): boolean {
    if (this.shouldRefreshCache()) {
      this.loadButtonMappings();
    }

    const mapping = this.buttonMappings.get(text);
    return mapping?.isEnabled === true;
  }

  /**
   * 获取按钮统计信息
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    lastUpdated: Date | null;
  } {
    const total = this.buttonMappings.size;
    const enabled = Array.from(this.buttonMappings.values()).filter(m => m.isEnabled).length;
    const disabled = total - enabled;

    return {
      total,
      enabled,
      disabled,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * 创建数据库表（如果不存在）
   */
  static async createTableIfNotExists(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS keyboard_button_configs (
          id SERIAL PRIMARY KEY,
          text VARCHAR(100) NOT NULL UNIQUE,
          callback_data VARCHAR(200) NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          is_enabled BOOLEAN DEFAULT true,
          button_type VARCHAR(20) DEFAULT 'reply' CHECK (button_type IN ('reply', 'inline')),
          description TEXT,
          params JSONB,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_keyboard_button_configs_enabled 
        ON keyboard_button_configs(is_enabled, button_type);
        
        CREATE INDEX IF NOT EXISTS idx_keyboard_button_configs_text 
        ON keyboard_button_configs(text);
      `);

      console.log('✅ 键盘按钮配置表已创建或已存在');
    } catch (error) {
      console.error('创建键盘按钮配置表失败:', error);
    }
  }

  /**
   * 初始化默认按钮配置到数据库
   */
  static async initializeDefaultButtons(): Promise<void> {
    try {
      // 先检查是否已有数据
      const existingResult = await query('SELECT COUNT(*) as count FROM keyboard_button_configs');
      if (existingResult.rows[0].count > 0) {
        console.log('⚠️ 键盘按钮配置已存在，跳过初始化');
        return;
      }

      const defaultButtons = [
        {
          text: '⚡ 能量闪租',
          callback_data: 'price:showEnergyFlash',
          action_type: 'price',
          description: '显示能量闪租价格配置',
          order_index: 1
        },
        {
          text: '🔥 笔数套餐',
          callback_data: 'price:showTransactionPackage',
          action_type: 'price',
          description: '显示笔数套餐价格配置',
          order_index: 2
        },
        {
          text: '🔄 TRX闪兑',
          callback_data: 'price:showTrxExchange',
          action_type: 'price',
          description: '显示TRX闪兑价格配置',
          order_index: 3
        },
        {
          text: '📋 我的订单',
          callback_data: 'order:showUserOrders',
          action_type: 'order',
          description: '显示用户订单',
          order_index: 4
        },
        {
          text: '💰 账户余额',
          callback_data: 'user:showBalance',
          action_type: 'user',
          description: '显示账户余额',
          order_index: 5
        },
        {
          text: '❓ 帮助支持',
          callback_data: 'help:showHelp',
          action_type: 'help',
          description: '显示帮助信息',
          order_index: 6
        },
        {
          text: '🔄 刷新菜单',
          callback_data: 'menu:showMainMenu',
          action_type: 'menu',
          description: '刷新主菜单',
          order_index: 7
        }
      ];

      for (const button of defaultButtons) {
        await query(`
          INSERT INTO keyboard_button_configs 
          (text, callback_data, action_type, description, order_index)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          button.text,
          button.callback_data,
          button.action_type,
          button.description,
          button.order_index
        ]);
      }

      console.log(`✅ 初始化了 ${defaultButtons.length} 个默认按钮配置`);
    } catch (error) {
      console.error('初始化默认按钮配置失败:', error);
    }
  }
}
