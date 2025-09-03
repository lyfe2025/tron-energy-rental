<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="handleClose"></div>
      
      <!-- 对话框 -->
      <div class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 标题 -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ menu ? '编辑菜单' : '新增菜单' }}
          </h3>
          <button
            @click="handleClose"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- 表单 -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 菜单名称 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                菜单名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入菜单名称"
              />
            </div>
            
            <!-- 菜单类型 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                菜单类型 <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    :value="1"
                    v-model="form.type"
                    class="mr-2"
                  />
                  菜单
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    :value="2"
                    v-model="form.type"
                    class="mr-2"
                  />
                  按钮
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    :value="3"
                    v-model="form.type"
                    class="mr-2"
                  />
                  链接
                </label>
              </div>
            </div>
          </div>
          
          <!-- 路径和组件 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6" v-if="form.type === MenuType.MENU">
            <!-- 路由路径 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                路由路径
              </label>
              <input
                v-model="form.path"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：/system/users"
              />
            </div>
            
            <!-- 组件路径 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                组件路径
              </label>
              <input
                v-model="form.component"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：@/pages/System/Users/index.vue"
              />
            </div>
          </div>
          
          <!-- 图标和权限 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 图标 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                图标
              </label>
              <div class="space-y-3">
                <!-- 图标类型选择 -->
                <div>
                  <label class="block text-xs text-gray-500 mb-1">图标类型</label>
                  <select
                    v-model="form.icon_type"
                    class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    @change="handleIconTypeChange"
                  >
                    <option value="lucide">Lucide图标</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                
                <!-- 图标选择 -->
                <div>
                  <label class="block text-xs text-gray-500 mb-1">
                    {{ form.icon_type === 'lucide' ? '选择图标' : '输入图标' }}
                  </label>
                  
                  <!-- Lucide图标选择 -->
                  <select
                    v-if="form.icon_type === 'lucide'"
                    v-model="form.icon"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">选择图标</option>
                    
                    <!-- 如果当前图标不在预定义列表中，添加当前图标选项 -->
                    <optgroup v-if="form.icon && !isIconInPredefinedList(form.icon)" label="当前图标">
                      <option :value="form.icon">{{ form.icon }} - 当前图标</option>
                    </optgroup>
                    
                    <optgroup label="常用图标">
                      <option value="Home">🏠 Home - 首页</option>
                      <option value="LayoutDashboard">📊 LayoutDashboard - 仪表板</option>
                      <option value="Users">👥 Users - 用户</option>
                      <option value="User">👤 User - 用户</option>
                      <option value="Settings">⚙️ Settings - 设置</option>
                      <option value="Menu">📋 Menu - 菜单</option>
                      <option value="FileText">📄 FileText - 文档</option>
                      <option value="Folder">📁 Folder - 文件夹</option>
                      <option value="Bot">🤖 Bot - 机器人</option>
                    </optgroup>
                    <optgroup label="系统管理">
                      <option value="Shield">🛡️ Shield - 权限</option>
                      <option value="Lock">🔒 Lock - 锁定</option>
                      <option value="Key">🔑 Key - 密钥</option>
                      <option value="UserCheck">✅ UserCheck - 用户验证</option>
                      <option value="Database">💾 Database - 数据库</option>
                      <option value="Server">🖥️ Server - 服务器</option>
                    </optgroup>
                    <optgroup label="业务功能">
                      <option value="ShoppingCart">🛒 ShoppingCart - 购物车</option>
                      <option value="DollarSign">💲 DollarSign - 金钱</option>
                      <option value="CreditCard">💳 CreditCard - 信用卡</option>
                      <option value="TrendingUp">📈 TrendingUp - 趋势上升</option>
                      <option value="BarChart3">📊 BarChart3 - 柱状图</option>
                      <option value="PieChart">🥧 PieChart - 饼图</option>
                    </optgroup>
                    <optgroup label="监控相关">
                      <option value="Monitor">🖥️ Monitor - 监控</option>
                      <option value="Activity">📊 Activity - 活动</option>
                      <option value="Zap">⚡ Zap - 闪电</option>
                      <option value="Wifi">📶 Wifi - 网络</option>
                      <option value="Clock">🕐 Clock - 时钟</option>
                      <option value="AlertTriangle">⚠️ AlertTriangle - 警告</option>
                    </optgroup>
                    <optgroup label="其他图标">
                      <option value="Bell">🔔 Bell - 铃铛</option>
                      <option value="Mail">📧 Mail - 邮件</option>
                      <option value="MessageCircle">💬 MessageCircle - 消息</option>
                      <option value="Calendar">📅 Calendar - 日历</option>
                      <option value="Search">🔍 Search - 搜索</option>
                      <option value="Plus">➕ Plus - 添加</option>
                      <option value="Minus">➖ Minus - 减少</option>
                      <option value="Edit">✏️ Edit - 编辑</option>
                      <option value="Trash2">🗑️ Trash2 - 删除</option>
                      <option value="Download">⬇️ Download - 下载</option>
                      <option value="Upload">⬆️ Upload - 上传</option>
                    </optgroup>
                  </select>
                  
                  <!-- 自定义图标输入 -->
                  <input
                    v-else
                    v-model="form.icon"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="输入自定义图标文字，如：U"
                    maxlength="2"
                  />
                </div>
                
                <!-- 图标预览 -->
                <div v-if="form.icon" class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span class="text-xs text-gray-500">预览:</span>
                  <component
                    v-if="form.icon_type === 'lucide' && form.icon"
                    :is="getLucideIcon(form.icon)"
                    class="w-5 h-5 text-gray-700"
                  />
                  <span
                    v-else-if="form.icon_type === 'custom' && form.icon"
                    class="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-500 text-white rounded"
                  >
                    {{ form.icon }}
                  </span>
                  <span class="text-sm text-gray-600">{{ form.icon }}</span>
                </div>
              </div>
            </div>
            
            <!-- 权限标识 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                权限标识
              </label>
              <input
                v-model="form.permission_key"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：system:user:list"
              />
            </div>
          </div>
          
          <!-- 父级菜单 -->
          <div v-if="!parentMenu">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              父级菜单
            </label>
            <select
              v-model="form.parent_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option :value="null">无（顶级菜单）</option>
              <option
                v-for="option in menuOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <!-- 重定向路径 -->
          <div v-if="form.type === MenuType.MENU">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              重定向路径
            </label>
            <input
              v-model="form.redirect"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="如：/system/users/list"
            />
          </div>
          
          <!-- 描述 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入菜单描述"
            ></textarea>
          </div>
          
          <!-- 设置选项 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 排序号 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                排序号
              </label>
              <input
                v-model.number="form.sort_order"
                type="number"
                min="0"
                max="9999"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            
            <!-- 状态 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    :value="1"
                    v-model="form.status"
                    class="mr-2"
                  />
                  正常
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    :value="0"
                    v-model="form.status"
                    class="mr-2"
                  />
                  停用
                </label>
              </div>
            </div>
          </div>
          
          <!-- 高级选项 -->
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-gray-700">高级选项</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- 是否隐藏 -->
              <label class="flex items-center">
                <input
                  v-model="form.is_hidden"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">隐藏菜单</span>
              </label>
              
              <!-- 是否缓存 -->
              <label class="flex items-center" v-if="form.type === MenuType.MENU">
                <input
                  v-model="form.is_cache"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">页面缓存</span>
              </label>
              
              <!-- 是否固定 -->
              <label class="flex items-center" v-if="form.type === MenuType.MENU">
                <input
                  v-model="form.is_affix"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">固定标签</span>
              </label>
            </div>
          </div>
          
          <!-- 按钮 -->
          <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {{ loading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    Activity, AlertTriangle, BarChart3, Bell, Bot, Calendar, Clock, CreditCard,
    Database, DollarSign, Download, Edit, FileText, Folder, Home, Key,
    LayoutDashboard, Lock, Mail, Menu, MessageCircle, Minus, Monitor,
    PieChart, Plus, Search, Server, Settings, Shield, ShoppingCart,
    Trash2,
    TrendingUp,
    Upload, User, UserCheck, Users, Wifi, X, Zap
} from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { useMenus } from '../composables/useMenus'
import type {
    CreateMenuRequest,
    MenuOption,
    MenuTreeNode,
    UpdateMenuRequest
} from '../types'
import { MenuIconType, MenuStatus, MenuType } from '../types'

// Props
interface Props {
  visible: boolean
  menu?: MenuTreeNode | null
  parentMenu?: MenuTreeNode | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  menu: null,
  parentMenu: null,
  loading: false
})

// Emits
interface Emits {
  close: []
  submit: [data: CreateMenuRequest | UpdateMenuRequest]
}

const emit = defineEmits<Emits>()

// 使用组合式函数
const { getMenuOptions } = useMenus()

// 状态
const menuOptions = ref<MenuOption[]>([])

// 表单数据
const form = reactive<{
  name: string
  path?: string
  component?: string
  icon?: string
  icon_type: MenuIconType
  type: MenuType
  status: MenuStatus
  sort_order: number
  parent_id?: number | null
  permission_key?: string
  description?: string
  is_hidden: boolean
  is_cache: boolean
  is_affix: boolean
  redirect?: string
  meta?: Record<string, any>
}>({
  name: '',
  path: '',
  component: '',
  icon: '',
  icon_type: MenuIconType.LUCIDE,
  type: 1,
  status: 1,
  sort_order: 0,
  parent_id: null,
  permission_key: '',
  description: '',
  is_hidden: false,
  is_cache: false,
  is_affix: false,
  redirect: '',
  meta: {}
})

// 方法
const resetForm = () => {
  form.name = ''
  form.path = ''
  form.component = ''
  form.icon = ''
  form.icon_type = MenuIconType.LUCIDE
  form.type = MenuType.MENU
  form.status = MenuStatus.ACTIVE
  form.sort_order = 0
  form.parent_id = null
  form.permission_key = ''
  form.description = ''
  form.is_hidden = false
  form.is_cache = false
  form.is_affix = false
  form.redirect = ''
  form.meta = {}
}

const loadForm = () => {
  if (props.menu) {
    // 编辑模式
    form.name = props.menu.name
    form.path = props.menu.path || ''
    form.component = props.menu.component || ''
    form.icon = props.menu.icon || ''
    
    // 根据现有图标智能判断图标类型
    if (props.menu.icon) {
      // 检查是否是预定义的Lucide图标
      if (isIconInPredefinedList(props.menu.icon)) {
        form.icon_type = MenuIconType.LUCIDE
      } else {
        // 如果不是预定义图标，仍然可能是Lucide图标，但不在我们的列表中
        // 根据图标名称的特征来判断：Lucide图标通常是驼峰命名且长度较长
        if (props.menu.icon.length > 2 && /^[A-Z][a-zA-Z]+$/.test(props.menu.icon)) {
          form.icon_type = MenuIconType.LUCIDE
        } else {
          form.icon_type = MenuIconType.CUSTOM
        }
      }
    } else {
      // 没有图标时默认为lucide类型
      form.icon_type = MenuIconType.LUCIDE
    }
    
    // 处理菜单类型：后端可能返回字符串或数字
    let menuType = props.menu.type
    if (typeof menuType === 'string') {
      // 如果是字符串类型，转换为数字
      switch (menuType) {
        case 'menu':
          form.type = 1
          break
        case 'button':
          form.type = 2
          break
        case 'link':
        case 'api':
          form.type = 3
          break
        default:
          form.type = 1 // 默认为菜单类型
      }
    } else {
      // 如果是数字，直接使用
      form.type = Number(menuType) || 1
    }
    
    form.status = Number(props.menu.status) || 1
    form.sort_order = Number(props.menu.sort_order) || 0
    form.parent_id = props.menu.parent_id || null
    // 后端字段名是permission，不是permission_key
    form.permission_key = (props.menu as any).permission || ''
    // 数据库中没有description字段
    form.description = (props.menu as any).description || ''
    // visible字段与is_hidden逻辑相反，1表示可见，0表示隐藏
    form.is_hidden = (props.menu as any).visible === 0
    // 数据库中没有is_cache和is_affix字段
    form.is_cache = (props.menu as any).is_cache || false
    form.is_affix = (props.menu as any).is_affix || false
    form.redirect = (props.menu as any).redirect || ''
    form.meta = (props.menu as any).meta || {}
  } else {
    // 新增模式
    resetForm()
    if (props.parentMenu) {
      form.parent_id = props.parentMenu.id
    }
  }
}

const loadMenuOptions = async () => {
  try {
    const excludeId = props.menu?.id
    const rawOptions = await getMenuOptions(excludeId)
    // 转换数据格式：{id, name, parent_id} -> {value, label}，并构建树形结构
    menuOptions.value = buildMenuOptionsTree(rawOptions)
  } catch (err) {
    console.error('加载菜单选项失败:', err)
  }
}

// 构建菜单选项树形结构
const buildMenuOptionsTree = (options: any[]): MenuOption[] => {
  const result: MenuOption[] = []
  const optionsMap = new Map()
  
  // 先创建映射
  options.forEach(option => {
    optionsMap.set(option.id, {
      value: option.id,
      label: option.name,
      parent_id: option.parent_id,
      children: []
    })
  })
  
  // 构建树形结构
  options.forEach(option => {
    const menuOption = optionsMap.get(option.id)
    if (option.parent_id && optionsMap.has(option.parent_id)) {
      // 有父级菜单
      const parent = optionsMap.get(option.parent_id)
      parent.children = parent.children || []
      parent.children.push({
        value: menuOption.value,
        label: `├─ ${menuOption.label}`,
        children: []
      })
    } else {
      // 顶级菜单
      menuOption.label = menuOption.label
      if (menuOption.children && menuOption.children.length > 0) {
        menuOption.children.forEach((child: any) => {
          child.label = `├─ ${child.label.replace('├─ ', '')}`
        })
      }
      result.push(menuOption)
    }
  })
  
  // 只返回顶级菜单，子菜单会作为层级显示
  const flatResult: MenuOption[] = []
  
  const addToFlat = (items: any[], level = 0) => {
    const prefix = level === 0 ? '' : '　'.repeat(level) + '├─ '
    items.forEach(item => {
      flatResult.push({
        value: item.value,
        label: prefix + item.label.replace(/├─ /g, ''),
        children: []
      })
      if (item.children && item.children.length > 0) {
        addToFlat(item.children, level + 1)
      }
    })
  }
  
  // 先按parent_id排序，顶级菜单在前
  const sortedOptions = [...options].sort((a, b) => {
    if (a.parent_id === null && b.parent_id !== null) return -1
    if (a.parent_id !== null && b.parent_id === null) return 1
    return a.id - b.id
  })
  
  // 重新构建简单的层级显示
  const topLevelMenus = sortedOptions.filter(option => option.parent_id === null)
  
  const buildHierarchy = (parentId: number | null, level = 0): MenuOption[] => {
    const children = sortedOptions.filter(option => option.parent_id === parentId)
    const result: MenuOption[] = []
    
    children.forEach(child => {
      const prefix = level === 0 ? '' : '　'.repeat(level) + '├─ '
      result.push({
        value: child.id,
        label: prefix + child.name,
        children: []
      })
      result.push(...buildHierarchy(child.id, level + 1))
    })
    
    return result
  }
  
  return buildHierarchy(null)
}

// 图标相关方法
const handleIconTypeChange = () => {
  // 当图标类型改变时，清空图标值
  form.icon = ''
}

// 预定义图标列表
const getPredefinedIcons = () => {
  return [
    'Home', 'LayoutDashboard', 'Users', 'User', 'Settings', 'Menu', 'FileText', 'Folder', 'Bot',
    'Shield', 'Lock', 'Key', 'UserCheck', 'Database', 'Server',
    'ShoppingCart', 'DollarSign', 'CreditCard', 'TrendingUp', 'BarChart3', 'PieChart',
    'Monitor', 'Activity', 'Zap', 'Wifi', 'Clock', 'AlertTriangle',
    'Bell', 'Mail', 'MessageCircle', 'Calendar', 'Search', 'Plus', 'Minus', 'Edit', 'Trash2', 
    'Download', 'Upload'
  ]
}

const isIconInPredefinedList = (iconName: string) => {
  return getPredefinedIcons().includes(iconName)
}

const getLucideIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Home, LayoutDashboard, Users, User, Settings, Menu, FileText, Folder, Bot,
    Shield, Lock, Key, UserCheck, Database, Server,
    ShoppingCart, DollarSign, CreditCard, TrendingUp, BarChart3, PieChart,
    Monitor, Activity, Zap, Wifi, Clock, AlertTriangle,
    Bell, Mail, MessageCircle, Calendar, Search, Plus, Minus, Edit, Trash2, 
    Download, Upload
  }
  return iconMap[iconName] || Menu // 默认返回Menu图标
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  const data = {
    name: form.name,
    path: form.path || undefined,
    component: form.component || undefined,
    icon: form.icon || undefined,
    type: form.type,
    status: form.status,
    sort_order: form.sort_order,
    parent_id: form.parent_id || undefined,
    // 后端字段名是permission，不是permission_key
    permission: form.permission_key || undefined,
    // visible字段与is_hidden逻辑相反
    visible: form.is_hidden ? 0 : 1
  }
  
  emit('submit', data)
}

// 监听
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadForm()
      loadMenuOptions()
    }
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  if (props.visible) {
    loadForm()
    loadMenuOptions()
  }
})
</script>