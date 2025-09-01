<template>
  <div class="menu-tree-node">
    <!-- 当前节点 -->
    <div
      class="menu-node"
      :class="{
        'selected': selected,
        'disabled': menu.status === 0
      }"
      @click="handleSelect"
    >
      <!-- 展开/收起按钮 -->
      <button
        v-if="hasChildren"
        @click.stop="handleToggle"
        class="expand-button"
      >
        <ChevronRight
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'rotate-90': expanded }"
        />
      </button>
      <div v-else class="w-6"></div>
      
      <!-- 菜单图标 -->
      <div class="menu-icon">
        <component
          v-if="menu.icon && menu.icon_type === 'lucide'"
          :is="getIconComponent(menu.icon)"
          class="w-4 h-4"
        />
        <div
          v-else-if="menu.icon && menu.icon_type === 'custom'"
          class="w-4 h-4 bg-gray-300 rounded flex items-center justify-center text-xs"
        >
          {{ menu.icon.charAt(0).toUpperCase() }}
        </div>
        <Menu v-else class="w-4 h-4 text-gray-400" />
      </div>
      
      <!-- 菜单信息 -->
      <div class="menu-info flex-1">
        <div class="flex items-center gap-2">
          <span class="menu-name">{{ menu.name }}</span>
          
          <!-- 菜单类型标签 -->
          <span
            class="type-badge"
            :class="getTypeBadgeClass(menu.type)"
          >
            {{ getTypeLabel(menu.type) }}
          </span>
          
          <!-- 状态标签 -->
          <span
            v-if="menu.status === 0"
            class="status-badge inactive"
          >
            已禁用
          </span>
          
          <!-- 隐藏标签 -->
          <span
            v-if="menu.is_hidden"
            class="status-badge hidden"
          >
            隐藏
          </span>
        </div>
        
        <!-- 菜单路径和权限 -->
        <div class="menu-details">
          <span v-if="menu.path" class="text-xs text-gray-500">{{ menu.path }}</span>
          <span v-if="menu.permission_key" class="text-xs text-blue-600 ml-2">{{ menu.permission_key }}</span>
        </div>
        
        <!-- 描述 -->
        <div v-if="menu.description" class="menu-description">
          {{ menu.description }}
        </div>
      </div>
      
      <!-- 排序号 -->
      <div class="sort-order">
        {{ menu.sort_order }}
      </div>
      
      <!-- 操作按钮 -->
      <div class="menu-actions">
        <button
          @click.stop="handleCreateChild"
          class="action-button"
          title="添加子菜单"
        >
          <Plus class="w-4 h-4" />
        </button>
        
        <button
          @click.stop="handleEdit"
          class="action-button"
          title="编辑"
        >
          <Edit class="w-4 h-4" />
        </button>
        
        <button
          @click.stop="handleDelete"
          class="action-button delete"
          title="删除"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div
      v-if="hasChildren && expanded"
      class="children-container"
    >
      <MenuTreeNode
        v-for="child in menu.children"
        :key="child.id"
        :menu="child"
        :expanded="childExpanded.includes(child.id)"
        :selected="selectedChild === child.id"
        @toggle="handleChildToggle"
        @select="handleChildSelect"
        @create-child="handleChildCreateChild"
        @edit="handleChildEdit"
        @delete="handleChildDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronRight,
  Menu,
  Plus,
  Edit,
  Trash2,
  Folder,
  File,
  Link,
  Settings,
  Home,
  Users,
  Shield,
  Database,
  BarChart3,
  Calendar,
  Mail,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Archive,
  Bookmark,
  Tag,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Printer,
  Camera,
  Image,
  Video,
  Music,
  FileText,
  Code,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  Bluetooth,
  Battery,
  Power,
  Zap,
  Sun,
  Moon,
  Star,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MoreVertical
} from 'lucide-vue-next'
import type { MenuTreeNode as MenuTreeNodeType, MenuType } from '../types'

// Props
interface Props {
  menu: MenuTreeNodeType
  expanded?: boolean
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false,
  selected: false
})

// Emits
interface Emits {
  toggle: [menuId: number]
  select: [menu: MenuTreeNodeType]
  createChild: [menu: MenuTreeNodeType]
  edit: [menu: MenuTreeNodeType]
  delete: [menu: MenuTreeNodeType]
}

const emit = defineEmits<Emits>()

// 状态
const childExpanded = ref<number[]>([])
const selectedChild = ref<number | null>(null)

// 计算属性
const hasChildren = computed(() => {
  return props.menu.children && props.menu.children.length > 0
})

// 图标组件映射
const iconComponents = {
  folder: Folder,
  file: File,
  link: Link,
  settings: Settings,
  home: Home,
  users: Users,
  shield: Shield,
  database: Database,
  'bar-chart-3': BarChart3,
  calendar: Calendar,
  mail: Mail,
  bell: Bell,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  copy: Copy,
  archive: Archive,
  bookmark: Bookmark,
  tag: Tag,
  clock: Clock,
  globe: Globe,
  smartphone: Smartphone,
  monitor: Monitor,
  printer: Printer,
  camera: Camera,
  image: Image,
  video: Video,
  music: Music,
  'file-text': FileText,
  code: Code,
  terminal: Terminal,
  cpu: Cpu,
  'hard-drive': HardDrive,
  wifi: Wifi,
  bluetooth: Bluetooth,
  battery: Battery,
  power: Power,
  zap: Zap,
  sun: Sun,
  moon: Moon,
  star: Star,
  heart: Heart,
  'thumbs-up': ThumbsUp,
  'message-circle': MessageCircle,
  share: Share,
  lock: Lock,
  unlock: Unlock,
  key: Key,
  eye: Eye,
  'eye-off': EyeOff,
  check: Check,
  x: X,
  'alert-triangle': AlertTriangle,
  info: Info,
  'help-circle': HelpCircle,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  menu: Menu,
  plus: Plus,
  edit: Edit,
  'trash-2': Trash2
}

// 方法
const getIconComponent = (iconName: string) => {
  return iconComponents[iconName as keyof typeof iconComponents] || Menu
}

const getTypeLabel = (type: MenuType): string => {
  const labels = {
    menu: '菜单',
    button: '按钮',
    link: '链接'
  }
  return labels[type] || type
}

const getTypeBadgeClass = (type: MenuType): string => {
  const classes = {
    menu: 'bg-blue-100 text-blue-800',
    button: 'bg-green-100 text-green-800',
    link: 'bg-purple-100 text-purple-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const handleToggle = () => {
  emit('toggle', props.menu.id)
}

const handleSelect = () => {
  emit('select', props.menu)
}

const handleCreateChild = () => {
  emit('createChild', props.menu)
}

const handleEdit = () => {
  emit('edit', props.menu)
}

const handleDelete = () => {
  emit('delete', props.menu)
}

// 子节点事件处理
const handleChildToggle = (menuId: number) => {
  const index = childExpanded.value.indexOf(menuId)
  if (index > -1) {
    childExpanded.value.splice(index, 1)
  } else {
    childExpanded.value.push(menuId)
  }
}

const handleChildSelect = (menu: MenuTreeNodeType) => {
  selectedChild.value = menu.id
  emit('select', menu)
}

const handleChildCreateChild = (menu: MenuTreeNodeType) => {
  emit('createChild', menu)
}

const handleChildEdit = (menu: MenuTreeNodeType) => {
  emit('edit', menu)
}

const handleChildDelete = (menu: MenuTreeNodeType) => {
  emit('delete', menu)
}
</script>

<style scoped>
.menu-tree-node {
  @apply select-none;
}

.menu-node {
  @apply flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-gray-50 cursor-pointer transition-colors;
}

.menu-node.selected {
  @apply bg-blue-50 border-blue-200;
}

.menu-node.disabled {
  @apply opacity-60;
}

.expand-button {
  @apply p-1 rounded hover:bg-gray-200 transition-colors;
}

.menu-icon {
  @apply flex items-center justify-center;
}

.menu-info {
  @apply flex-1 min-w-0;
}

.menu-name {
  @apply font-medium text-gray-900 truncate;
}

.type-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.status-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.status-badge.inactive {
  @apply bg-red-100 text-red-800;
}

.status-badge.hidden {
  @apply bg-yellow-100 text-yellow-800;
}

.menu-details {
  @apply flex items-center gap-2 mt-1;
}

.menu-description {
  @apply text-sm text-gray-600 mt-1 truncate;
}

.sort-order {
  @apply text-sm text-gray-500 font-mono;
}

.menu-actions {
  @apply flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity;
}

.menu-node:hover .menu-actions {
  @apply opacity-100;
}

.action-button {
  @apply p-1.5 rounded hover:bg-gray-200 transition-colors;
}

.action-button.delete {
  @apply hover:bg-red-100 hover:text-red-600;
}

.children-container {
  @apply ml-6 border-l border-gray-200 pl-4 mt-2;
}
</style>