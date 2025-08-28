/**
 * Toast 通知管理 Composable
 * 提供全局的通知消息功能
 */
import { ref } from 'vue'

export interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number  // 自动关闭时间，0表示不自动关闭
  dismissible?: boolean  // 是否可手动关闭
  delay?: number  // 延迟显示时间
}

// 全局通知状态
const notifications = ref<ToastNotification[]>([])
let notificationId = 0

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${++notificationId}`
}

/**
 * 添加通知
 */
function addNotification(notification: Omit<ToastNotification, 'id'>): string {
  const id = generateId()
  const newNotification: ToastNotification = {
    id,
    dismissible: true,
    duration: 4000,  // 默认4秒后自动关闭
    ...notification
  }
  
  notifications.value.push(newNotification)
  
  // 自动关闭通知
  if (newNotification.duration && newNotification.duration > 0) {
    setTimeout(() => {
      dismiss(id)
    }, newNotification.duration + (newNotification.delay || 0))
  }
  
  return id
}

/**
 * 关闭通知
 */
function dismiss(id: string) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

/**
 * 清除所有通知
 */
function clear() {
  notifications.value = []
}

/**
 * 快捷方法 - 成功通知
 */
function success(message: string, options?: Partial<ToastNotification>): string {
  return addNotification({
    type: 'success',
    message,
    ...options
  })
}

/**
 * 快捷方法 - 错误通知
 */
function error(message: string, options?: Partial<ToastNotification>): string {
  return addNotification({
    type: 'error',
    message,
    duration: 6000,  // 错误消息显示更久
    ...options
  })
}

/**
 * 快捷方法 - 警告通知
 */
function warning(message: string, options?: Partial<ToastNotification>): string {
  return addNotification({
    type: 'warning',
    message,
    duration: 5000,
    ...options
  })
}

/**
 * 快捷方法 - 信息通知
 */
function info(message: string, options?: Partial<ToastNotification>): string {
  return addNotification({
    type: 'info',
    message,
    ...options
  })
}

/**
 * 保存操作相关的通知
 */
function saveSuccess(message: string = '保存成功') {
  return success(message, {
    title: '操作成功',
    duration: 3000
  })
}

function saveError(message: string = '保存失败，请稍后重试') {
  return error(message, {
    title: '保存失败',
    duration: 5000
  })
}

function saveWarning(message: string) {
  return warning(message, {
    title: '保存警告',
    duration: 4000
  })
}

/**
 * Loading状态通知
 */
function loading(message: string = '正在保存...') {
  return info(message, {
    title: '正在处理',
    duration: 0,  // 不自动关闭
    dismissible: false  // 不可手动关闭
  })
}

export function useToast() {
  return {
    // 状态
    notifications,
    
    // 基础方法
    addNotification,
    dismiss,
    clear,
    
    // 快捷方法
    success,
    error,
    warning,
    info,
    
    // 保存操作专用方法
    saveSuccess,
    saveError,
    saveWarning,
    loading
  }
}
