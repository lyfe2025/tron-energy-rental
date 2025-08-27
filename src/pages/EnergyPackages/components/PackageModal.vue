<template>
  <!-- 能量包详情/编辑模态框 -->
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="handleBackdropClick"
  >
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">
          {{ modalTitle }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>

      <!-- 查看模式 -->
      <div v-if="mode === 'view'" class="space-y-6">
        <!-- 基本信息 -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-3">基本信息</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">能量包名称</label>
              <p class="mt-1 text-sm text-gray-900">{{ selectedPackage?.name }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">类型</label>
              <p class="mt-1">
                <span :class="getTypeColor(selectedPackage?.type)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getTypeText(selectedPackage?.type) }}
                </span>
              </p>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700">描述</label>
              <p class="mt-1 text-sm text-gray-900">{{ selectedPackage?.description || '暂无描述' }}</p>
            </div>
          </div>
        </div>

        <!-- 价格信息 -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-3">价格信息</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">当前价格</label>
              <p class="mt-1 text-sm font-semibold text-gray-900">{{ formatCurrency(selectedPackage?.price || 0) }} TRX</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">原价</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatCurrency(selectedPackage?.original_price || 0) }} TRX</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">折扣</label>
              <p class="mt-1 text-sm text-gray-900">{{ selectedPackage?.discount_percentage || 0 }}%</p>
            </div>
          </div>
        </div>

        <!-- 资源配置 -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-3">资源配置</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">能量数量</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatNumber(selectedPackage?.energy_amount || 0) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">带宽数量</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatNumber(selectedPackage?.bandwidth_amount || 0) }}</p>
            </div>
          </div>
        </div>

        <!-- 销售统计 -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 mb-3">销售统计</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">总销量</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatNumber(selectedPackage?.sales_count || 0) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">今日销量</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatNumber(selectedPackage?.today_sales || 0) }}</p>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3">
          <button
            @click="$emit('edit', selectedPackage)"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit class="-ml-1 mr-2 h-4 w-4" />
            编辑
          </button>
          <button
            @click="$emit('duplicate', selectedPackage)"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Copy class="-ml-1 mr-2 h-4 w-4" />
            复制
          </button>
        </div>
      </div>

      <!-- 编辑/创建模式 -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 基本信息 -->
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">能量包名称 *</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="请输入能量包名称"
            />
          </div>

          <div>
            <label for="type" class="block text-sm font-medium text-gray-700">类型 *</label>
            <select
              id="type"
              v-model="form.type"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="energy">纯能量</option>
              <option value="bandwidth">纯带宽</option>
              <option value="mixed">混合包</option>
            </select>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700">描述</label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="请输入能量包描述"
            ></textarea>
          </div>
        </div>

        <!-- 资源配置 -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-gray-900">资源配置</h4>
          
          <div v-if="form.type === 'energy' || form.type === 'mixed'">
            <label for="energy_amount" class="block text-sm font-medium text-gray-700">能量数量 *</label>
            <input
              id="energy_amount"
              v-model.number="form.energy_amount"
              type="number"
              min="0"
              step="1"
              :required="form.type === 'energy' || form.type === 'mixed'"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="请输入能量数量"
            />
          </div>

          <div v-if="form.type === 'bandwidth' || form.type === 'mixed'">
            <label for="bandwidth_amount" class="block text-sm font-medium text-gray-700">带宽数量 *</label>
            <input
              id="bandwidth_amount"
              v-model.number="form.bandwidth_amount"
              type="number"
              min="0"
              step="1"
              :required="form.type === 'bandwidth' || form.type === 'mixed'"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="请输入带宽数量"
            />
          </div>
        </div>

        <!-- 价格设置 -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-gray-900">价格设置</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="price" class="block text-sm font-medium text-gray-700">价格 (TRX) *</label>
              <input
                id="price"
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.000001"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入价格"
              />
            </div>

            <div>
              <label for="original_price" class="block text-sm font-medium text-gray-700">原价 (TRX)</label>
              <input
                id="original_price"
                v-model.number="form.original_price"
                type="number"
                min="0"
                step="0.000001"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入原价"
              />
            </div>
          </div>

          <div>
            <label for="discount_percentage" class="block text-sm font-medium text-gray-700">折扣百分比 (%)</label>
            <input
              id="discount_percentage"
              v-model.number="form.discount_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="请输入折扣百分比"
            />
          </div>
        </div>

        <!-- 状态设置 -->
        <div>
          <div class="flex items-center">
            <input
              id="status"
              v-model="form.status"
              type="checkbox"
              true-value="active"
              false-value="inactive"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label for="status" class="ml-2 block text-sm text-gray-900">
              启用能量包
            </label>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            @click="$emit('close')"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isSaving" class="-ml-1 mr-2 h-4 w-4 animate-spin" />
            {{ isSaving ? '保存中...' : (mode === 'create' ? '创建' : '保存') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy, Edit, Loader2, X } from 'lucide-vue-next'
import { computed, watch } from 'vue'
import type { EnergyPackage } from '@/types/api'

interface Props {
  show: boolean
  mode: 'view' | 'edit' | 'create'
  selectedPackage?: EnergyPackage | null
  form: {
    id?: string
    name: string
    type: 'energy' | 'bandwidth' | 'mixed'
    description: string
    energy_amount: number
    bandwidth_amount: number
    price: number
    original_price: number
    discount_percentage: number
    status: 'active' | 'inactive'
  }
  isSaving: boolean
}

interface Emits {
  'close': []
  'submit': []
  'edit': [pkg: EnergyPackage]
  'duplicate': [pkg: EnergyPackage]
  'update:form': [form: Props['form']]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'view':
      return '能量包详情'
    case 'edit':
      return '编辑能量包'
    case 'create':
      return '创建能量包'
    default:
      return '能量包'
  }
})

// 监听表单变化
watch(
  () => props.form,
  (newForm) => {
    emit('update:form', newForm)
  },
  { deep: true }
)

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN')
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

const getTypeText = (type?: 'energy' | 'bandwidth' | 'mixed') => {
  if (!type) return ''
  const typeMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: '纯能量',
    bandwidth: '纯带宽',
    mixed: '混合包'
  }
  return typeMap[type]
}

const getTypeColor = (type?: 'energy' | 'bandwidth' | 'mixed') => {
  if (!type) return ''
  const colorMap: Record<'energy' | 'bandwidth' | 'mixed', string> = {
    energy: 'bg-yellow-100 text-yellow-800',
    bandwidth: 'bg-blue-100 text-blue-800',
    mixed: 'bg-green-100 text-green-800'
  }
  return colorMap[type]
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

const handleSubmit = () => {
  emit('submit')
}
</script>