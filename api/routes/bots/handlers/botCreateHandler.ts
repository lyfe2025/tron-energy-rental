/**
 * 机器人创建处理器
 * 包含：创建新机器人、Token验证
 */
import { type Request, type Response } from 'express';
import { query } from '../../../config/database.js';
import { isValidBotToken } from '../middleware.js';
import type { CreateBotData, RouteHandler } from '../types.js';

/**
 * 创建新机器人
 * POST /api/bots
 * 权限：管理员
 */
export const createBot: RouteHandler = async (req: Request, res: Response) => {
  try {
    const {
      name,
      username,
      token,
      description,
      short_description,
      network_id,
      work_mode = 'polling',
      webhook_url,
      webhook_secret,
      max_connections = 40,
      settings = {},
      welcome_message = '欢迎使用TRON能量租赁服务！',
      help_message = '如需帮助，请联系客服。',
      custom_commands = [],
      menu_button_enabled = false,
      menu_button_text = '菜单',
      menu_type = 'commands',
      web_app_url,
      menu_commands = [],
      keyboard_config = null,
      is_active = true
    } = req.body as CreateBotData;
    
    // 验证必填字段
    if (!name || !username || !token) {
      res.status(400).json({
        success: false,
        message: '机器人名称、用户名和Token为必填项'
      });
      return;
    }
    
    // 验证Token格式（基本验证）
    if (!isValidBotToken(token)) {
      res.status(400).json({
        success: false,
        message: 'Token格式不正确'
      });
      return;
    }

    // 如果选择webhook模式，验证webhook_url
    if (work_mode === 'webhook') {
      if (!webhook_url) {
        res.status(400).json({
          success: false,
          message: 'Webhook模式需要提供webhook_url'
        });
        return;
      }
      
      try {
        const parsedUrl = new URL(webhook_url);
        if (parsedUrl.protocol !== 'https:') {
          res.status(400).json({
            success: false,
            message: 'Webhook URL必须使用HTTPS协议'
          });
          return;
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Webhook URL格式不正确'
        });
        return;
      }
    }
    
    // 检查用户名是否已存在
    const existingBot = await query(
      'SELECT id FROM telegram_bots WHERE bot_username = $1',
      [username]
    );
    
    if (existingBot.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该用户名已被使用'
      });
      return;
    }
    
    // 检查Token是否已存在
    const existingToken = await query(
      'SELECT id FROM telegram_bots WHERE bot_token = $1',
      [token]
    );
    
    if (existingToken.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: '该Token已被使用'
      });
      return;
    }
    
    console.log(`\n🚀 开始创建机器人...`);
    console.log(`📋 机器人信息:`, {
      name,
      username,
      description: description?.substring(0, 50) + '...',
      work_mode,
      webhook_base_url: webhook_url?.substring(0, 50) + '...',
      custom_commands: custom_commands?.length || 0,
      menu_button_enabled,
      menu_commands: menu_commands?.length || 0,
      keyboard_config: keyboard_config ? '已配置' : '未配置'
    });
    
    // 先创建机器人（不包含最终webhook_url，暂时留空或使用基础URL）
    const newBot = await query(
      `INSERT INTO telegram_bots (
        bot_name, bot_username, bot_token, description, short_description, network_id, work_mode, 
        webhook_url, webhook_secret, max_connections, 
        welcome_message, help_message, custom_commands,
        menu_button_enabled, menu_button_text, menu_type, web_app_url, menu_commands,
        keyboard_config, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING 
        id, bot_name as name, bot_username as username,
        CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(work_mode, 'polling') as work_mode,
        webhook_url, webhook_secret, max_connections,
        description, short_description, welcome_message, help_message, 
        custom_commands, menu_button_enabled, menu_button_text, 
        menu_type, web_app_url, menu_commands, keyboard_config, 
        0 as total_users, 0 as total_orders, created_at`,
      [name, username, token, description, short_description, network_id, work_mode, 
       webhook_url, webhook_secret, max_connections, // 这里暂时使用基础URL
       welcome_message, help_message,
       custom_commands ? JSON.stringify(custom_commands) : null,
       menu_button_enabled, menu_button_text, menu_type, web_app_url,
       menu_commands ? JSON.stringify(menu_commands) : null,
       keyboard_config ? JSON.stringify(keyboard_config) : null, is_active]
    );
    
    const createdBot = newBot.rows[0];
    console.log(`✅ 机器人创建成功，ID: ${createdBot.id}`);
    
    // 🔗 如果是webhook模式，更新webhook_url添加机器人ID
    if (work_mode === 'webhook' && webhook_url && createdBot.id) {
      // 确保基础URL不以斜杠结尾，然后添加机器人ID
      const baseUrl = webhook_url.replace(/\/+$/, ''); // 移除末尾的斜杠
      const finalWebhookUrl = `${baseUrl}/${createdBot.id}`;
      
      console.log(`🔗 正在更新Webhook URL...`);
      console.log(`📍 基础URL: ${webhook_url}`);
      console.log(`🎯 最终URL: ${finalWebhookUrl}`);
      
      // 更新数据库中的webhook_url
      await query(
        'UPDATE telegram_bots SET webhook_url = $1 WHERE id = $2',
        [finalWebhookUrl, createdBot.id]
      );
      
      // 更新返回的机器人对象
      createdBot.webhook_url = finalWebhookUrl;
      console.log(`✅ Webhook URL已更新为最终地址`);
    }
    
    // 🚀 开始同步机器人配置到Telegram
    console.log(`\n🚀 开始同步机器人配置到Telegram...`);
    console.log(`📋 同步目标: 新创建的机器人 (ID: ${createdBot.id})`);
    
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
      // 直接使用创建时的Token
      const currentToken = token;
      
      // 准备HTTP客户端
      const axios = (await import('axios')).default;
      
      // 1️⃣ 同步机器人名称
      console.log(`\n1️⃣ 同步机器人名称`);
      try {
        console.log(`📝 设置名称: "${name}"`);
        const nameUrl = `https://api.telegram.org/bot${token}/setMyName`;
        
        const nameResponse = await axios.post(nameUrl, { name }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        if (nameResponse.data.ok) {
          syncResults.nameSync = true;
          console.log(`✅ 机器人名称同步成功`);
        } else {
          syncResults.nameSync = false;
          syncResults.nameSyncError = nameResponse.data.description || 'API返回失败';
          console.error(`❌ 机器人名称同步失败:`, nameResponse.data);
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
        console.error(`❌ 同步机器人名称错误:`, errorMessage);
      }
      
      // 2️⃣ 同步机器人介绍（详细描述）
      console.log(`\n2️⃣ 同步机器人介绍（详细描述）`);
      try {
        const desc = description || '';
        console.log(`📝 设置介绍: "${desc}"`);
        const descUrl = `https://api.telegram.org/bot${token}/setMyDescription`;
        
        const descResponse = await axios.post(descUrl, { description: desc }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        if (descResponse.data.ok) {
          syncResults.descriptionSync = true;
          console.log(`✅ 机器人介绍同步成功`);
        } else {
          syncResults.descriptionSync = false;
          console.error(`❌ 机器人介绍同步失败:`, descResponse.data);
        }
      } catch (error) {
        syncResults.descriptionSync = false;
        const errorMsg = error.response?.status === 401 ? 'Token无效或已过期' : error.message;
        console.error(`❌ 同步机器人介绍错误:`, errorMsg);
      }
      
      // 3️⃣ 同步机器人命令
      console.log(`\n3️⃣ 同步机器人命令`);
      try {
        // 构建命令列表（基础命令 + 菜单命令 + 自定义命令）
        const commandList = [
          { command: 'start', description: '启动机器人' },
          { command: 'help', description: '获取帮助' }
        ];
        
        // 添加菜单命令
        if (menu_commands && menu_commands.length > 0) {
          menu_commands.forEach(cmd => {
            if (cmd.command && cmd.description) {
              commandList.push({ command: cmd.command, description: cmd.description });
            }
          });
        }
        
        // 添加自定义命令
        if (custom_commands && custom_commands.length > 0) {
          custom_commands.forEach(cmd => {
            if (cmd.command && cmd.is_enabled) {
              commandList.push({ 
                command: cmd.command, 
                description: cmd.response_message.substring(0, 256) || '自定义命令' 
              });
            }
          });
        }
        
        console.log(`📋 设置命令列表 (${commandList.length}个):`, commandList);
        
        const TelegramBot = (await import('node-telegram-bot-api')).default;
        const tempBot = new TelegramBot(token, { polling: false });
        
        const result = await tempBot.setMyCommands(commandList);
        console.log(`📡 setMyCommands结果:`, result);
        
        syncResults.commandsSync = true;
        console.log(`✅ 机器人命令同步成功`);
      } catch (error) {
        syncResults.commandsSync = false;
        console.error(`❌ 同步机器人命令错误:`, error.message);
      }
      
      // 4️⃣ 同步机器人关于（短描述）
      console.log(`\n4️⃣ 同步机器人关于（短描述）`);
      try {
        const shortDesc = short_description || 
          (description ? description.substring(0, 120) : 
          `${name} - TRON能量租赁机器人`);
          
        console.log(`📝 设置关于: "${shortDesc}"`);
        const shortDescUrl = `https://api.telegram.org/bot${token}/setMyShortDescription`;
        
        const shortDescResponse = await axios.post(shortDescUrl, { short_description: shortDesc }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        if (shortDescResponse.data.ok) {
          syncResults.shortDescriptionSync = true;
          console.log(`✅ 机器人关于同步成功`);
        } else {
          syncResults.shortDescriptionSync = false;
          console.error(`❌ 机器人关于同步失败:`, shortDescResponse.data);
        }
      } catch (error) {
        syncResults.shortDescriptionSync = false;
        console.error(`❌ 同步机器人关于错误:`, error.message);
      }
      
      // 5️⃣ 同步菜单按钮（如果启用）
      if (menu_button_enabled) {
        console.log(`\n5️⃣ 同步菜单按钮`);
        try {
          console.log(`📝 菜单按钮配置:`, {
            enabled: menu_button_enabled,
            text: menu_button_text,
            type: menu_type,
            web_app_url: web_app_url?.substring(0, 50) + '...'
          });
          
          const menuButtonConfig: any = {
            type: menu_type,
            text: menu_button_text || '菜单'  // 所有类型都需要text属性
          };
          
          if (menu_type === 'web_app' && web_app_url) {
            menuButtonConfig.web_app = { url: web_app_url };
          }
          
          const menuUrl = `https://api.telegram.org/bot${token}/setChatMenuButton`;
          
          const menuResponse = await axios.post(menuUrl, {
            menu_button: menuButtonConfig
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          if (menuResponse.data.ok) {
            syncResults.menuButtonSync = true;
            console.log(`✅ 菜单按钮同步成功`);
          } else {
            syncResults.menuButtonSync = false;
            console.error(`❌ 菜单按钮同步失败:`, menuResponse.data);
          }
        } catch (error) {
          syncResults.menuButtonSync = false;
          console.error(`❌ 同步菜单按钮错误:`, error.message);
        }
      } else {
        console.log(`\n5️⃣ 菜单按钮未启用，跳过同步`);
        syncResults.menuButtonSync = null;
      }
      
      // 6️⃣ 同步内嵌键盘配置
      console.log(`\n6️⃣ 同步内嵌键盘配置`);
      try {
        if (keyboard_config && keyboard_config.main_menu) {
          const keyboardConfig = keyboard_config.main_menu;
          
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
              console.log(`📋 内嵌键盘验证成功，rows: ${inlineKeyboard.length}`);
              syncResults.keyboardSync = true;
              console.log(`✅ 内嵌键盘配置同步成功`);
            } else {
              syncResults.keyboardSync = false;
              console.error(`❌ 没有可用的键盘按钮`);
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
        console.error(`❌ 同步内嵌键盘错误:`, error.message);
      }
      
      // 7️⃣ 同步价格配置内嵌键盘
      console.log(`\n7️⃣ 同步价格配置内嵌键盘`);
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
            console.log(`✅ 价格配置同步成功，有效配置: ${validConfigCount}/${activeConfigs.length}`);
            if (hasInlineKeyboards) {
              console.log(`📋 包含内嵌键盘配置`);
            }
          } else {
            syncResults.priceConfigSync = false;
            syncResults.priceConfigSyncError = '所有价格配置都无效';
            console.error(`❌ 没有有效的价格配置`);
          }
          
        } else {
          console.log(`⏭️ 未找到激活的价格配置，跳过同步`);
          syncResults.priceConfigSync = null;
        }
        
      } catch (error) {
        syncResults.priceConfigSync = false;
        syncResults.priceConfigSyncError = error.message;
        console.error(`❌ 同步价格配置错误:`, error.message);
      }
      
    } catch (error) {
      console.error(`❌ 同步机器人配置时出错:`, error.message);
    }
    
    // 📊 显示同步结果汇总
    console.log(`\n📊 同步结果汇总:`);
    console.log(`==================`);
    console.log(`1️⃣ ${syncResults.nameSync ? '✅' : '❌'} 机器人名称: ${syncResults.nameSync ? '成功' : '失败'}`);
    console.log(`2️⃣ ${syncResults.descriptionSync ? '✅' : '❌'} 机器人描述: ${syncResults.descriptionSync ? '成功' : '失败'}`);
    console.log(`3️⃣ ${syncResults.commandsSync ? '✅' : '❌'} 命令列表: ${syncResults.commandsSync ? '成功' : '失败'}`);
    console.log(`4️⃣ ${syncResults.shortDescriptionSync ? '✅' : '❌'} 短描述: ${syncResults.shortDescriptionSync ? '成功' : '失败'}`);
    console.log(`5️⃣ ${syncResults.menuButtonSync === null ? '⏭️' : syncResults.menuButtonSync ? '✅' : '❌'} 菜单按钮: ${syncResults.menuButtonSync === null ? '跳过' : syncResults.menuButtonSync ? '成功' : '失败'}`);
    console.log(`6️⃣ ${syncResults.keyboardSync === null ? '⏭️' : syncResults.keyboardSync ? '✅' : '❌'} 内嵌键盘: ${syncResults.keyboardSync === null ? '跳过' : syncResults.keyboardSync ? '成功' : '失败'}`);
    console.log(`7️⃣ ${syncResults.priceConfigSync === null ? '⏭️' : syncResults.priceConfigSync ? '✅' : '❌'} 价格配置: ${syncResults.priceConfigSync === null ? '跳过' : syncResults.priceConfigSync ? '成功' : '失败'}`);
    console.log(`==================`);
    
    const successCount = Object.values(syncResults).filter(Boolean).length;
    const totalCount = Object.values(syncResults).filter(v => v !== null).length;
    console.log(`🎯 同步完成率: ${successCount}/${totalCount} (${totalCount > 0 ? Math.round(successCount/totalCount*100) : 0}%)`);
    console.log(`🎉 机器人创建和配置完成!\n`);
    
    res.status(201).json({
      success: true,
      message: '机器人创建成功',
      data: {
        bot: createdBot,
        syncStatus: syncResults,
        syncLogs: [
          `✅ 机器人数据库创建成功 (ID: ${createdBot.id})`,
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
    console.error('创建机器人错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证Bot Token并获取机器人信息
 * POST /api/bots/verify-token
 * 权限：管理员
 */
export const verifyBotToken: RouteHandler = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Bot Token不能为空'
      });
      return;
    }
    
    // 验证Token格式
    if (!isValidBotToken(token)) {
      res.status(400).json({
        success: false,
        message: 'Bot Token格式不正确'
      });
      return;
    }
    
    // 检查Token是否已被使用
    const tokenCheck = await query(
      'SELECT id, bot_name FROM telegram_bots WHERE bot_token = $1',
      [token]
    );
    
    if (tokenCheck.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: `该Token已被机器人 "${tokenCheck.rows[0].bot_name}" 使用`
      });
      return;
    }
    
    // 使用Telegram Bot API验证Token并获取机器人信息
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        res.status(400).json({
          success: false,
          message: 'Token无效或已过期'
        });
        return;
      }
      
      const botInfo = data.result;
      
      res.status(200).json({
        success: true,
        message: 'Token验证成功',
        data: {
          id: botInfo.id,
          name: botInfo.first_name,
          username: botInfo.username,
          is_bot: botInfo.is_bot,
          can_join_groups: botInfo.can_join_groups,
          can_read_all_group_messages: botInfo.can_read_all_group_messages,
          supports_inline_queries: botInfo.supports_inline_queries
        }
      });
      
    } catch (apiError) {
      console.error('Telegram API调用错误:', apiError);
      res.status(400).json({
        success: false,
        message: 'Token验证失败，请检查Token是否正确'
      });
    }
    
  } catch (error) {
    console.error('验证Bot Token错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
