/**
 * This is a API server
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import adminsRoutes from './routes/admins.ts';
import agentsRoutes from './routes/agents.ts';
import authRoutes from './routes/auth.ts';
import botsRoutes from './routes/bots.ts';
import energyDelegationRoutes from './routes/energy-delegation';
import energyPoolRoutes from './routes/energy-pool.js';
import ordersRoutes from './routes/orders.ts';
import paymentRoutes from './routes/payment.ts';
import priceConfigsRoutes from './routes/price-configs.ts';
import schedulerRoutes from './routes/scheduler';
import statisticsRoutes from './routes/statistics/index.ts';
import systemConfigsRoutes from './routes/system-configs/index.ts';
import telegramRoutes from './routes/telegram.ts';
import testRoutes from './routes/test.ts';
import tronRoutes from './routes/tron.ts';
import userLevelsRoutes from './routes/user-levels.ts';
import usersRoutes from './routes/users.ts';


// load env
dotenv.config();


const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/telegram', telegramRoutes);
app.use('/api/tron', tronRoutes);
app.use('/api/energy-delegation', energyDelegationRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/energy-pool', energyPoolRoutes);

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
      '/api/telegram',
      '/api/tron',
      '/api/energy-delegation',
      '/api/scheduler',
      '/api/energy-pool',
      '/api/health'
    ]
  });
});

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