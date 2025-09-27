/**
 * 定时任务系统测试脚本
 * 用于验证新的动态任务架构是否正常工作
 */

import { logger } from '../../utils/logger';
import { SchedulerService } from '../scheduler';
import { taskRegistry } from './TaskRegistry';
import { getAllTaskHandlers } from './handlers';

/**
 * 测试任务注册器功能
 */
async function testTaskRegistry(): Promise<boolean> {
  try {
    logger.info('🧪 测试任务注册器功能...');
    
    // 清空注册器
    taskRegistry.clear();
    
    // 注册所有内置任务处理器
    const handlers = getAllTaskHandlers();
    taskRegistry.registerBatch(handlers);
    
    // 验证注册结果
    const stats = taskRegistry.getStats();
    logger.info(`✅ 任务注册器测试通过: 注册了 ${stats.total} 个任务处理器，其中 ${stats.critical} 个关键任务`);
    
    // 验证每个任务处理器
    for (const taskName of stats.registered) {
      const handler = taskRegistry.get(taskName);
      if (!handler) {
        throw new Error(`找不到任务处理器: ${taskName}`);
      }
      
      logger.debug(`  ✓ ${handler.name}: ${handler.description} (${handler.critical ? '关键' : '普通'})`);
    }
    
    return true;
  } catch (error) {
    logger.error('❌ 任务注册器测试失败:', error);
    return false;
  }
}

/**
 * 测试任务处理器验证功能
 */
async function testTaskHandlerValidation(): Promise<boolean> {
  try {
    logger.info('🧪 测试任务处理器验证功能...');
    
    const { valid, invalid } = await taskRegistry.validateAll();
    
    if (invalid.length > 0) {
      logger.warn('⚠️  发现无效的任务处理器:');
      for (const { handler, error } of invalid) {
        logger.warn(`  - ${handler.name}: ${error}`);
      }
    }
    
    logger.info(`✅ 任务处理器验证完成: ${valid.length} 个有效，${invalid.length} 个无效`);
    return invalid.length === 0;
  } catch (error) {
    logger.error('❌ 任务处理器验证测试失败:', error);
    return false;
  }
}

/**
 * 测试调度器基本功能
 */
async function testSchedulerBasics(): Promise<boolean> {
  try {
    logger.info('🧪 测试调度器基本功能...');
    
    const scheduler = new SchedulerService();
    
    // 测试健康状态检查
    const healthStatus = scheduler.getHealthStatus();
    logger.info(`  ✓ 健康状态: ${healthStatus.healthy ? '正常' : '异常'}`);
    logger.info(`  ✓ 总任务数: ${healthStatus.totalTasks}`);
    logger.info(`  ✓ 运行中任务: ${healthStatus.runningTasks}`);
    logger.info(`  ✓ 关键任务: ${healthStatus.criticalTasks} / ${healthStatus.criticalTasksRunning}`);
    
    if (healthStatus.issues.length > 0) {
      logger.warn('  ⚠️  发现的问题:');
      for (const issue of healthStatus.issues) {
        logger.warn(`    - ${issue}`);
      }
    }
    
    // 测试获取任务处理器列表
    const handlers = scheduler.getRegisteredHandlers();
    logger.info(`  ✓ 注册的任务处理器: ${handlers.length} 个`);
    
    // 测试获取任务状态
    const taskStatus = scheduler.getTaskStatus();
    logger.info(`  ✓ 任务状态查询: ${taskStatus.length} 个任务`);
    
    logger.info('✅ 调度器基本功能测试通过');
    return true;
  } catch (error) {
    logger.error('❌ 调度器基本功能测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<boolean> {
  logger.info('🚀 开始定时任务系统测试...');
  
  const tests = [
    { name: '任务注册器', test: testTaskRegistry },
    { name: '任务处理器验证', test: testTaskHandlerValidation },
    { name: '调度器基本功能', test: testSchedulerBasics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
        logger.info(`✅ ${name} 测试通过`);
      } else {
        failed++;
        logger.error(`❌ ${name} 测试失败`);
      }
    } catch (error) {
      failed++;
      logger.error(`💥 ${name} 测试异常:`, error);
    }
  }
  
  const total = passed + failed;
  const success = failed === 0;
  
  logger.info(`\n📊 测试结果汇总:`);
  logger.info(`  总测试数: ${total}`);
  logger.info(`  通过: ${passed}`);
  logger.info(`  失败: ${failed}`);
  logger.info(`  成功率: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (success) {
    logger.info('🎉 所有测试通过！新的定时任务架构工作正常。');
  } else {
    logger.error('💔 部分测试失败，需要检查和修复。');
  }
  
  return success;
}

// 如果直接运行此文件，则执行所有测试
if (require.main === module) {
  runAllTests().catch(error => {
    logger.error('测试运行失败:', error);
    process.exit(1);
  });
}
