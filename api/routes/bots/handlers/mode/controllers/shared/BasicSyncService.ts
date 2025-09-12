/**
 * 基础同步服务
 * 提供通用的Telegram Bot API同步方法
 */
export class BasicSyncService {
  /**
   * 同步机器人名称
   */
  static async syncBotName(
    botToken: string, 
    name: string, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始同步机器人名称: ${name}`);
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      
      if (data.ok) {
        logs.push(`✅ ${modePrefix} 机器人名称同步成功`);
        return { success: true };
      } else {
        const error = `机器人名称同步失败: ${data.description || '未知错误'}`;
        logs.push(`❌ ${modePrefix} ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `机器人名称同步失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步机器人描述
   */
  static async syncBotDescription(
    botToken: string, 
    description: string, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始同步机器人描述`);
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await response.json();
      
      if (data.ok) {
        logs.push(`✅ ${modePrefix} 机器人描述同步成功`);
        return { success: true };
      } else {
        const error = `机器人描述同步失败: ${data.description || '未知错误'}`;
        logs.push(`❌ ${modePrefix} ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `机器人描述同步失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步机器人短描述
   */
  static async syncBotShortDescription(
    botToken: string, 
    shortDescription: string, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始同步机器人短描述`);
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: shortDescription })
      });
      const data = await response.json();
      
      if (data.ok) {
        logs.push(`✅ ${modePrefix} 机器人短描述同步成功`);
        return { success: true };
      } else {
        const error = `机器人短描述同步失败: ${data.description || '未知错误'}`;
        logs.push(`❌ ${modePrefix} ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `机器人短描述同步失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步机器人命令列表
   */
  static async syncBotCommands(
    botToken: string, 
    formData: any, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始同步命令列表`);
      
      // 构建命令列表
      const commands: Array<{command: string, description: string}> = [];
      
      // 添加菜单命令
      if (formData.menu_commands && Array.isArray(formData.menu_commands)) {
        formData.menu_commands.forEach((cmd: any) => {
          if (cmd.command && cmd.description) {
            commands.push({
              command: cmd.command,
              description: cmd.description
            });
          }
        });
      }
      
      // 添加自定义命令（如果启用）
      if (formData.custom_commands && Array.isArray(formData.custom_commands)) {
        formData.custom_commands.forEach((cmd: any) => {
          if (cmd.command && cmd.is_enabled && !commands.find(c => c.command === cmd.command)) {
            commands.push({
              command: cmd.command,
              description: cmd.response_message || `自定义命令: ${cmd.command}`
            });
          }
        });
      }
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      });
      const data = await response.json();
      
      if (data.ok) {
        logs.push(`✅ ${modePrefix} 命令列表同步成功 (${commands.length}个命令)`);
        return { success: true };
      } else {
        const error = `命令列表同步失败: ${data.description || '未知错误'}`;
        logs.push(`❌ ${modePrefix} ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `命令列表同步失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 同步菜单按钮
   */
  static async syncMenuButton(
    botToken: string, 
    formData: any, 
    logs: string[],
    mode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const modePrefix = mode ? `[${mode}]` : '';
    
    try {
      logs.push(`🎯 ${modePrefix} 开始同步菜单按钮`);
      
      const menuButton: any = { type: 'default' };
      if (formData.menu_type === 'web_app' && formData.web_app_url) {
        menuButton.type = 'web_app';
        menuButton.text = formData.menu_button_text || '菜单';
        menuButton.web_app = { url: formData.web_app_url };
      }
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_button: menuButton })
      });
      const data = await response.json();
      
      if (data.ok) {
        logs.push(`✅ ${modePrefix} 菜单按钮同步成功`);
        return { success: true };
      } else {
        const error = `菜单按钮同步失败: ${data.description || '未知错误'}`;
        logs.push(`❌ ${modePrefix} ${error}`);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMsg = `菜单按钮同步失败: ${error.message}`;
      logs.push(`❌ ${modePrefix} ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}
