import {
    Activity, AlertTriangle, BarChart3, Bell, Bot, Calendar, Clock, CreditCard,
    Database, DollarSign, Download, Edit, FileText, Folder, Fuel, Home, Key,
    LayoutDashboard, Lock, Mail, Menu, MessageCircle, Minus, Monitor,
    PieChart, Plus, Search, Server, Settings, Settings2, Shield, ShoppingCart,
    Trash2,
    TrendingUp,
    Upload, User, UserCheck, Users, Wifi, Zap
} from 'lucide-vue-next'
import { MenuIconType } from '../types'

/**
 * 图标管理 composable
 */
export function useMenuIcons() {
  // 预定义图标列表
  const getPredefinedIcons = () => {
    return [
      'Home', 'LayoutDashboard', 'Users', 'User', 'Settings', 'Settings2', 'Menu', 'FileText', 'Folder', 'Bot',
      'Shield', 'Lock', 'Key', 'UserCheck', 'Database', 'Server',
      'ShoppingCart', 'DollarSign', 'CreditCard', 'TrendingUp', 'BarChart3', 'PieChart',
      'Monitor', 'Activity', 'Zap', 'Fuel', 'Wifi', 'Clock', 'AlertTriangle',
      'Bell', 'Mail', 'MessageCircle', 'Calendar', 'Search', 'Plus', 'Minus', 'Edit', 'Trash2', 
      'Download', 'Upload'
    ]
  }

  // 检查图标是否在预定义列表中
  const isIconInPredefinedList = (iconName: string) => {
    return getPredefinedIcons().includes(iconName)
  }

  // 获取Lucide图标组件
  const getLucideIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Home, LayoutDashboard, Users, User, Settings, Settings2, Menu, FileText, Folder, Bot,
      Shield, Lock, Key, UserCheck, Database, Server,
      ShoppingCart, DollarSign, CreditCard, TrendingUp, BarChart3, PieChart,
      Monitor, Activity, Zap, Fuel, Wifi, Clock, AlertTriangle,
      Bell, Mail, MessageCircle, Calendar, Search, Plus, Minus, Edit, Trash2, 
      Download, Upload
    }
    return iconMap[iconName] || Menu // 默认返回Menu图标
  }

  // 智能判断图标类型
  const detectIconType = (iconName: string): MenuIconType => {
    if (!iconName) return MenuIconType.LUCIDE
    
    // 检查是否是预定义的Lucide图标
    if (isIconInPredefinedList(iconName)) {
      return MenuIconType.LUCIDE
    } else {
      // 如果不是预定义图标，仍然可能是Lucide图标，但不在我们的列表中
      // 根据图标名称的特征来判断：Lucide图标通常是驼峰命名且长度较长
      if (iconName.length > 2 && /^[A-Z][a-zA-Z]+$/.test(iconName)) {
        return MenuIconType.LUCIDE
      } else {
        return MenuIconType.CUSTOM
      }
    }
  }

  // 图标选项列表
  const getIconOptions = () => [
    {
      label: '常用图标',
      options: [
        { value: 'Home', label: '🏠 Home - 首页' },
        { value: 'LayoutDashboard', label: '📊 LayoutDashboard - 仪表板' },
        { value: 'Users', label: '👥 Users - 用户' },
        { value: 'User', label: '👤 User - 用户' },
        { value: 'Settings', label: '⚙️ Settings - 设置' },
        { value: 'Settings2', label: '⚙️ Settings2 - 设置2' },
        { value: 'Menu', label: '📋 Menu - 菜单' },
        { value: 'FileText', label: '📄 FileText - 文档' },
        { value: 'Folder', label: '📁 Folder - 文件夹' },
        { value: 'Bot', label: '🤖 Bot - 机器人' }
      ]
    },
    {
      label: '系统管理',
      options: [
        { value: 'Shield', label: '🛡️ Shield - 权限' },
        { value: 'Lock', label: '🔒 Lock - 锁定' },
        { value: 'Key', label: '🔑 Key - 密钥' },
        { value: 'UserCheck', label: '✅ UserCheck - 用户验证' },
        { value: 'Database', label: '💾 Database - 数据库' },
        { value: 'Server', label: '🖥️ Server - 服务器' }
      ]
    },
    {
      label: '业务功能',
      options: [
        { value: 'ShoppingCart', label: '🛒 ShoppingCart - 购物车' },
        { value: 'DollarSign', label: '💲 DollarSign - 金钱' },
        { value: 'CreditCard', label: '💳 CreditCard - 信用卡' },
        { value: 'TrendingUp', label: '📈 TrendingUp - 趋势上升' },
        { value: 'BarChart3', label: '📊 BarChart3 - 柱状图' },
        { value: 'PieChart', label: '🥧 PieChart - 饼图' },
        { value: 'Fuel', label: '⛽ Fuel - 能量池' }
      ]
    },
    {
      label: '监控相关',
      options: [
        { value: 'Monitor', label: '🖥️ Monitor - 监控' },
        { value: 'Activity', label: '📊 Activity - 活动' },
        { value: 'Zap', label: '⚡ Zap - 闪电' },
        { value: 'Wifi', label: '📶 Wifi - 网络' },
        { value: 'Clock', label: '🕐 Clock - 时钟' },
        { value: 'AlertTriangle', label: '⚠️ AlertTriangle - 警告' }
      ]
    },
    {
      label: '其他图标',
      options: [
        { value: 'Bell', label: '🔔 Bell - 铃铛' },
        { value: 'Mail', label: '📧 Mail - 邮件' },
        { value: 'MessageCircle', label: '💬 MessageCircle - 消息' },
        { value: 'Calendar', label: '📅 Calendar - 日历' },
        { value: 'Search', label: '🔍 Search - 搜索' },
        { value: 'Plus', label: '➕ Plus - 添加' },
        { value: 'Minus', label: '➖ Minus - 减少' },
        { value: 'Edit', label: '✏️ Edit - 编辑' },
        { value: 'Trash2', label: '🗑️ Trash2 - 删除' },
        { value: 'Download', label: '⬇️ Download - 下载' },
        { value: 'Upload', label: '⬆️ Upload - 上传' }
      ]
    }
  ]

  return {
    getPredefinedIcons,
    isIconInPredefinedList,
    getLucideIcon,
    detectIconType,
    getIconOptions
  }
}

