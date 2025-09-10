<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <el-tabs v-model="activeTab" class="notification-tabs-modern">
      
      <!-- 业务通知配置 -->
      <el-tab-pane name="business">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">💼</span>
            <span>业务通知</span>
          </div>
        </template>
        <div class="p-6">
          <BusinessNotificationPanel 
            v-model="config.business_notifications"
            :bot-id="botId"
            @save="$emit('save')"
          />
        </div>
      </el-tab-pane>

      <!-- 代理通知配置 -->
      <el-tab-pane name="agent">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">👥</span>
            <span>代理通知</span>
          </div>
        </template>
        <div class="p-6">
          <AgentNotificationPanel 
            v-model="config.agent_notifications"
            :bot-id="botId"
            @save="$emit('save')"
          />
        </div>
      </el-tab-pane>

      <!-- 价格通知配置 -->
      <el-tab-pane name="price">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">💰</span>
            <span>价格通知</span>
          </div>
        </template>
        <div class="p-6">
          <PriceNotificationPanel 
            v-model="config.price_notifications"
            :bot-id="botId"
            @save="$emit('save')"
          />
        </div>
      </el-tab-pane>

      <!-- 系统通知配置 -->
      <el-tab-pane name="system">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">⚙️</span>
            <span>系统通知</span>
          </div>
        </template>
        <div class="p-6">
          <SystemNotificationPanel 
            v-model="config.system_notifications"
            :bot-id="botId"
            @save="$emit('save')"
          />
        </div>
      </el-tab-pane>

      <!-- 营销通知配置 -->
      <el-tab-pane name="marketing">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">📢</span>
            <span>营销通知</span>
          </div>
        </template>
        <div class="p-6">
          <MarketingNotificationPanel 
            v-model="config.marketing_notifications"
            :bot-id="botId"
            @save="$emit('save')"
          />
        </div>
      </el-tab-pane>

      <!-- 消息模板管理 -->
      <el-tab-pane name="templates">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">📝</span>
            <span>消息模板</span>
          </div>
        </template>
        <div class="p-6">
          <MessageTemplatePanel 
            :bot-id="botId"
            @template-updated="$emit('refresh')"
          />
        </div>
      </el-tab-pane>

      <!-- 通知设置 -->
      <el-tab-pane name="settings">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">⚡</span>
            <span>通知设置</span>
          </div>
        </template>
        <div class="p-6">
          <NotificationSettingsPanel 
            :bot-id="botId"
            @settings-updated="$emit('refresh')"
          />
        </div>
      </el-tab-pane>

      <!-- 数据分析 -->
      <el-tab-pane name="analytics">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">📊</span>
            <span>数据分析</span>
          </div>
        </template>
        <div class="p-6">
          <NotificationAnalyticsPanel 
            :bot-id="botId"
          />
        </div>
      </el-tab-pane>

      <!-- 手动发送 -->
      <el-tab-pane name="manual">
        <template #label>
          <div class="flex items-center gap-2 px-2 py-1">
            <span class="text-lg">📤</span>
            <span>手动发送</span>
          </div>
        </template>
        <div class="p-6">
          <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 text-center">
            <div class="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <span class="text-3xl">📤</span>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">手动发送通知</h3>
            <p class="text-gray-600 mb-6 max-w-md mx-auto">向机器人用户发送自定义通知消息，支持富文本格式和图片</p>
            <el-button 
              type="primary" 
              size="large"
              @click="$emit('show-manual-dialog')"
              class="px-8 py-3"
            >
              <Promotion class="w-5 h-5 mr-2" />
              发送通知
            </el-button>
          </div>
        </div>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import type { BotNotificationConfig } from '@/types/notification'
import { Promotion } from '@element-plus/icons-vue'
import { ref } from 'vue'

// 组件导入
import AgentNotificationPanel from '../../components/AgentNotificationPanel.vue'
import BusinessNotificationPanel from '../../components/BusinessNotificationPanel.vue'
import MarketingNotificationPanel from '../../components/MarketingNotificationPanel.vue'
import MessageTemplatePanel from '../../components/MessageTemplatePanel.vue'
import NotificationAnalyticsPanel from '../../components/NotificationAnalyticsPanel.vue'
import NotificationSettingsPanel from '../../components/NotificationSettingsPanel.vue'
import PriceNotificationPanel from '../../components/PriceNotificationPanel.vue'
import SystemNotificationPanel from '../../components/SystemNotificationPanel.vue'

interface Props {
  config: BotNotificationConfig
  botId: string
}

interface Emits {
  (e: 'save'): void
  (e: 'refresh'): void
  (e: 'show-manual-dialog'): void
}

defineProps<Props>()
defineEmits<Emits>()

const activeTab = ref('business')
</script>

<style scoped>
/* 现代化标签页样式 */
.notification-tabs-modern :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
  background: transparent;
  padding: 0 24px;
}

.notification-tabs-modern :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.notification-tabs-modern :deep(.el-tabs__nav) {
  border: none;
}

.notification-tabs-modern :deep(.el-tabs__item) {
  border: none !important;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  padding: 16px 24px;
  margin-right: 8px;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s ease;
}

.notification-tabs-modern :deep(.el-tabs__item:hover) {
  color: #3b82f6;
  background: #eff6ff;
}

.notification-tabs-modern :deep(.el-tabs__item.is-active) {
  color: #3b82f6 !important;
  background: #eff6ff;
  border-bottom: 3px solid #3b82f6 !important;
  margin-bottom: 0;
}

.notification-tabs-modern :deep(.el-tabs__active-bar) {
  display: none;
}

.notification-tabs-modern :deep(.el-tabs__content) {
  padding: 0;
}

.notification-tabs-modern :deep(.el-tab-pane) {
  background: #ffffff;
}
</style>
