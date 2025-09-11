/**
 * 同步数据验证器
 * 负责验证同步配置数据的有效性
 */
export class SyncDataValidator {
  /**
   * 验证机器人名称
   */
  static validateBotName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: '机器人名称不能为空' };
    }

    if (name.length > 64) {
      return { valid: false, error: '机器人名称不能超过64个字符' };
    }

    return { valid: true };
  }

  /**
   * 验证机器人描述
   */
  static validateBotDescription(description: string): { valid: boolean; error?: string } {
    if (!description || typeof description !== 'string') {
      return { valid: false, error: '机器人描述不能为空' };
    }

    if (description.length > 512) {
      return { valid: false, error: '机器人描述不能超过512个字符' };
    }

    return { valid: true };
  }

  /**
   * 验证机器人短描述
   */
  static validateBotShortDescription(shortDescription: string): { valid: boolean; error?: string } {
    if (!shortDescription || typeof shortDescription !== 'string') {
      return { valid: false, error: '机器人短描述不能为空' };
    }

    if (shortDescription.length > 120) {
      return { valid: false, error: '机器人短描述不能超过120个字符' };
    }

    return { valid: true };
  }

  /**
   * 验证机器人命令
   */
  static validateBotCommands(commands: any[]): { valid: boolean; error?: string } {
    if (!Array.isArray(commands)) {
      return { valid: false, error: '命令必须是数组格式' };
    }

    if (commands.length > 100) {
      return { valid: false, error: '命令数量不能超过100个' };
    }

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (!command.command || typeof command.command !== 'string') {
        return { valid: false, error: `第${i + 1}个命令的command字段无效` };
      }

      if (!command.description || typeof command.description !== 'string') {
        return { valid: false, error: `第${i + 1}个命令的description字段无效` };
      }

      // 验证命令格式
      if (!/^[a-z0-9_]{1,32}$/.test(command.command)) {
        return { 
          valid: false, 
          error: `第${i + 1}个命令"${command.command}"格式无效，只能包含小写字母、数字和下划线，长度1-32个字符` 
        };
      }

      if (command.description.length > 256) {
        return { valid: false, error: `第${i + 1}个命令的描述不能超过256个字符` };
      }
    }

    return { valid: true };
  }

  /**
   * 验证Webhook URL
   */
  static validateWebhookUrl(webhookUrl: string): { valid: boolean; error?: string } {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return { valid: false, error: 'Webhook URL不能为空' };
    }

    try {
      const url = new URL(webhookUrl);
      
      if (url.protocol !== 'https:') {
        return { valid: false, error: 'Webhook URL必须使用HTTPS协议' };
      }

      if (webhookUrl.length > 2048) {
        return { valid: false, error: 'Webhook URL长度不能超过2048个字符' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Webhook URL格式无效' };
    }
  }

  /**
   * 验证菜单按钮配置
   */
  static validateMenuButtonConfig(config: any): { valid: boolean; error?: string } {
    if (!config || typeof config !== 'object') {
      return { valid: false, error: '菜单按钮配置无效' };
    }

    if (typeof config.is_enabled !== 'boolean') {
      return { valid: false, error: 'is_enabled字段必须是布尔值' };
    }

    if (config.is_enabled) {
      if (config.menu_type === 'web_app') {
        if (!config.web_app_url) {
          return { valid: false, error: 'Web App类型菜单按钮必须提供web_app_url' };
        }

        const urlValidation = this.validateWebhookUrl(config.web_app_url);
        if (!urlValidation.valid) {
          return { valid: false, error: `Web App URL无效: ${urlValidation.error}` };
        }

        if (config.button_text && config.button_text.length > 16) {
          return { valid: false, error: '菜单按钮文本不能超过16个字符' };
        }
      } else if (config.menu_type && config.menu_type !== 'commands') {
        return { valid: false, error: '菜单类型只能是commands或web_app' };
      }
    }

    return { valid: true };
  }

  /**
   * 验证完整的同步配置
   */
  static validateSyncConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.name) {
      const nameValidation = this.validateBotName(config.name);
      if (!nameValidation.valid) {
        errors.push(nameValidation.error!);
      }
    }

    if (config.description) {
      const descValidation = this.validateBotDescription(config.description);
      if (!descValidation.valid) {
        errors.push(descValidation.error!);
      }
    }

    if (config.shortDescription) {
      const shortDescValidation = this.validateBotShortDescription(config.shortDescription);
      if (!shortDescValidation.valid) {
        errors.push(shortDescValidation.error!);
      }
    }

    if (config.commands) {
      const commandsValidation = this.validateBotCommands(config.commands);
      if (!commandsValidation.valid) {
        errors.push(commandsValidation.error!);
      }
    }

    if (config.webhookUrl) {
      const webhookValidation = this.validateWebhookUrl(config.webhookUrl);
      if (!webhookValidation.valid) {
        errors.push(webhookValidation.error!);
      }
    }

    if (config.menuButton) {
      const menuValidation = this.validateMenuButtonConfig(config.menuButton);
      if (!menuValidation.valid) {
        errors.push(menuValidation.error!);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
