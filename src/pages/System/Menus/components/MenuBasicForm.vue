<template>
  <div class="space-y-6">
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
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6" v-if="form.type === 1">
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
      <!-- 图标选择器 -->
      <MenuIconSelector
        v-model="form.icon"
        v-model:icon-type="form.icon_type"
        @icon-type-change="handleIconTypeChange"
      />
      
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
    <div v-if="form.type === 1">
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
  </div>
</template>

<script setup lang="ts">
import type { MenuOption, MenuTreeNode } from '../types'
import MenuIconSelector from './MenuIconSelector.vue'

// Props
interface Props {
  form: any
  parentMenu?: MenuTreeNode | null
  menuOptions: MenuOption[]
}

defineProps<Props>()

// Emits
interface Emits {
  'icon-type-change': []
}

const emit = defineEmits<Emits>()

// 方法
const handleIconTypeChange = () => {
  emit('icon-type-change')
}
</script>

