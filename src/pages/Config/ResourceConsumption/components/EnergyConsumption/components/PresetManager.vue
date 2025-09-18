<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-orange-100 rounded-lg">
        <Settings class="w-6 h-6 text-orange-600" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">预设值管理</h3>
        <p class="text-sm text-gray-600">快速配置常用能量消耗值</p>
      </div>
    </div>

    <!-- 官方推荐预设值 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
        官方推荐预设值
      </h4>
      <div class="space-y-2">
        <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <div class="font-medium text-blue-900">已有USDT地址转账</div>
            <div class="text-sm text-blue-700">65,000 能量</div>
          </div>
          <button 
            @click="applyPreset(65000)"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            应用
          </button>
        </div>
        <div class="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div>
            <div class="font-medium text-orange-900">新地址首次转账</div>
            <div class="text-sm text-orange-700">130,000 能量</div>
          </div>
          <button 
            @click="applyPreset(130000)"
            class="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>

    <!-- 自定义预设值 -->
    <div class="space-y-3 mb-6" v-if="localConfig.preset_values && localConfig.preset_values.length > 0">
      <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
        自定义预设值
      </h4>
      <div 
        v-for="(preset, index) in localConfig.preset_values" 
        :key="index"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      >
        <div>
          <div class="font-medium text-gray-900">{{ preset.name }}</div>
          <div class="text-sm text-gray-600">{{ preset.value.toLocaleString() }} 能量</div>
        </div>
        <div class="flex gap-2">
          <button 
            @click="applyPreset(preset.value)"
            :disabled="isSaving"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm rounded-md transition-colors"
          >
            应用
          </button>
          <button 
            @click="removePreset(index)"
            :disabled="isSaving"
            class="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm rounded-md transition-colors flex items-center gap-1"
          >
            <div v-if="isSaving" class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加自定义预设值 -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-2 h-2 bg-gray-500 rounded-full"></span>
        添加自定义预设值
      </h4>
      <div class="grid grid-cols-2 gap-3">
        <el-input 
          v-model="newPreset.name" 
          placeholder="预设名称"
          class="col-span-1"
          :disabled="isSaving"
        />
        <el-input-number 
          v-model="newPreset.value" 
          placeholder="能量值"
          :min="1000"
          :max="200000"
          :step="1000"
          class="col-span-1"
          :disabled="isSaving"
        />
        <button 
          @click="addPreset"
          :disabled="!newPreset.name || !newPreset.value || isSaving"
          class="col-span-2 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <div v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {{ isSaving ? '保存中...' : '添加自定义预设' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import type { EnergyConfig } from '../../../types/resource-consumption.types'
import type { NewPresetState } from '../types/energy-calculator.types'

interface Props {
  localConfig: EnergyConfig
  newPreset: NewPresetState
  isSaving?: boolean
  applyPreset: (value: number) => void
  addPreset: () => Promise<void>
  removePreset: (index: number) => Promise<void>
}

defineProps<Props>()
</script>
