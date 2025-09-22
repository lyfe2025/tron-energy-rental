// 重新导出分离后的模块以保持兼容性
export * from './payment/index';
export { paymentService };

// 保持原来的导入方式兼容性 - 默认导出paymentService实例
  import { paymentService } from './payment/index';
export default paymentService;