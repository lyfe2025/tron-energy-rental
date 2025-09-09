<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">🔥 套餐配置</h3>
      <button
        @click="addPackage"
        class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
      >
        ➕ 添加套餐
      </button>
    </div>

    <div class="space-y-4">
      <div
        v-for="(pkg, index) in packages"
        :key="index"
        class="package-item p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-orange-50 to-red-50"
      >
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
            <input
              :value="pkg.name"
              @input="updatePackage(index, 'name', ($event.target as HTMLInputElement).value)"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">📝 笔数</label>
            <input
              :value="pkg.transaction_count"
              @input="updatePackage(index, 'transaction_count', parseInt(($event.target as HTMLInputElement).value))"
              type="number"
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">💰 价格 (TRX)</label>
            <input
              :value="pkg.price"
              @input="updatePackage(index, 'price', parseFloat(($event.target as HTMLInputElement).value))"
              type="number"
              step="0.1"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex items-end">
            <button
              @click="removePackage(index)"
              class="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex-shrink-0"
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Package {
  name: string
  transaction_count: number
  price: number
  currency: string
}

interface PackagesListProps {
  packages: Package[]
}

const props = defineProps<PackagesListProps>()
const emit = defineEmits<{
  'update:packages': [packages: Package[]]
}>()

const addPackage = () => {
  const newPackages = [...props.packages, {
    name: '新套餐',
    transaction_count: 100,
    price: 250,
    currency: 'TRX'
  }]
  emit('update:packages', newPackages)
}

const removePackage = (index: number) => {
  const newPackages = [...props.packages]
  newPackages.splice(index, 1)
  emit('update:packages', newPackages)
}

const updatePackage = (index: number, field: string, value: any) => {
  const newPackages = [...props.packages]
  newPackages[index] = { ...newPackages[index], [field]: value }
  emit('update:packages', newPackages)
}
</script>

<style scoped>
.package-item {
  @apply bg-gray-50;
}
</style>
