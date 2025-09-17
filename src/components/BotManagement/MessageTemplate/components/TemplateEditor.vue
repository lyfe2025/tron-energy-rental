<template>
  <!-- 模板编辑器对话框 -->
  <el-dialog 
    :model-value="visible" 
    :title="isEditMode ? '编辑消息模板' : '创建消息模板'"
    width="90%"
    max-width="1200px"
    @update:model-value="$emit('update:visible', $event)"
    @close="$emit('close')"
    class="template-editor-dialog"
  >
    <div class="template-editor">
      
      <!-- 基础信息 -->
      <el-form :model="currentTemplate" label-width="120px">
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模板名称" required>
              <el-input v-model="currentTemplate.name" placeholder="输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通知类型" required>
              <el-select v-model="currentTemplate.type" placeholder="选择通知类型" class="w-full">
                <el-option-group label="业务通知">
                  <el-option label="订单创建" value="order_created" />
                  <el-option label="支付成功" value="payment_success" />
                  <el-option label="能量代理完成" value="energy_delegation_complete" />
                </el-option-group>
                <el-option-group label="代理通知">
                  <el-option label="代理审核通过" value="application_approved" />
                  <el-option label="佣金到账" value="commission_earned" />
                </el-option-group>
                <el-option-group label="系统通知">
                  <el-option label="系统维护" value="maintenance_notice" />
                  <el-option label="重要公告" value="important_announcement" />
                </el-option-group>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="分类">
              <el-select v-model="currentTemplate.category" placeholder="选择分类" class="w-full">
                <el-option label="业务通知" value="business" />
                <el-option label="代理通知" value="agent" />
                <el-option label="价格通知" value="price" />
                <el-option label="系统通知" value="system" />
                <el-option label="营销通知" value="marketing" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="语言">
              <el-select v-model="currentTemplate.language" placeholder="选择语言" class="w-full">
                <el-option label="中文" value="zh" />
                <el-option label="English" value="en" />
                <el-option label="日本語" value="ja" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="消息格式">
              <el-select v-model="currentTemplate.parse_mode" placeholder="选择格式" class="w-full">
                <el-option label="Markdown" value="Markdown" />
                <el-option label="HTML" value="HTML" />
                <el-option label="纯文本" value="text" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="模板描述">
          <el-input v-model="currentTemplate.description" placeholder="简要描述模板用途" />
        </el-form-item>

        <el-form-item label="模板标签">
          <el-input v-model="currentTemplate.tags" placeholder="用逗号分隔的标签，如：订单,支付,重要" />
        </el-form-item>

      </el-form>

      <!-- 内容编辑区域 -->
      <div class="content-editor">
        <el-row :gutter="20">
          
          <!-- 模板内容 -->
          <el-col :span="12">
            <div class="editor-section">
              <h4 class="text-gray-900 font-semibold mb-3">📝 消息内容</h4>
              <el-input
                type="textarea"
                v-model="currentTemplate.content"
                placeholder="输入消息模板内容，使用 {{变量名}} 来表示动态内容"
                :rows="15"
                class="template-textarea"
              />
              
              <!-- 变量助手 -->
              <div class="variable-helper mt-4">
                <h5 class="text-gray-300 mb-2">💡 可用变量</h5>
                <div class="variable-tags">
                  <el-tag 
                    v-for="variable in availableVariables" 
                    :key="variable.name"
                    @click="$emit('insert-variable', variable.name)"
                    class="variable-tag mr-2 mb-2 cursor-pointer"
                    type="info"
                  >
                    <span v-text="'{{' + variable.name + '}}'"></span>
                  </el-tag>
                </div>
                <el-button size="small" @click="$emit('show-variable-manager')">管理变量</el-button>
              </div>
            </div>
          </el-col>
          
          <!-- 实时预览 -->
          <el-col :span="12">
            <div class="preview-section">
              <h4 class="text-gray-900 font-semibold mb-3">👁️ 实时预览</h4>
              <div class="telegram-preview">
                <div class="telegram-message">
                  <div v-html="previewContent" class="message-content"></div>
                  
                  <!-- 按钮预览 -->
                  <div v-if="currentTemplate.buttons && currentTemplate.buttons.length > 0" class="buttons-preview mt-3">
                    <div 
                      v-for="(buttonRow, rowIndex) in currentTemplate.buttons" 
                      :key="rowIndex"
                      class="button-row"
                    >
                      <div 
                        v-for="(button, btnIndex) in buttonRow" 
                        :key="btnIndex"
                        class="telegram-button"
                      >
                        {{ button.text }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 测试数据 -->
              <div class="test-data mt-4">
                <h5 class="text-gray-300 mb-2">🧪 测试数据</h5>
                <el-input
                  type="textarea"
                  :model-value="testDataJson"
                  @update:model-value="emit('update:testDataJson', $event)"
                  placeholder="输入JSON格式的测试数据"
                  :rows="5"
                />
              </div>
            </div>
          </el-col>
          
        </el-row>
      </div>

      <!-- 按钮配置 -->
      <ButtonConfiguration
        :buttons="currentTemplate.buttons || []"
        @add-row="$emit('add-button-row')"
        @remove-row="$emit('remove-button-row', $event)"
        @add-button="$emit('add-button-to-row', $event)"
        @remove-button="$emit('remove-button-from-row', $event.row, $event.button)"
      />

      <!-- 模板设置 -->
      <div class="template-settings mt-6">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="默认模板">
              <el-switch v-model="currentTemplate.is_default" />
              <div class="text-sm text-gray-400 mt-1">
                设为该类型的默认模板
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="启用状态">
              <el-switch v-model="currentTemplate.is_active" />
              <div class="text-sm text-gray-400 mt-1">
                禁用后不会在发送时使用
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="版本号">
              <el-input-number v-model="currentTemplate.version" :min="1" :max="999" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('close')">取消</el-button>
        <el-button type="info" @click="$emit('preview')">👁️ 预览</el-button>
        <el-button type="success" @click="$emit('test')">🧪 测试发送</el-button>
        <el-button type="primary" @click="$emit('save')" :loading="saving">
          {{ isEditMode ? '保存更改' : '创建模板' }}
        </el-button>
      </div>
    </template>

  </el-dialog>
</template>

<script setup lang="ts">
import type { MessageTemplate } from '../types/template.types'
import ButtonConfiguration from './ButtonConfiguration.vue'

interface Props {
  visible: boolean
  currentTemplate: Partial<MessageTemplate>
  availableVariables: Array<{name: string, type: string, description: string}>
  previewContent: string
  testDataJson: string
  isEditMode: boolean
  saving?: boolean
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'update:testDataJson', value: string): void
  (e: 'close'): void
  (e: 'save'): void
  (e: 'preview'): void
  (e: 'test'): void
  (e: 'insert-variable', variableName: string): void
  (e: 'show-variable-manager'): void
  (e: 'add-button-row'): void
  (e: 'remove-button-row', index: number): void
  (e: 'add-button-to-row', rowIndex: number): void
  (e: 'remove-button-from-row', rowIndex: number, buttonIndex: number): void
}

withDefaults(defineProps<Props>(), {
  saving: false
})

const emit = defineEmits<Emits>()
</script>

<style scoped>
.template-editor-dialog :deep(.el-dialog) {
  @apply bg-white border border-gray-200 shadow-lg;
}

.template-editor-dialog :deep(.el-dialog__header) {
  @apply bg-gray-50 border-b border-gray-200;
}

.template-editor-dialog :deep(.el-dialog__title) {
  @apply text-gray-900 font-semibold;
}

.template-editor :deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

.template-editor :deep(.el-input__inner),
.template-editor :deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

.template-editor :deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

.editor-section h4,
.preview-section h4 {
  @apply text-gray-900 font-semibold;
}

.template-textarea :deep(.el-textarea__inner) {
  @apply font-mono;
}

.variable-helper {
  @apply p-3 bg-blue-50 rounded-lg border border-blue-200;
}

.variable-tag {
  @apply hover:bg-blue-600 hover:text-white transition-colors cursor-pointer;
}

.telegram-preview {
  @apply bg-gray-50 p-4 rounded-lg border border-gray-200;
}

.telegram-message {
  @apply bg-white rounded-lg p-4 shadow-sm border border-gray-200;
}

.message-content {
  @apply text-gray-900 whitespace-pre-line;
}

.buttons-preview {
  @apply space-y-2;
}

.button-row {
  @apply flex gap-2;
}

.telegram-button {
  @apply inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors;
}

.test-data :deep(.el-textarea__inner) {
  @apply bg-gray-50 border-gray-300 text-gray-900 font-mono text-xs focus:border-blue-500;
}

.template-settings {
  @apply p-4 bg-gray-50 rounded-lg border border-gray-200;
}

.template-settings :deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
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

/* 选择器样式 */
:deep(.el-select-dropdown) {
  @apply bg-white border-gray-200 shadow-lg;
}

:deep(.el-option) {
  @apply text-gray-900;
}

:deep(.el-option:hover) {
  @apply bg-blue-50;
}

:deep(.el-option.selected) {
  @apply bg-blue-600 text-white;
}
</style>
