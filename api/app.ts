/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.ts';
import testRoutes from './routes/test.ts';
import ordersRoutes from './routes/orders.ts';
import usersRoutes from './routes/users.ts';
import botsRoutes from './routes/bots.ts';
import energyPackagesRoutes from './routes/energy-packages.ts';
import statisticsRoutes from './routes/statistics.ts';
import systemConfigsRoutes from './routes/system-configs.ts';
import priceConfigsRoutes from './routes/price-configs.ts';

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
app.use('/api/statistics', statisticsRoutes);
app.use('/api/system-configs', systemConfigsRoutes);
app.use('/api/price-configs', priceConfigsRoutes);

/**
 * health
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