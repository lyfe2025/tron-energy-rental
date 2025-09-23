<template>
  <div class="announcement-form">
    <el-card class="form-card">
      <template #header>
        <span class="text-gray-900 font-semibold flex items-center gap-2">
          <span class="text-xl">📢</span>
          重要公告配置
        </span>
      </template>

      <el-form :model="form" label-width="120px">
        
        <el-form-item label="公告标题" required>
          <el-input 
            :model-value="form.title"
            @update:model-value="$emit('update:form', { ...form, title: $event })"
            placeholder="输入公告标题"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公告内容" required>
          <el-input 
            type="textarea" 
            :model-value="form.content"
            @update:model-value="$emit('update:form', { ...form, content: $event })"
            placeholder="输入公告详细内容"
            :rows="6"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公告类型">
              <el-select 
                :model-value="form.announcement_type" 
                @update:model-value="$emit('update:form', { ...form, announcement_type: $event })"
                placeholder="选择公告类型"
              >
                <el-option label="政策变更" value="policy_change" />
                <el-option label="功能更新" value="feature_update" />
                <el-option label="安全提醒" value="security_alert" />
                <el-option label="其他公告" value="general" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急程度">
              <el-radio-group :model-value="urgency" @update:model-value="$emit('update:urgency', $event)">
                <el-radio label="low">📅 普通</el-radio>
                <el-radio label="medium">⚠️ 重要</el-radio>
                <el-radio label="high">🚨 紧急</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="配图">
          <el-upload
            class="announcement-uploader"
            action="/api/upload/announcement-image"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleImageUpload"
            :before-upload="beforeImageUpload"
          >
            <img v-if="form.image_url" :src="form.image_url" class="announcement-image" />
            <el-icon v-else class="announcement-uploader-icon text-6xl text-gray-400"><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="操作按钮">
          <div class="action-buttons-config">
            <el-input 
              :model-value="form.action_button.text"
              @update:model-value="$emit('update:form', { ...form, action_button: { ...form.action_button, text: $event } })"
              placeholder="按钮文字"
              style="width: 150px; margin-right: 10px;"
            />
            <el-select 
              :model-value="form.action_button.type"
              @update:model-value="$emit('update:form', { ...form, action_button: { ...form.action_button, type: $event } })"
              placeholder="按钮类型"
              style="width: 120px; margin-right: 10px;"
            >
              <el-option label="URL链接" value="url" />
              <el-option label="回调动作" value="callback_data" />
              <el-option label="无按钮" value="none" />
            </el-select>
            <el-input 
              :model-value="form.action_button.value"
              @update:model-value="$emit('update:form', { ...form, action_button: { ...form.action_button, value: $event } })"
              placeholder="链接或回调数据"
              style="width: 200px;"
            />
          </div>
        </el-form-item>

      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Plus } from '@element-plus/icons-vue'

interface AnnouncementForm {
  title: string
  content: string
  announcement_type: string
  image_url: string
  action_button: {
    text: string
    type: string
    value: string
  }
}

interface Props {
  form: AnnouncementForm
  urgency: string
}

interface Emits {
  (e: 'update:form', value: AnnouncementForm): void
  (e: 'update:urgency', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Toast 通知
const { success, error } = useToast()

// 上传配置
const uploadHeaders = {
  'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
}

const beforeImageUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleImageUpload = (response: any) => {
  if (response.success) {
    emit('update:form', { ...props.form, image_url: response.data.url })
    success('图片上传成功')
  } else {
    error('图片上传失败')
  }
}
</script>

<style scoped>
.form-card {
  @apply bg-white border-gray-200 shadow-sm;
}

.form-card :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.form-card :deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

.form-card :deep(.el-input__inner),
.form-card :deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

.form-card :deep(.el-select) {
  @apply bg-white;
}

.form-card :deep(.el-radio__label) {
  @apply text-gray-700;
}

.form-card :deep(.el-radio__input.is-checked .el-radio__inner) {
  @apply bg-blue-600 border-blue-600;
}

.announcement-uploader {
  @apply border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-blue-400;
}

.announcement-uploader :deep(.el-upload) {
  @apply border-0;
}

.announcement-uploader-icon {
  @apply text-6xl text-gray-400;
}

.announcement-image {
  @apply w-32 h-32 object-cover rounded;
}

.action-buttons-config {
  @apply flex items-center gap-2 flex-wrap;
}

/* 按钮样式 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}
</style>
