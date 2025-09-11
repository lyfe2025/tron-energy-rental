<template>
  <!-- 显示文本配置 -->
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
    <div class="space-y-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
        <input
          v-model="displayTexts.title"
          type="text"
          placeholder="⚡闪租能量（需要时）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">副标题模板</label>
        <div class="space-y-3">
          <div v-for="(template, index) in subtitleTemplates" :key="index" class="flex gap-2">
            <input
              v-model="subtitleTemplates[index]"
              type="text"
              :placeholder="`副标题模板 ${index + 1}（例如：🔸转账 ${index === 0 ? '{price}' : '{price*' + (index + 1) + '}'} Trx= ${index + 1} 笔能量）`"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="removeSubtitleTemplate(index)"
              :disabled="subtitleTemplates.length <= 1"
              class="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
          <button
            @click="addSubtitleTemplate"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            添加副标题模板
          </button>
          <p class="text-xs text-gray-500">
            支持变量：{price} 价格，{max} 最大数量<br/>
            支持计算：{price*2} 乘法，{price+1} 加法，{price-1} 减法，{price/2} 除法<br/>
            例如："🔸转账 {price*2} Trx= 2 笔能量"。所有模板都会显示，每行一个。
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">租赁时长标签</label>
          <input
            v-model="displayTexts.duration_label"
            type="text"
            placeholder="⏱ 租期时效：{duration}小时"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">价格标签</label>
          <input
            v-model="displayTexts.price_label"
            type="text"
            placeholder="💰 单笔价格：{price}TRX"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">最大数量标签</label>
          <input
            v-model="displayTexts.max_label"
            type="text"
            placeholder="🔢 最大购买：{max}笔"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">地址标签</label>
          <input
            v-model="displayTexts.address_label"
            type="text"
            placeholder="💰 下单地址：（点击地址自动复制）"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">双倍能量提醒</label>
        <textarea
          v-model="displayTexts.double_energy_warning"
          rows="2"
          placeholder="⚠️ 注意：账户无USDT将消耗双倍能量"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEnergyFlashConfig } from '../composables/useEnergyFlashConfig';
import type { EnergyFlashConfig } from '../types/energy-flash.types';

interface Props {
  config: EnergyFlashConfig
}

const props = defineProps<Props>()

// 使用配置管理composable
const { displayTexts, subtitleTemplates } = useEnergyFlashConfig(props.config)

/**
 * 副标题模板管理
 */
const addSubtitleTemplate = () => {
  if (props.config?.config?.display_texts?.subtitle_template) {
    if (Array.isArray(props.config.config.display_texts.subtitle_template)) {
      props.config.config.display_texts.subtitle_template.push('')
    }
  }
}

const removeSubtitleTemplate = (index: number) => {
  if (props.config?.config?.display_texts?.subtitle_template) {
    if (Array.isArray(props.config.config.display_texts.subtitle_template)) {
      // 至少保留一个模板
      if (props.config.config.display_texts.subtitle_template.length > 1) {
        props.config.config.display_texts.subtitle_template.splice(index, 1)
      }
    }
  }
}
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
