/**
 * 设置配置映射模块
 * 负责配置键映射和值解析功能
 */

export function useSettingsConfig() {
  // 配置键映射表 - 将后端配置键映射到前端设置结构
  const configKeyMappings = {
    // 基础设置
    'system.name': 'systemName',
    'system.description': 'systemDescription', 
    'system.contact_email': 'contactEmail',
    'system.support_phone': 'supportPhone',
    'system.timezone': 'timezone',
    'system.language': 'language',
    'system.currency': 'currency',
    'system.date_format': 'dateFormat',
    
    // 安全设置
    'security.enable_two_factor': 'enableTwoFactor',
    'security.session_timeout': 'sessionTimeout',
    'security.password_min_length': 'passwordMinLength',
    'security.max_login_attempts': 'maxLoginAttempts',
    'security.login_lockout_minutes': 'loginLockoutMinutes',
    'security.password_expire_days': 'passwordExpireDays',
    'security.jwt_expire_hours': 'jwtExpireHours',
    'security.enable_ip_whitelist': 'enableIpWhitelist',
    'security.ip_whitelist': 'ipWhitelist',
    'security.enable_api_rate_limit': 'enableApiRateLimit',
    'security.api_rate_limit': 'apiRateLimit',
    
    // 通知设置
    'notification.email_enabled': 'emailNotifications',
    'notification.sms_enabled': 'smsNotifications',
    'notification.telegram_enabled': 'telegramNotifications',
    'notification.system_alerts': 'systemAlerts',
    'notification.order_updates': 'orderUpdates',
    'notification.low_balance_alert': 'lowBalanceAlert',
    'notification.maintenance_notifications': 'maintenanceNotifications',
    'notification.weekly_report': 'weeklyReport',
    'notification.monthly_report': 'monthlyReport',
    
    // 高级设置
    'cache.enable_query_cache': 'enableQueryCache',
    'cache.redis_ttl_seconds': 'redisTtlSeconds',
    'logging.enable_file_log': 'enableFileLog',
    'logging.level': 'logLevel',
    'logging.retention_days': 'logRetentionDays',
    'api.enable_cors': 'enableCors',
    'feature.energy_trading': 'enableEnergyTrading',
    'feature.referral_system': 'enableReferralSystem',
    'feature.user_registration': 'enableUserRegistration',
    'feature.agent_application': 'enableAgentApplication',
    
    // 定价设置
    'pricing.energy_base_price': 'energyBasePrice',
    'pricing.bandwidth_base_price': 'bandwidthBasePrice',
    'pricing.emergency_fee_multiplier': 'emergencyFeeMultiplier',
    'pricing.minimum_order_amount': 'minimumOrderAmount',
    'pricing.maximum_order_amount': 'maximumOrderAmount'
  }

  /**
   * 解析配置值
   */
  const parseConfigValue = (value: string, type?: string): any => {
    if (type === 'json' || (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{')))) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    
    if (value === 'true') return true
    if (value === 'false') return false
    
    const num = Number(value)
    if (!isNaN(num) && value !== '') return num
    
    return value
  }

  /**
   * 构建配置数组
   */
  const buildConfigArray = (settingsToProcess: any) => {
    console.log('🛠️ [配置构建] 开始构建配置数组, 输入数据:', settingsToProcess)
    const configs: Array<{ config_key: string; config_value: any }> = []
    
    // 转换设置为配置格式
    Object.entries(settingsToProcess).forEach(([category, settings]) => {
      console.log(`📊 [配置构建] 处理分类: ${category}`, settings)
      
      Object.entries(settings).forEach(([key, value]) => {
        console.log(`🔍 [配置构建] 处理设置项: ${key} = ${value} (type: ${typeof value})`)
        
        // 根据类别找到对应的后端配置键
        const prefix = category === 'basic' ? 'system.' :
                      category === 'security' ? 'security.' :
                      category === 'notifications' ? 'notification.' :
                      category === 'pricing' ? 'pricing.' :
                      category === 'advanced' ? '' : ''
        
        console.log(`🏷️ [配置构建] 分类 ${category} 的前缀: '${prefix}'`)
        
        // 查找匹配的配置键
        const configKey = Object.keys(configKeyMappings).find(k => {
          const mapped = configKeyMappings[k as keyof typeof configKeyMappings]
          const matches = mapped === key && (prefix === '' || k.startsWith(prefix))
          console.log(`🔎 [配置构建] 检查配置键: ${k} -> ${mapped}, 匹配: ${matches}`)
          return matches
        })
        
        if (configKey) {
          let configValue = value
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            configValue = JSON.stringify(value)
          } else {
            configValue = String(value)
          }
          
          const configItem = {
            config_key: configKey,
            config_value: configValue
          }
          
          console.log(`✅ [配置构建] 成功映射: ${key} -> ${configKey} = ${configValue}`)
          configs.push(configItem)
        } else {
          console.warn(`⚠️ [配置构建] 未找到匹配的配置键: ${category}.${key}, 值: ${value}`)
        }
      })
    })
    
    console.log('🏁 [配置构建] 最终生成的配置数组:', configs)
    return configs
  }

  return {
    configKeyMappings,
    parseConfigValue,
    buildConfigArray
  }
}
