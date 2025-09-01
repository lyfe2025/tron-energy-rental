<template>
  <div class="menus-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 rounded-lg">
          <Menu class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">菜单管理</h1>
          <p class="text-sm text-gray-500">管理系统菜单结构和权限配置</p>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- 搜索和筛选 -->
        <div class="flex flex-col sm:flex-row gap-4 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索菜单名称..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="handleSearch"
            />
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button
            @click="handleExpandAll"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronDown class="w-4 h-4" />
            {{ allExpanded ? '收起全部' : '展开全部' }}
          </button>
          
          <button
            @click="handleRefresh"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw class="w-4 h-4" />
            刷新
          </button>
          
          <button
            @click="handleCreateMenu"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus class="w-4 h-4" />
            新增菜单
          </button>
        </div>
      </div>
    </div>

    <!-- 菜单树 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
        <div class="text-red-500 mb-2">加载失败</div>
        <button
          @click="handleRefresh"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          重试
        </button>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="menuTree.length === 0" class="flex flex-col items-center justify-center py-12">
        <Menu class="w-12 h-12 text-gray-400 mb-4" />
        <div class="text-gray-500 mb-2">暂无菜单数据</div>
        <button
          @click="handleCreateMenu"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          创建第一个菜单
        </button>
      </div>
      
      <!-- 菜单树形结构 -->
      <div v-else class="p-6">
        <MenuTreeNode
          v-for="menu in filteredMenuTree"
          :key="menu.id"
          :menu="menu"
          :expanded="expandedNodes.includes(menu.id)"
          :selected="selectedMenu?.id === menu.id"
          @toggle="handleToggleNode"
          @select="handleSelectMenu"
          @create-child="handleCreateChildMenu"
          @edit="handleEditMenu"
          @delete="handleDeleteMenu"
        />
      </div>
    </div>

    <!-- 菜单对话框 -->
    <MenuDialog
      v-if="dialogVisible"
      :visible="dialogVisible"
      :menu="currentMenu"
      :parent-menu="parentMenu"
      :loading="dialogLoading"
      @close="handleCloseDialog"
      @submit="handleSubmitMenu"
    />

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      v-if="confirmVisible"
      :visible="confirmVisible"
      :title="'删除菜单'"
      :message="confirmMessage"
      :loading="confirmLoading"
      type="danger"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Menu, Plus, RefreshCw, Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import MenuDialog from './components/MenuDialog.vue'
import MenuTreeNode from './components/MenuTreeNode.vue'
import { useMenus } from './composables/useMenus'
import type { CreateMenuRequest, MenuTreeNode as MenuTreeNodeType, UpdateMenuRequest } from './types'

// 使用组合式函数
const {
  menuTree,
  loading,
  error,
  loadMenuTree,
  createMenu,
  updateMenu,
  deleteMenuById
} = useMenus()

// 状态
const searchQuery = ref('')
const expandedNodes = ref<number[]>([])
const selectedMenu = ref<MenuTreeNodeType | null>(null)
const currentMenu = ref<MenuTreeNodeType | null>(null)
const parentMenu = ref<MenuTreeNodeType | null>(null)
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const confirmVisible = ref(false)
const confirmLoading = ref(false)
const confirmMessage = ref('')
const menuToDelete = ref<MenuTreeNodeType | null>(null)

// 计算属性
const allExpanded = computed(() => {
  const getAllMenuIds = (menus: MenuTreeNodeType[]): number[] => {
    const ids: number[] = []
    menus.forEach(menu => {
      ids.push(menu.id)
      if (menu.children && menu.children.length > 0) {
        ids.push(...getAllMenuIds(menu.children))
      }
    })
    return ids
  }
  
  const allIds = getAllMenuIds(menuTree.value)
  return allIds.length > 0 && allIds.every(id => expandedNodes.value.includes(id))
})

const filteredMenuTree = computed(() => {
  if (!searchQuery.value) {
    return menuTree.value
  }
  
  const filterMenus = (menus: MenuTreeNodeType[]): MenuTreeNodeType[] => {
    const filtered: MenuTreeNodeType[] = []
    
    menus.forEach(menu => {
      const matchesSearch = menu.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      const filteredChildren = menu.children ? filterMenus(menu.children) : []
      
      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...menu,
          children: filteredChildren
        })
      }
    })
    
    return filtered
  }
  
  return filterMenus(menuTree.value)
})

// 方法
const handleSearch = () => {
  // 搜索时自动展开所有匹配的节点
  if (searchQuery.value) {
    const expandMatching = (menus: MenuTreeNodeType[]) => {
      menus.forEach(menu => {
        if (menu.name.toLowerCase().includes(searchQuery.value.toLowerCase())) {
          if (!expandedNodes.value.includes(menu.id)) {
            expandedNodes.value.push(menu.id)
          }
        }
        if (menu.children) {
          expandMatching(menu.children)
        }
      })
    }
    expandMatching(menuTree.value)
  }
}

const handleRefresh = async () => {
  searchQuery.value = ''
  await loadMenuTree()
}

const handleExpandAll = () => {
  const getAllMenuIds = (menus: MenuTreeNodeType[]): number[] => {
    const ids: number[] = []
    menus.forEach(menu => {
      ids.push(menu.id)
      if (menu.children && menu.children.length > 0) {
        ids.push(...getAllMenuIds(menu.children))
      }
    })
    return ids
  }
  
  if (allExpanded.value) {
    expandedNodes.value = []
  } else {
    expandedNodes.value = getAllMenuIds(menuTree.value)
  }
}

const handleToggleNode = (menuId: number) => {
  const index = expandedNodes.value.indexOf(menuId)
  if (index > -1) {
    expandedNodes.value.splice(index, 1)
  } else {
    expandedNodes.value.push(menuId)
  }
}

const handleSelectMenu = (menu: MenuTreeNodeType) => {
  selectedMenu.value = menu
}

const handleCreateMenu = () => {
  currentMenu.value = null
  parentMenu.value = null
  dialogVisible.value = true
}

const handleCreateChildMenu = (menu: MenuTreeNodeType) => {
  currentMenu.value = null
  parentMenu.value = menu
  dialogVisible.value = true
}

const handleEditMenu = (menu: MenuTreeNodeType) => {
  currentMenu.value = menu
  parentMenu.value = null
  dialogVisible.value = true
}

const handleDeleteMenu = (menu: MenuTreeNodeType) => {
  menuToDelete.value = menu
  
  if (menu.children && menu.children.length > 0) {
    confirmMessage.value = `菜单「${menu.name}」包含子菜单，删除后子菜单也将被删除。确定要删除吗？`
  } else {
    confirmMessage.value = `确定要删除菜单「${menu.name}」吗？此操作不可恢复。`
  }
  
  confirmVisible.value = true
}

const handleCloseDialog = () => {
  dialogVisible.value = false
  currentMenu.value = null
  parentMenu.value = null
}

const handleSubmitMenu = async (data: CreateMenuRequest | UpdateMenuRequest) => {
  try {
    dialogLoading.value = true
    
    let result: MenuTreeNodeType | null = null
    
    if (currentMenu.value) {
      // 编辑
      result = await updateMenu(currentMenu.value.id, data as UpdateMenuRequest)
    } else {
      // 创建
      const createData = {
        ...data,
        parent_id: parentMenu.value?.id || null
      } as CreateMenuRequest
      result = await createMenu(createData)
    }
    
    if (result) {
      dialogVisible.value = false
      currentMenu.value = null
      parentMenu.value = null
      await loadMenuTree()
    }
  } catch (err) {
    console.error('操作失败:', err)
  } finally {
    dialogLoading.value = false
  }
}

const handleConfirmDelete = async () => {
  if (!menuToDelete.value) return
  
  try {
    confirmLoading.value = true
    
    const success = await deleteMenuById(menuToDelete.value.id)
    
    if (success) {
      confirmVisible.value = false
      menuToDelete.value = null
      await loadMenuTree()
    }
  } catch (err) {
    console.error('删除失败:', err)
  } finally {
    confirmLoading.value = false
  }
}

const handleCancelDelete = () => {
  confirmVisible.value = false
  menuToDelete.value = null
}

// 生命周期
onMounted(async () => {
  await loadMenuTree()
})
</script>

<style scoped>
.menus-page {
  @apply p-6 space-y-6;
}

.page-header {
  @apply mb-6;
}
</style>