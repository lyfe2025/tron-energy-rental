/**
 * This is a API server
 */

import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import agentPricingRoutes from './routes/agent-pricing/index.ts';
import authRoutes from './routes/auth.ts';
import botsRoutes from './routes/bots.ts';
import energyPackagesRoutes from './routes/energy-packages/index.ts';
import ordersRoutes from './routes/orders.ts';
import priceConfigsRoutes from './routes/price-configs.ts';
import robotPricingRoutes from './routes/robot-pricing/index.ts';
import statisticsRoutes from './routes/statistics/index.ts';
import systemConfigsRoutes from './routes/system-configs/index.ts';
import testRoutes from './routes/test.ts';
import usersRoutes from './routes/users.ts';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use('/api/users', usersRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/energy-packages', energyPackagesRoutes);
app.use('/api/agent-pricing', agentPricingRoutes);
app.use('/api/robot-pricing', robotPricingRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/system-configs', systemConfigsRoutes);
app.use('/api/price-configs', priceConfigsRoutes);

/**
 * API root
 */
app.use('/api', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'API Server is running',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/test', 
      '/api/orders',
      '/api/users',
      '/api/bots',
      '/api/energy-packages',
      '/api/agent-pricing',
      '/api/robot-pricing',
      '/api/statistics',
      '/api/system-configs',
      '/api/price-configs',
      '/api/health'
    ]
  });
});

/**
 * health check - direct access
 */
app.use('/health', (req: Request, res: Response, next: NextFunction): void => {
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
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
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

export default app;