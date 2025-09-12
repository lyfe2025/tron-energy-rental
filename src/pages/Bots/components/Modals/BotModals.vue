<template>
  <div>
    <!-- 创建机器人弹窗 -->
    <BotCreateModal
      v-model:visible="modals.showCreateModal"
      @create="$emit('create-bot', $event)"
      @update:visible="$emit('update:showCreateModal', $event)"
    />

    <!-- 编辑机器人弹窗 -->
    <BotEditModal
      v-model:visible="modals.showEditModal"
      :bot-data="modals.selectedBot"
      @save="$emit('update-bot', $event)"
      @refresh="$emit('refresh-bots')"
      @update:visible="$emit('update:showEditModal', $event)"
    />

    <!-- 网络配置弹窗 -->
    <NetworkConfigModal
      v-model:visible="modals.showNetworkModal"
      entity-type="bot"
      :entity-data="modals.selectedBot ? { id: modals.selectedBot.id, name: modals.selectedBot.name } : null"
      @success="$emit('network-updated')"
      @update:visible="handleNetworkModalClose"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="modals.showConfirmDialog"
      :title="modals.confirmDialogConfig.title"
      :message="modals.confirmDialogConfig.message"
      :details="modals.confirmDialogConfig.details"
      :warning="modals.confirmDialogConfig.warning"
      :type="modals.confirmDialogConfig.type"
      :confirm-text="modals.confirmDialogConfig.confirmText"
      :cancel-text="modals.confirmDialogConfig.cancelText"
      :loading="modals.confirmDialogConfig.loading"
      @confirm="$emit('confirm')"
      @cancel="$emit('cancel')"
      @close="$emit('cancel')"
    />

    <!-- 机器人详情弹窗 -->
    <BotDetailDialog
      :visible="modals.showBotDetailDialog"
      :bot-detail="modals.selectedBotDetail"
      @close="$emit('close-bot-detail')"
    />

    <!-- 机器人日志弹窗 -->
    <BotLogsDialog
      :visible="modals.showBotLogsDialog"
      :bot-logs="modals.selectedBotLogs"
      :logs="modals.botLogs"
      :loading="modals.logsLoading"
      @close="$emit('close-bot-logs')"
      @refresh-logs="$emit('refresh-logs')"
    />

    <!-- 手动同步对话框 -->
    <ManualSyncDialog
      v-model="modals.showManualSyncDialog"
      :bot-data="modals.manualSyncBotData"
      :current-form-data="modals.manualSyncFormData"
      @sync-success="$emit('manual-sync-success', $event)"
      @update:modelValue="$emit('update:showManualSyncDialog', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NetworkConfigModal from '@/components/NetworkConfigModal.vue'
import BotCreateModal from '../BotCreateModal.vue'
import BotDetailDialog from '../BotDetailDialog.vue'
import BotEditModal from '../BotEditModal.vue'
import BotLogsDialog from '../BotLogsDialog.vue'
import { ManualSyncDialog } from '../ManualSyncDialog'

const emit = defineEmits<{
  'create-bot': [data: any]
  'update-bot': [data: any]
  'refresh-bots': []
  'network-updated': []
  'network-cancelled': []
  confirm: []
  cancel: []
  'close-bot-detail': []
  'close-bot-logs': []
  'refresh-logs': []
  'manual-sync-success': [result?: any]
  'update:showCreateModal': [value: boolean]
  'update:showEditModal': [value: boolean]
  'update:showManualSyncDialog': [value: boolean]
}>()

// 处理网络配置弹窗关闭事件
const handleNetworkModalClose = (visible: boolean) => {
  if (!visible) {
    // 网络配置弹窗关闭时，触发取消事件以清理状态
    emit('network-cancelled')
  }
}

interface ModalState {
  showCreateModal: boolean
  showEditModal: boolean
  showNetworkModal: boolean
  showManualSyncDialog: boolean
  selectedBot: any
  manualSyncBotData: any
  manualSyncFormData: any
  showConfirmDialog: boolean
  confirmDialogConfig: any
  showBotDetailDialog: boolean
  selectedBotDetail: any
  showBotLogsDialog: boolean
  selectedBotLogs: any
  botLogs: any[]
  logsLoading: boolean
}

interface Props {
  modals: ModalState
}

defineProps<Props>()
</script>
