/**
 * Price Search 主路由模块
 * 整合所有价格搜索相关的子模块
 */
import { Router } from 'express';
import searchRouter from './search.js';
import compareRouter from './compare.js';
import trendsRouter from './trends.js';
import filtersRouter from './filters.js';

const router: Router = Router();

// 挂载子路由模块
router.use('/', searchRouter);           // 综合价格搜索
router.use('/compare', compareRouter);   // 价格比较分析
router.use('/trends', trendsRouter);     // 价格趋势分析
router.use('/filters', filtersRouter);   // 高级筛选器

// 健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Price Search API is running',
    modules: {
      search: 'active',
      compare: 'active',
      trends: 'active',
      filters: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;