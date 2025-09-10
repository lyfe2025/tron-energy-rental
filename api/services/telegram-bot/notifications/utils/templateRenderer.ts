/**
 * 模板渲染工具
 * 负责消息模板的渲染和变量替换
 */

import type { MessageTemplate } from '../../types/notification.types.js';

/**
 * 渲染模板内容
 */
export async function renderTemplate(template: MessageTemplate, data: any): Promise<any> {
  let content = template.content;
  
  // 替换变量
  if (template.variables && Array.isArray(template.variables)) {
    template.variables.forEach((variable: any) => {
      const value = data[variable.name] || '';
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });
  }

  // 处理按钮
  let replyMarkup = null;
  if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
    replyMarkup = {
      inline_keyboard: template.buttons.map((row: any) => {
      return Array.isArray(row) ? row.map((button: any) => {
        let buttonData: any = {
          text: replaceVariables(button.text, data)
        };

        if (button.type === 'callback_data') {
          buttonData.callback_data = replaceVariables(button.value, data);
        } else if (button.type === 'url') {
          buttonData.url = replaceVariables(button.value, data);
        }

        return buttonData;
      }) : [row];
      })
    };
  }

  return {
    text: content,
    parse_mode: template.parse_mode || 'Markdown',
    reply_markup: replyMarkup,
    image_url: data.image_url || null
  };
}

/**
 * 替换变量
 */
export function replaceVariables(text: string, data: any): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    return data[variableName] || match;
  });
}

/**
 * 验证模板变量
 */
export function validateTemplateVariables(template: MessageTemplate, data: any): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (template.variables && Array.isArray(template.variables)) {
    template.variables.forEach((variable: any) => {
      if (variable.required && !data[variable.name]) {
        missing.push(variable.name);
      }
    });
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 格式化消息内容（处理Markdown特殊字符）
 */
export function formatMessageContent(content: string, parseMode: string = 'Markdown'): string {
  if (parseMode === 'Markdown') {
    // 转义Markdown特殊字符
    return content
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }
  
  return content;
}

/**
 * 生成预览内容
 */
export function generatePreview(template: MessageTemplate, sampleData: any = {}): string {
  const defaultData = {
    user_name: '用户名',
    order_id: 'ORD123456',
    amount: '100.00',
    trx_amount: '1000',
    energy_amount: '50000',
    transaction_hash: 'abc123def456...',
    commission: '5.00',
    balance: '500.00',
    ...sampleData
  };

  let preview = template.content;
  
  // 替换变量
  if (template.variables && Array.isArray(template.variables)) {
    template.variables.forEach((variable: any) => {
      const value = defaultData[variable.name] || `{${variable.name}}`;
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      preview = preview.replace(regex, value);
    });
  }

  return preview;
}
