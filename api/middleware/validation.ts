import type express from 'express';
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
import { body, param, query, validationResult } from 'express-validator';

/**
 * 处理验证结果的中间件
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 订单创建验证规则
 */
export const validateCreateOrder = [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('packageId').isInt({ min: 1 }).withMessage('Valid package ID is required'),
  body('energyAmount').isInt({ min: 1 }).withMessage('Energy amount must be a positive integer'),
  body('durationHours').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('priceTrx').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('recipientAddress').isLength({ min: 34, max: 34 }).withMessage('Invalid TRON address'),
  handleValidationErrors
];

/**
 * 订单ID验证规则
 */
export const validateOrderId = [
  param('id').isInt({ min: 1 }).withMessage('Valid order ID is required'),
  handleValidationErrors
];

/**
 * 订单状态更新验证规则
 */
export const validateUpdateOrderStatus = [
  param('id').isInt({ min: 1 }).withMessage('Valid order ID is required'),
  body('status').isIn(['pending', 'paid', 'processing', 'active', 'completed', 'cancelled', 'failed'])
    .withMessage('Invalid order status'),
  handleValidationErrors
];

/**
 * 用户ID验证规则
 */
export const validateUserId = [
  param('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  handleValidationErrors
];

/**
 * 分页验证规则
 */
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * 搜索验证规则
 */
export const validateSearch = [
  query('query').optional().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('status').optional().isIn(['pending', 'paid', 'processing', 'active', 'completed', 'cancelled', 'failed'])
    .withMessage('Invalid status filter'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  handleValidationErrors
];

/**
 * TRON地址验证规则
 */
export const validateTronAddress = [
  body('address').isLength({ min: 34, max: 34 }).withMessage('Invalid TRON address format'),
  handleValidationErrors
];

/**
 * 能量数量验证规则
 */
export const validateEnergyAmount = [
  body('energyAmount').isInt({ min: 1 }).withMessage('Energy amount must be a positive integer'),
  handleValidationErrors
];

/**
 * 委托参数验证规则
 */
export const validateDelegationParams = [
  body('orderId').isInt({ min: 1 }).withMessage('Valid order ID is required'),
  body('recipientAddress').isLength({ min: 34, max: 34 }).withMessage('Invalid TRON address'),
  body('energyAmount').isInt({ min: 1 }).withMessage('Energy amount must be a positive integer'),
  body('durationHours').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  handleValidationErrors
];

/**
 * 支付监控验证规则
 */
export const validatePaymentMonitoring = [
  body('orderId').isInt({ min: 1 }).withMessage('Valid order ID is required'),
  body('expectedAmount').isFloat({ min: 0 }).withMessage('Expected amount must be a positive number'),
  body('recipientAddress').isLength({ min: 34, max: 34 }).withMessage('Invalid TRON address'),
  body('timeoutMinutes').optional().isInt({ min: 1 }).withMessage('Timeout must be a positive integer'),
  handleValidationErrors
];

/**
 * 能量池账户验证规则
 */
export const validateEnergyPoolAccount = [
  body('address').isLength({ min: 34, max: 34 }).withMessage('Invalid TRON address'),
  body('private_key').isLength({ min: 1 }).withMessage('Private key is required'),
  body('total_energy').isInt({ min: 0 }).withMessage('Total energy must be a non-negative integer'),
  body('cost_per_energy').isFloat({ min: 0 }).withMessage('Cost per energy must be a non-negative number'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('Invalid status'),
  handleValidationErrors
];