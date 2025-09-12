<!--
 * 菜单按钮配置标签页
 * 职责：显示和编辑机器人的菜单按钮配置
-->
<template>
  <div class="space-y-6">
    <!-- 菜单按钮配置 -->
    <div class="space-y-4 border-t pt-6">
      <BotFormMenuButtons
        :modelValue="menuButtonConfig"
        @update:modelValue="$emit('update:menuButtonConfig', $event)"
      />
    </div>

    <!-- 键盘配置 -->
    <div class="space-y-4 border-t pt-6">
      <KeyboardConfigEditor 
        :modelValue="keyboardConfig"
        @update:modelValue="$emit('update:keyboardConfig', $event)"
        :price-configs="priceConfigsStatus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BotFormMenuButtons from '../../BotFormMenuButtons.vue'
import KeyboardConfigEditor from '../../KeyboardConfigEditor.vue'

// 命令接口定义
interface BotCommand {
  command: string
  description: string
}

// 菜单配置接口
interface MenuButtonConfig {
  is_enabled: boolean
  button_text: string
  menu_type: 'commands' | 'web_app'
  web_app_url: string
  commands: BotCommand[]
}

// Props
interface Props {
  menuButtonConfig: MenuButtonConfig
  keyboardConfig: any
  priceConfigsStatus: any
}

defineProps<Props>()

// Emits
defineEmits<{
  'update:menuButtonConfig': [value: any]
  'update:keyboardConfig': [value: any]
}>()
</script>
