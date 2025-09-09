<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">笔数套餐模式</h2>
        <p class="text-gray-600 text-sm mt-1">长期套餐价格配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="config" class="flex flex-col lg:flex-row gap-6">
      <!-- 左侧：Telegram 显示预览 -->
      <TelegramPreview
        :packages="config.config.packages"
        :usage-rules="config.config.usage_rules"
        :notes="config.config.notes"
        :display-texts="config.config.display_texts"
      />

      <!-- 右侧：配置表单 -->
      <div class="lg:w-2/3 space-y-6">
        <!-- 基础配置 -->
        <BasicConfig
          :config="{
            daily_fee: config.config.daily_fee,
            transferable: config.config.transferable,
            proxy_purchase: config.config.proxy_purchase
          }"
          @update:daily_fee="updateConfigField('daily_fee', $event)"
          @update:transferable="updateConfigField('transferable', $event)"
          @update:proxy_purchase="updateConfigField('proxy_purchase', $event)"
        />

        <!-- 套餐配置 -->
        <PackagesList
          :packages="config.config.packages"
          @update:packages="updateConfigField('packages', $event)"
        />

        <!-- 内嵌键盘配置 -->
        <InlineKeyboardConfig
          :config="inlineKeyboardConfig"
          :packages="config.config.packages"
          @update:config="updateInlineKeyboardConfig"
        />

        <!-- 显示文本配置 -->
        <DisplayTextConfig
          :display-texts="config.config.display_texts"
          @update:display-text="updateDisplayText"
        />

        <!-- 使用规则配置 -->
        <UsageRulesConfig
          :usage-rules="config.config.usage_rules"
          @update:usage-rules="updateConfigField('usage_rules', $event)"
        />

        <!-- 注意事项配置 -->
        <NotesConfig
          :notes="config.config.notes"
          @update:notes="updateConfigField('notes', $event)"
        />
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        @click="handleSave"
        :disabled="saving"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import type { ConfigCardProps } from '../types'

// 导入子组件
import BasicConfig from './TransactionPackage/BasicConfig.vue'
import DisplayTextConfig from './TransactionPackage/DisplayTextConfig.vue'
import InlineKeyboardConfig from './TransactionPackage/InlineKeyboardConfig.vue'
import NotesConfig from './TransactionPackage/NotesConfig.vue'
import PackagesList from './TransactionPackage/PackagesList.vue'
import TelegramPreview from './TransactionPackage/TelegramPreview.vue'
import UsageRulesConfig from './TransactionPackage/UsageRulesConfig.vue'

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()

// 内嵌键盘配置管理
const inlineKeyboardConfig = reactive({
  enabled: false,
  keyboard_type: 'transaction_count_selection',
  title: '🔥 笔数套餐服务',
  description: '请选择您需要的交易笔数，按钮显示在此文本下方：',
  buttons_per_row: 1,
  buttons: [
    {
      id: '1',
      text: '1笔 - 100 TRX',
      callback_data: 'transaction_package_1',
      transaction_count: 1,
      price: 100,
      description: '单笔交易，适合临时使用'
    },
    {
      id: '2',
      text: '5笔 - 450 TRX',
      callback_data: 'transaction_package_5',
      transaction_count: 5,
      price: 450,
      description: '5笔套餐，节省50 TRX'
    }
  ],
  next_message: '请输入能量接收地址',
  validation: {
    address_required: true,
    min_transaction_count: 1,
    max_transaction_count: 50
  }
})

const handleToggle = () => {
  props.onToggle('transaction_package')
}

const handleSave = () => {
  // 确保保存时包含内嵌键盘配置
  if (props.config) {
    props.config.inline_keyboard_config = inlineKeyboardConfig
  }
  props.onSave('transaction_package')
}

const updateConfigField = (field: string, value: any) => {
  if (props.config?.config) {
    props.config.config[field] = value
  }
}

const updateDisplayText = (field: string, value: string) => {
  if (props.config?.config) {
    if (!props.config.config.display_texts) {
      initializeDisplayTexts()
    }
    if (props.config.config.display_texts) {
      props.config.config.display_texts[field] = value
    }
  }
}

const updateInlineKeyboardConfig = (newConfig: any) => {
  Object.assign(inlineKeyboardConfig, newConfig)
}

// 初始化显示文本配置
const initializeDisplayTexts = () => {
  if (props.config?.config && !props.config.config.display_texts) {
    props.config.config.display_texts = {
      title: '🔥 笔数套餐 🔥（无时间限制）',
      subtitle: '（24小时不使用，则扣一笔占费）',
      usage_title: '💡 笔数开/关按钮，可查询账单，开/关笔数',
      address_prompt: '请输入能量接收地址：'
    }
  }
}

// 初始化使用规则
const initializeUsageRules = () => {
  if (props.config?.config && !props.config.config.usage_rules) {
    props.config.config.usage_rules = [
      '对方有U没U都是扣除一笔转账',
      '转移笔数到其他地址请联系客服',
      '为他人购买，填写他人地址即可'
    ]
  }
}

// 初始化notes数组
const initializeNotes = () => {
  if (props.config?.config && !props.config.config.notes) {
    props.config.config.notes = [
      '暂停后不会自动扣费'
    ]
    // 根据配置动态添加注意事项
    if (props.config.config.transferable) {
      props.config.config.notes.push('支持转移笔数给其他地址')
    }
    if (props.config.config.proxy_purchase) {
      props.config.config.notes.push('支持代购，填写收款地址即可')
    }
  }
}

// 初始化内嵌键盘配置
const initializeInlineKeyboardConfig = () => {
  if (props.config?.inline_keyboard_config) {
    // 如果已有配置，则加载现有配置
    Object.assign(inlineKeyboardConfig, props.config.inline_keyboard_config)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initializeDisplayTexts()
  initializeUsageRules()
  initializeNotes()
  initializeInlineKeyboardConfig()
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}
</style>
