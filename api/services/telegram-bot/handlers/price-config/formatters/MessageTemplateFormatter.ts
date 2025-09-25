/**
 * 消息模板格式化器
 * 从PriceConfigMessageHandler中分离出的模板格式化逻辑
 */

export class MessageTemplateFormatter {
  /**
   * 格式化主消息模板，支持占位符替换和计算表达式
   */
  static formatMainMessageTemplate(template: string, variables: { [key: string]: any }): string {
    let result = template;
    
    // 先处理计算表达式（price*2, price*3等）
    result = result.replace(/\{price\*(\d+)\}/g, (match, multiplier) => {
      const price = variables.price || 0;
      const result = price * parseInt(multiplier);
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\/(\d+)\}/g, (match, divisor) => {
      const price = variables.price || 0;
      const div = parseInt(divisor);
      const result = div > 0 ? price / div : price;
      return Number(result.toFixed(8)).toString();
    });
    
    result = result.replace(/\{price\+(\d+)\}/g, (match, addend) => {
      const price = variables.price || 0;
      return (price + parseInt(addend)).toString();
    });
    
    result = result.replace(/\{price\-(\d+)\}/g, (match, subtrahend) => {
      const price = variables.price || 0;
      return (price - parseInt(subtrahend)).toString();
    });
    
    // 处理其他变量的计算表达式
    result = result.replace(/\{maxTransactions\*(\d+)\}/g, (match, multiplier) => {
      const maxTransactions = variables.maxTransactions || 0;
      return (maxTransactions * parseInt(multiplier)).toString();
    });
    
    // 最后处理基础变量替换
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      let replacementValue = value?.toString() || '0';
      
      // 特殊处理支付地址 - 在Telegram中使用monospace格式让用户可以点击复制
      if (key === 'paymentAddress' && replacementValue && replacementValue !== '0') {
        replacementValue = `\`${replacementValue}\``;
      }
      
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacementValue);
    }
    
    return result;
  }

  /**
   * 生成指定数量的换行符
   */
  static generateLineBreaks(count: number): string {
    return count > 0 ? '\n'.repeat(count) : '';
  }
}
