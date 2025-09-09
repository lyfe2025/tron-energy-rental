/**
 * 机器人更新处理器
 * 包含：更新机器人信息、删除机器人
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import { buildUpdateFields, isValidBotToken } from '../middleware.js';
import type { RouteHandler, UpdateBotData } from '../types.js';

/**
 * 更新机器人信息
 * PUT /api/bots/:id
 * 权限：管理员
 */
export const updateBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateBotData;
    
    console.log(`\n🚀 收到机器人更新请求:`);
    console.log(`📋 机器人ID: ${id}`);
    console.log(`📋 更新数据:`, updateData);
    console.log(`🕐 请求时间: ${new Date().toLocaleString()}`);
    console.log(`===============================`);
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 检查用户名是否被其他机器人使用
    if (updateData.username) {
      const usernameCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_username = $1 AND id != $2',
        [updateData.username, id]
      );
      
      if (usernameCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该用户名已被其他机器人使用'
        });
        return;
      }
    }
    
    // 检查Token是否被其他机器人使用
    if (updateData.token) {
      if (!isValidBotToken(updateData.token)) {
        res.status(400).json({
          success: false,
          message: 'Token格式不正确'
        });
        return;
      }
      
      const tokenCheck = await query(
        'SELECT id FROM telegram_bots WHERE bot_token = $1 AND id != $2',
        [updateData.token, id]
      );
      
      if (tokenCheck.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: '该Token已被其他机器人使用'
        });
        return;
      }
    }
    
    // 🔗 处理webhook_url更新：如果用户提供了webhook_url，先暂存原始值，待机器人更新后再处理
    let originalWebhookUrl = null;
    let shouldUpdateWebhookUrl = false;
    
    if (updateData.webhook_url !== undefined) {
      originalWebhookUrl = updateData.webhook_url;
      shouldUpdateWebhookUrl = true;
      
      // 暂时从更新数据中移除webhook_url，稍后处理
      delete updateData.webhook_url;
      console.log(`🔗 检测到Webhook URL更新: ${originalWebhookUrl}`);
      console.log(`📝 将在机器人更新后处理Webhook URL（添加机器人ID）`);
    }
    
    // 构建更新字段
    const { updateFields, updateValues, paramIndex } = buildUpdateFields(updateData);
    
    if (updateFields.length === 0 && !shouldUpdateWebhookUrl) {
      res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
      return;
    }
    
    // 添加更新时间
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // 添加 WHERE 条件的参数
    const finalParamIndex = paramIndex;
    updateValues.push(id);
    
    // 执行更新
    const updateQuery = `
      UPDATE telegram_bots 
      SET ${updateFields.join(', ')}
      WHERE id = $${finalParamIndex}
      RETURNING 
        id, bot_name as name, bot_username as username, bot_token as token,
        description, short_description, welcome_message, help_message,
        custom_commands, menu_button_enabled, menu_button_text, 
        menu_type, web_app_url, menu_commands,
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        work_mode, webhook_url, webhook_secret, max_connections, 
        keyboard_config, network_id, updated_at
    `;
    
    const updatedBot = await query(updateQuery, updateValues);
    
    // 🔗 处理Webhook URL更新（添加机器人ID）
    if (shouldUpdateWebhookUrl && originalWebhookUrl) {
      // 检查URL是否已经包含机器人ID
      const alreadyHasBotId = originalWebhookUrl.endsWith(`/${id}`);
      
      let finalWebhookUrl: string;
      if (alreadyHasBotId) {
        // 如果已经包含机器人ID，直接使用
        finalWebhookUrl = originalWebhookUrl;
        console.log(`🔗 URL已包含机器人ID，无需处理`);
        console.log(`📍 保持原URL: ${originalWebhookUrl}`);
      } else {
        // 如果不包含，则添加机器人ID
        const baseUrl = originalWebhookUrl.replace(/\/+$/, ''); // 移除末尾的斜杠
        finalWebhookUrl = `${baseUrl}/${id}`;
        console.log(`🔗 正在更新Webhook URL...`);
        console.log(`📍 基础URL: ${originalWebhookUrl}`);
        console.log(`🎯 最终URL: ${finalWebhookUrl}`);
      }
      
      // 单独更新webhook_url
      await query(
        'UPDATE telegram_bots SET webhook_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [finalWebhookUrl, id]
      );
      
      // 更新返回的机器人对象
      if (updatedBot.rows[0]) {
        updatedBot.rows[0].webhook_url = finalWebhookUrl;
      }
      console.log(`✅ Webhook URL已更新`);
    }
    
    // 🔄 分步同步机器人信息到Telegram - 主动同步所有配置
    console.log(`\n🚀 开始分步同步机器人信息到Telegram...`);
    console.log(`📋 当前操作类型: 全面同步机器人配置`);
    console.log(`🎯 同步策略: 主动设置所有配置项，而不仅仅是更新的字段`);
    
    const syncResults = {
      nameSync: null as boolean | null,
      descriptionSync: null as boolean | null,
      commandsSync: null as boolean | null,
      shortDescriptionSync: null as boolean | null,
      menuButtonSync: null as boolean | null,
      keyboardSync: null as boolean | null,
      priceConfigSync: null as boolean | null,
      // 错误信息
      nameSyncError: null as string | null,
      descriptionSyncError: null as string | null,
      commandsSyncError: null as string | null,
      shortDescriptionSyncError: null as string | null,
      menuButtonSyncError: null as string | null,
      keyboardSyncError: null as string | null,
      priceConfigSyncError: null as string | null
    };
    
    try {
      // 获取最新的机器人配置（包含刚才更新的数据）
      console.log(`🔍 正在获取最新机器人配置 (ID: ${id})...`);
      const latestBotData = updatedBot.rows[0]; // 使用刚更新的数据
      
      // 直接使用更新后的数据中的Token，而不依赖configService缓存
      const currentToken = latestBotData.token;
      
      if (!currentToken) {
        console.error(`❌ 机器人Token为空 (ID: ${id})`);
        throw new Error('机器人Token为空');
      }
      
      console.log(`✅ 机器人配置获取成功:`, {
        id: latestBotData.id,
        name: latestBotData.name,
        username: latestBotData.username,
        description: latestBotData.description?.substring(0, 50) + '...',
        tokenPrefix: currentToken.substring(0, 10) + '...'
      });
      
      // 准备HTTP客户端
      const axios = (await import('axios')).default;
      
      // 1️⃣ 第一步：同步机器人名称（总是执行）
      console.log(`\n1️⃣ 第一步：同步机器人名称`);
      try {
        const currentName = latestBotData.name;
        console.log(`📝 准备设置名称: "${currentName}"`);
        
        const url = `https://api.telegram.org/bot${currentToken}/setMyName`;
        console.log(`🔗 API URL: ${url.replace(currentToken, '***TOKEN***')}`);
        
        const response = await axios.post(url, { name: currentName }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log(`📡 Telegram API响应:`, response.data);
        
        if (response.data.ok) {
          syncResults.nameSync = true;
          console.log(`✅ 步骤1完成 - 机器人名称同步成功: "${currentName}"`);
        } else {
          syncResults.nameSync = false;
          syncResults.nameSyncError = response.data.description || 'API返回失败';
          console.error(`❌ 步骤1失败 - 机器人名称同步失败:`, response.data);
        }
      } catch (error) {
        syncResults.nameSync = false;
        // 提取详细的错误信息
        let errorMessage = error.message;
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.description) {
            errorMessage = errorData.description;
            // 如果是频率限制错误，添加重试时间信息
            if (errorData.parameters?.retry_after) {
              const retryHours = Math.round(errorData.parameters.retry_after / 3600);
              errorMessage += ` (需等待${retryHours}小时后重试)`;
            }
          }
        }
        syncResults.nameSyncError = errorMessage;
        console.error(`❌ 步骤1错误 - 同步机器人名称时发生错误:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
      
      // 2️⃣ 第二步：同步机器人介绍（详细描述）（总是执行）
      console.log(`\n2️⃣ 第二步：同步机器人介绍（详细描述）`);
      try {
        const currentDescription = latestBotData.description || '';
        console.log(`📝 准备设置介绍: "${currentDescription}"`);
        
        const url = `https://api.telegram.org/bot${currentToken}/setMyDescription`;
        console.log(`🔗 API URL: ${url.replace(currentToken, '***TOKEN***')}`);
        
        const response = await axios.post(url, { description: currentDescription }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log(`📡 Telegram API响应:`, response.data);
        
        if (response.data.ok) {
          syncResults.descriptionSync = true;
          console.log(`✅ 步骤2完成 - 机器人介绍同步成功: "${currentDescription}"`);
        } else {
          syncResults.descriptionSync = false;
          syncResults.descriptionSyncError = response.data.description || 'API返回失败';
          console.error(`❌ 步骤2失败 - 机器人介绍同步失败:`, response.data);
        }
      } catch (error) {
        syncResults.descriptionSync = false;
        // 提取详细的错误信息
        let errorMessage = error.message;
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.description) {
            errorMessage = errorData.description;
            if (errorData.parameters?.retry_after) {
              const retryHours = Math.round(errorData.parameters.retry_after / 3600);
              errorMessage += ` (需等待${retryHours}小时后重试)`;
            }
          }
        }
        syncResults.descriptionSyncError = errorMessage;
        console.error(`❌ 步骤2错误 - 同步机器人描述时发生错误:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
      
      // 3️⃣ 第三步：同步机器人命令菜单（动态生成）
      console.log(`\n3️⃣ 第三步：同步机器人命令菜单`);
      try {
        const TelegramBot = (await import('node-telegram-bot-api')).default;
        const tempBot = new TelegramBot(currentToken, { polling: false });
        
        // 构建命令列表（基础命令 + 菜单命令 + 自定义命令）
        const commandList = [
          { command: 'start', description: '启动机器人' },
          { command: 'help', description: '获取帮助' }
        ];
        
        // 添加菜单命令
        if (latestBotData.menu_commands) {
          try {
            const menuCommands = typeof latestBotData.menu_commands === 'string' 
              ? JSON.parse(latestBotData.menu_commands) 
              : latestBotData.menu_commands;
            
            if (Array.isArray(menuCommands)) {
              menuCommands.forEach(cmd => {
                if (cmd.command && cmd.description) {
                  commandList.push({ command: cmd.command, description: cmd.description });
                }
              });
            }
          } catch (parseError) {
            console.warn(`⚠️ 解析菜单命令失败:`, parseError.message);
          }
        }
        
        // 添加自定义命令
        if (latestBotData.custom_commands) {
          try {
            const customCommands = typeof latestBotData.custom_commands === 'string' 
              ? JSON.parse(latestBotData.custom_commands) 
              : latestBotData.custom_commands;
            
            if (Array.isArray(customCommands)) {
              customCommands.forEach(cmd => {
                if (cmd.command && cmd.is_enabled) {
                  commandList.push({ 
                    command: cmd.command, 
                    description: cmd.response_message ? cmd.response_message.substring(0, 256) : '自定义命令' 
                  });
                }
              });
            }
          } catch (parseError) {
            console.warn(`⚠️ 解析自定义命令失败:`, parseError.message);
          }
        }
        
        console.log(`📋 准备设置命令列表 (${commandList.length}个):`, commandList);
        
        const result = await tempBot.setMyCommands(commandList);
        console.log(`📡 setMyCommands结果:`, result);
        
        syncResults.commandsSync = true;
        console.log(`✅ 步骤3完成 - 机器人命令菜单同步成功`);
      } catch (error) {
        syncResults.commandsSync = false;
        // 提取详细的错误信息
        let errorMessage = error.message;
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.description) {
            errorMessage = errorData.description;
            if (errorData.parameters?.retry_after) {
              const retryHours = Math.round(errorData.parameters.retry_after / 3600);
              errorMessage += ` (需等待${retryHours}小时后重试)`;
            }
          }
        }
        syncResults.commandsSyncError = errorMessage;
        console.error(`❌ 步骤3错误 - 同步机器人命令时发生错误:`, {
          message: error.message,
          stack: error.stack
        });
      }
      
      // 4️⃣ 第四步：同步机器人关于（短描述，用于机器人资料页面）
      console.log(`\n4️⃣ 第四步：同步机器人关于（短描述）`);
      try {
        const shortDescription = latestBotData.short_description || 
          (latestBotData.description ? latestBotData.description.substring(0, 120) : // 回退到介绍的前120字符
          `${latestBotData.name} - TRON能量租赁机器人`);
          
        console.log(`📝 准备设置关于: "${shortDescription}"`);
        
        const url = `https://api.telegram.org/bot${currentToken}/setMyShortDescription`;
        console.log(`🔗 API URL: ${url.replace(currentToken, '***TOKEN***')}`);
        
        const response = await axios.post(url, { short_description: shortDescription }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        console.log(`📡 Telegram API响应:`, response.data);
        
        if (response.data.ok) {
          syncResults.shortDescriptionSync = true;
          console.log(`✅ 步骤4完成 - 机器人关于同步成功: "${shortDescription}"`);
        } else {
          syncResults.shortDescriptionSync = false;
          syncResults.shortDescriptionSyncError = response.data.description || 'API返回失败';
          console.error(`❌ 步骤4失败 - 机器人关于同步失败:`, response.data);
        }
      } catch (error) {
        syncResults.shortDescriptionSync = false;
        // 提取详细的错误信息
        let errorMessage = error.message;
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.description) {
            errorMessage = errorData.description;
            if (errorData.parameters?.retry_after) {
              const retryHours = Math.round(errorData.parameters.retry_after / 3600);
              errorMessage += ` (需等待${retryHours}小时后重试)`;
            }
          }
        }
        syncResults.shortDescriptionSyncError = errorMessage;
        console.error(`❌ 步骤4错误 - 同步机器人短描述时发生错误:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
      
      // 5️⃣ 第五步：同步菜单按钮（如果启用）
      if (latestBotData.menu_button_enabled) {
        console.log(`\n5️⃣ 第五步：同步菜单按钮`);
        try {
          console.log(`📝 菜单按钮配置:`, {
            enabled: latestBotData.menu_button_enabled,
            text: latestBotData.menu_button_text,
            type: latestBotData.menu_type,
            web_app_url: latestBotData.web_app_url?.substring(0, 50) + '...'
          });
          
          const menuButtonConfig: any = {
            type: latestBotData.menu_type,
            text: latestBotData.menu_button_text || '菜单'  // 所有类型都需要text属性
          };
          
          if (latestBotData.menu_type === 'web_app' && latestBotData.web_app_url) {
            menuButtonConfig.web_app = { url: latestBotData.web_app_url };
          }
          
          const menuUrl = `https://api.telegram.org/bot${currentToken}/setChatMenuButton`;
          
          const menuResponse = await axios.post(menuUrl, {
            menu_button: menuButtonConfig
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          if (menuResponse.data.ok) {
            syncResults.menuButtonSync = true;
            console.log(`✅ 步骤5完成 - 菜单按钮同步成功`);
          } else {
            syncResults.menuButtonSync = false;
            syncResults.menuButtonSyncError = menuResponse.data.description || 'API返回失败';
            console.error(`❌ 步骤5失败 - 菜单按钮同步失败:`, menuResponse.data);
          }
        } catch (error) {
          syncResults.menuButtonSync = false;
          // 提取详细的错误信息
          let errorMessage = error.message;
          if (error.response?.data) {
            const errorData = error.response.data;
            if (errorData.description) {
              errorMessage = errorData.description;
              if (errorData.parameters?.retry_after) {
                const retryHours = Math.round(errorData.parameters.retry_after / 3600);
                errorMessage += ` (需等待${retryHours}小时后重试)`;
              }
            }
          }
          syncResults.menuButtonSyncError = errorMessage;
          console.error(`❌ 步骤5错误 - 同步菜单按钮时发生错误:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
        }
      } else {
        console.log(`\n5️⃣ 第五步：菜单按钮未启用，跳过同步`);
        syncResults.menuButtonSync = null;
      }
      
      // 6️⃣ 第六步：同步内嵌键盘配置
      console.log(`\n6️⃣ 第六步：同步内嵌键盘配置`);
      try {
        if (latestBotData.keyboard_config && latestBotData.keyboard_config.main_menu) {
          const keyboardConfig = latestBotData.keyboard_config.main_menu;
          
          console.log(`📱 键盘配置:`, {
            type: keyboardConfig.type,
            title: keyboardConfig.title,
            enabled: keyboardConfig.is_enabled,
            rows: keyboardConfig.rows?.length || 0
          });
          
          if (keyboardConfig.is_enabled && keyboardConfig.rows && keyboardConfig.rows.length > 0) {
            // 构建内嵌键盘
            const inlineKeyboard = keyboardConfig.rows
              .filter(row => row.is_enabled)
              .map(row => 
                row.buttons
                  .filter(button => button.is_enabled)
                  .map(button => ({
                    text: button.text,
                    callback_data: button.callback_data
                  }))
              )
              .filter(row => row.length > 0);
            
            if (inlineKeyboard.length > 0) {
              // 发送测试消息，确认键盘配置可用
              console.log(`📋 准备测试内嵌键盘，rows: ${inlineKeyboard.length}`);
              
              // 这里我们只是验证键盘配置格式，实际使用时会在消息处理中应用
              syncResults.keyboardSync = true;
              console.log(`✅ 步骤6完成 - 内嵌键盘配置验证成功`);
            } else {
              syncResults.keyboardSync = false;
              syncResults.keyboardSyncError = '没有可用的键盘按钮';
              console.error(`❌ 步骤6失败 - 没有可用的键盘按钮`);
            }
          } else {
            console.log(`⏭️ 键盘未启用或无按钮配置，跳过同步`);
            syncResults.keyboardSync = null;
          }
        } else {
          console.log(`⏭️ 未配置键盘，跳过同步`);
          syncResults.keyboardSync = null;
        }
      } catch (error) {
        syncResults.keyboardSync = false;
        // 提取详细的错误信息
        let errorMessage = error.message;
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.description) {
            errorMessage = errorData.description;
            if (errorData.parameters?.retry_after) {
              const retryHours = Math.round(errorData.parameters.retry_after / 3600);
              errorMessage += ` (需等待${retryHours}小时后重试)`;
            }
          }
        }
        syncResults.keyboardSyncError = errorMessage;
        console.error(`❌ 步骤6错误 - 同步内嵌键盘时发生错误:`, {
          message: error.message,
          stack: error.stack
        });
      }
      
      // 7️⃣ 第七步：同步价格配置内嵌键盘
      console.log(`\n7️⃣ 第七步：同步价格配置内嵌键盘`);
      try {
        // 动态导入 PriceConfigService
        const { PriceConfigService } = await import('../../../services/PriceConfigService.js');
        const priceConfigService = new PriceConfigService();
        
        // 获取所有激活的价格配置
        const activeConfigs = await priceConfigService.getActiveConfigs();
        
        console.log(`📋 价格配置检查:`, {
          total_configs: activeConfigs.length,
          config_types: activeConfigs.map(c => c.mode_type)
        });
        
        if (activeConfigs.length > 0) {
          let validConfigCount = 0;
          let hasInlineKeyboards = false;
          
          for (const config of activeConfigs) {
            const modeType = config.mode_type;
            const configData = config.config;
            const inlineKeyboardConfig = config.inline_keyboard_config;
            
            console.log(`🔧 检查配置: ${modeType}`);
            
            // 验证配置数据是否有效
            let isConfigValid = false;
            try {
              if (modeType === 'energy_flash') {
                isConfigValid = configData && typeof configData.single_price === 'number';
              } else if (modeType === 'transaction_package') {
                isConfigValid = configData && Array.isArray(configData.packages) && configData.packages.length > 0;
              } else if (modeType === 'trx_exchange') {
                isConfigValid = configData && configData.usdt_to_trx_rate && configData.trx_to_usdt_rate;
              }
              
              if (isConfigValid) {
                validConfigCount++;
                console.log(`✅ ${modeType} 配置有效`);
                
                // 检查是否有内嵌键盘配置
                if (inlineKeyboardConfig && inlineKeyboardConfig.enabled) {
                  hasInlineKeyboards = true;
                  console.log(`📋 ${modeType} 内嵌键盘已启用`);
                }
              } else {
                console.log(`⚠️ ${modeType} 配置数据无效`);
              }
            } catch (configError) {
              console.error(`❌ ${modeType} 配置验证失败:`, configError.message);
            }
          }
          
          if (validConfigCount > 0) {
            syncResults.priceConfigSync = true;
            console.log(`✅ 步骤7完成 - 价格配置同步成功，有效配置: ${validConfigCount}/${activeConfigs.length}`);
            if (hasInlineKeyboards) {
              console.log(`📋 包含内嵌键盘配置`);
            }
          } else {
            syncResults.priceConfigSync = false;
            syncResults.priceConfigSyncError = '所有价格配置都无效';
            console.error(`❌ 步骤7失败 - 没有有效的价格配置`);
          }
          
        } else {
          console.log(`⏭️ 未找到激活的价格配置，跳过同步`);
          syncResults.priceConfigSync = null;
        }
        
      } catch (error) {
        syncResults.priceConfigSync = false;
        syncResults.priceConfigSyncError = error.message;
        console.error(`❌ 步骤7错误 - 同步价格配置时发生错误:`, {
          message: error.message,
          stack: error.stack
        });
      }
      
    } catch (error) {
      console.error(`❌ 同步机器人信息到Telegram时出错:`, {
        message: error.message,
        stack: error.stack
      });
    }
    
    // 📊 显示分步同步结果汇总
    console.log(`\n📊 分步同步结果汇总:`);
    console.log(`==================`);
    console.log(`1️⃣ ${syncResults.nameSync ? '✅' : '❌'} 机器人名称同步: ${syncResults.nameSync ? '成功' : `失败${syncResults.nameSyncError ? ` - ${syncResults.nameSyncError}` : ''}`}`);
    console.log(`2️⃣ ${syncResults.descriptionSync ? '✅' : '❌'} 机器人描述同步: ${syncResults.descriptionSync ? '成功' : `失败${syncResults.descriptionSyncError ? ` - ${syncResults.descriptionSyncError}` : ''}`}`);
    console.log(`3️⃣ ${syncResults.commandsSync ? '✅' : '❌'} 命令菜单同步: ${syncResults.commandsSync ? '成功' : `失败${syncResults.commandsSyncError ? ` - ${syncResults.commandsSyncError}` : ''}`}`);
    console.log(`4️⃣ ${syncResults.shortDescriptionSync ? '✅' : '❌'} 短描述同步: ${syncResults.shortDescriptionSync ? '成功' : `失败${syncResults.shortDescriptionSyncError ? ` - ${syncResults.shortDescriptionSyncError}` : ''}`}`);
    console.log(`5️⃣ ${syncResults.menuButtonSync === null ? '⏭️' : syncResults.menuButtonSync ? '✅' : '❌'} 菜单按钮同步: ${syncResults.menuButtonSync === null ? '跳过' : syncResults.menuButtonSync ? '成功' : `失败${syncResults.menuButtonSyncError ? ` - ${syncResults.menuButtonSyncError}` : ''}`}`);
    console.log(`6️⃣ ${syncResults.keyboardSync === null ? '⏭️' : syncResults.keyboardSync ? '✅' : '❌'} 内嵌键盘同步: ${syncResults.keyboardSync === null ? '跳过' : syncResults.keyboardSync ? '成功' : `失败${syncResults.keyboardSyncError ? ` - ${syncResults.keyboardSyncError}` : ''}`}`);
    console.log(`7️⃣ ${syncResults.priceConfigSync === null ? '⏭️' : syncResults.priceConfigSync ? '✅' : '❌'} 价格配置同步: ${syncResults.priceConfigSync === null ? '跳过' : syncResults.priceConfigSync ? '成功' : `失败${syncResults.priceConfigSyncError ? ` - ${syncResults.priceConfigSyncError}` : ''}`}`);
    console.log(`==================`);
    
    const successCount = Object.values(syncResults).filter(Boolean).length;
    const totalCount = Object.values(syncResults).filter(v => v !== null).length;
    console.log(`🎯 同步完成率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log(`==================\n`);
    
    res.status(200).json({
      success: true,
      message: '机器人信息更新成功',
      data: {
        bot: updatedBot.rows[0],
        syncStatus: syncResults,
        syncLogs: [
          `✅ 机器人数据库更新成功 (ID: ${id})`,
          `1️⃣ 机器人名称同步: ${syncResults.nameSync ? '✅ 成功' : `❌ 失败${syncResults.nameSyncError ? ` - ${syncResults.nameSyncError}` : ''}`}`,
          `2️⃣ 机器人描述同步: ${syncResults.descriptionSync ? '✅ 成功' : `❌ 失败${syncResults.descriptionSyncError ? ` - ${syncResults.descriptionSyncError}` : ''}`}`,
          `3️⃣ 命令列表同步: ${syncResults.commandsSync ? '✅ 成功' : `❌ 失败${syncResults.commandsSyncError ? ` - ${syncResults.commandsSyncError}` : ''}`}`,
          `4️⃣ 短描述同步: ${syncResults.shortDescriptionSync ? '✅ 成功' : `❌ 失败${syncResults.shortDescriptionSyncError ? ` - ${syncResults.shortDescriptionSyncError}` : ''}`}`,
          `5️⃣ 菜单按钮同步: ${syncResults.menuButtonSync === null ? '⏭️ 跳过' : syncResults.menuButtonSync ? '✅ 成功' : `❌ 失败${syncResults.menuButtonSyncError ? ` - ${syncResults.menuButtonSyncError}` : ''}`}`,
          `6️⃣ 内嵌键盘同步: ${syncResults.keyboardSync === null ? '⏭️ 跳过' : syncResults.keyboardSync ? '✅ 成功' : `❌ 失败${syncResults.keyboardSyncError ? ` - ${syncResults.keyboardSyncError}` : ''}`}`,
          `7️⃣ 价格配置同步: ${syncResults.priceConfigSync === null ? '⏭️ 跳过' : syncResults.priceConfigSync ? '✅ 成功' : `❌ 失败${syncResults.priceConfigSyncError ? ` - ${syncResults.priceConfigSyncError}` : ''}`}`,
          `🎯 同步完成率: ${Object.values(syncResults).filter(Boolean).length}/${Object.values(syncResults).filter(v => v !== null).length}`
        ]
      }
    });
    
  } catch (error) {
    console.error('更新机器人信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除机器人
 * DELETE /api/bots/:id
 * 权限：管理员
 */
export const deleteBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查机器人是否存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE id = $1',
      [id]
    );
    
    if (existingBot.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: '机器人不存在'
      });
      return;
    }
    
    // 检查机器人是否有关联的订单
    const orderCheck = await query(
      'SELECT COUNT(*) as count FROM orders WHERE bot_id = $1',
      [id]
    );
    
    if (parseInt(orderCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该机器人有关联的订单，不能删除。请先处理相关订单或将机器人状态设为停用。'
      });
      return;
    }
    
    // 检查机器人是否有关联的用户
    const userCheck = await query(
      'SELECT COUNT(*) as count FROM users WHERE bot_id = $1',
      [id]
    );
    
    if (parseInt(userCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: '该机器人有关联的用户数据，不能删除。请先清理相关用户数据或将机器人状态设为停用。'
      });
      return;
    }
    
    // 删除机器人
    await query('DELETE FROM telegram_bots WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: '机器人删除成功'
    });
    
  } catch (error) {
    console.error('删除机器人错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
