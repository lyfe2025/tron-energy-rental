import { reactive } from 'vue'
import type { CreateMenuRequest, MenuOption, MenuTreeNode, UpdateMenuRequest } from '../types'
import { MenuIconType, MenuStatus, MenuType } from '../types'
import { useMenuIcons } from './useMenuIcons'
import { useMenus } from './useMenus'

/**
 * 菜单表单管理 composable
 */
export function useMenuForm() {
  const { detectIconType } = useMenuIcons()
  const { getMenuOptions } = useMenus()

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

  // 重置表单
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

  // 加载表单数据
  const loadForm = (menu?: MenuTreeNode | null, parentMenu?: MenuTreeNode | null) => {
    if (menu) {
      // 编辑模式
      form.name = menu.name
      form.path = menu.path || ''
      form.component = menu.component || ''
      form.icon = menu.icon || ''
      
      // 根据现有图标智能判断图标类型
      if (menu.icon) {
        form.icon_type = detectIconType(menu.icon)
      } else {
        form.icon_type = MenuIconType.LUCIDE
      }
      
      // 处理菜单类型：后端可能返回字符串或数字
      let menuType = menu.type
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
      
      form.status = Number(menu.status) || 1
      form.sort_order = Number(menu.sort_order) || 0
      form.parent_id = menu.parent_id || null
      // 后端字段名是permission，不是permission_key
      form.permission_key = (menu as any).permission || ''
      // 数据库中没有description字段
      form.description = (menu as any).description || ''
      // visible字段与is_hidden逻辑相反，1表示可见，0表示隐藏
      form.is_hidden = (menu as any).visible === 0
      // 数据库中没有is_cache和is_affix字段
      form.is_cache = (menu as any).is_cache || false
      form.is_affix = (menu as any).is_affix || false
      form.redirect = (menu as any).redirect || ''
      form.meta = (menu as any).meta || {}
    } else {
      // 新增模式
      resetForm()
      if (parentMenu) {
        form.parent_id = parentMenu.id
      }
    }
  }

  // 构建菜单选项树形结构
  const buildMenuOptionsTree = (options: any[]): MenuOption[] => {
    // 先按parent_id排序，顶级菜单在前
    const sortedOptions = [...options].sort((a, b) => {
      if (a.parent_id === null && b.parent_id !== null) return -1
      if (a.parent_id !== null && b.parent_id === null) return 1
      return a.id - b.id
    })
    
    // 构建简单的层级显示
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

  // 加载菜单选项
  const loadMenuOptions = async (excludeId?: number) => {
    try {
      const rawOptions = await getMenuOptions(excludeId)
      // 转换数据格式：{id, name, parent_id} -> {value, label}，并构建树形结构
      return buildMenuOptionsTree(rawOptions)
    } catch (err) {
      console.error('加载菜单选项失败:', err)
      return []
    }
  }

  // 构建提交数据
  const buildSubmitData = (): CreateMenuRequest | UpdateMenuRequest => {
    const data = {
      name: form.name,
      path: form.path || undefined,
      component: form.component || undefined,
      icon: form.icon || undefined,
      type: form.type,
      status: form.status,
      sort_order: form.sort_order,
      parent_id: form.parent_id,  // 修复：直接使用form.parent_id，不要使用|| undefined，因为null是有效值
      // 后端字段名是permission，不是permission_key
      permission: form.permission_key || undefined,
      // visible字段与is_hidden逻辑相反
      visible: form.is_hidden ? 0 : 1
    }
    
    return data
  }

  // 图标类型改变处理
  const handleIconTypeChange = () => {
    form.icon = ''
  }

  return {
    form,
    resetForm,
    loadForm,
    loadMenuOptions,
    buildSubmitData,
    handleIconTypeChange
  }
}

