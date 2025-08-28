<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <!-- 桌面端表格 -->
    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left">
              <input
                v-model="selectAll"
                @change="toggleSelectAll"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              能量包信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              类型
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              价格
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              销量
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="pkg in paginatedPackages" :key="pkg.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <input
                v-model="selectedPackages"
                :value="pkg.id"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <div class="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Package class="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ pkg.name }}</div>
                  <div class="text-sm text-gray-500">{{ pkg.description || '暂无描述' }}</div>
                  <div class="text-xs text-gray-400 mt-1">
                    <span v-if="pkg.energy_amount">能量: {{ formatNumber(pkg.energy_amount) }}</span>
                    <span v-if="pkg.bandwidth_amount" class="ml-2">带宽: {{ formatNumber(pkg.bandwidth_amount) }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="getTypeColor(pkg.type)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                {{ getTypeText(pkg.type) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">
                {{ formatCurrency(pkg.price) }} TRX
              </div>
              <div v-if="pkg.original_price && pkg.original_price > pkg.price" class="text-xs text-gray-500 line-through">
                {{ formatCurrency(pkg.original_price) }} TRX
              </div>
              <div v-if="pkg.discount_percentage" class="text-xs text-red-600">
                {{ pkg.discount_percentage }}% 折扣
              </div>
            </td>
            <td class="px-6 py-4">
              <span :class="getStatusColor(pkg.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                {{ getStatusText(pkg.status) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">{{ formatNumber(pkg.sales_count || 0) }}</div>
              <div class="text-xs text-gray-500">今日: {{ formatNumber(pkg.today_sales || 0) }}</div>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <button
                  @click="$emit('view', pkg)"
                  class="text-gray-400 hover:text-gray-600"
                  title="查看"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('edit', pkg)"
                  class="text-gray-400 hover:text-gray-600"
                  title="编辑"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <button
                  @click="$emit('toggle-status', pkg)"
                  :class="pkg.status === 'active' ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'"
                  :title="pkg.status === 'active' ? '禁用' : '启用'"
                >
                  <Power class="h-4 w-4" />
                </button>
                <div class="relative">
                  <button
                    @click="togglePackageMenu(pkg.id)"
                    class="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>
                  <div
                    v-if="showPackageMenu === pkg.id"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                  >
                    <div class="py-1">
                      <button
                        @click="$emit('duplicate', pkg)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <Copy class="h-4 w-4 mr-2" />
                        复制
                      </button>
                      <button
                        @click="$emit('view-stats', pkg)"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <BarChart3 class="h-4 w-4 mr-2" />
                        统计
                      </button>
                      <button
                        @click="$emit('delete', pkg)"
                        class="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 class="h-4 w-4 mr-2" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端卡片 -->
    <div class="md:hidden">
      <div v-for="pkg in paginatedPackages" :key="pkg.id" class="border-b border-gray-200 p-4">
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-3">
            <input
              v-model="selectedPackages"
              :value="pkg.id"
              type="checkbox"
              class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="text-sm font-medium text-gray-900">{{ pkg.name }}</h3>
                <span :class="getTypeColor(pkg.type)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getTypeText(pkg.type) }}
                </span>
                <span :class="getStatusColor(pkg.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getStatusText(pkg.status) }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ pkg.description || '暂无描述' }}</p>
              <div class="flex items-center justify-between mt-2">
                <div class="text-sm">
                  <span class="font-medium text-gray-900">{{ formatCurrency(pkg.price) }} TRX</span>
                  <span v-if="pkg.original_price && pkg.original_price > pkg.price" class="text-xs text-gray-500 line-through ml-2">
                    {{ formatCurrency(pkg.original_price) }} TRX
                  </span>
                </div>
                <div class="text-sm text-gray-500">
                  销量: {{ formatNumber(pkg.sales_count || 0) }}
                </div>
              </div>
            </div>
          </div>
          <div class="relative">
            <button
              @click="togglePackageMenu(pkg.id)"
              class="text-gray-400 hover:text-gray-600"
            >
              <MoreVertical class="h-5 w-5" />
            </button>
            <div
              v-if="showPackageMenu === pkg.id"
              class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
            >
              <div class="py-1">
                <button
                  @click="$emit('view', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Eye class="h-4 w-4 mr-2" />
                  查看
                </button>
                <button
                  @click="$emit('edit', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Edit class="h-4 w-4 mr-2" />
                  编辑
                </button>
                <button
                  @click="$emit('toggle-status', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Power class="h-4 w-4 mr-2" />
                  {{ pkg.status === 'active' ? '禁用' : '启用' }}
                </button>
                <button
                  @click="$emit('duplicate', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Copy class="h-4 w-4 mr-2" />
                  复制
                </button>
                <button
                  @click="$emit('view-stats', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <BarChart3 class="h-4 w-4 mr-2" />
                  统计
                </button>
                <button
                  @click="$emit('delete', pkg)"
                  class="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="paginatedPackages.length === 0" class="text-center py-12">
      <Package class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">暂无能量包</h3>
      <p class="mt-1 text-sm text-gray-500">请使用上方的搜索栏添加能量包</p>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
      <div class="flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="currentPage > 1 && (currentPage = currentPage - 1)"
            :disabled="currentPage <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="currentPage < totalPages && (currentPage = currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              显示第 <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span> 到
                <span class="font-medium">{{ Math.min(currentPage * pageSize, packages.length) }}</span> 条，
                共 <span class="font-medium">{{ packages.length }}</span> 条记录
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="currentPage > 1 && (currentPage = currentPage - 1)"
                :disabled="currentPage <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="currentPage = page"
                :class="[
                  page === currentPage
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                ]"
              >
                {{ page }}
              </button>
              <button
                @click="currentPage < totalPages && (currentPage = currentPage + 1)"
                :disabled="currentPage >= totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3,
  Copy,
  Edit,
  Eye,
  MoreVertical,
  Package,
  Plus,
  Power,
  Trash2
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { EnergyPackage } from '@/types/api'

interface Props {
  packages: EnergyPackage[]
  isLoading?: boolean
  selectedPackages: string[]
  showPackageMenu?: string
  currentPage: number
  totalPages: number
  pageSize: number
}

interface Emits {
  'update:currentPage': [page: number]
  'update:selectedPackages': [packages: string[]]
  'update:showPackageMenu': [packageId: string]
  'view': [pkg: EnergyPackage]
  'edit': [pkg: EnergyPackage]
  'toggle-status': [pkg: EnergyPackage]
  'duplicate': [pkg: EnergyPackage]
  'view-stats': [pkg: EnergyPackage]
  'delete': [pkg: EnergyPackage]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地状态
const showPackageMenu = computed({
  get: () => props.showPackageMenu || '',
  set: (value: string) => emit('update:showPackageMenu', value)
})

// 计算属性
const currentPage = computed({
  get: () => props.currentPage,
  set: (value: number) => emit('update:currentPage', value)
})

const selectedPackages = computed({
  get: () => props.selectedPackages,
  set: (value: string[]) => emit('update:selectedPackages', value)
})

const selectAll = computed({
  get: () => props.selectedPackages.length === paginatedPackages.value.length && paginatedPackages.value.length > 0,
  set: () => toggleSelectAll()
})

const totalPages = computed(() => {
  return props.totalPages
})

const paginatedPackages = computed(() => {
  return props.packages
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = props.currentPage
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...', total)
    }
  }
  
  return pages.filter(page => page !== '...')
})

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN')
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const getTypeText = (type: 'energy' | 'bandwidth' | 'mixed') => {
  const typeMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: '纯能量',
    bandwidth: '纯带宽',
    mixed: '混合包'
  }
  return typeMap[type]
}

const getTypeColor = (type: 'energy' | 'bandwidth' | 'mixed') => {
  const colorMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: 'bg-yellow-100 text-yellow-800',
    bandwidth: 'bg-blue-100 text-blue-800',
    mixed: 'bg-green-100 text-green-800'
  }
  return colorMap[type]
}

const getStatusText = (status: 'active' | 'inactive') => {
  const statusMap: Record<'active' | 'inactive', string> = {
    active: '启用',
    inactive: '禁用'
  }
  return statusMap[status]
}

const getStatusColor = (status: 'active' | 'inactive') => {
  const colorMap: Record<'active' | 'inactive', string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800'
  }
  return colorMap[status]
}

const toggleSelectAll = () => {
  if (props.selectedPackages.length === paginatedPackages.value.length && paginatedPackages.value.length > 0) {
    emit('update:selectedPackages', [])
  } else {
    emit('update:selectedPackages', paginatedPackages.value.map(pkg => pkg.id))
  }
}

const togglePackageMenu = (packageId: string) => {
  emit('update:showPackageMenu', showPackageMenu.value === packageId ? '' : packageId)
}
</script>