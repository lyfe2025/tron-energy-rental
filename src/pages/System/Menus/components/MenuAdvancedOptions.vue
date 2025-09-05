<template>
  <div class="space-y-6">
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
        <label class="flex items-center" v-if="form.type === 1">
          <input
            v-model="form.is_cache"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="ml-2 text-sm text-gray-700">页面缓存</span>
        </label>
        
        <!-- 是否固定 -->
        <label class="flex items-center" v-if="form.type === 1">
          <input
            v-model="form.is_affix"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="ml-2 text-sm text-gray-700">固定标签</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  form: any
}

defineProps<Props>()
</script>

