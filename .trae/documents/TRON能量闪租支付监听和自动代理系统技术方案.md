# TRON能量闪租支付监听和自动代理系统技术方案

## 1. 系统概述

### 1.1 业务流程
用户在Telegram机器人中点击"能量闪租"后，系统返回价格配置和下单地址。用户通过钱包转账TRX后，系统需要：
1. 实时监听指定地址的TRX转账
2. 根据转账金额计算对应笔数（不超过最大笔数限制）
3. 自动完成能量代理给转账用户
4. 完成订单流程

### 1.2 技术架构
基于现有项目的模块化架构，新增支付监听服务，整合现有的：
- TRON服务（地址监听、交易查询）
- 订单管理服务（订单生命周期）
- 能量池管理服务（能量分配和代理）
- 价格配置服务（价格计算）
- 资源消耗配置（单笔能量配置）

## 2. 核心模块设计

### 2.1 支付监听服务 (PaymentMonitoringService)

#### 2.1.1 服务职责
- 监听指定TRON地址的转账交易
- 验证转账金额和发送方地址
- 触发后续的订单处理流程

#### 2.1.2 技术实现
```typescript
// api/services/payment-monitoring/PaymentMonitoringService.ts
export class PaymentMonitoringService {
  private tronService: TronService;
  private monitoringTasks: Map<string, NodeJS.Timeout> = new Map();
  private readonly POLLING_INTERVAL = 10000; // 10秒轮询一次
  
  /**
   * 开始监听指定地址的支付
   */
  async startPaymentMonitoring(params: {
    orderId: string;
    paymentAddress: string;
    expectedAmount?: number;
    timeout?: number; // 默认30分钟
  }): Promise<void> {
    const { orderId, paymentAddress, expectedAmount, timeout = 1800000 } = params;
    
    // 清理已存在的监听任务
    this.stopPaymentMonitoring(orderId);
    
    const startTime = Date.now();
    const monitoringTask = setInterval(async () => {
      try {
        // 检查是否超时
        if (Date.now() - startTime > timeout) {
          await this.handlePaymentTimeout(orderId);
          this.stopPaymentMonitoring(orderId);
          return;
        }
        
        // 获取最新交易
        const transactions = await this.tronService.getTransactionsFromAddress(
          paymentAddress, 
          10, 
          0
        );
        
        // 检查新的转账交易
        for (const tx of transactions) {
          if (await this.isValidPayment(tx, paymentAddress, expectedAmount, startTime)) {
            await this.handlePaymentConfirmed(orderId, tx);
            this.stopPaymentMonitoring(orderId);
            return;
          }
        }
      } catch (error) {
        console.error(`支付监听错误 [订单: ${orderId}]:`, error);
      }
    }, this.POLLING_INTERVAL);
    
    this.monitoringTasks.set(orderId, monitoringTask);
    console.log(`✅ 开始监听支付 [订单: ${orderId}] [地址: ${paymentAddress}]`);
  }
  
  /**
   * 验证交易是否为有效支付
   */
  private async isValidPayment(
    transaction: any, 
    paymentAddress: string, 
    expectedAmount?: number,
    startTime?: number
  ): Promise<boolean> {
    // 检查交易时间（必须在监听开始后）
    if (startTime && transaction.block_timestamp < startTime) {
      return false;
    }
    
    // 检查交易类型（TRX转账）
    if (transaction.raw_data?.contract?.[0]?.type !== 'TransferContract') {
      return false;
    }
    
    const contractParam = transaction.raw_data.contract[0].parameter.value;
    
    // 检查接收地址
    if (contractParam.to_address !== paymentAddress) {
      return false;
    }
    
    // 检查金额（如果指定了期望金额）
    if (expectedAmount && contractParam.amount < expectedAmount) {
      return false;
    }
    
    // 检查交易是否成功
    const txInfo = await this.tronService.getTransaction(transaction.txID);
    if (!txInfo.success || txInfo.data?.receipt?.result !== 'SUCCESS') {
      return false;
    }
    
    return true;
  }
  
  /**
   * 处理支付确认
   */
  private async handlePaymentConfirmed(orderId: string, transaction: any): Promise<void> {
    const contractParam = transaction.raw_data.contract[0].parameter.value;
    const amount = contractParam.amount / 1000000; // 转换为TRX
    const fromAddress = contractParam.owner_address;
    
    console.log(`💰 检测到支付 [订单: ${orderId}] [金额: ${amount} TRX] [来源: ${fromAddress}]`);
    
    // 调用订单服务处理支付确认
    await orderService.handlePaymentConfirmed(orderId, transaction.txID, amount);
  }
  
  /**
   * 处理支付超时
   */
  private async handlePaymentTimeout(orderId: string): Promise<void> {
    console.log(`⏰ 支付超时 [订单: ${orderId}]`);
    await orderService.handleOrderExpired(orderId);
  }
  
  /**
   * 停止支付监听
   */
  stopPaymentMonitoring(orderId: string): void {
    const task = this.monitoringTasks.get(orderId);
    if (task) {
      clearInterval(task);
      this.monitoringTasks.delete(orderId);
      console.log(`🛑 停止支付监听 [订单: ${orderId}]`);
    }
  }
}
```

### 2.2 能量闪租订单处理服务 (EnergyFlashOrderService)

#### 2.2.1 服务职责
- 处理能量闪租订单的创建
- 计算笔数和能量分配
- 协调能量代理流程

#### 2.2.2 技术实现
```typescript
// api/services/energy-flash/EnergyFlashOrderService.ts
export class EnergyFlashOrderService {
  private priceConfigService: PriceConfigService;
  private energyPoolService: EnergyPoolService;
  private resourceConsumptionService: ResourceConsumptionService;
  
  /**
   * 创建能量闪租订单
   */
  async createEnergyFlashOrder(params: {
    userId: string;
    recipientAddress: string;
    chatId: number;
  }): Promise<{
    orderId: string;
    paymentAddress: string;
    priceConfig: any;
    expiresAt: Date;
  }> {
    // 获取能量闪租价格配置
    const priceConfig = await this.priceConfigService.getConfigByMode('energy_flash');
    if (!priceConfig || !priceConfig.is_active) {
      throw new Error('能量闪租服务暂不可用');
    }
    
    // 生成订单ID
    const orderId = `FLASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 获取支付地址（从环境变量或配置中获取）
    const paymentAddress = process.env.TRON_PAYMENT_ADDRESS;
    if (!paymentAddress) {
      throw new Error('支付地址未配置');
    }
    
    // 设置订单过期时间（默认30分钟）
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // 创建订单记录
    await this.createOrderRecord({
      orderId,
      userId,
      recipientAddress,
      chatId,
      orderType: 'energy_flash',
      status: 'pending_payment',
      paymentAddress,
      priceConfig: priceConfig.config,
      expiresAt
    });
    
    return {
      orderId,
      paymentAddress,
      priceConfig: priceConfig.config,
      expiresAt
    };
  }
  
  /**
   * 处理支付确认后的订单处理
   */
  async processPaymentConfirmed(params: {
    orderId: string;
    txHash: string;
    paidAmount: number;
    fromAddress: string;
  }): Promise<void> {
    const { orderId, txHash, paidAmount, fromAddress } = params;
    
    // 获取订单信息
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }
    
    // 计算用户获得的笔数
    const transactionCount = this.calculateTransactionCount(
      paidAmount, 
      order.priceConfig
    );
    
    console.log(`📊 订单处理 [${orderId}] [支付: ${paidAmount} TRX] [笔数: ${transactionCount}]`);
    
    // 更新订单状态
    await this.updateOrderStatus(orderId, 'paid', {
      txHash,
      paidAmount,
      fromAddress,
      transactionCount,
      paidAt: new Date()
    });
    
    // 开始能量代理流程
    await this.processEnergyDelegation(orderId, transactionCount);
  }
  
  /**
   * 计算用户获得的笔数
   */
  private calculateTransactionCount(paidAmount: number, priceConfig: any): number {
    const singlePrice = priceConfig.single_price || 0;
    const maxTransactions = priceConfig.max_transactions || 1;
    
    if (singlePrice <= 0) {
      throw new Error('价格配置错误');
    }
    
    // 计算理论笔数
    const theoreticalCount = Math.floor(paidAmount / singlePrice);
    
    // 不能超过最大笔数限制
    const actualCount = Math.min(theoreticalCount, maxTransactions);
    
    console.log(`💰 笔数计算: 支付${paidAmount} TRX, 单价${singlePrice} TRX, 理论${theoreticalCount}笔, 实际${actualCount}笔`);
    
    return actualCount;
  }
  
  /**
   * 处理能量代理
   */
  private async processEnergyDelegation(orderId: string, transactionCount: number): Promise<void> {
    try {
      // 获取单笔能量配置
      const energyPerTransaction = await this.getEnergyPerTransaction();
      const totalEnergyRequired = energyPerTransaction * transactionCount;
      
      console.log(`⚡ 能量代理 [${orderId}] [单笔: ${energyPerTransaction}] [总计: ${totalEnergyRequired}]`);
      
      // 获取订单信息
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error(`订单不存在: ${orderId}`);
      }
      
      // 检查能量池是否有足够能量
      const allocation = await this.energyPoolService.optimizeEnergyAllocation(totalEnergyRequired);
      if (!allocation.success) {
        throw new Error(`能量池能量不足: ${allocation.error}`);
      }
      
      // 执行能量代理
      const delegationResult = await this.executeBatchEnergyDelegation({
        recipientAddress: order.recipientAddress,
        energyPerTransaction,
        transactionCount,
        allocation: allocation.allocation,
        expiryHours: order.priceConfig.expiry_hours || 1
      });
      
      // 更新订单状态
      await this.updateOrderStatus(orderId, 'completed', {
        delegationResult,
        completedAt: new Date()
      });
      
      // 发送完成通知
      await this.sendCompletionNotification(order, delegationResult);
      
    } catch (error) {
      console.error(`能量代理失败 [${orderId}]:`, error);
      
      // 更新订单状态为失败
      await this.updateOrderStatus(orderId, 'failed', {
        errorMessage: error.message,
        failedAt: new Date()
      });
      
      // 发送失败通知
      await this.sendFailureNotification(orderId, error.message);
    }
  }
  
  /**
   * 获取单笔能量配置
   */
  private async getEnergyPerTransaction(): Promise<number> {
    // 从资源消耗配置中获取单笔能量配置
    const energyConfig = await this.resourceConsumptionService.getResourceConfig('energy');
    return energyConfig?.usdt_standard_energy || 15000; // 默认15000能量
  }
  
  /**
   * 执行批量能量代理
   */
  private async executeBatchEnergyDelegation(params: {
    recipientAddress: string;
    energyPerTransaction: number;
    transactionCount: number;
    allocation: any[];
    expiryHours: number;
  }): Promise<any[]> {
    const { recipientAddress, energyPerTransaction, transactionCount, allocation, expiryHours } = params;
    const results = [];
    
    for (let i = 0; i < transactionCount; i++) {
      try {
        // 选择合适的能量池账户
        const poolAccount = allocation.find(a => a.availableEnergy >= energyPerTransaction);
        if (!poolAccount) {
          throw new Error(`第${i + 1}笔代理失败：能量池能量不足`);
        }
        
        // 执行能量代理
        const delegationResult = await this.tronService.delegateEnergy({
          fromAddress: poolAccount.address,
          toAddress: recipientAddress,
          energyAmount: energyPerTransaction,
          duration: expiryHours * 3600 // 转换为秒
        });
        
        results.push({
          transactionIndex: i + 1,
          poolAccount: poolAccount.address,
          energyAmount: energyPerTransaction,
          txHash: delegationResult.txHash,
          success: true
        });
        
        // 更新能量池账户可用能量
        poolAccount.availableEnergy -= energyPerTransaction;
        
        console.log(`✅ 第${i + 1}笔能量代理成功 [${energyPerTransaction} Energy] [TxHash: ${delegationResult.txHash}]`);
        
      } catch (error) {
        console.error(`❌ 第${i + 1}笔能量代理失败:`, error);
        results.push({
          transactionIndex: i + 1,
          energyAmount: energyPerTransaction,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}
```

### 2.3 订单生命周期扩展

#### 2.3.1 扩展现有OrderLifecycleService
```typescript
// api/services/order/OrderLifecycleService.ts (扩展)
export class OrderLifecycleService {
  // ... 现有代码 ...
  
  /**
   * 处理能量闪租订单的支付确认
   */
  async handleEnergyFlashPaymentConfirmed(
    orderId: string, 
    txHash: string, 
    amount: number,
    fromAddress: string
  ): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }
    
    if (order.orderType === 'energy_flash') {
      // 使用能量闪租服务处理
      const energyFlashService = new EnergyFlashOrderService();
      await energyFlashService.processPaymentConfirmed({
        orderId,
        txHash,
        paidAmount: amount,
        fromAddress
      });
    } else {
      // 使用原有逻辑处理其他类型订单
      await this.handlePaymentConfirmed(orderId, txHash, amount);
    }
  }
}
```

## 3. 数据库设计

### 3.1 订单表扩展
```sql
-- 扩展现有orders表，添加能量闪租相关字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_address VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(20, 6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS from_address VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delegation_result JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_config JSONB;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_address ON orders(payment_address);
CREATE INDEX IF NOT EXISTS idx_orders_from_address ON orders(from_address);
```

### 3.2 支付监听记录表
```sql
-- 创建支付监听记录表
CREATE TABLE IF NOT EXISTS payment_monitoring_logs (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  payment_address VARCHAR(100) NOT NULL,
  monitoring_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  monitoring_stopped_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'monitoring', -- monitoring, completed, timeout, error
  detected_tx_hash VARCHAR(100),
  detected_amount DECIMAL(20, 6),
  detected_from_address VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_payment_monitoring_order_id ON payment_monitoring_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_monitoring_address ON payment_monitoring_logs(payment_address);
CREATE INDEX IF NOT EXISTS idx_payment_monitoring_status ON payment_monitoring_logs(status);
```

## 4. API接口设计

### 4.1 能量闪租订单创建接口
```typescript
// api/routes/energy-flash.ts
router.post('/create-order', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { recipientAddress, chatId } = req.body;
    const userId = req.user.id;
    
    // 验证接收地址
    if (!tronService.isValidAddress(recipientAddress)) {
      return res.status(400).json({
        success: false,
        error: '无效的TRON地址'
      });
    }
    
    const energyFlashService = new EnergyFlashOrderService();
    const result = await energyFlashService.createEnergyFlashOrder({
      userId,
      recipientAddress,
      chatId
    });
    
    // 开始支付监听
    const paymentMonitoringService = new PaymentMonitoringService();
    await paymentMonitoringService.startPaymentMonitoring({
      orderId: result.orderId,
      paymentAddress: result.paymentAddress,
      timeout: 30 * 60 * 1000 // 30分钟
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('创建能量闪租订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 4.2 手动支付确认接口（备用）
```typescript
// 用于手动确认支付的备用接口
router.post('/confirm-payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderId, txHash } = req.body;
    
    // 验证交易哈希
    const txInfo = await tronService.getTransaction(txHash);
    if (!txInfo.success) {
      return res.status(400).json({
        success: false,
        error: '无效的交易哈希'
      });
    }
    
    // 手动触发支付确认处理
    const orderLifecycleService = new OrderLifecycleService();
    await orderLifecycleService.handleEnergyFlashPaymentConfirmed(
      orderId,
      txHash,
      txInfo.data.amount / 1000000, // 转换为TRX
      txInfo.data.from_address
    );
    
    res.json({
      success: true,
      message: '支付确认处理中'
    });
    
  } catch (error) {
    console.error('手动确认支付失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 5. Telegram机器人集成

### 5.1 能量闪租回调处理扩展
```typescript
// api/services/telegram-bot/callbacks/handlers/EnergyFlashCallbackHandler.ts
export class EnergyFlashCallbackHandler extends BaseCallbackHandler {
  
  async handleEnergyFlashOrder(context: CallbackContext): Promise<void> {
    const { chatId, userId, messageId } = context;
    
    try {
      // 获取用户的TRON地址（如果已设置）
      const user = await userService.getUserById(userId);
      let recipientAddress = user?.tron_address;
      
      if (!recipientAddress) {
        // 请求用户输入TRON地址
        await this.requestTronAddress(chatId, messageId);
        return;
      }
      
      // 创建能量闪租订单
      const energyFlashService = new EnergyFlashOrderService();
      const orderResult = await energyFlashService.createEnergyFlashOrder({
        userId: userId.toString(),
        recipientAddress,
        chatId
      });
      
      // 开始支付监听
      const paymentMonitoringService = new PaymentMonitoringService();
      await paymentMonitoringService.startPaymentMonitoring({
        orderId: orderResult.orderId,
        paymentAddress: orderResult.paymentAddress
      });
      
      // 发送支付信息
      await this.sendPaymentInfo(chatId, orderResult);
      
    } catch (error) {
      console.error('处理能量闪租订单失败:', error);
      await this.sendErrorMessage(chatId, '创建订单失败，请稍后重试');
    }
  }
  
  private async sendPaymentInfo(chatId: number, orderResult: any): Promise<void> {
    const { orderId, paymentAddress, priceConfig, expiresAt } = orderResult;
    
    const message = `⚡ 能量闪租订单已创建\n\n` +
      `📋 订单号: \`${orderId}\`\n` +
      `💰 单笔价格: ${priceConfig.single_price} TRX\n` +
      `📊 最大笔数: ${priceConfig.max_transactions}\n` +
      `⏰ 时效: ${priceConfig.expiry_hours}小时\n\n` +
      `💳 支付地址:\n\`${paymentAddress}\`\n\n` +
      `⚠️ 请在 ${expiresAt.toLocaleString()} 前完成支付\n` +
      `支付完成后系统将自动处理能量代理。`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ 我已支付', callback_data: `confirm_flash_payment_${orderId}` },
          { text: '❌ 取消订单', callback_data: `cancel_flash_order_${orderId}` }
        ],
        [
          { text: '📊 查看订单', callback_data: `view_flash_order_${orderId}` }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}
```

## 6. 部署和配置

### 6.1 环境变量配置
```bash
# .env 文件添加
# TRON支付监听配置
TRON_PAYMENT_ADDRESS=TYour_Payment_Address_Here
PAYMENT_MONITORING_INTERVAL=10000
PAYMENT_TIMEOUT=1800000

# 能量闪租配置
ENERGY_FLASH_ENABLED=true
DEFAULT_ENERGY_PER_TRANSACTION=15000
MAX_CONCURRENT_MONITORING=100
```

### 6.2 服务启动配置
```typescript
// api/server.ts 添加服务初始化
import { PaymentMonitoringService } from './services/payment-monitoring/PaymentMonitoringService';
import { EnergyFlashOrderService } from './services/energy-flash/EnergyFlashOrderService';

// 初始化服务
const paymentMonitoringService = new PaymentMonitoringService();
const energyFlashOrderService = new EnergyFlashOrderService();

// 注册全局服务实例
app.locals.paymentMonitoringService = paymentMonitoringService;
app.locals.energyFlashOrderService = energyFlashOrderService;

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('正在关闭支付监听服务...');
  paymentMonitoringService.stopAllMonitoring();
});
```

## 7. 监控和日志

### 7.1 监控指标
- 活跃支付监听数量
- 支付确认成功率
- 能量代理成功率
- 平均处理时间
- 错误率统计

### 7.2 日志记录
```typescript
// 关键操作日志
console.log(`🔍 [PaymentMonitoring] 开始监听 [订单: ${orderId}] [地址: ${paymentAddress}]`);
console.log(`💰 [PaymentDetected] 检测到支付 [订单: ${orderId}] [金额: ${amount} TRX]`);
console.log(`⚡ [EnergyDelegation] 能量代理 [订单: ${orderId}] [笔数: ${count}] [总能量: ${totalEnergy}]`);
console.log(`✅ [OrderCompleted] 订单完成 [订单: ${orderId}] [耗时: ${duration}ms]`);
```

## 8. 测试方案

### 8.1 单元测试
- PaymentMonitoringService 各方法测试
- EnergyFlashOrderService 业务逻辑测试
- 笔数计算逻辑测试
- 能量代理逻辑测试

### 8.2 集成测试
- 完整的支付到代理流程测试
- 超时处理测试
- 异常情况处理测试
- 并发订单处理测试

### 8.3 压力测试
- 大量并发支付监听
- 能量池资源竞争测试
- 系统资源使用监控

## 9. 实施步骤

### 第一阶段：核心服务开发（1-2周）
1. 创建 PaymentMonitoringService
2. 创建 EnergyFlashOrderService
3. 扩展 OrderLifecycleService
4. 数据库表结构调整

### 第二阶段：API和机器人集成（1周）
1. 创建能量闪租相关API接口
2. 扩展Telegram机器人回调处理
3. 完善错误处理和通知机制

### 第三阶段：测试和优化（1周）
1. 单元测试和集成测试
2. 性能优化和监控完善
3. 文档完善和部署准备

### 第四阶段：部署和监控（0.5周）
1. 生产环境部署
2. 监控系统配置
3. 运行状态验证

## 10. 风险控制

### 10.1 技术风险
- **TRON网络延迟**：设置合理的轮询间隔和超时时间
- **能量池资源不足**：实现智能分配和预警机制
- **并发处理冲突**：使用数据库锁和队列机制

### 10.2 业务风险
- **重复支付处理**：实现幂等性检查
- **支付金额不匹配**：灵活的金额匹配策略
- **代理失败处理**：完善的回滚和补偿机制

### 10.3 安全风险
- **私钥安全**：使用环境变量和加密存储
- **地址验证**：严格的地址格式和有效性检查
- **交易验证**：多重验证确保交易真实性

## 11. 总结

本技术方案基于现有项目架构，通过新增支付监听服务和能量闪租订单处理服务，实现了完整的TRON能量闪租自动化流程。方案具有以下特点：

1. **模块化设计**：各服务职责清晰，便于维护和扩展
2. **实时监听**：基于轮询的支付监听机制，确保及时处理
3. **智能分配**：结合现有能量池管理，实现最优资源分配
4. **完善的错误处理**：多层次的异常处理和恢复机制
5. **可扩展性**：支持未来功能扩展和性能优化

通过分阶段实施，可以确保系统稳定性的同时快速上线新功能，为用户提供便捷的TRON能量租赁服务。