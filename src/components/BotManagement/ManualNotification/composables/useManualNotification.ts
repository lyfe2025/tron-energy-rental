import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

export function useManualNotification(botId: string) {
  const sending = ref(false)

  // 通知表单数据
  const notificationForm = reactive({
    type: 'maintenance_notice',
    title: '',
    content: '',
    urgency: 'medium',
    target_users: 'all',
    send_options: ['send_immediately'],
    scheduled_at: null,
    image_url: '',
    action_button: {
      text: '',
      type: 'none',
      value: ''
    }
  })

  // 维护通知表单
  const maintenanceForm = reactive({
    maintenance_type: 'scheduled',
    start_time: '',
    duration_hours: 2,
    affected_features: ['order_creation', 'payment_processing'],
    description: '',
    send_schedule: ['advance_24h', 'start_notification', 'completion_notification']
  })

  // 公告表单
  const announcementForm = reactive({
    title: '',
    content: '',
    announcement_type: 'general',
    image_url: '',
    action_button: {
      text: '',
      type: 'none',
      value: ''
    }
  })

  // 预览内容计算
  const previewContent = computed(() => {
    let content = ''
    let title = ''
    
    if (notificationForm.type === 'maintenance_notice') {
      title = '🔧 系统维护通知'
      content = `
📅 **维护时间：** ${maintenanceForm.start_time || '待定'}
⏱️ **预计时长：** ${maintenanceForm.duration_hours}小时
🎯 **维护内容：** ${maintenanceForm.description || '系统维护升级'}

⚠️ **影响功能：**
${maintenanceForm.affected_features.map(f => `• ${getFeatureName(f)}`).join('\n')}

💡 **温馨提示：**
为确保您的使用体验，建议您在维护开始前完成重要操作。维护期间给您带来的不便，我们深表歉意！

维护完成后，我们会第一时间通知您。
      `.trim()
    } else if (notificationForm.type === 'important_announcement') {
      title = announcementForm.title || '📢 重要公告'
      content = announcementForm.content || '这里是公告内容...'
    }

    return {
      title,
      content,
      image_url: announcementForm.image_url || notificationForm.image_url,
      action_button: announcementForm.action_button.type !== 'none' ? announcementForm.action_button : null
    }
  })

  // 功能名称映射
  const getFeatureName = (feature: string) => {
    const featureMap: Record<string, string> = {
      order_creation: '下单功能',
      payment_processing: '支付处理',
      energy_delegation: '能量委托',
      agent_functions: '代理功能',
      customer_service: '客服支持'
    }
    return featureMap[feature] || feature
  }

  // 重置表单
  const resetForm = () => {
    notificationForm.type = 'maintenance_notice'
    notificationForm.title = ''
    notificationForm.content = ''
    notificationForm.urgency = 'medium'
    notificationForm.target_users = 'all'
    notificationForm.send_options = ['send_immediately']
    notificationForm.scheduled_at = null
    notificationForm.image_url = ''
    
    Object.assign(maintenanceForm, {
      maintenance_type: 'scheduled',
      start_time: '',
      duration_hours: 2,
      affected_features: ['order_creation', 'payment_processing'],
      description: '',
      send_schedule: ['advance_24h', 'start_notification', 'completion_notification']
    })
    
    Object.assign(announcementForm, {
      title: '',
      content: '',
      announcement_type: 'general',
      image_url: '',
      action_button: {
        text: '',
        type: 'none',
        value: ''
      }
    })
  }

  // 发送通知
  const sendNotification = async () => {
    // 验证表单
    if (notificationForm.type === 'maintenance_notice') {
      if (!maintenanceForm.description) {
        ElMessage.error('请填写维护内容')
        return
      }
    } else if (notificationForm.type === 'important_announcement') {
      if (!announcementForm.title || !announcementForm.content) {
        ElMessage.error('请填写公告标题和内容')
        return
      }
    }

    sending.value = true
    
    try {
      // 构建通知数据
      let notificationData: any = {
        type: notificationForm.type,
        urgency: notificationForm.urgency,
        target_users: notificationForm.target_users,
        send_immediately: notificationForm.send_options.includes('send_immediately'),
        scheduled_at: notificationForm.scheduled_at,
        options: {
          pin_message: notificationForm.send_options.includes('pin_message'),
          disable_preview: notificationForm.send_options.includes('disable_preview')
        }
      }

      if (notificationForm.type === 'maintenance_notice') {
        notificationData = {
          ...notificationData,
          title: '系统维护通知',
          maintenance_time: maintenanceForm.start_time,
          duration: `${maintenanceForm.duration_hours}小时`,
          description: maintenanceForm.description,
          affected_features: maintenanceForm.affected_features.map(f => getFeatureName(f)),
          send_schedule: maintenanceForm.send_schedule
        }
      } else {
        notificationData = {
          ...notificationData,
          title: announcementForm.title,
          content: announcementForm.content,
          image_url: announcementForm.image_url,
          action_button: announcementForm.action_button.type !== 'none' ? announcementForm.action_button : null
        }
      }

      const response = await fetch(`/api/telegram-bot-notifications/${botId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ notification_data: notificationData })
      })

      if (response.ok) {
        const data = await response.json()
        ElMessage.success('通知发送任务已创建')
        return data.notification_id
      } else {
        ElMessage.error('发送通知失败')
      }
    } catch (error) {
      console.error('发送通知失败:', error)
      ElMessage.error('发送通知失败')
    } finally {
      sending.value = false
    }
  }

  // 监听类型变化重置表单
  watch(() => notificationForm.type, () => {
    // 重置特定表单数据
    Object.assign(maintenanceForm, {
      maintenance_type: 'scheduled',
      start_time: '',
      duration_hours: 2,
      affected_features: ['order_creation', 'payment_processing'],
      description: '',
      send_schedule: ['advance_24h', 'start_notification', 'completion_notification']
    })
    
    Object.assign(announcementForm, {
      title: '',
      content: '',
      announcement_type: 'general',
      image_url: '',
      action_button: {
        text: '',
        type: 'none',
        value: ''
      }
    })
  })

  return {
    // 状态
    sending,
    notificationForm,
    maintenanceForm,
    announcementForm,
    previewContent,
    
    // 方法
    resetForm,
    sendNotification,
    getFeatureName
  }
}
