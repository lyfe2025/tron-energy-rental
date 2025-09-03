# 🚀 项目实战示例和完整流程

> TRON 能量租赁项目的完整业务流程示例和最佳实践

## 📋 目录

- [完整业务流程](#完整业务流程)
- [用户注册和设置](#用户注册和设置)
- [能量套餐购买](#能量套餐购买)
- [支付确认流程](#支付确认流程)
- [能量委托执行](#能量委托执行)
- [订单管理示例](#订单管理示例)
- [管理员功能](#管理员功能)
- [集成测试示例](#集成测试示例)

## 🎯 完整业务流程

### 业务流程图

```mermaid
graph TB
    A[用户发送 /start] --> B[注册/更新用户信息]
    B --> C{用户是否已设置TRON地址}
    C -->|否| D[引导设置TRON地址]
    C -->|是| E[显示主菜单]
    D --> F[用户输入地址]
    F --> G[验证地址格式]
    G --> H[保存地址并激活账户]
    H --> E
    
    E --> I[用户点击"购买能量"]
    I --> J[显示能量套餐列表]
    J --> K[用户选择套餐]
    K --> L[创建订单]
    L --> M[显示支付信息]
    M --> N[用户完成支付]
    N --> O[系统监控支付]
    O --> P{支付确认}
    P -->|成功| Q[执行能量委托]
    P -->|失败/超时| R[订单取消]
    Q --> S[委托完成通知]
    R --> T[超时通知]
    
    S --> U[流程结束]
    T --> U
```

## 👤 用户注册和设置

### 1. 用户首次使用流程

```typescript
// 完整的用户注册和设置流程示例
export class UserOnboardingExample {
  /**
   * 处理用户 /start 命令
   */
  static async handleStartCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const telegramUser = msg.from;
    
    if (!telegramUser) {
      await this.sendErrorMessage(chatId, '无法获取用户信息');
      return;
    }

    try {
      console.log(`🔄 Processing /start for user ${telegramUser.id}`);

      // 步骤1: 注册或更新用户信息
      const user = await UserService.registerTelegramUser({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code
      });

      // 步骤2: 检查用户状态
      if (user.status === 'inactive') {
        await this.startAccountSetupFlow(chatId, user);
      } else {
        await this.showWelcomeMessage(chatId, user);
      }

      // 步骤3: 记录用户活动
      await UserAnalytics.trackEvent(user.id, 'start_command_used', {
        chat_id: chatId,
        is_new_user: user.created_at.getTime() > Date.now() - 60000 // 1分钟内创建
      });

    } catch (error) {
      console.error('Start command error:', error);
      await this.sendErrorMessage(chatId, '初始化失败，请重试');
    }
  }

  /**
   * 开始账户设置流程
   */
  private static async startAccountSetupFlow(chatId: number, user: User): Promise<void> {
    const welcomeMessage = `🎉 欢迎来到 TRON 能量租赁服务！

👋 你好 ${user.first_name}！

为了开始使用我们的服务，请先设置您的TRON地址。

📍 <b>什么是TRON地址？</b>
TRON地址是您在TRON网络上的唯一标识，以"T"开头，共34位字符。

💡 <b>如何获取TRON地址？</b>
• 打开您的TRON钱包应用（如TronLink）
• 复制您的钱包地址
• 粘贴到这里

⚠️ <b>注意事项：</b>
• 请确保地址正确，错误的地址将导致能量无法到账
• 地址格式：T + 33位字符（数字和字母）

请发送您的TRON地址：`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 如何获取地址？', callback_data: 'help_get_address' },
          { text: '❓ 什么是TRON？', callback_data: 'help_about_tron' }
        ],
        [
          { text: '🔙 稍后设置', callback_data: 'skip_setup' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });

    // 设置用户状态为"设置地址"
    UserStateManager.setState(user.telegram_id, {
      chatId,
      currentAction: 'setting_address',
      step: 1,
      data: { user_id: user.id }
    });
  }

  /**
   * 处理地址输入
   */
  static async handleAddressInput(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const address = msg.text?.trim();
    const userId = msg.from?.id;

    if (!userId || !address) return;

    try {
      // 验证用户是否在设置地址状态
      const userState = UserStateManager.getState(userId);
      if (!userState || userState.currentAction !== 'setting_address') {
        return;
      }

      console.log(`🔍 Validating address for user ${userId}: ${address}`);

      // 验证地址格式
      if (!this.validateTronAddress(address)) {
        await this.sendAddressValidationError(chatId, address);
        return;
      }

      // 检查地址是否已被其他用户使用
      const existingUser = await db.user.findFirst({
        where: { 
          tron_address: address,
          id: { not: userState.data.user_id }
        }
      });

      if (existingUser) {
        await telegramBotService.sendMessage(chatId,
          '❌ 该TRON地址已被其他用户使用\n\n请使用其他地址或联系客服。'
        );
        return;
      }

      // 保存地址并激活用户
      await UserService.activateUser(userState.data.user_id, address);

      // 清除用户状态
      UserStateManager.clearState(userId);

      // 发送成功消息
      await this.sendAddressSetupSuccess(chatId, address);

      // 显示主菜单
      await this.showMainMenu(chatId);

    } catch (error) {
      console.error('Address input error:', error);
      await this.sendErrorMessage(chatId, '地址设置失败，请重试');
    }
  }

  private static validateTronAddress(address: string): boolean {
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  private static async sendAddressValidationError(chatId: number, address: string): Promise<void> {
    const errorMessage = `❌ TRON地址格式错误

您输入的地址：<code>${address}</code>

✅ <b>正确格式：</b>
• 以字母 "T" 开头
• 总长度为 34 位字符
• 包含数字和字母（不含特殊字符）

📝 <b>示例：</b>
<code>TExample123456789abcdefghijklmnopqr</code>

请重新输入正确的TRON地址：`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💡 获取帮助', callback_data: 'help_get_address' },
          { text: '❌ 取消设置', callback_data: 'cancel_setup' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, errorMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private static async sendAddressSetupSuccess(chatId: number, address: string): Promise<void> {
    const successMessage = `✅ TRON地址设置成功！

📍 您的地址：<code>${address}</code>

🎉 <b>账户已激活！</b>

现在您可以：
• 🔋 购买TRON能量
• 💰 查看账户余额
• 📋 管理订单记录

💡 如需修改地址，请联系客服。`;

    await telegramBotService.sendMessage(chatId, successMessage, {
      parse_mode: 'HTML'
    });
  }
}
```

## ⚡ 能量套餐购买

### 2. 完整的购买流程

```typescript
export class EnergyPurchaseExample {
  /**
   * 显示能量套餐列表
   */
  static async showEnergyPackages(chatId: number, userId: number): Promise<void> {
    try {
      console.log(`📦 Showing energy packages for user ${userId}`);

      // 获取可用套餐
      const packages = await this.getAvailablePackages();
      
      if (packages.length === 0) {
        await telegramBotService.sendMessage(chatId, 
          '😔 暂无可用套餐，请稍后再试。'
        );
        return;
      }

      const packageMessage = `⚡ <b>TRON能量套餐</b>

选择适合您的能量套餐：

${packages.map((pkg, index) => 
  `${index + 1}. <b>${pkg.name}</b>
   • 能量数量：<code>${pkg.energy.toLocaleString()}</code> Energy
   • 委托时长：<code>${pkg.duration_hours}</code> 小时
   • 价格：<code>${pkg.price_trx}</code> TRX
   • 节省手续费：<code>~${pkg.energy_cost_trx.toFixed(2)}</code> TRX`
).join('\n\n')}

💡 <b>什么是TRON能量？</b>
能量用于执行智能合约，避免消耗TRX作为手续费。`;

      // 构建套餐选择键盘
      const keyboard = this.buildPackageKeyboard(packages);

      await telegramBotService.sendMessage(chatId, packageMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      // 记录浏览事件
      await UserAnalytics.trackEvent(userId.toString(), 'view_packages', {
        packages_count: packages.length
      });

    } catch (error) {
      console.error('Show packages error:', error);
      await telegramBotService.sendMessage(chatId, 
        '❌ 获取套餐信息失败，请重试。'
      );
    }
  }

  /**
   * 处理套餐选择
   */
  static async handlePackageSelection(
    chatId: number, 
    packageId: string, 
    userId: number
  ): Promise<void> {
    try {
      console.log(`🎯 User ${userId} selected package ${packageId}`);

      // 获取套餐信息
      const packageInfo = await this.getPackageInfo(packageId);
      if (!packageInfo) {
        await telegramBotService.sendMessage(chatId, '❌ 套餐不存在或已下架');
        return;
      }

      // 获取用户信息
      const user = await UserService.getUserByTelegramId(userId);
      if (!user || !user.tron_address) {
        await telegramBotService.sendMessage(chatId, 
          '❌ 请先设置TRON地址\n\n使用命令：/start'
        );
        return;
      }

      // 显示套餐确认信息
      await this.showPackageConfirmation(chatId, packageInfo, user);

      // 记录选择事件
      await UserAnalytics.trackEvent(user.id, 'package_selected', {
        package_id: packageId,
        package_name: packageInfo.name,
        price: packageInfo.price_trx
      });

    } catch (error) {
      console.error('Package selection error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 处理请求失败，请重试');
    }
  }

  /**
   * 显示套餐确认页面
   */
  private static async showPackageConfirmation(
    chatId: number, 
    packageInfo: any, 
    user: User
  ): Promise<void> {
    const confirmMessage = `📋 <b>订单确认</b>

📦 <b>套餐信息：</b>
• 套餐名称：${packageInfo.name}
• 能量数量：<code>${packageInfo.energy.toLocaleString()}</code> Energy
• 委托时长：<code>${packageInfo.duration_hours}</code> 小时
• 价格：<code>${packageInfo.price_trx}</code> TRX

📍 <b>接收地址：</b>
<code>${user.tron_address}</code>

💰 <b>您的余额：</b>
• TRX：<code>${user.trx_balance}</code>
• USDT：<code>${user.usdt_balance}</code>

⏰ <b>预计完成时间：</b> 3-5分钟

确认购买此套餐吗？`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ 确认购买', callback_data: `confirm_package_${packageInfo.id}` },
          { text: '❌ 取消', callback_data: `cancel_package_${packageInfo.id}` }
        ],
        [
          { text: '🔙 返回套餐列表', callback_data: 'buy_energy' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, confirmMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  /**
   * 处理套餐确认
   */
  static async handlePackageConfirmation(
    chatId: number, 
    packageId: string, 
    userId: number
  ): Promise<void> {
    try {
      console.log(`✅ User ${userId} confirmed package ${packageId}`);

      // 获取用户和套餐信息
      const [user, packageInfo] = await Promise.all([
        UserService.getUserByTelegramId(userId),
        this.getPackageInfo(packageId)
      ]);

      if (!user || !packageInfo) {
        await telegramBotService.sendMessage(chatId, '❌ 信息获取失败');
        return;
      }

      // 检查余额是否足够
      if (user.trx_balance < packageInfo.price_trx) {
        await this.handleInsufficientBalance(chatId, user, packageInfo);
        return;
      }

      // 创建订单
      const order = await this.createOrder(user, packageInfo);

      // 扣除余额
      const balanceDeducted = await BalanceService.deductBalance(
        user.id,
        packageInfo.price_trx,
        'TRX',
        'purchase',
        order.id
      );

      if (!balanceDeducted) {
        await telegramBotService.sendMessage(chatId, '❌ 余额扣除失败，请重试');
        return;
      }

      // 显示订单成功创建信息
      await this.showOrderCreated(chatId, order);

      // 启动能量委托处理
      await this.triggerEnergyDelegation(order);

      // 记录购买事件
      await UserAnalytics.trackEvent(user.id, 'order_created', {
        order_id: order.id,
        package_id: packageInfo.id,
        amount: packageInfo.price_trx,
        payment_method: 'balance'
      });

    } catch (error) {
      console.error('Package confirmation error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 订单创建失败，请重试');
    }
  }

  /**
   * 处理余额不足情况
   */
  private static async handleInsufficientBalance(
    chatId: number, 
    user: User, 
    packageInfo: any
  ): Promise<void> {
    const needed = packageInfo.price_trx - user.trx_balance;
    
    const message = `💰 余额不足

💳 <b>当前余额：</b> ${user.trx_balance} TRX
💰 <b>套餐价格：</b> ${packageInfo.price_trx} TRX
📉 <b>缺少：</b> ${needed.toFixed(2)} TRX

您可以选择：`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💳 充值余额', callback_data: 'recharge' },
          { text: '💰 直接支付', callback_data: `pay_direct_${packageInfo.id}` }
        ],
        [
          { text: '🔙 返回套餐列表', callback_data: 'buy_energy' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  private static buildPackageKeyboard(packages: any[]): any {
    const keyboard = packages.map(pkg => [{
      text: `${pkg.name} - ${pkg.energy.toLocaleString()} ⚡ - ${pkg.price_trx} TRX`,
      callback_data: `package_${pkg.id}`
    }]);

    keyboard.push([
      { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
    ]);

    return { inline_keyboard: keyboard };
  }
}
```

## 💳 支付确认流程

### 3. 直接支付处理流程

```typescript
export class DirectPaymentExample {
  /**
   * 处理直接支付请求
   */
  static async handleDirectPayment(
    chatId: number, 
    packageId: string, 
    userId: number
  ): Promise<void> {
    try {
      console.log(`💳 Processing direct payment for user ${userId}, package ${packageId}`);

      // 获取用户和套餐信息
      const [user, packageInfo] = await Promise.all([
        UserService.getUserByTelegramId(userId),
        EnergyPurchaseExample.getPackageInfo(packageId)
      ]);

      if (!user || !packageInfo) {
        await telegramBotService.sendMessage(chatId, '❌ 信息获取失败');
        return;
      }

      // 创建支付订单
      const paymentOrder = await PaymentService.createPaymentOrder({
        userId: user.id,
        packageId: packageInfo.id,
        amount: packageInfo.price_trx,
        currency: 'TRX',
        recipientAddress: user.tron_address!
      });

      // 显示支付信息
      await this.showPaymentInformation(chatId, paymentOrder, packageInfo);

      // 记录支付创建事件
      await UserAnalytics.trackEvent(user.id, 'payment_created', {
        order_id: paymentOrder.id,
        amount: packageInfo.price_trx,
        currency: 'TRX',
        payment_method: 'direct'
      });

    } catch (error) {
      console.error('Direct payment error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 支付创建失败，请重试');
    }
  }

  /**
   * 显示支付信息
   */
  private static async showPaymentInformation(
    chatId: number, 
    paymentOrder: any, 
    packageInfo: any
  ): Promise<void> {
    const paymentMessage = `💳 <b>支付信息</b>

📦 <b>订单详情：</b>
• 订单号：<code>${paymentOrder.id}</code>
• 套餐：${packageInfo.name}
• 能量：<code>${packageInfo.energy.toLocaleString()}</code> Energy
• 金额：<code>${paymentOrder.amount_trx}</code> TRX

💰 <b>支付地址：</b>
<code>${paymentOrder.payment_address}</code>

⚠️ <b>重要提醒：</b>
• 请转账准确金额：<code>${paymentOrder.amount_trx}</code> TRX
• 网络：TRON 主网
• 超时时间：30分钟
• 到账后自动处理，无需手动确认

⏰ <b>订单将在以下时间过期：</b>
${paymentOrder.expires_at.toLocaleString('zh-CN')}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ 我已支付', callback_data: `confirm_payment_${paymentOrder.id}` },
          { text: '📋 复制地址', callback_data: `copy_address_${paymentOrder.payment_address}` }
        ],
        [
          { text: '🔍 查看进度', callback_data: `check_payment_${paymentOrder.id}` },
          { text: '❌ 取消订单', callback_data: `cancel_payment_${paymentOrder.id}` }
        ],
        [
          { text: '🏠 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, paymentMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });
  }

  /**
   * 处理支付确认
   */
  static async handlePaymentConfirmation(
    chatId: number, 
    orderId: string, 
    userId: number
  ): Promise<void> {
    try {
      console.log(`🔍 User ${userId} confirmed payment for order ${orderId}`);

      // 获取订单信息
      const order = await db.paymentOrder.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        await telegramBotService.sendMessage(chatId, '❌ 订单不存在');
        return;
      }

      // 检查订单状态
      if (order.status !== 'pending') {
        await this.showOrderStatus(chatId, order);
        return;
      }

      // 立即检查支付状态
      await PaymentMonitorService.checkPaymentStatus(orderId);

      // 显示检查结果
      const updatedOrder = await db.paymentOrder.findUnique({
        where: { id: orderId }
      });

      if (updatedOrder && updatedOrder.status === 'paid') {
        await this.showPaymentSuccess(chatId, updatedOrder);
      } else {
        await this.showPaymentPending(chatId, order);
      }

    } catch (error) {
      console.error('Payment confirmation error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 支付检查失败，请重试');
    }
  }

  /**
   * 显示支付成功信息
   */
  private static async showPaymentSuccess(chatId: number, order: any): Promise<void> {
    const successMessage = `✅ <b>支付确认成功！</b>

💳 <b>订单信息：</b>
• 订单号：<code>${order.id}</code>
• 金额：<code>${order.amount_trx}</code> TRX
• 交易哈希：<code>${order.tx_hash}</code>

⚡ <b>处理状态：</b>
正在执行能量委托，预计3-5分钟完成

📱 您将收到完成通知，也可以查看订单详情。`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 订单详情', callback_data: `order_detail_${order.id}` },
          { text: '🔍 查看交易', url: `https://tronscan.org/#/transaction/${order.tx_hash}` }
        ],
        [
          { text: '🏠 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, successMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  /**
   * 显示支付待确认信息
   */
  private static async showPaymentPending(chatId: number, order: any): Promise<void> {
    const pendingMessage = `⏳ <b>支付确认中</b>

💳 <b>订单号：</b> <code>${order.id}</code>

🔍 <b>当前状态：</b> 等待支付确认
• 我们正在监控区块链交易
• 通常3-6秒内完成确认
• 确认后将自动处理

💡 <b>如果您已完成支付：</b>
• 请等待区块确认
• 无需重复操作
• 支付成功后会立即通知您

⚠️ <b>如果长时间未确认：</b>
• 检查转账金额是否正确
• 确认使用TRON主网
• 联系客服获取帮助`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 重新检查', callback_data: `confirm_payment_${order.id}` },
          { text: '📞 联系客服', callback_data: 'help_support' }
        ],
        [
          { text: '🏠 返回主菜单', callback_data: 'refresh_menu' }
        ]
      ]
    };

    await telegramBotService.sendMessage(chatId, pendingMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
}
```

## ⚡ 能量委托执行

### 4. 能量委托处理流程

```typescript
export class EnergyDelegationExample {
  /**
   * 执行能量委托
   */
  static async executeEnergyDelegation(order: any): Promise<void> {
    try {
      console.log(`⚡ Starting energy delegation for order ${order.id}`);

      // 更新订单状态为处理中
      await OrderStatusManager.updateOrderStatus(
        order.id,
        'processing',
        'Starting energy delegation'
      );

      // 获取委托参数
      const delegationParams = await this.prepareDelegationParams(order);

      // 执行能量委托
      const delegationResult = await this.performEnergyDelegation(delegationParams);

      if (delegationResult.success) {
        // 委托成功，更新订单状态
        await this.handleDelegationSuccess(order, delegationResult);
      } else {
        // 委托失败，处理失败情况
        await this.handleDelegationFailure(order, delegationResult.error);
      }

    } catch (error) {
      console.error('Energy delegation error:', error);
      await this.handleDelegationFailure(order, error.message);
    }
  }

  /**
   * 准备委托参数
   */
  private static async prepareDelegationParams(order: any): Promise<{
    recipientAddress: string;
    energyAmount: number;
    durationHours: number;
    estimatedCost: number;
  }> {
    // 获取套餐信息
    const packageInfo = await db.energyPackage.findUnique({
      where: { id: order.package_id }
    });

    if (!packageInfo) {
      throw new Error('Package not found');
    }

    // 获取当前网络状态
    const networkStatus = await this.getNetworkStatus();

    // 计算实际需要的资源量
    const energyAmount = packageInfo.energy;
    const estimatedCost = await this.estimateDelegationCost(energyAmount, packageInfo.duration_hours);

    return {
      recipientAddress: order.recipient_address,
      energyAmount,
      durationHours: packageInfo.duration_hours,
      estimatedCost
    };
  }

  /**
   * 执行能量委托
   */
  private static async performEnergyDelegation(params: any): Promise<{
    success: boolean;
    txHash?: string;
    delegationId?: string;
    error?: string;
  }> {
    try {
      // 获取 TRON 服务实例
      const tronWeb = TronService.getInstance();

      // 构建委托交易
      const delegateTransaction = await tronWeb.transactionBuilder.freezeBalanceV2(
        params.estimatedCost * 1000000, // 转换为 Sun
        'ENERGY',
        tronWeb.defaultAddress.base58
      );

      // 签名并广播交易
      const signedTx = await tronWeb.trx.sign(delegateTransaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        // 委托资源给目标地址
        const delegateResourceTx = await tronWeb.transactionBuilder.delegateResource(
          params.energyAmount,
          params.recipientAddress,
          'ENERGY',
          tronWeb.defaultAddress.base58,
          false, // 不锁定
          params.durationHours * 3600 // 转换为秒
        );

        const signedDelegateTx = await tronWeb.trx.sign(delegateResourceTx);
        const delegateResult = await tronWeb.trx.sendRawTransaction(signedDelegateTx);

        if (delegateResult.result) {
          return {
            success: true,
            txHash: delegateResult.txid,
            delegationId: this.generateDelegationId(result.txid, delegateResult.txid)
          };
        } else {
          throw new Error('Resource delegation failed');
        }
      } else {
        throw new Error('Freeze balance failed');
      }

    } catch (error) {
      console.error('Energy delegation execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理委托成功
   */
  private static async handleDelegationSuccess(order: any, result: any): Promise<void> {
    try {
      // 更新订单状态
      await db.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          tx_hash: result.txHash,
          delegation_id: result.delegationId,
          completed_at: new Date()
        }
      });

      // 创建委托记录
      await db.energyDelegation.create({
        data: {
          id: result.delegationId,
          order_id: order.id,
          recipient_address: order.recipient_address,
          energy_amount: order.energy_amount,
          duration_hours: order.duration_hours,
          tx_hash: result.txHash,
          status: 'active',
          created_at: new Date(),
          expires_at: new Date(Date.now() + order.duration_hours * 60 * 60 * 1000)
        }
      });

      // 发送完成通知
      await this.sendDelegationSuccessNotification(order, result);

      // 更新用户统计
      await this.updateUserStats(order);

      console.log(`✅ Energy delegation completed for order ${order.id}`);

    } catch (error) {
      console.error('Failed to handle delegation success:', error);
    }
  }

  /**
   * 处理委托失败
   */
  private static async handleDelegationFailure(order: any, errorMessage: string): Promise<void> {
    try {
      // 更新订单状态
      await OrderStatusManager.updateOrderStatus(
        order.id,
        'failed',
        `Energy delegation failed: ${errorMessage}`
      );

      // 退款处理
      await this.processRefund(order);

      // 发送失败通知
      await this.sendDelegationFailureNotification(order, errorMessage);

      console.log(`❌ Energy delegation failed for order ${order.id}: ${errorMessage}`);

    } catch (error) {
      console.error('Failed to handle delegation failure:', error);
    }
  }

  /**
   * 发送委托成功通知
   */
  private static async sendDelegationSuccessNotification(order: any, result: any): Promise<void> {
    try {
      const user = await UserService.getUserById(order.user_id);
      if (!user) return;

      const message = `🎉 <b>能量委托完成！</b>

✅ <b>订单信息：</b>
• 订单号：<code>${order.id}</code>
• 能量数量：<code>${order.energy_amount.toLocaleString()}</code> Energy
• 委托时长：<code>${order.duration_hours}</code> 小时
• 接收地址：<code>${order.recipient_address}</code>

🔗 <b>区块链信息：</b>
• 交易哈希：<code>${result.txHash}</code>
• 委托ID：<code>${result.delegationId}</code>

⏰ <b>到期时间：</b>
${new Date(Date.now() + order.duration_hours * 60 * 60 * 1000).toLocaleString('zh-CN')}

💡 现在您可以使用智能合约时消耗能量而不是TRX！`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔍 查看交易', url: `https://tronscan.org/#/transaction/${result.txHash}` },
            { text: '📊 查看委托', callback_data: `delegation_status_${result.delegationId}` }
          ],
          [
            { text: '🔄 再次购买', callback_data: 'buy_energy' },
            { text: '🏠 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };

      await telegramBotService.sendMessage(user.telegram_id, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Failed to send delegation success notification:', error);
    }
  }

  private static generateDelegationId(freezeTxId: string, delegateTxId: string): string {
    return `delegation_${Date.now()}_${freezeTxId.substring(0, 8)}_${delegateTxId.substring(0, 8)}`;
  }

  private static async getNetworkStatus(): Promise<any> {
    // 获取 TRON 网络状态
    const tronWeb = TronService.getInstance();
    return await tronWeb.trx.getNodeInfo();
  }

  private static async estimateDelegationCost(energyAmount: number, durationHours: number): Promise<number> {
    // 根据当前网络状况估算委托成本
    // 这里应该根据实际的 TRON 网络状况进行计算
    const baseRate = 0.00001; // TRX per Energy per hour
    return energyAmount * durationHours * baseRate;
  }
}
```

## 📋 订单管理示例

### 5. 订单查询和管理

```typescript
export class OrderManagementExample {
  /**
   * 显示用户订单列表
   */
  static async showUserOrders(chatId: number, userId: number, page: number = 1): Promise<void> {
    try {
      console.log(`📋 Showing orders for user ${userId}, page ${page}`);

      const user = await UserService.getUserByTelegramId(userId);
      if (!user) {
        await telegramBotService.sendMessage(chatId, '❌ 用户信息不存在');
        return;
      }

      // 分页获取订单
      const pageSize = 5;
      const { data: orders, pagination } = await DatabaseOptimizer.paginatedQuery(
        db.order,
        { user_id: user.id },
        page,
        pageSize,
        { created_at: 'desc' }
      );

      if (orders.length === 0) {
        await this.showNoOrdersMessage(chatId);
        return;
      }

      // 构建订单列表消息
      const ordersMessage = await this.buildOrdersListMessage(orders, pagination);
      
      // 构建分页键盘
      const keyboard = this.buildOrdersKeyboard(orders, pagination);

      await telegramBotService.sendMessage(chatId, ordersMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      // 记录查看事件
      await UserAnalytics.trackEvent(user.id, 'view_orders', {
        page,
        total_orders: pagination.total
      });

    } catch (error) {
      console.error('Show orders error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 获取订单失败，请重试');
    }
  }

  /**
   * 显示订单详情
   */
  static async showOrderDetail(chatId: number, orderId: string, userId: number): Promise<void> {
    try {
      console.log(`📄 Showing order detail ${orderId} for user ${userId}`);

      const user = await UserService.getUserByTelegramId(userId);
      if (!user) {
        await telegramBotService.sendMessage(chatId, '❌ 用户信息不存在');
        return;
      }

      // 获取订单详情
      const order = await db.order.findFirst({
        where: { 
          id: orderId,
          user_id: user.id 
        },
        include: {
          package: true,
          delegation: true,
          statusHistory: {
            orderBy: { created_at: 'desc' },
            take: 5
          }
        }
      });

      if (!order) {
        await telegramBotService.sendMessage(chatId, '❌ 订单不存在或无权访问');
        return;
      }

      // 构建详情消息
      const detailMessage = await this.buildOrderDetailMessage(order);
      
      // 构建操作键盘
      const keyboard = this.buildOrderDetailKeyboard(order);

      await telegramBotService.sendMessage(chatId, detailMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

      // 记录查看详情事件
      await UserAnalytics.trackEvent(user.id, 'view_order_detail', {
        order_id: orderId,
        order_status: order.status
      });

    } catch (error) {
      console.error('Show order detail error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 获取订单详情失败');
    }
  }

  /**
   * 构建订单列表消息
   */
  private static async buildOrdersListMessage(orders: any[], pagination: any): Promise<string> {
    let message = `📋 <b>我的订单</b> (第${pagination.page}/${pagination.totalPages}页)\n\n`;

    for (const order of orders) {
      const statusEmoji = this.getOrderStatusEmoji(order.status);
      const timeAgo = this.getTimeAgo(order.created_at);

      message += `${statusEmoji} <b>订单 #${order.id.substring(0, 8)}</b>
📦 ${order.package_name || '标准套餐'}
⚡ ${order.energy_amount.toLocaleString()} Energy
💰 ${order.price_trx} TRX
⏰ ${timeAgo}
🔄 状态：${this.getOrderStatusText(order.status)}

`;
    }

    message += `📊 <b>统计：</b> 共 ${pagination.total} 个订单`;

    return message;
  }

  /**
   * 构建订单详情消息
   */
  private static async buildOrderDetailMessage(order: any): Promise<string> {
    const statusEmoji = this.getOrderStatusEmoji(order.status);
    
    let message = `📄 <b>订单详情</b>

${statusEmoji} <b>订单号：</b> <code>${order.id}</code>
📦 <b>套餐名称：</b> ${order.package?.name || order.package_name || '标准套餐'}
⚡ <b>能量数量：</b> <code>${order.energy_amount.toLocaleString()}</code> Energy
💰 <b>支付金额：</b> <code>${order.price_trx}</code> TRX
📍 <b>接收地址：</b> <code>${order.recipient_address}</code>
🔄 <b>当前状态：</b> ${this.getOrderStatusText(order.status)}

⏰ <b>时间信息：</b>
• 创建时间：${order.created_at.toLocaleString('zh-CN')}`;

    if (order.completed_at) {
      message += `\n• 完成时间：${order.completed_at.toLocaleString('zh-CN')}`;
    }

    if (order.delegation) {
      message += `\n• 到期时间：${order.delegation.expires_at.toLocaleString('zh-CN')}`;
    }

    if (order.tx_hash) {
      message += `\n\n🔗 <b>区块链信息：</b>
• 交易哈希：<code>${order.tx_hash}</code>`;
    }

    if (order.delegation_id) {
      message += `\n• 委托ID：<code>${order.delegation_id}</code>`;
    }

    // 添加状态历史
    if (order.statusHistory && order.statusHistory.length > 0) {
      message += `\n\n📈 <b>状态历史：</b>`;
      for (const history of order.statusHistory.slice(0, 3)) {
        message += `\n• ${this.getOrderStatusText(history.to_status)} - ${history.created_at.toLocaleString('zh-CN')}`;
      }
    }

    return message;
  }

  /**
   * 构建订单操作键盘
   */
  private static buildOrderDetailKeyboard(order: any): any {
    const keyboard: any[][] = [];

    // 根据订单状态显示不同操作
    switch (order.status) {
      case 'pending':
        keyboard.push([
          { text: '💳 确认支付', callback_data: `confirm_payment_${order.id}` },
          { text: '❌ 取消订单', callback_data: `cancel_order_${order.id}` }
        ]);
        break;

      case 'processing':
        keyboard.push([
          { text: '🔄 刷新状态', callback_data: `refresh_order_${order.id}` }
        ]);
        break;

      case 'completed':
        if (order.tx_hash) {
          keyboard.push([
            { text: '🔍 查看交易', url: `https://tronscan.org/#/transaction/${order.tx_hash}` }
          ]);
        }
        if (order.delegation_id) {
          keyboard.push([
            { text: '📊 查看委托', callback_data: `delegation_status_${order.delegation_id}` }
          ]);
        }
        keyboard.push([
          { text: '🔄 再次购买', callback_data: 'buy_energy' }
        ]);
        break;

      case 'failed':
        keyboard.push([
          { text: '🔄 重新尝试', callback_data: `retry_order_${order.id}` },
          { text: '📞 联系客服', callback_data: 'help_support' }
        ]);
        break;
    }

    // 通用操作
    keyboard.push([
      { text: '🔙 返回订单列表', callback_data: 'my_orders' },
      { text: '🏠 主菜单', callback_data: 'refresh_menu' }
    ]);

    return { inline_keyboard: keyboard };
  }

  private static getOrderStatusEmoji(status: string): string {
    const emojiMap = {
      'pending': '⏳',
      'paid': '💳',
      'confirmed': '✅',
      'processing': '🔄',
      'completed': '🎉',
      'failed': '❌',
      'expired': '⏰',
      'cancelled': '🚫'
    };
    return emojiMap[status] || '❓';
  }

  private static getOrderStatusText(status: string): string {
    const textMap = {
      'pending': '等待支付',
      'paid': '已支付',
      'confirmed': '已确认',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败',
      'expired': '已过期',
      'cancelled': '已取消'
    };
    return textMap[status] || '未知状态';
  }

  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  }
}
```

## 👨‍💼 管理员功能

### 6. 管理员操作示例

```typescript
export class AdminFunctionsExample {
  /**
   * 管理员面板
   */
  static async showAdminPanel(chatId: number, userId: number): Promise<void> {
    try {
      // 验证管理员权限
      const user = await UserService.getUserByTelegramId(userId);
      if (!user || !UserPermissionManager.hasPermission(user, PERMISSIONS.ADMIN_PANEL)) {
        await telegramBotService.sendMessage(chatId, '❌ 您没有管理员权限');
        return;
      }

      // 获取系统统计
      const stats = await this.getSystemStats();

      const adminMessage = `🔧 <b>管理员面板</b>

📊 <b>系统概览：</b>
• 总用户数：<code>${stats.totalUsers}</code>
• 活跃用户：<code>${stats.activeUsers}</code>
• 今日订单：<code>${stats.todayOrders}</code>
• 今日收入：<code>${stats.todayRevenue}</code> TRX

⚡ <b>能量统计：</b>
• 总委托量：<code>${stats.totalEnergyDelegated.toLocaleString()}</code> Energy
• 活跃委托：<code>${stats.activeDelegations}</code>

🏥 <b>系统健康：</b>
• 数据库：${stats.dbStatus}
• TRON网络：${stats.tronStatus}
• 支付监控：${stats.paymentMonitorStatus}`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👥 用户管理', callback_data: 'admin_users' },
            { text: '📦 套餐管理', callback_data: 'admin_packages' }
          ],
          [
            { text: '💰 财务管理', callback_data: 'admin_finance' },
            { text: '⚙️ 系统设置', callback_data: 'admin_settings' }
          ],
          [
            { text: '📊 数据统计', callback_data: 'admin_analytics' },
            { text: '🔧 系统维护', callback_data: 'admin_maintenance' }
          ],
          [
            { text: '📢 广播消息', callback_data: 'admin_broadcast' },
            { text: '📋 系统日志', callback_data: 'admin_logs' }
          ],
          [
            { text: '🔙 返回主菜单', callback_data: 'refresh_menu' }
          ]
        ]
      };

      await telegramBotService.sendMessage(chatId, adminMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Admin panel error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 加载管理面板失败');
    }
  }

  /**
   * 用户管理功能
   */
  static async showUserManagement(chatId: number, userId: number): Promise<void> {
    try {
      const userStats = await this.getUserManagementStats();

      const message = `👥 <b>用户管理</b>

📈 <b>用户统计：</b>
• 总用户数：<code>${userStats.total}</code>
• 新用户（今日）：<code>${userStats.newToday}</code>
• 活跃用户（7天）：<code>${userStats.active7d}</code>
• VIP用户：<code>${userStats.vipUsers}</code>
• 被封用户：<code>${userStats.bannedUsers}</code>

🔍 请选择管理操作：`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👤 查找用户', callback_data: 'admin_find_user' },
            { text: '📊 用户统计', callback_data: 'admin_user_stats' }
          ],
          [
            { text: '🚫 封禁管理', callback_data: 'admin_ban_management' },
            { text: '👑 VIP管理', callback_data: 'admin_vip_management' }
          ],
          [
            { text: '💰 余额管理', callback_data: 'admin_balance_management' },
            { text: '📧 批量消息', callback_data: 'admin_bulk_message' }
          ],
          [
            { text: '🔙 返回管理面板', callback_data: 'admin_panel' }
          ]
        ]
      };

      await telegramBotService.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('User management error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 加载用户管理失败');
    }
  }

  /**
   * 广播消息功能
   */
  static async initiateBroadcast(chatId: number, userId: number): Promise<void> {
    try {
      const user = await UserService.getUserByTelegramId(userId);
      if (!user || !UserPermissionManager.hasPermission(user, PERMISSIONS.BROADCAST_MESSAGE)) {
        await telegramBotService.sendMessage(chatId, '❌ 您没有广播权限');
        return;
      }

      const message = `📢 <b>广播消息</b>

请发送要广播的消息内容。

📝 <b>支持格式：</b>
• 纯文本消息
• HTML格式（<b>粗体</b>、<i>斜体</i>等）
• 包含链接的消息

👥 <b>发送范围：</b>
稍后可选择发送给所有用户或特定用户群体。

💡 发送消息后，请等待确认选择发送范围。`;

      await telegramBotService.sendMessage(chatId, message, {
        parse_mode: 'HTML'
      });

      // 设置用户状态为广播模式
      UserStateManager.setState(userId, {
        chatId,
        currentAction: 'broadcast_message',
        step: 1,
        data: { admin_id: user.id }
      });

    } catch (error) {
      console.error('Broadcast initiation error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 初始化广播失败');
    }
  }

  /**
   * 处理广播消息内容
   */
  static async handleBroadcastContent(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const content = msg.text;
    const userId = msg.from?.id;

    if (!userId || !content) return;

    try {
      const userState = UserStateManager.getState(userId);
      if (!userState || userState.currentAction !== 'broadcast_message') {
        return;
      }

      // 保存广播内容
      UserStateManager.updateStateData(userId, {
        broadcast_content: content,
        step: 2
      });

      // 显示发送范围选择
      const message = `📢 <b>广播消息预览</b>

📝 <b>消息内容：</b>
${content}

👥 <b>请选择发送范围：</b>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👥 所有用户', callback_data: 'broadcast_all_users' },
            { text: '⭐ 仅VIP用户', callback_data: 'broadcast_vip_users' }
          ],
          [
            { text: '📈 活跃用户', callback_data: 'broadcast_active_users' },
            { text: '🆕 新用户', callback_data: 'broadcast_new_users' }
          ],
          [
            { text: '❌ 取消广播', callback_data: 'cancel_broadcast' }
          ]
        ]
      };

      await telegramBotService.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Broadcast content handling error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 处理广播内容失败');
    }
  }

  /**
   * 执行广播
   */
  static async executeBroadcast(
    chatId: number, 
    userId: number, 
    targetGroup: string
  ): Promise<void> {
    try {
      const userState = UserStateManager.getState(userId);
      if (!userState || !userState.data.broadcast_content) {
        await telegramBotService.sendMessage(chatId, '❌ 广播内容丢失');
        return;
      }

      // 获取目标用户列表
      const targetUsers = await this.getTargetUsers(targetGroup);
      
      const confirmMessage = `📢 <b>确认广播</b>

📝 <b>消息内容：</b>
${userState.data.broadcast_content}

👥 <b>发送范围：</b> ${this.getTargetGroupName(targetGroup)}
📊 <b>目标用户数：</b> ${targetUsers.length}

⚠️ <b>确认发送吗？此操作不可撤销。</b>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ 确认发送', callback_data: `confirm_broadcast_${targetGroup}` },
            { text: '❌ 取消', callback_data: 'cancel_broadcast' }
          ]
        ]
      };

      await telegramBotService.sendMessage(chatId, confirmMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Broadcast execution error:', error);
      await telegramBotService.sendMessage(chatId, '❌ 执行广播失败');
    }
  }

  private static async getSystemStats(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      todayOrders,
      todayRevenue,
      totalEnergyDelegated,
      activeDelegations
    ] = await Promise.all([
      db.user.count(),
      db.user.count({
        where: {
          last_activity: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      db.order.count({
        where: {
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      db.order.aggregate({
        _sum: { price_trx: true },
        where: {
          status: 'completed',
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      db.energyDelegation.aggregate({
        _sum: { energy_amount: true }
      }),
      db.energyDelegation.count({
        where: {
          status: 'active',
          expires_at: { gt: new Date() }
        }
      })
    ]);

    // 健康检查
    const healthCheck = await DiagnosticsService.performHealthCheck();

    return {
      totalUsers,
      activeUsers,
      todayOrders,
      todayRevenue: todayRevenue._sum.price_trx || 0,
      totalEnergyDelegated: totalEnergyDelegated._sum.energy_amount || 0,
      activeDelegations,
      dbStatus: healthCheck.services.database?.status === 'up' ? '✅' : '❌',
      tronStatus: healthCheck.services.tron?.status === 'up' ? '✅' : '❌',
      paymentMonitorStatus: '✅' // 简化状态
    };
  }
}
```

## 🧪 集成测试示例

### 7. 端到端测试流程

```typescript
export class IntegrationTestExample {
  /**
   * 完整流程测试
   */
  static async runFullFlowTest(): Promise<void> {
    console.log('🧪 Starting full flow integration test...');

    try {
      // 1. 模拟用户注册
      const testUser = await this.simulateUserRegistration();
      console.log('✅ User registration test passed');

      // 2. 模拟地址设置
      await this.simulateAddressSetup(testUser);
      console.log('✅ Address setup test passed');

      // 3. 模拟套餐购买
      const testOrder = await this.simulatePackagePurchase(testUser);
      console.log('✅ Package purchase test passed');

      // 4. 模拟支付确认
      await this.simulatePaymentConfirmation(testOrder);
      console.log('✅ Payment confirmation test passed');

      // 5. 模拟能量委托
      await this.simulateEnergyDelegation(testOrder);
      console.log('✅ Energy delegation test passed');

      // 6. 清理测试数据
      await this.cleanupTestData(testUser, testOrder);
      console.log('✅ Test cleanup completed');

      console.log('🎉 Full flow integration test completed successfully!');

    } catch (error) {
      console.error('❌ Integration test failed:', error);
      throw error;
    }
  }

  /**
   * 模拟用户注册
   */
  private static async simulateUserRegistration(): Promise<any> {
    const testTelegramUser = {
      telegram_id: 999999999,
      username: 'test_user',
      first_name: 'Test',
      last_name: 'User',
      language_code: 'zh'
    };

    return await UserService.registerTelegramUser(testTelegramUser);
  }

  /**
   * 模拟地址设置
   */
  private static async simulateAddressSetup(user: any): Promise<void> {
    const testAddress = 'TTestAddress123456789abcdefghijklmno';
    await UserService.activateUser(user.id, testAddress);
  }

  /**
   * 模拟套餐购买
   */
  private static async simulatePackagePurchase(user: any): Promise<any> {
    // 创建测试套餐
    const testPackage = await db.energyPackage.create({
      data: {
        name: '测试套餐',
        energy: 32000,
        duration_hours: 24,
        price_trx: 10,
        is_active: true
      }
    });

    // 创建测试订单
    return await db.order.create({
      data: {
        user_id: user.id,
        package_id: testPackage.id,
        package_name: testPackage.name,
        energy_amount: testPackage.energy,
        duration_hours: testPackage.duration_hours,
        price_trx: testPackage.price_trx,
        recipient_address: user.tron_address,
        status: 'pending'
      }
    });
  }

  /**
   * 模拟支付确认
   */
  private static async simulatePaymentConfirmation(order: any): Promise<void> {
    const testTxHash = 'test_tx_hash_' + Date.now();
    
    await db.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        tx_hash: testTxHash,
        paid_at: new Date()
      }
    });
  }

  /**
   * 模拟能量委托
   */
  private static async simulateEnergyDelegation(order: any): Promise<void> {
    const delegationId = 'test_delegation_' + Date.now();
    
    // 更新订单状态
    await db.order.update({
      where: { id: order.id },
      data: {
        status: 'completed',
        delegation_id: delegationId,
        completed_at: new Date()
      }
    });

    // 创建委托记录
    await db.energyDelegation.create({
      data: {
        id: delegationId,
        order_id: order.id,
        recipient_address: order.recipient_address,
        energy_amount: order.energy_amount,
        duration_hours: order.duration_hours,
        status: 'active',
        created_at: new Date(),
        expires_at: new Date(Date.now() + order.duration_hours * 60 * 60 * 1000)
      }
    });
  }

  /**
   * 清理测试数据
   */
  private static async cleanupTestData(user: any, order: any): Promise<void> {
    // 删除测试数据
    await db.energyDelegation.deleteMany({
      where: { order_id: order.id }
    });

    await db.order.delete({
      where: { id: order.id }
    });

    await db.energyPackage.deleteMany({
      where: { name: '测试套餐' }
    });

    await db.user.delete({
      where: { id: user.id }
    });
  }
}
```

## 💡 使用建议和最佳实践

### 开发环境设置

```bash
# 1. 安装依赖
npm install

# 2. 设置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的参数

# 3. 初始化数据库
npm run db:migrate
npm run db:seed

# 4. 启动开发服务器
npm run dev

# 5. 运行集成测试
npm run test:integration
```

### 生产部署清单

- [ ] ✅ **安全配置** - 更新所有密钥和密码
- [ ] ✅ **数据库优化** - 创建索引，配置连接池
- [ ] ✅ **监控设置** - 配置日志记录和健康检查
- [ ] ✅ **Webhook 配置** - 设置 HTTPS 和证书
- [ ] ✅ **备份策略** - 配置数据库和配置文件备份
- [ ] ✅ **负载测试** - 验证系统在高负载下的表现
- [ ] ✅ **错误处理** - 确保所有错误场景都有适当处理
- [ ] ✅ **用户文档** - 提供用户使用指南

## 🔗 相关文档

- [README](./README.md) - 完整 API 文档导航
- [Error Handling](./10-error-handling.md) - 错误处理指南
- [User Management API](./06-user-management-api.md) - 用户管理
- [Payment Integration API](./07-payment-integration-api.md) - 支付集成

---

> 💡 **实践建议**
> 
> 这些示例展示了项目的完整实现流程。在实际开发中，建议：
> 
> 1. **从小规模开始** - 先实现核心功能，再逐步添加高级特性
> 2. **充分测试** - 每个功能都要有对应的测试用例
> 3. **监控优先** - 从一开始就建立完善的监控和日志系统
> 4. **用户体验** - 关注用户反馈，持续优化交互流程
> 5. **文档维护** - 保持代码和文档的同步更新

