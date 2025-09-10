# TRON能量租赁项目通知管理系统设计方案

## 📋 项目通知类型完整清单

### 🔥 业务核心通知（自动触发）

| 通知类型 | 触发时机 | 目标用户 | 优先级 | 是否可配置 |
|----------|----------|----------|--------|-----------|
| **订单创建通知** | 用户下单成功 | 订单用户 | 🔥 高 | ✅ |
| **支付成功通知** | 检测到支付到账 | 订单用户 | 🔥 高 | ✅ |
| **支付超时通知** | 订单15分钟未支付 | 订单用户 | 🔥 高 | ✅ |
| **能量委托成功通知** | 能量委托完成 | 订单用户 | 🔥 高 | ✅ |
| **能量委托失败通知** | 委托过程失败 | 订单用户 | 🔥 高 | ✅ |
| **订单状态变更通知** | 处理中、已完成、失败 | 订单用户 | 🔥 高 | ✅ |
| **余额充值成功通知** | 用户充值到账 | 充值用户 | 🔥 高 | ✅ |
| **余额不足提醒** | 下单时余额不足 | 订单用户 | 🔄 中 | ✅ |

### 💰 代理业务通知（自动触发）

| 通知类型 | 触发时机 | 目标用户 | 优先级 | 是否可配置 |
|----------|----------|----------|--------|-----------|
| **代理申请提交通知** | 用户提交代理申请 | 申请用户 | 🔄 中 | ✅ |
| **代理审核通过通知** | 管理员审核通过 | 代理用户 | 🔥 高 | ✅ |
| **代理审核拒绝通知** | 管理员审核拒绝 | 申请用户 | 🔄 中 | ✅ |
| **佣金到账通知** | 下级用户消费产生佣金 | 代理用户 | 🔄 中 | ✅ |
| **代理等级升级通知** | 达到升级条件 | 代理用户 | ⭐ 低 | ✅ |
| **提现成功通知** | 佣金提现完成 | 代理用户 | 🔥 高 | ✅ |
| **月度佣金统计通知** | 每月1号发送 | 所有代理 | ⭐ 低 | ✅ |

### 💰 价格和市场通知（自动触发）

| 通知类型 | 触发时机 | 目标用户 | 优先级 | 是否可配置 |
|----------|----------|----------|--------|-----------|
| **价格上涨通知** | 能量价格上涨5%以上 | 订阅用户 | 🔄 中 | ✅ |
| **价格下降通知** | 能量价格下降5%以上 | 订阅用户 | 🔄 中 | ✅ |
| **新套餐上线通知** | 新增能量套餐 | 所有用户 | ⭐ 低 | ✅ |
| **限时优惠通知** | 特价活动开始 | 目标群体 | 🔄 中 | ✅ |
| **库存预警通知** | 能量池库存不足 | 管理员 | ⚠️ 高 | ✅ |

### ⚠️ 系统和安全通知（管理员手动/自动触发）

| 通知类型 | 触发时机 | 目标用户 | 优先级 | 触发方式 |
|----------|----------|----------|--------|----------|
| **系统维护通知** | 计划维护前24小时 | 所有用户 | ⚠️ 高 | 🔧 管理员手动 |
| **维护开始通知** | 维护开始时 | 所有用户 | ⚠️ 高 | 🔧 管理员手动 |
| **维护完成通知** | 维护结束后 | 所有用户 | ⚠️ 高 | 🔧 管理员手动 |
| **系统异常通知** | 关键服务故障 | 管理员 | 🚨 紧急 | 🤖 自动触发 |
| **安全警告通知** | 异常登录、大额交易 | 相关用户 | ⚠️ 高 | 🤖 自动触发 |
| **每日数据报告** | 每日23:59 | 管理员 | ⭐ 低 | 🤖 自动触发 |
| **重要公告通知** | 政策变更、重要声明 | 所有用户 | ⚠️ 高 | 🔧 管理员手动 |
| **节假日祝福** | 节假日当天 | 所有用户 | ⭐ 低 | 🔧 管理员手动 |

### 📊 运营和营销通知（管理员手动触发）

| 通知类型 | 触发时机 | 目标用户 | 优先级 | 特殊说明 |
|----------|----------|----------|--------|----------|
| **用户生日祝福** | 用户生日当天 | 生日用户 | ⭐ 低 | 可设置自动/手动 |
| **长期未使用提醒** | 30天未登录 | 沉睡用户 | ⭐ 低 | 自动批量发送 |
| **新功能介绍** | 功能上线时 | 目标用户群 | 🔄 中 | 分批次发送 |
| **用户满意度调查** | 每季度一次 | 活跃用户 | ⭐ 低 | 问卷形式 |
| **VIP用户专享通知** | 特殊活动 | VIP用户 | 🔄 中 | 个性化内容 |

## 🎛️ 机器人卡片通知配置界面设计

### 主界面布局

```typescript
// 机器人卡片扩展 - 通知管理标签页
interface BotNotificationConfig {
  // 基础设置
  enabled: boolean;                    // 通知功能总开关
  default_language: string;            // 默认语言
  timezone: string;                   // 时区设置
  
  // 通知分类配置
  business_notifications: BusinessNotificationConfig;    // 业务通知
  agent_notifications: AgentNotificationConfig;         // 代理通知
  price_notifications: PriceNotificationConfig;        // 价格通知
  system_notifications: SystemNotificationConfig;      // 系统通知
  marketing_notifications: MarketingNotificationConfig; // 营销通知
  
  // 发送策略
  rate_limiting: RateLimitingConfig;   // 频率限制
  retry_strategy: RetryConfig;         // 重试策略
  quiet_hours: QuietHoursConfig;       // 静默时间
  
  // 模板管理
  message_templates: MessageTemplateConfig;  // 消息模板
  
  // 统计和监控
  analytics_enabled: boolean;          // 统计开关
  performance_monitoring: boolean;     // 性能监控
}
```

### 通知配置界面组件

```vue
<template>
  <div class="bot-notification-management">
    <!-- 通知功能总开关 -->
    <div class="notification-master-switch">
      <el-switch 
        v-model="config.enabled"
        active-text="通知功能已启用"
        inactive-text="通知功能已禁用"
        size="large"
      />
    </div>

    <!-- 通知分类配置标签页 -->
    <el-tabs v-model="activeTab" type="border-card">
      
      <!-- 业务通知配置 -->
      <el-tab-pane label="💼 业务通知" name="business">
        <BusinessNotificationPanel 
          v-model="config.business_notifications"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 代理通知配置 -->
      <el-tab-pane label="👥 代理通知" name="agent">
        <AgentNotificationPanel 
          v-model="config.agent_notifications"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 价格通知配置 -->
      <el-tab-pane label="💰 价格通知" name="price">
        <PriceNotificationPanel 
          v-model="config.price_notifications"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 系统通知配置 -->
      <el-tab-pane label="⚠️ 系统通知" name="system">
        <SystemNotificationPanel 
          v-model="config.system_notifications"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 营销通知配置 -->
      <el-tab-pane label="📢 营销通知" name="marketing">
        <MarketingNotificationPanel 
          v-model="config.marketing_notifications"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 消息模板管理 -->
      <el-tab-pane label="📝 消息模板" name="templates">
        <MessageTemplatePanel 
          v-model="config.message_templates"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 发送设置 -->
      <el-tab-pane label="⚙️ 发送设置" name="settings">
        <NotificationSettingsPanel 
          v-model="config"
          :bot-id="botId"
        />
      </el-tab-pane>

      <!-- 统计监控 -->
      <el-tab-pane label="📊 统计监控" name="analytics">
        <NotificationAnalyticsPanel 
          :bot-id="botId"
        />
      </el-tab-pane>

    </el-tabs>

    <!-- 快速操作区域 -->
    <div class="quick-actions">
      <el-button 
        type="primary" 
        :icon="Send"
        @click="showManualNotificationDialog = true"
      >
        📢 发送系统通知
      </el-button>
      
      <el-button 
        type="success"
        :icon="DocumentCopy"
        @click="exportConfig"
      >
        📄 导出配置
      </el-button>
      
      <el-button 
        type="warning"
        :icon="Upload"
        @click="importConfig"
      >
        📂 导入配置
      </el-button>
    </div>

    <!-- 手动发送通知对话框 -->
    <ManualNotificationDialog 
      v-model="showManualNotificationDialog"
      :bot-id="botId"
      @sent="handleNotificationSent"
    />

  </div>
</template>
```

### 业务通知配置面板

```vue
<template>
  <div class="business-notification-panel">
    <el-card>
      <template #header>
        <span>💼 业务通知配置</span>
        <el-switch 
          v-model="config.enabled"
          class="float-right"
        />
      </template>

      <!-- 订单相关通知 -->
      <el-collapse v-model="activeNames">
        
        <el-collapse-item title="📋 订单通知" name="order">
          <div class="notification-group">
            
            <div class="notification-item">
              <div class="item-header">
                <span>订单创建通知</span>
                <el-switch v-model="config.order_created.enabled" />
              </div>
              <div class="item-content" v-if="config.order_created.enabled">
                <el-form-item label="发送延迟">
                  <el-input-number 
                    v-model="config.order_created.delay_seconds"
                    :min="0" :max="300" 
                    controls-position="right"
                  />
                  <span class="unit">秒</span>
                </el-form-item>
                
                <el-form-item label="包含内容">
                  <el-checkbox-group v-model="config.order_created.include_fields">
                    <el-checkbox label="order_id">订单号</el-checkbox>
                    <el-checkbox label="package_name">套餐名称</el-checkbox>
                    <el-checkbox label="amount">金额</el-checkbox>
                    <el-checkbox label="target_address">目标地址</el-checkbox>
                    <el-checkbox label="payment_qr">支付二维码</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>

                <el-form-item label="操作按钮">
                  <el-checkbox-group v-model="config.order_created.action_buttons">
                    <el-checkbox label="view_details">查看详情</el-checkbox>
                    <el-checkbox label="contact_support">联系客服</el-checkbox>
                    <el-checkbox label="cancel_order">取消订单</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </div>
            </div>

            <el-divider />

            <div class="notification-item">
              <div class="item-header">
                <span>支付成功通知</span>
                <el-switch v-model="config.payment_success.enabled" />
              </div>
              <div class="item-content" v-if="config.payment_success.enabled">
                <el-form-item label="包含图片">
                  <el-switch v-model="config.payment_success.include_image" />
                </el-form-item>
                
                <el-form-item label="显示交易链接">
                  <el-switch v-model="config.payment_success.show_tx_link" />
                </el-form-item>

                <el-form-item label="后续操作提示">
                  <el-checkbox-group v-model="config.payment_success.next_actions">
                    <el-checkbox label="show_processing_time">显示处理时间</el-checkbox>
                    <el-checkbox label="show_delegation_status">显示委托状态</el-checkbox>
                    <el-checkbox label="offer_more_packages">推荐其他套餐</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </div>
            </div>

            <!-- 其他订单通知配置项... -->
            
          </div>
        </el-collapse-item>

        <!-- 能量委托通知 -->
        <el-collapse-item title="⚡ 能量委托通知" name="delegation">
          <!-- 类似的配置结构 -->
        </el-collapse-item>

      </el-collapse>
    </el-card>
  </div>
</template>
```

### 系统通知管理面板（管理员手动触发）

```vue
<template>
  <div class="system-notification-panel">
    
    <!-- 系统维护通知 -->
    <el-card class="maintenance-notification">
      <template #header>
        <span>🔧 系统维护通知</span>
      </template>

      <el-form :model="maintenanceForm" label-width="120px">
        
        <el-form-item label="维护类型">
          <el-select v-model="maintenanceForm.type" placeholder="选择维护类型">
            <el-option label="计划维护" value="scheduled" />
            <el-option label="紧急维护" value="emergency" />
            <el-option label="功能升级" value="upgrade" />
          </el-select>
        </el-form-item>

        <el-form-item label="开始时间">
          <el-date-picker
            v-model="maintenanceForm.start_time"
            type="datetime"
            placeholder="选择开始时间"
          />
        </el-form-item>

        <el-form-item label="预计时长">
          <el-input-number 
            v-model="maintenanceForm.duration_hours"
            :min="0.5" :max="24" :step="0.5"
            controls-position="right"
          />
          <span class="unit">小时</span>
        </el-form-item>

        <el-form-item label="影响功能">
          <el-checkbox-group v-model="maintenanceForm.affected_features">
            <el-checkbox label="order_creation">下单功能</el-checkbox>
            <el-checkbox label="payment_processing">支付处理</el-checkbox>
            <el-checkbox label="energy_delegation">能量委托</el-checkbox>
            <el-checkbox label="agent_functions">代理功能</el-checkbox>
            <el-checkbox label="customer_service">客服支持</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="维护内容">
          <el-input 
            type="textarea" 
            v-model="maintenanceForm.description"
            placeholder="详细描述本次维护的内容和目的"
            :rows="3"
          />
        </el-form-item>

        <el-form-item label="发送时机">
          <el-checkbox-group v-model="maintenanceForm.send_schedule">
            <el-checkbox label="advance_24h">提前24小时通知</el-checkbox>
            <el-checkbox label="advance_1h">提前1小时提醒</el-checkbox>
            <el-checkbox label="start_notification">维护开始通知</el-checkbox>
            <el-checkbox label="completion_notification">维护完成通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="目标用户">
          <el-radio-group v-model="maintenanceForm.target_users">
            <el-radio label="all">所有用户</el-radio>
            <el-radio label="active_only">仅活跃用户</el-radio>
            <el-radio label="agents_only">仅代理用户</el-radio>
            <el-radio label="custom">自定义群体</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            @click="scheduleMaintenanceNotification"
            :loading="sendingMaintenance"
          >
            📅 安排维护通知
          </el-button>
          
          <el-button 
            type="warning" 
            @click="sendImmediateNotification"
            :loading="sendingImmediate"
          >
            📢 立即发送通知
          </el-button>
        </el-form-item>

      </el-form>
    </el-card>

    <!-- 重要公告通知 -->
    <el-card class="announcement-notification">
      <template #header>
        <span>📢 重要公告</span>
      </template>

      <el-form :model="announcementForm" label-width="120px">
        
        <el-form-item label="公告类型">
          <el-select v-model="announcementForm.type" placeholder="选择公告类型">
            <el-option label="政策变更" value="policy_change" />
            <el-option label="功能更新" value="feature_update" />
            <el-option label="安全提醒" value="security_alert" />
            <el-option label="节假日祝福" value="holiday_greeting" />
            <el-option label="其他公告" value="general" />
          </el-select>
        </el-form-item>

        <el-form-item label="公告标题">
          <el-input 
            v-model="announcementForm.title"
            placeholder="输入公告标题"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公告内容">
          <el-input 
            type="textarea" 
            v-model="announcementForm.content"
            placeholder="输入公告详细内容"
            :rows="5"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="配图">
          <el-upload
            class="announcement-uploader"
            action="/api/upload/announcement-image"
            :show-file-list="false"
            :on-success="handleImageUpload"
          >
            <img v-if="announcementForm.image_url" :src="announcementForm.image_url" class="announcement-image" />
            <el-icon v-else class="announcement-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="紧急程度">
          <el-radio-group v-model="announcementForm.urgency">
            <el-radio label="low">📅 普通</el-radio>
            <el-radio label="medium">⚠️ 重要</el-radio>
            <el-radio label="high">🚨 紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="发送策略">
          <el-checkbox-group v-model="announcementForm.send_options">
            <el-checkbox label="immediate">立即发送</el-checkbox>
            <el-checkbox label="optimal_time">智能时间发送</el-checkbox>
            <el-checkbox label="pin_message">置顶消息</el-checkbox>
            <el-checkbox label="disable_preview">禁用预览</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="操作按钮">
          <div class="action-buttons-config">
            <el-input 
              v-model="announcementForm.action_button.text"
              placeholder="按钮文字"
              style="width: 150px; margin-right: 10px;"
            />
            <el-select 
              v-model="announcementForm.action_button.type"
              placeholder="按钮类型"
              style="width: 120px; margin-right: 10px;"
            >
              <el-option label="URL链接" value="url" />
              <el-option label="回调动作" value="callback" />
              <el-option label="无按钮" value="none" />
            </el-select>
            <el-input 
              v-model="announcementForm.action_button.value"
              placeholder="链接或回调数据"
              style="width: 200px;"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            @click="sendAnnouncement"
            :loading="sendingAnnouncement"
          >
            📢 发送公告
          </el-button>
          
          <el-button 
            @click="previewAnnouncement"
          >
            👁️ 预览效果
          </el-button>
        </el-form-item>

      </el-form>
    </el-card>

    <!-- 发送历史记录 -->
    <el-card class="notification-history">
      <template #header>
        <span>📊 发送历史</span>
      </template>
      
      <el-table :data="notificationHistory" style="width: 100%">
        <el-table-column prop="type" label="通知类型" width="120" />
        <el-table-column prop="title" label="标题" width="200" />
        <el-table-column prop="target_count" label="目标用户数" width="100" />
        <el-table-column prop="sent_count" label="成功发送" width="100" />
        <el-table-column prop="failed_count" label="发送失败" width="100" />
        <el-table-column prop="created_at" label="发送时间" width="160" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button 
              size="small" 
              @click="viewDetails(scope.row)"
            >
              查看详情
            </el-button>
            <el-button 
              size="small" 
              type="warning"
              @click="resendNotification(scope.row)"
            >
              重新发送
            </el-button>
          </template>
        </el-table-column>
      </el-table>

    </el-card>

  </div>
</template>
```

### 消息模板管理

```vue
<template>
  <div class="message-template-panel">
    
    <!-- 模板列表 -->
    <div class="template-list">
      <el-card>
        <template #header>
          <div class="template-header">
            <span>📝 消息模板库</span>
            <el-button 
              type="primary" 
              size="small"
              @click="showCreateTemplate = true"
            >
              ➕ 新建模板
            </el-button>
          </div>
        </template>

        <el-table :data="templates" style="width: 100%">
          
          <el-table-column prop="name" label="模板名称" width="200" />
          
          <el-table-column prop="type" label="通知类型" width="150">
            <template #default="scope">
              <el-tag :type="getTypeColor(scope.row.type)">
                {{ getTypeName(scope.row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="language" label="语言" width="100" />
          
          <el-table-column label="模板预览" width="300">
            <template #default="scope">
              <div class="template-preview">
                {{ truncateText(scope.row.content, 100) }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="usage_count" label="使用次数" width="100" />
          
          <el-table-column prop="updated_at" label="更新时间" width="160" />
          
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button 
                size="small" 
                @click="editTemplate(scope.row)"
              >
                ✏️ 编辑
              </el-button>
              <el-button 
                size="small" 
                type="success"
                @click="testTemplate(scope.row)"
              >
                🧪 测试
              </el-button>
              <el-button 
                size="small" 
                type="info"
                @click="duplicateTemplate(scope.row)"
              >
                📄 复制
              </el-button>
              <el-button 
                size="small" 
                type="danger"
                @click="deleteTemplate(scope.row)"
              >
                🗑️ 删除
              </el-button>
            </template>
          </el-table-column>
          
        </el-table>
      </el-card>
    </div>

    <!-- 模板编辑器 -->
    <el-dialog 
      v-model="showTemplateEditor" 
      title="编辑消息模板"
      width="80%"
      :before-close="handleEditorClose"
    >
      <div class="template-editor">
        
        <!-- 基础信息 -->
        <el-form :model="currentTemplate" label-width="120px">
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板名称" required>
                <el-input v-model="currentTemplate.name" placeholder="输入模板名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="通知类型" required>
                <el-select v-model="currentTemplate.type" placeholder="选择通知类型">
                  <el-option 
                    v-for="type in notificationTypes" 
                    :key="type.value"
                    :label="type.label" 
                    :value="type.value" 
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="语言">
                <el-select v-model="currentTemplate.language" placeholder="选择语言">
                  <el-option label="中文" value="zh" />
                  <el-option label="English" value="en" />
                  <el-option label="日本語" value="ja" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="消息格式">
                <el-select v-model="currentTemplate.parse_mode" placeholder="选择格式">
                  <el-option label="Markdown" value="Markdown" />
                  <el-option label="HTML" value="HTML" />
                  <el-option label="纯文本" value="text" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

        </el-form>

        <!-- 内容编辑区域 -->
        <div class="content-editor">
          <el-row :gutter="20">
            
            <!-- 模板内容 -->
            <el-col :span="12">
              <div class="editor-section">
                <h4>📝 消息内容</h4>
                <el-input
                  type="textarea"
                  v-model="currentTemplate.content"
                  placeholder="输入消息模板内容，使用 {{变量名}} 来表示动态内容"
                  :rows="15"
                  class="template-textarea"
                />
                
                <!-- 变量助手 -->
                <div class="variable-helper">
                  <h5>💡 可用变量</h5>
                  <div class="variable-tags">
                    <el-tag 
                      v-for="variable in availableVariables" 
                      :key="variable.name"
                      @click="insertVariable(variable.name)"
                      class="variable-tag"
                    >
                      {{`{{${variable.name}}}`}}
                    </el-tag>
                  </div>
                </div>
              </div>
            </el-col>
            
            <!-- 实时预览 -->
            <el-col :span="12">
              <div class="preview-section">
                <h4>👁️ 实时预览</h4>
                <div class="telegram-preview">
                  <div class="telegram-message">
                    <div v-html="renderPreview()" class="message-content"></div>
                    
                    <!-- 按钮预览 -->
                    <div v-if="currentTemplate.buttons && currentTemplate.buttons.length > 0" class="buttons-preview">
                      <div 
                        v-for="(button, index) in currentTemplate.buttons" 
                        :key="index"
                        class="telegram-button"
                      >
                        {{ button.text }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 测试数据 -->
                <div class="test-data">
                  <h5>🧪 测试数据</h5>
                  <el-input
                    type="textarea"
                    v-model="testDataJson"
                    placeholder="输入JSON格式的测试数据"
                    :rows="5"
                    @input="updatePreview"
                  />
                </div>
              </div>
            </el-col>
            
          </el-row>
        </div>

        <!-- 按钮配置 -->
        <div class="buttons-config">
          <h4>🔘 内联按钮配置</h4>
          <div 
            v-for="(button, index) in currentTemplate.buttons" 
            :key="index"
            class="button-config-item"
          >
            <el-row :gutter="10">
              <el-col :span="6">
                <el-input v-model="button.text" placeholder="按钮文字" />
              </el-col>
              <el-col :span="4">
                <el-select v-model="button.type" placeholder="类型">
                  <el-option label="回调" value="callback_data" />
                  <el-option label="链接" value="url" />
                </el-select>
              </el-col>
              <el-col :span="8">
                <el-input v-model="button.value" placeholder="回调数据或URL" />
              </el-col>
              <el-col :span="4">
                <el-button 
                  type="danger" 
                  size="small"
                  @click="removeButton(index)"
                >
                  删除
                </el-button>
              </el-col>
            </el-row>
          </div>
          
          <el-button 
            type="primary" 
            size="small"
            @click="addButton"
          >
            ➕ 添加按钮
          </el-button>
        </div>

      </div>

      <template #footer>
        <el-button @click="showTemplateEditor = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存模板</el-button>
        <el-button type="success" @click="testCurrentTemplate">发送测试</el-button>
      </template>

    </el-dialog>

  </div>
</template>
```

## 🛠️ 数据库扩展设计

### 通知配置表

```sql
-- 机器人通知配置表
CREATE TABLE telegram_bot_notification_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 总体配置
    enabled BOOLEAN DEFAULT true,
    default_language VARCHAR(10) DEFAULT 'zh',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 分类配置 (JSON)
    business_notifications JSONB DEFAULT '{}',
    agent_notifications JSONB DEFAULT '{}',
    price_notifications JSONB DEFAULT '{}',
    system_notifications JSONB DEFAULT '{}',
    marketing_notifications JSONB DEFAULT '{}',
    
    -- 发送策略
    rate_limiting JSONB DEFAULT '{}',
    retry_strategy JSONB DEFAULT '{}',
    quiet_hours JSONB DEFAULT '{}',
    
    -- 统计开关
    analytics_enabled BOOLEAN DEFAULT true,
    performance_monitoring BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 消息模板表
CREATE TABLE telegram_message_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 通知类型
    language VARCHAR(10) DEFAULT 'zh',
    
    -- 模板内容
    content TEXT NOT NULL,
    parse_mode VARCHAR(20) DEFAULT 'Markdown',
    
    -- 按钮配置
    buttons JSONB DEFAULT '[]',
    
    -- 变量定义
    variables JSONB DEFAULT '[]',
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL
);

-- 通知发送记录表
CREATE TABLE telegram_notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 通知基本信息
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    
    -- 发送目标
    target_type VARCHAR(50) NOT NULL, -- 'all', 'user', 'group', 'agents'
    target_count INTEGER DEFAULT 0,
    
    -- 发送结果
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
    
    -- 发送内容
    message_content TEXT,
    template_id UUID REFERENCES telegram_message_templates(id),
    
    -- 发送配置
    send_immediately BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    error_details TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL
);

-- 用户通知偏好表
CREATE TABLE user_notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    -- 通知开关
    enabled_types JSONB DEFAULT '[]', -- 允许的通知类型数组
    disabled_types JSONB DEFAULT '[]', -- 禁用的通知类型数组
    
    -- 时间设置
    quiet_hours JSONB DEFAULT '{}', -- 静默时间段配置
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 接收偏好
    prefer_images BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'zh',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, bot_id)
);

-- 通知统计表
CREATE TABLE telegram_notification_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bot_id UUID NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    
    -- 发送统计
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    -- 用户交互统计
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    -- 性能统计
    avg_send_time_ms INTEGER DEFAULT 0,
    max_send_time_ms INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(bot_id, date, notification_type)
);
```

## 🚀 后端API接口设计

### 通知配置API

```typescript
// 通知配置管理API
export class NotificationConfigAPI {
  
  // 获取机器人通知配置
  async getBotNotificationConfig(botId: string): Promise<BotNotificationConfig> {
    const result = await query(
      'SELECT * FROM telegram_bot_notification_configs WHERE bot_id = $1',
      [botId]
    );
    
    if (result.rows.length === 0) {
      // 创建默认配置
      return await this.createDefaultConfig(botId);
    }
    
    return this.parseConfig(result.rows[0]);
  }
  
  // 更新通知配置
  async updateNotificationConfig(
    botId: string, 
    config: Partial<BotNotificationConfig>
  ): Promise<void> {
    await query(`
      UPDATE telegram_bot_notification_configs 
      SET 
        enabled = $2,
        business_notifications = $3,
        agent_notifications = $4,
        price_notifications = $5,
        system_notifications = $6,
        marketing_notifications = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1
    `, [
      botId,
      config.enabled,
      JSON.stringify(config.business_notifications),
      JSON.stringify(config.agent_notifications),
      JSON.stringify(config.price_notifications),
      JSON.stringify(config.system_notifications),
      JSON.stringify(config.marketing_notifications)
    ]);
  }
}

// 手动通知发送API
export class ManualNotificationAPI {
  
  // 发送系统维护通知
  async sendMaintenanceNotification(
    botId: string,
    maintenanceInfo: MaintenanceNotificationData,
    createdBy: string
  ): Promise<string> {
    
    // 创建通知记录
    const notificationId = await this.createNotificationRecord(
      botId,
      'system_maintenance',
      maintenanceInfo,
      createdBy
    );
    
    // 获取目标用户
    const targetUsers = await this.getTargetUsers(botId, maintenanceInfo.target_users);
    
    // 生成消息内容
    const messageContent = await this.renderMaintenanceMessage(maintenanceInfo);
    
    // 发送通知
    await this.sendToUsers(botId, targetUsers, messageContent, notificationId);
    
    return notificationId;
  }
  
  // 发送重要公告
  async sendAnnouncement(
    botId: string,
    announcement: AnnouncementData,
    createdBy: string
  ): Promise<string> {
    
    const notificationId = await this.createNotificationRecord(
      botId,
      'important_announcement',
      announcement,
      createdBy
    );
    
    // 根据紧急程度决定发送策略
    if (announcement.urgency === 'high') {
      await this.sendImmediately(botId, announcement, notificationId);
    } else {
      await this.scheduleOptimalSend(botId, announcement, notificationId);
    }
    
    return notificationId;
  }
  
  // 批量发送通知
  private async sendToUsers(
    botId: string,
    users: User[],
    messageContent: MessageContent,
    notificationId: string
  ): Promise<void> {
    
    const batchSize = 30;
    let sentCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(user => this.sendSingleNotification(botId, user, messageContent))
      );
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          sentCount++;
        } else {
          failedCount++;
          console.error('发送失败:', result.reason);
        }
      });
      
      // 更新发送进度
      await this.updateNotificationProgress(notificationId, sentCount, failedCount);
      
      // 批次间延迟
      if (i + batchSize < users.length) {
        await this.delay(1100);
      }
    }
    
    // 标记完成
    await this.markNotificationCompleted(notificationId, sentCount, failedCount);
  }
}
```

## 📊 前端实现要点

### 1. 组件结构

```
src/components/BotManagement/NotificationConfig/
├── index.vue                    # 主入口组件
├── BusinessNotificationPanel.vue    # 业务通知配置
├── AgentNotificationPanel.vue       # 代理通知配置
├── PriceNotificationPanel.vue       # 价格通知配置
├── SystemNotificationPanel.vue      # 系统通知配置
├── MarketingNotificationPanel.vue   # 营销通知配置
├── MessageTemplatePanel.vue         # 消息模板管理
├── NotificationSettingsPanel.vue    # 发送设置
├── NotificationAnalyticsPanel.vue   # 统计监控
├── ManualNotificationDialog.vue     # 手动发送对话框
└── components/
    ├── TemplateEditor.vue           # 模板编辑器
    ├── NotificationPreview.vue      # 通知预览
    └── SendingProgressDialog.vue    # 发送进度对话框
```

### 2. 状态管理

```typescript
// stores/notificationConfig.ts
export const useNotificationConfigStore = defineStore('notificationConfig', {
  state: () => ({
    currentBotId: '',
    config: {} as BotNotificationConfig,
    templates: [] as MessageTemplate[],
    sendingHistory: [] as NotificationLog[],
    analytics: {} as NotificationAnalytics,
    loading: false,
    saving: false
  }),
  
  actions: {
    async loadConfig(botId: string) {
      this.loading = true;
      try {
        this.config = await notificationAPI.getBotConfig(botId);
        this.templates = await notificationAPI.getTemplates(botId);
        this.currentBotId = botId;
      } finally {
        this.loading = false;
      }
    },
    
    async saveConfig() {
      this.saving = true;
      try {
        await notificationAPI.updateConfig(this.currentBotId, this.config);
        ElMessage.success('配置保存成功');
      } finally {
        this.saving = false;
      }
    },
    
    async sendManualNotification(notificationData: any) {
      return await notificationAPI.sendManual(this.currentBotId, notificationData);
    }
  }
});
```

### 3. 实时通知状态更新

```typescript
// composables/useNotificationStatus.ts
export function useNotificationStatus(notificationId: string) {
  const status = ref('pending');
  const progress = ref(0);
  const details = ref({});
  
  // WebSocket连接获取实时状态
  const ws = new WebSocket(`ws://localhost:3001/notification-status/${notificationId}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    status.value = data.status;
    progress.value = data.progress;
    details.value = data.details;
  };
  
  onUnmounted(() => {
    ws.close();
  });
  
  return { status, progress, details };
}
```

## 🎯 实施优先级和时间规划

### Phase 1: 基础通知配置（1-2周）
1. ✅ 数据库表设计和创建
2. ✅ 基础通知配置API
3. ✅ 机器人卡片通知管理标签页
4. ✅ 业务通知配置面板

### Phase 2: 模板和手动通知（2-3周）
1. 🔄 消息模板管理系统
2. 🔄 系统维护通知功能
3. 🔄 重要公告发送功能
4. 🔄 发送进度实时监控

### Phase 3: 高级功能（3-4周）
1. 📊 通知效果统计分析
2. 🎯 个性化通知设置
3. 🔍 A/B测试框架
4. 📱 移动端适配优化

这个设计方案完全基于您的TRON能量租赁项目特点，提供了完整的通知管理功能，让管理员可以灵活配置和发送各种类型的通知。
