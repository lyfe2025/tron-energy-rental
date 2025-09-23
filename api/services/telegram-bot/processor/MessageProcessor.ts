/**
 * 消息处理器核心
 * 负责处理所有类型的消息并路由到相应的处理器
 */
import { CommandProcessor } from './CommandProcessor.ts';
import { TextMessageHandler } from './handlers/TextMessageHandler.ts';
import type {
    MessageHandler,
    MessageProcessResult,
    ProcessorDependencies
} from './types.ts';

export class MessageProcessor implements MessageHandler {
  private commandProcessor: CommandProcessor;
  private textMessageHandler: TextMessageHandler;
  private dependencies: ProcessorDependencies;

  constructor(dependencies: ProcessorDependencies) {
    this.dependencies = dependencies;
    this.commandProcessor = new CommandProcessor(dependencies);
    this.textMessageHandler = new TextMessageHandler(dependencies);
  }

  /**
   * 更新依赖
   */
  updateDependencies(dependencies: Partial<ProcessorDependencies>): void {
    this.dependencies = { ...this.dependencies, ...dependencies };
    this.commandProcessor.updateDependencies(this.dependencies);
    this.textMessageHandler.updateDependencies(this.dependencies);
  }

  /**
   * 处理消息（支持webhook和polling两种模式）
   */
  async processMessage(message: any): Promise<MessageProcessResult> {
    try {
      const isCommand = message.text && message.text.startsWith('/');
      
      console.log('📨 处理消息:', {
        chatId: message.chat.id,
        text: message.text?.substring(0, 50),
        isCommand,
        from: message.from?.username
      });

      // 记录用户消息
      await this.dependencies.logger.logBotActivity(
        'info', 
        'user_message_received', 
        `用户消息: ${message.text?.substring(0, 100)}`, 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          username: message.from?.username,
          messageType: isCommand ? 'command' : 'text',
          messageLength: message.text?.length || 0
        }
      );

      // 根据消息类型分发处理
      if (isCommand) {
        // 处理命令
        const command = message.text.split(' ')[0].substring(1);
        return await this.commandProcessor.handleCommand(command, message);
      } else if (message.text) {
        // 处理普通文本消息
        return await this.textMessageHandler.handleTextMessage(message);
      } else if (message.photo) {
        // 处理图片消息
        return await this.handlePhotoMessage(message);
      } else if (message.document) {
        // 处理文档消息
        return await this.handleDocumentMessage(message);
      } else {
        // 处理其他类型消息
        return await this.handleOtherMessage(message);
      }

    } catch (error) {
      console.error('❌ 处理消息失败:', error);
      
      await this.dependencies.logger.logBotActivity(
        'error', 
        'message_processing_failed', 
        `消息处理失败: ${error.message}`, 
        {
          error: error.stack,
          message
        }
      );

      return { 
        success: false, 
        error: error as Error,
        action: 'message_error',
        description: '消息处理失败'
      };
    }
  }

  /**
   * 处理图片消息
   */
  private async handlePhotoMessage(message: any): Promise<MessageProcessResult> {
    try {
      console.log('🖼️ 处理图片消息:', {
        chatId: message.chat.id,
        photoCount: message.photo?.length || 0,
        caption: message.caption?.substring(0, 50)
      });

      await this.dependencies.logger.logBotActivity(
        'info', 
        'photo_message_received', 
        '收到图片消息', 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          photoCount: message.photo?.length || 0,
          caption: message.caption
        }
      );

      // 暂时只回复确认消息
      await this.dependencies.api.sendMessage(
        message.chat.id,
        '收到您的图片！目前暂不支持图片处理功能。\n\n发送 /menu 查看可用功能'
      );

      return { 
        success: true, 
        action: 'photo_response',
        description: '图片消息已处理'
      };

    } catch (error) {
      console.error('❌ 处理图片消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理文档消息
   */
  private async handleDocumentMessage(message: any): Promise<MessageProcessResult> {
    try {
      console.log('📄 处理文档消息:', {
        chatId: message.chat.id,
        fileName: message.document?.file_name,
        fileSize: message.document?.file_size
      });

      await this.dependencies.logger.logBotActivity(
        'info', 
        'document_message_received', 
        '收到文档消息', 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          fileName: message.document?.file_name,
          fileSize: message.document?.file_size,
          mimeType: message.document?.mime_type
        }
      );

      // 暂时只回复确认消息
      await this.dependencies.api.sendMessage(
        message.chat.id,
        '收到您的文档！目前暂不支持文档处理功能。\n\n发送 /menu 查看可用功能'
      );

      return { 
        success: true, 
        action: 'document_response',
        description: '文档消息已处理'
      };

    } catch (error) {
      console.error('❌ 处理文档消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理其他类型消息
   */
  private async handleOtherMessage(message: any): Promise<MessageProcessResult> {
    try {
      const messageType = this.getMessageType(message);
      
      console.log('🔄 处理其他消息:', {
        chatId: message.chat.id,
        messageType
      });

      await this.dependencies.logger.logBotActivity(
        'info', 
        'other_message_received', 
        `收到${messageType}消息`, 
        {
          chatId: message.chat.id,
          userId: message.from?.id,
          messageType
        }
      );

      // 回复不支持的消息类型
      await this.dependencies.api.sendMessage(
        message.chat.id,
        `暂不支持${messageType}类型的消息。\n\n发送 /menu 查看可用功能`
      );

      return { 
        success: true, 
        action: 'unsupported_message_response',
        description: `${messageType}消息已处理`
      };

    } catch (error) {
      console.error('❌ 处理其他消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息类型
   */
  private getMessageType(message: any): string {
    if (message.audio) return '音频';
    if (message.voice) return '语音';
    if (message.video) return '视频';
    if (message.video_note) return '视频笔记';
    if (message.animation) return '动画';
    if (message.sticker) return '贴纸';
    if (message.location) return '位置';
    if (message.contact) return '联系人';
    if (message.poll) return '投票';
    if (message.venue) return '地点';
    if (message.dice) return '骰子';
    return '未知';
  }

  /**
   * 获取命令处理器（用于直接调用）
   */
  getCommandProcessor(): CommandProcessor {
    return this.commandProcessor;
  }

  /**
   * 获取文本消息处理器（用于直接调用）
   */
  getTextMessageHandler(): TextMessageHandler {
    return this.textMessageHandler;
  }
}
