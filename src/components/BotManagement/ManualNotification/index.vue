<template>
  <el-dialog 
    :model-value="visible" 
    @update:model-value="$emit('update:modelValue', $event)"
    title="📢 发送系统通知"
    width="80%"
    max-width="1000px"
    :before-close="handleClose"
    class="manual-notification-dialog"
  >
    <div class="notification-sender">
      
      <!-- 通知类型选择 -->
      <NotificationTypeSelector 
        :selected-type="notificationForm.type"
        @update:type="notificationForm.type = $event"
      />

      <!-- 系统维护通知表单 -->
      <MaintenanceForm 
        v-if="notificationForm.type === 'maintenance_notice'"
        :form="maintenanceForm"
        :urgency="notificationForm.urgency"
        @update:form="Object.assign(maintenanceForm, $event)"
        @update:urgency="notificationForm.urgency = $event"
      />

      <!-- 重要公告表单 -->
      <AnnouncementForm 
        v-else-if="notificationForm.type === 'important_announcement'"
        :form="announcementForm"
        :urgency="notificationForm.urgency"
        @update:form="Object.assign(announcementForm, $event)"
        @update:urgency="notificationForm.urgency = $event"
      />

      <!-- 通用配置 -->
      <CommonSettings 
        :settings="{
          target_users: notificationForm.target_users,
          send_options: notificationForm.send_options,
          scheduled_at: notificationForm.scheduled_at
        }"
        @update:settings="Object.assign(notificationForm, $event)"
      />

      <!-- 预览区域 -->
      <MessagePreview :content="previewContent" />

    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="previewNotification">
          👁️ 预览效果
        </el-button>
        <el-button 
          type="success" 
          @click="handleSendNotification"
          :loading="sending"
        >
          📢 发送通知
        </el-button>
      </div>
    </template>

  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { computed } from 'vue'
import { useManualNotification } from './composables/useManualNotification'

// 组件导入
import AnnouncementForm from './components/AnnouncementForm.vue'
import CommonSettings from './components/CommonSettings.vue'
import MaintenanceForm from './components/MaintenanceForm.vue'
import MessagePreview from './components/MessagePreview.vue'
import NotificationTypeSelector from './components/NotificationTypeSelector.vue'

interface Props {
  modelValue: boolean
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'sent', notificationId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用手动通知逻辑
const {
  sending,
  notificationForm,
  maintenanceForm,
  announcementForm,
  previewContent,
  resetForm,
  sendNotification
} = useManualNotification(props.botId)

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法定义
const handleClose = () => {
  visible.value = false
  resetForm()
}

const previewNotification = () => {
  ElMessageBox.alert(previewContent.value.content, previewContent.value.title, {
    confirmButtonText: '确定',
    dangerouslyUseHTMLString: true
  })
}

const handleSendNotification = async () => {
  const notificationId = await sendNotification()
  if (notificationId) {
    emit('sent', notificationId)
    handleClose()
  }
}
</script>

<style scoped>
.manual-notification-dialog :deep(.el-dialog) {
  @apply bg-white border border-gray-200 shadow-xl;
}

.manual-notification-dialog :deep(.el-dialog__header) {
  @apply bg-gray-50 border-b border-gray-200;
}

.manual-notification-dialog :deep(.el-dialog__title) {
  @apply text-gray-900 font-semibold;
}

.dialog-footer {
  @apply flex justify-end gap-3;
}

/* 按钮样式 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}
</style>
