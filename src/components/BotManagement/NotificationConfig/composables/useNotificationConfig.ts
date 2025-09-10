import { notificationsAPI } from '@/services/api/notifications/notificationsAPI'
import type { BotNotificationConfig } from '@/types/notification'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'

export function useNotificationConfig(botId: string) {
  const loading = ref(true)
  const saving = ref(false)
  const showManualDialog = ref(false)
  const showImportDialog = ref(false)

  // 通知配置数据
  const config = reactive<BotNotificationConfig>({
    enabled: true,
    default_language: 'zh',
    timezone: 'Asia/Shanghai',
    business_notifications: {
      enabled: true,
      order_created: { enabled: true, delay_seconds: 5 },
      payment_success: { enabled: true, include_image: true },
      payment_failed: { enabled: true, retry_notification: true },
      energy_delegation_complete: { enabled: true, show_tx_link: true },
      energy_delegation_failed: { enabled: true, include_support_contact: true },
      order_status_update: { enabled: true, edit_existing_message: true },
      balance_recharged: { enabled: true },
      balance_insufficient: { enabled: true }
    },
    agent_notifications: {
      enabled: true,
      application_submitted: { enabled: true },
      application_approved: { enabled: true, include_welcome_guide: true },
      application_rejected: { enabled: true, include_feedback: true },
      commission_earned: { enabled: true, min_amount: 1 },
      level_upgrade: { enabled: true, include_benefits: true },
      withdrawal_completed: { enabled: true },
      monthly_summary: { enabled: true, send_on_day: 1 }
    },
    price_notifications: {
      enabled: true,
      price_increase: { enabled: true, threshold_percent: 5 },
      price_decrease: { enabled: true, threshold_percent: 5 },
      new_package: { enabled: true, target_all_users: true },
      limited_offer: { enabled: true, urgency_indicators: true },
      stock_warning: { enabled: false, admin_only: true }
    },
    system_notifications: {
      enabled: true,
      maintenance_notice: { enabled: true, advance_hours: 24 },
      maintenance_start: { enabled: true },
      maintenance_complete: { enabled: true },
      system_alert: { enabled: true, admin_only: true },
      security_warning: { enabled: true },
      daily_report: { enabled: false, admin_only: true }
    },
    marketing_notifications: {
      enabled: true,
      new_feature: { enabled: true, target_active_users: true },
      user_reactivation: { enabled: true, inactive_days: 30 },
      satisfaction_survey: { enabled: true, frequency_days: 90 },
      birthday_greeting: { enabled: false },
      vip_exclusive: { enabled: true, vip_only: true }
    },
    rate_limiting: {
      enabled: true,
      max_per_hour: 10,
      max_per_day: 50,
      user_limits: {
        transaction: 5,
        order_status: 3,
        price_change: 2,
        marketing: 1,
        system: 3
      }
    },
    retry_strategy: {
      enabled: true,
      max_attempts: 3,
      delay_seconds: [30, 300, 1800],
      exponential_backoff: true
    },
    quiet_hours: {
      enabled: false,
      start_time: '23:00',
      end_time: '07:00',
      timezone: 'Asia/Shanghai'
    },
    analytics_enabled: true,
    performance_monitoring: true
  })

  // 方法定义
  const loadConfig = async () => {
    loading.value = true
    try {
      const response = await notificationsAPI.getConfig(botId)
      
      if (response.data) {
        Object.assign(config, response.data)
        console.log('✅ 通知配置加载成功')
      } else {
        ElMessage.error('加载配置失败')
      }
    } catch (error: any) {
      console.error('❌ 加载配置失败:', error)
      ElMessage.error(error?.response?.data?.message || '加载配置失败')
    } finally {
      loading.value = false
    }
  }

  const saveConfig = async () => {
    saving.value = true
    try {
      const response = await notificationsAPI.updateConfig(botId, config)
      
      if (response.data) {
        ElMessage.success('配置保存成功')
        console.log('✅ 通知配置保存成功')
      } else {
        ElMessage.error('保存配置失败')
      }
    } catch (error: any) {
      console.error('❌ 保存配置失败:', error)
      ElMessage.error(error?.response?.data?.message || '保存配置失败')
    } finally {
      saving.value = false
    }
  }

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `bot-${botId}-notification-config.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('配置已导出')
  }

  const importConfig = (importedConfig: BotNotificationConfig) => {
    Object.assign(config, importedConfig)
    saveConfig()
  }

  const resetConfig = async () => {
    try {
      await ElMessageBox.confirm(
        '确认要重置所有通知配置为默认值吗？此操作无法撤销。',
        '重置配置',
        {
          confirmButtonText: '确认重置',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      // 重置配置为默认值
      Object.assign(config, {
        enabled: true,
        default_language: 'zh',
        timezone: 'Asia/Shanghai',
        business_notifications: {
          enabled: true,
          order_created: { enabled: true, delay_seconds: 5 },
          payment_failed: { enabled: true, retry_notification: true },
          payment_success: { enabled: true, include_image: true },
          order_status_update: { enabled: true, edit_existing_message: true },
          energy_delegation_failed: { enabled: true, include_support_contact: true },
          energy_delegation_complete: { enabled: true, show_tx_link: true }
        },
        agent_notifications: {
          enabled: true,
          level_upgrade: { enabled: true, include_benefits: true },
          monthly_summary: { enabled: true, send_on_day: 1 },
          commission_earned: { enabled: true, min_amount: 1 },
          application_approved: { enabled: true, include_welcome_guide: true },
          application_rejected: { enabled: true, include_feedback: true },
          withdrawal_completed: { enabled: true },
          application_submitted: { enabled: true }
        },
        price_notifications: {
          enabled: true,
          new_package: { enabled: true, target_all_users: true },
          limited_offer: { enabled: true, urgency_indicators: true },
          stock_warning: { enabled: false, admin_only: true },
          price_decrease: { enabled: true, threshold_percent: 5 },
          price_increase: { enabled: true, threshold_percent: 5 }
        },
        system_notifications: {
          enabled: true,
          daily_report: { enabled: false, admin_only: true },
          system_alert: { enabled: true, admin_only: true },
          security_warning: { enabled: true },
          maintenance_start: { enabled: true },
          maintenance_notice: { enabled: true, advance_hours: 24 },
          maintenance_complete: { enabled: true }
        },
        marketing_notifications: {
          enabled: true,
          new_feature: { enabled: true, target_active_users: true },
          vip_exclusive: { enabled: true, vip_only: true },
          birthday_greeting: { enabled: false },
          user_reactivation: { enabled: true, inactive_days: 30 },
          satisfaction_survey: { enabled: true, frequency_days: 90 }
        },
        rate_limiting: {
          enabled: true,
          max_per_day: 50,
          user_limits: {
            system: 3,
            marketing: 1,
            transaction: 5,
            order_status: 3,
            price_change: 2
          },
          max_per_hour: 10
        },
        retry_strategy: {
          enabled: true,
          max_attempts: 3,
          delay_seconds: [30, 300, 1800],
          exponential_backoff: true
        },
        quiet_hours: {
          enabled: false,
          end_time: '07:00',
          timezone: 'Asia/Shanghai',
          start_time: '23:00'
        },
        analytics_enabled: true,
        performance_monitoring: true
      });
      
      // 自动保存
      await saveConfig();
      ElMessage.success('配置已重置为默认值并保存');
    } catch {
      // 用户取消操作
    }
  }

  const handleNotificationSent = (notificationId: string) => {
    ElMessage.success('通知发送任务已创建')
    // 可以在这里添加跳转到发送记录的逻辑
  }

  return {
    // 状态
    loading,
    saving,
    showManualDialog,
    showImportDialog,
    config,
    
    // 方法
    loadConfig,
    saveConfig,
    exportConfig,
    importConfig,
    resetConfig,
    handleNotificationSent
  }
}
