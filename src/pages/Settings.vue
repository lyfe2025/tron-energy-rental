<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">系统设置</h1>
        <p class="mt-1 text-sm text-gray-500">管理TRON能量租赁系统的配置参数和功能开关</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          @click="resetToDefaults"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <RotateCcw class="h-4 w-4 mr-2" />
          恢复默认
        </button>
        <button
          @click="saveAllSettings"
          :disabled="isSaving"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save :class="['h-4 w-4 mr-2', { 'animate-spin': isSaving }]" />
          {{ isSaving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>

    <!-- 设置导航 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in settingTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="h-5 w-5 mr-2 inline" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- 基础配置 -->
      <div v-if="activeTab === 'basic'" class="p-6 space-y-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">基础配置</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 系统名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                系统名称
              </label>
              <input
                v-model="settings.basic.system_name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="TRON能量租赁系统"
              />
            </div>
            
            <!-- 系统版本 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                系统版本
              </label>
              <input
                v-model="settings.basic.system_version"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="v1.0.0"
              />
            </div>
            
            <!-- 管理员邮箱 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                管理员邮箱
              </label>
              <input
                v-model="settings.basic.admin_email"
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="admin@example.com"
              />
            </div>
            
            <!-- 客服电话 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                客服电话
              </label>
              <input
                v-model="settings.basic.support_phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="400-123-4567"
              />
            </div>
            
            <!-- 时区设置 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                时区设置
              </label>
              <select
                v-model="settings.basic.timezone"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                <option value="UTC">UTC (UTC+0)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
              </select>
            </div>
            
            <!-- 语言设置 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                默认语言
              </label>
              <select
                v-model="settings.basic.language"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 业务配置 -->
      <div v-if="activeTab === 'business'" class="p-6 space-y-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">业务配置</h3>
          
          <div class="space-y-6">
            <!-- 订单配置 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">订单配置</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    订单超时时间 (分钟)
                  </label>
                  <input
                    v-model.number="settings.business.order_timeout_minutes"
                    type="number"
                    min="1"
                    max="1440"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最大重试次数
                  </label>
                  <input
                    v-model.number="settings.business.max_retry_count"
                    type="number"
                    min="0"
                    max="10"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最小订单金额 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.min_order_amount"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最大订单金额 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.max_order_amount"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <!-- 用户配置 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">用户配置</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    新用户默认余额 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.default_user_balance"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最大充值金额 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.max_recharge_amount"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    VIP等级阈值 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.vip_threshold"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    推荐奖励比例 (%)
                  </label>
                  <input
                    v-model.number="settings.business.referral_reward_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            
            <!-- 机器人配置 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">机器人配置</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    机器人最低余额 (TRX)
                  </label>
                  <input
                    v-model.number="settings.business.bot_min_balance"
                    type="number"
                    min="0"
                    step="0.000001"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    机器人检查间隔 (秒)
                  </label>
                  <input
                    v-model.number="settings.business.bot_check_interval"
                    type="number"
                    min="10"
                    max="3600"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    最大并发订单数
                  </label>
                  <input
                    v-model.number="settings.business.max_concurrent_orders"
                    type="number"
                    min="1"
                    max="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    机器人故障重启次数
                  </label>
                  <input
                    v-model.number="settings.business.bot_restart_limit"
                    type="number"
                    min="0"
                    max="10"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 安全配置 -->
      <div v-if="activeTab === 'security'" class="p-6 space-y-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">安全配置</h3>
          
          <div class="space-y-6">
            <!-- 登录安全 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">登录安全</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    登录失败锁定次数
                  </label>
                  <input
                    v-model.number="settings.security.login_fail_limit"
                    type="number"
                    min="3"
                    max="10"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    锁定时间 (分钟)
                  </label>
                  <input
                    v-model.number="settings.security.lockout_duration"
                    type="number"
                    min="5"
                    max="1440"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    JWT过期时间 (小时)
                  </label>
                  <input
                    v-model.number="settings.security.jwt_expiry"
                    type="number"
                    min="1"
                    max="168"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    密码最小长度
                  </label>
                  <input
                    v-model.number="settings.security.password_min_length"
                    type="number"
                    min="6"
                    max="32"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div class="mt-4 space-y-3">
                <div class="flex items-center">
                  <input
                    v-model="settings.security.require_strong_password"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    要求强密码（包含大小写字母、数字和特殊字符）
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.security.enable_two_factor"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用双因素认证
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.security.enable_ip_whitelist"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用IP白名单
                  </label>
                </div>
              </div>
            </div>
            
            <!-- API安全 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">API安全</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    API请求频率限制 (次/分钟)
                  </label>
                  <input
                    v-model.number="settings.security.api_rate_limit"
                    type="number"
                    min="10"
                    max="1000"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    API密钥过期时间 (天)
                  </label>
                  <input
                    v-model.number="settings.security.api_key_expiry"
                    type="number"
                    min="1"
                    max="365"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div class="mt-4 space-y-3">
                <div class="flex items-center">
                  <input
                    v-model="settings.security.enable_api_logging"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用API访问日志
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.security.enable_request_signing"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用请求签名验证
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能开关 -->
      <div v-if="activeTab === 'features'" class="p-6 space-y-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">功能开关</h3>
          
          <div class="space-y-4">
            <div 
              v-for="feature in featureToggles" 
              :key="feature.key"
              class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div class="flex-1">
                <div class="flex items-center">
                  <component :is="feature.icon" class="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">{{ feature.name }}</h4>
                    <p class="text-sm text-gray-500">{{ feature.description }}</p>
                  </div>
                </div>
              </div>
              <div class="ml-4">
                <button
                  @click="toggleFeature(feature.key)"
                  :class="[
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    settings.features[feature.key] ? 'bg-indigo-600' : 'bg-gray-200'
                  ]"
                >
                  <span
                    :class="[
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      settings.features[feature.key] ? 'translate-x-5' : 'translate-x-0'
                    ]"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 通知配置 -->
      <div v-if="activeTab === 'notifications'" class="p-6 space-y-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">通知配置</h3>
          
          <div class="space-y-6">
            <!-- 邮件通知 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">邮件通知</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    SMTP服务器
                  </label>
                  <input
                    v-model="settings.notifications.smtp_host"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    SMTP端口
                  </label>
                  <input
                    v-model.number="settings.notifications.smtp_port"
                    type="number"
                    min="1"
                    max="65535"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    发件人邮箱
                  </label>
                  <input
                    v-model="settings.notifications.smtp_username"
                    type="email"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="noreply@example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    SMTP密码
                  </label>
                  <input
                    v-model="settings.notifications.smtp_password"
                    type="password"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div class="mt-4 space-y-3">
                <div class="flex items-center">
                  <input
                    v-model="settings.notifications.enable_email"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用邮件通知
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.notifications.email_order_status"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    订单状态变更通知
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.notifications.email_system_alerts"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    系统告警通知
                  </label>
                </div>
              </div>
            </div>
            
            <!-- 短信通知 -->
            <div class="border border-gray-200 rounded-lg p-4">
              <h4 class="text-md font-medium text-gray-900 mb-4">短信通知</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    短信服务商
                  </label>
                  <select
                    v-model="settings.notifications.sms_provider"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="aliyun">阿里云短信</option>
                    <option value="tencent">腾讯云短信</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    API密钥
                  </label>
                  <input
                    v-model="settings.notifications.sms_api_key"
                    type="password"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div class="mt-4 space-y-3">
                <div class="flex items-center">
                  <input
                    v-model="settings.notifications.enable_sms"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    启用短信通知
                  </label>
                </div>
                <div class="flex items-center">
                  <input
                    v-model="settings.notifications.sms_urgent_only"
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 text-sm text-gray-700">
                    仅紧急情况发送短信
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">最近操作日志</h3>
          <button
            @click="loadOperationLogs"
            class="text-sm text-indigo-600 hover:text-indigo-500"
          >
            查看全部
          </button>
        </div>
      </div>
      
      <div v-if="isLoadingLogs" class="flex items-center justify-center py-8">
        <Loader2 class="h-6 w-6 animate-spin text-indigo-600" />
        <span class="ml-2 text-gray-600">加载中...</span>
      </div>
      
      <div v-else-if="operationLogs.length > 0" class="divide-y divide-gray-200">
        <div 
          v-for="log in operationLogs.slice(0, 5)" 
          :key="log.id"
          class="px-6 py-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div :class="['h-2 w-2 rounded-full mr-3', getLogStatusColor(log.type)]" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ log.action }}</p>
                <p class="text-sm text-gray-500">{{ log.details }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-900">用户ID: {{ log.user_id }}</p>
              <p class="text-sm text-gray-500">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="px-6 py-8 text-center text-gray-500">
        暂无操作日志
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { settingsAPI } from '@/services/api'
import type { SystemSettings, OperationLog } from '@/types/api'
import {
  Settings,
  Shield,
  Bell,
  Zap,
  Database,
  Save,
  RotateCcw,
  Loader2,
  ShoppingCart,
  Users,
  Bot,
  Package,
  Mail,
  MessageSquare,
  Eye,
  Globe,
  Lock,
  Activity
} from 'lucide-vue-next'

// 响应式数据
const activeTab = ref('basic')
const isSaving = ref(false)
const isLoadingLogs = ref(false)
const operationLogs = ref<OperationLog[]>([])

// 设置标签页
const settingTabs = [
  { id: 'basic', name: '基础配置', icon: Settings },
  { id: 'business', name: '业务配置', icon: ShoppingCart },
  { id: 'security', name: '安全配置', icon: Shield },
  { id: 'features', name: '功能开关', icon: Zap },
  { id: 'notifications', name: '通知配置', icon: Bell }
]

// 功能开关配置
const featureToggles = [
  {
    key: 'user_registration',
    name: '用户注册',
    description: '允许新用户注册账户',
    icon: Users
  },
  {
    key: 'auto_order_processing',
    name: '自动订单处理',
    description: '启用自动化订单处理流程',
    icon: ShoppingCart
  },
  {
    key: 'bot_auto_restart',
    name: '机器人自动重启',
    description: '机器人故障时自动重启',
    icon: Bot
  },
  {
    key: 'price_auto_adjustment',
    name: '价格自动调整',
    description: '根据市场情况自动调整价格',
    icon: Package
  },
  {
    key: 'maintenance_mode',
    name: '维护模式',
    description: '启用系统维护模式',
    icon: Settings
  },
  {
    key: 'api_access',
    name: 'API访问',
    description: '允许第三方API访问',
    icon: Globe
  },
  {
    key: 'audit_logging',
    name: '审计日志',
    description: '记录所有系统操作日志',
    icon: Eye
  },
  {
    key: 'real_time_monitoring',
    name: '实时监控',
    description: '启用系统实时监控',
    icon: Activity
  }
]

// 设置数据
const settings = reactive<SystemSettings>({
  basic: {
    system_name: 'TRON能量租赁系统',
    system_version: 'v1.0.0',
    admin_email: 'admin@example.com',
    support_phone: '400-123-4567',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    maintenance_message: '系统维护中，请稍后访问'
  },
  business: {
    min_order_amount: 1,
    max_order_amount: 10000,
    default_commission_rate: 5,
    auto_approve_orders: false,
    require_kyc: true,
    max_daily_orders: 100,
    order_timeout_minutes: 30,
    referral_reward_rate: 5,
    bot_min_balance: 100,
    bot_check_interval: 60,
    max_concurrent_orders: 10,
    bot_restart_limit: 3,
    max_retry_count: 3,
    default_user_balance: 0,
    max_recharge_amount: 100000,
    vip_threshold: 10000
  },
  security: {
    password_min_length: 8,
    require_2fa: false,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    ip_whitelist: [],
    api_rate_limit: 100,
    enable_two_factor: false,
    enable_ip_whitelist: false,
    api_key_expiry: 90,
    enable_api_logging: true,
    enable_request_signing: false,
    login_fail_limit: 5,
    lockout_duration: 30,
    jwt_expiry: 24,
    require_strong_password: true
  },
  features: {
    user_registration: true,
    auto_order_processing: true,
    bot_auto_restart: true,
    price_auto_adjustment: false,
    maintenance_mode: false,
    api_access: true,
    audit_logging: true,
    real_time_monitoring: true
  },
  notifications: {
    email_notifications: true,
    sms_notifications: false,
    order_status_updates: true,
    system_alerts: true,
    maintenance_notices: true,
    security_alerts: true,
    sms_provider: 'aliyun',
    sms_api_key: '',
    enable_sms: false,
    sms_urgent_only: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    enable_email: true,
    email_order_status: true,
    email_system_alerts: true
  }
})

// 方法
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

const getLogStatusColor = (type: string) => {
  const colorMap: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }
  return colorMap[type] || 'bg-gray-500'
}

const toggleFeature = (key: string) => {
  settings.features[key as keyof typeof settings.features] = !settings.features[key as keyof typeof settings.features]
}

// 加载设置
const loadSettings = async () => {
  try {
    const response = await settingsAPI.getSettings()
    
    if (response.data.success) {
      const data = response.data.data
      Object.assign(settings.basic, data.basic || {})
      Object.assign(settings.business, data.business || {})
      Object.assign(settings.security, data.security || {})
      Object.assign(settings.features, data.features || {})
      Object.assign(settings.notifications, data.notifications || {})
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存所有设置
const saveAllSettings = async () => {
  try {
    isSaving.value = true
    
    const response = await settingsAPI.updateSettings(settings)
    
    if (response.data.success) {
      alert('设置保存成功')
      await loadOperationLogs()
    } else {
      alert('设置保存失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    alert('设置保存失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

// 恢复默认设置
const resetToDefaults = async () => {
  if (!confirm('确定要恢复所有设置到默认值吗？此操作不可撤销。')) {
    return
  }
  
  try {
    const response = await settingsAPI.resetToDefaults()
    
    if (response.data.success) {
      await loadSettings()
      alert('已恢复默认设置')
    } else {
      alert('恢复默认设置失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('恢复默认设置失败:', error)
    alert('恢复默认设置失败，请稍后重试')
  }
}

// 加载操作日志
const loadOperationLogs = async () => {
  try {
    isLoadingLogs.value = true
    
    const response = await settingsAPI.getOperationLogs({
      page: 1,
      limit: 10
    })
    
    if (response.data.success) {
      operationLogs.value = response.data.data?.items || []
    }
  } catch (error) {
    console.error('加载操作日志失败:', error)
  } finally {
    isLoadingLogs.value = false
  }
}

// 生命周期
onMounted(() => {
  loadSettings()
  loadOperationLogs()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>