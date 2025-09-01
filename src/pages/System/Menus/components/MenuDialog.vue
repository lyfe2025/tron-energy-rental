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
              <div class="flex gap-2">
                <select
                  v-model="form.icon_type"
                  class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lucide">Lucide</option>
                  <option value="custom">自定义</option>
                </select>
                <input
                  v-model="form.icon"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :placeholder="form.icon_type === 'lucide' ? '如：users' : '如：U'"
                />
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
import { ref, reactive, watch, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useMenus } from '../composables/useMenus'
import type {
  MenuTreeNode,
  CreateMenuRequest,
  UpdateMenuRequest,
  MenuOption
} from '../types'
import { MenuIconType, MenuType, MenuStatus } from '../types'

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
    form.icon_type = props.menu.icon_type
    form.type = props.menu.type
    form.status = props.menu.status
    form.sort_order = props.menu.sort_order
    form.parent_id = props.menu.parent_id || null
    form.permission_key = props.menu.permission_key || ''
    form.description = props.menu.description || ''
    form.is_hidden = props.menu.is_hidden
    form.is_cache = props.menu.is_cache
    form.is_affix = props.menu.is_affix
    form.redirect = props.menu.redirect || ''
    form.meta = props.menu.meta || {}
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
    menuOptions.value = await getMenuOptions(excludeId)
  } catch (err) {
    console.error('加载菜单选项失败:', err)
  }
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
    icon_type: form.icon_type,
    type: form.type,
    status: form.status,
    sort_order: form.sort_order,
    parent_id: form.parent_id || undefined,
    permission_key: form.permission_key || undefined,
    description: form.description || undefined,
    is_hidden: form.is_hidden,
    is_cache: form.is_cache,
    is_affix: form.is_affix,
    redirect: form.redirect || undefined,
    meta: Object.keys(form.meta || {}).length > 0 ? form.meta : undefined
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