/**
 * 机器人网络配置管理路由
 * 包含：机器人与TRON网络的关联配置管理
 * 
 * 注意：此文件已经过模块化重构，原始内容已备份到 network-config.ts.backup
 * 实际的业务逻辑现在分布在 network-config/ 目录下的不同控制器中
 */

// 直接导入并重新导出分离后的模块化路由
export { default } from './network-config/index.ts';
