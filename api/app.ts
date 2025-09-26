/**
 * This is a API server
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import pool from './config/database.ts';
import { apiErrorLogger, requestLogger } from './middleware/requestLogger.ts';
import adminsRoutes from './routes/admins.ts';
import agentsRoutes from './routes/agents.ts';
import authRoutes from './routes/auth.ts';
import botsRoutes from './routes/bots/index.ts';
import configCacheRoutes from './routes/config-cache.ts';
import energyDelegationRoutes from './routes/energy-delegation.ts';
import energyPoolRoutes from './routes/energy-pool.ts';
import realtimeStakeStatusRoutes from './routes/energy-pool/realtime-stake-status.ts';
import energyPoolsExtendedRoutes from './routes/energy-pools/extended.ts';
import monitoringRoutes from './routes/monitoring.ts';
import multiBotStatusRoutes from './routes/multi-bot-status.ts';
import networkLogsRoutes from './routes/network-logs';
import ordersRoutes from './routes/orders.ts';
import paymentRoutes from './routes/payment.ts';
import priceConfigsRoutes from './routes/price-configs.ts';
import schedulerRoutes from './routes/scheduler.ts';
import stakeRoutes from './routes/stake.ts';
import statisticsRoutes from './routes/statistics/index.ts';
import systemConfigsRoutes from './routes/system-configs/index.ts';
import systemRoutes from './routes/system/index.ts';
import telegramBotNotificationsRoutes from './routes/telegram-bot-notifications/index.ts';
import telegramRoutes from './routes/telegram.ts';
import testRoutes from './routes/test.ts';
import transactionPackageRoutes from './routes/transaction-package.ts';
import tronNetworksRoutes from './routes/tron-networks/index.ts';
import tronRoutes from './routes/tron.ts';
import uploadsRoutes from './routes/uploads.ts';
import userLevelsRoutes from './routes/user-levels.ts';
import usersRoutes from './routes/users.ts';


// load env
dotenv.config();


const app: express.Application = express();

// 设置数据库连接池到app.locals
app.locals.pool = pool;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 用于提供上传的图片和默认资源
// 使用项目根目录的绝对路径，避免工作目录变化导致的路径问题
import { getProjectPath } from './utils/logger/core/project-root';
app.use('/uploads', express.static(getProjectPath('public/uploads')));
app.use('/assets', express.static(getProjectPath('public/assets')));

// 结构化请求日志中间件
app.use(requestLogger);

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);


app.use('/api/orders', ordersRoutes);
app.use('/api/payment', paymentRoutes);

app.use('/api/users', usersRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/user-levels', userLevelsRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/price-configs', priceConfigsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/system-configs', systemConfigsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/telegram-bot-notifications', telegramBotNotificationsRoutes);
app.use('/api/transaction-package', transactionPackageRoutes);
app.use('/api/multi-bot', multiBotStatusRoutes);
app.use('/api/tron', tronRoutes);
app.use('/api/tron-networks', tronNetworksRoutes);
app.use('/api/energy-pools-extended', energyPoolsExtendedRoutes);
app.use('/api/config-cache', configCacheRoutes);
app.use('/api/energy-delegation', energyDelegationRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/energy-pool/accounts', realtimeStakeStatusRoutes);
app.use('/api/energy-pool', energyPoolRoutes);
app.use('/api/energy-pool/stake', stakeRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/network-logs', networkLogsRoutes);
app.use('/api/uploads', uploadsRoutes);

/**
 * health check - direct access
 */
app.use('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * health check - API path
 */
app.use('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * API root - must be after all specific routes
 */
app.use('/api', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'API Server is running',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/test', 
      '/api/orders',
      '/api/payment',
      '/api/users',
      '/api/agents',
      '/api/admins',
      '/api/user-levels',
      '/api/bots',
      '/api/price-configs',
      '/api/statistics',
      '/api/system-configs',
      '/api/system',
      '/api/telegram',
      '/api/transaction-package',
      '/api/tron',
      '/api/tron-networks',
      '/api/energy-pools-extended',
      '/api/config-cache',
      '/api/energy-delegation',
      '/api/scheduler',
      '/api/energy-pool',
      '/api/energy-pool/stake',
      '/api/monitoring',
      '/api/uploads',
      '/api/health'
    ]
  });
});

/**
 * API错误日志中间件
 */
app.use(apiErrorLogger);

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

// Services will be initialized by server.ts

export default app;