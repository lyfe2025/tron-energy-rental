<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
    <div class="space-y-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
        <input
          v-model="displayTexts.title"
          type="text"
          placeholder="🟢USDT自动兑换TRX🔴"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">副标题模板</label>
        <input
          v-model="displayTexts.subtitle_template"
          type="text"
          placeholder="（转U自动回TRX，{min_amount}U起换）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">支持变量：{min_amount} 最小兑换金额</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">汇率标题</label>
          <input
            v-model="displayTexts.rate_title"
            type="text"
            placeholder="📊 当前汇率"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">地址标签</label>
          <input
            v-model="displayTexts.address_label"
            type="text"
            placeholder="📍 兑换地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">汇率描述</label>
        <textarea
          v-model="displayTexts.rate_description"
          rows="2"
          placeholder="当前汇率仅供参考"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>
    </div>
  </div>

  <!-- 换行配置 -->
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📐 换行设置</h3>
    <p class="text-sm text-gray-600 mb-4">
      配置在不同位置添加额外的换行，让消息显示更美观。数值为0表示不添加额外换行。
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          标题后换行数
          <span class="text-xs text-gray-500">(标题与副标题之间)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_title"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          副标题后换行数
          <span class="text-xs text-gray-500">(最小兑换说明后)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_subtitle"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          汇率信息后换行数
          <span class="text-xs text-gray-500">(汇率显示后)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_rates"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          地址信息后换行数
          <span class="text-xs text-gray-500">(兑换地址后)</span>
        </label>
        <input
          v-model.number="lineBreaks.after_address"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          注意事项前换行数
          <span class="text-xs text-gray-500">(注意事项列表前)</span>
        </label>
        <input
          v-model.number="lineBreaks.before_notes"
          type="number"
          min="0"
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    
    <!-- 快速预设 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-2">快速预设</label>
      <div class="flex gap-2 flex-wrap">
        <button
          @click="setLineBreakPreset('compact')"
          class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
        >
          紧凑(0换行)
        </button>
        <button
          @click="setLineBreakPreset('normal')"
          class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
        >
          标准(1换行)
        </button>
        <button
          @click="setLineBreakPreset('spacious')"
          class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
        >
          宽松(2换行)
        </button>
        <button
          @click="setLineBreakPreset('custom')"
          class="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
        >
          自定义美观
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayTexts: any
  lineBreaks?: any
  setLineBreakPreset?: (preset: string) => void
}

const props = defineProps<Props>()

// 默认换行配置
const lineBreaks = props.lineBreaks || {
  after_title: 0,
  after_subtitle: 0,
  after_rates: 0,
  after_address: 0,
  before_notes: 0
}

// 换行配置预设方法
const setLineBreakPreset = props.setLineBreakPreset || ((presetType: string) => {
  const presets = {
    compact: {
      after_title: 0,
      after_subtitle: 0,
      after_rates: 0,
      after_address: 0,
      before_notes: 0
    },
    normal: {
      after_title: 1,
      after_subtitle: 1,
      after_rates: 1,
      after_address: 1,
      before_notes: 1
    },
    spacious: {
      after_title: 2,
      after_subtitle: 2,
      after_rates: 2,
      after_address: 2,
      before_notes: 2
    },
    custom: {
      after_title: 1,
      after_subtitle: 1,
      after_rates: 1,
      after_address: 1,
      before_notes: 1
    }
  }
  
  const preset = presets[presetType] || presets.normal
  Object.assign(lineBreaks, preset)
})
</script>
