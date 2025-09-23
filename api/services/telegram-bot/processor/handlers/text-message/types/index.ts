/**
 * Text Message Handler 类型定义
 */
import type {
  MessageProcessResult,
  PriceConfig,
  ProcessorDependencies,
  TemplateVariables
} from '../../../types.ts';

// 从主类型文件导出已有类型
export type {
  MessageProcessResult,
  PriceConfig, ProcessorDependencies, TemplateVariables
};

// 按钮处理相关类型
export interface ButtonHandlerResult {
  success: boolean;
  processed: boolean;
  error?: Error;
  action?: string;
  description?: string;
}

// 价格配置处理相关类型
export interface PriceConfigHandlerOptions {
  configType: string;
  buttonText: string;
  message: any;
}

// 消息匹配相关类型
export interface CallbackDataMapping {
  buttonText: string;
  callbackData: string;
}
