<template>
  <div class="message-template-panel">
    
    <!-- 模板列表 -->
    <TemplateList
      :templates="templates"
      :pagination="pagination"
      :filters="filters"
      :loading="loading"
      @create-template="createTemplate"
      @edit-template="editTemplate"
      @test-template="testTemplate"
      @duplicate-template="duplicateTemplate"
      @delete-template="deleteTemplate"
      @update-search="updateSearch"
      @update-type-filter="updateTypeFilter"
      @update-category-filter="updateCategoryFilter"
      @update-language-filter="updateLanguageFilter"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />

    <!-- 模板编辑器对话框 -->
    <TemplateEditor
      v-model:visible="showTemplateEditor"
      :current-template="currentTemplate"
      :available-variables="availableVariables"
      :preview-content="renderPreview()"
      :test-data-json="testDataJson"
      :is-edit-mode="isEditMode"
      :saving="saving"
      @close="handleEditorClose"
      @save="saveTemplate"
      @preview="previewTemplate"
      @test="testCurrentTemplate"
      @insert-variable="insertVariable"
      @show-variable-manager="showVariableManager = true"
      @add-button-row="addButtonRow"
      @remove-button-row="removeButtonRow"
      @add-button-to-row="addButtonToRow"
      @remove-button-from-row="removeButtonFromRow"
      @update:testDataJson="updateTestDataJson"
    />

    <!-- 变量管理对话框 -->
    <VariableManager
      v-model:visible="showVariableManager"
      :variables="currentTemplate.variables || []"
      @add-variable="addVariable"
      @remove-variable="removeVariable"
    />

  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { ElMessageBox } from 'element-plus'
import { onMounted, reactive } from 'vue'
import TemplateEditor from './components/TemplateEditor.vue'
import TemplateList from './components/TemplateList.vue'
import VariableManager from './components/VariableManager.vue'
import { useTemplateData } from './composables/useTemplateData'
import { useTemplateEditor } from './composables/useTemplateEditor'
import type { MessageTemplate, TemplateFilters } from './types/template.types'

interface Props {
  botId: string
}

const props = defineProps<Props>()

// Toast 通知
const { info } = useToast()

// 使用composables
const {
  loading,
  templates,
  pagination,
  loadTemplates,
  saveTemplate: saveTemplateData,
  deleteTemplate: deleteTemplateData,
  testTemplate: testTemplateData
} = useTemplateData(props.botId)

const {
  showTemplateEditor,
  showVariableManager,
  isEditMode,
  saving,
  currentTemplate,
  testDataJson,
  availableVariables,
  editTemplate,
  createTemplate,
  duplicateTemplate,
  resetTemplate,
  handleEditorClose,
  addButtonRow,
  removeButtonRow,
  addButtonToRow,
  removeButtonFromRow,
  addVariable,
  removeVariable,
  insertVariable,
  updateTestDataJson,
  renderPreview
} = useTemplateEditor()

// 过滤器状态
const filters = reactive<TemplateFilters>({
  searchQuery: '',
  filterType: '',
  filterCategory: '',
  filterLanguage: 'zh'
})

// 事件处理函数
const updateSearch = (query: string) => {
  filters.searchQuery = query
  loadTemplatesWithFilters()
}

const updateTypeFilter = (type: string) => {
  filters.filterType = type
  loadTemplatesWithFilters()
}

const updateCategoryFilter = (category: string) => {
  filters.filterCategory = category
  loadTemplatesWithFilters()
}

const updateLanguageFilter = (language: string) => {
  filters.filterLanguage = language
  loadTemplatesWithFilters()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadTemplatesWithFilters()
}

const handlePageSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  loadTemplatesWithFilters()
}

const loadTemplatesWithFilters = () => {
  loadTemplates(filters)
}

const saveTemplate = async () => {
  saving.value = true
  try {
    const success = await saveTemplateData(currentTemplate, isEditMode.value)
    if (success) {
      showTemplateEditor.value = false
      resetTemplate()
    }
  } finally {
    saving.value = false
  }
}

const deleteTemplate = async (template: MessageTemplate) => {
  await deleteTemplateData(template)
}

const testTemplate = async (template: MessageTemplate) => {
  await testTemplateData(template)
}

const previewTemplate = () => {
  ElMessageBox.alert(renderPreview(), '模板预览', {
    confirmButtonText: '确定',
    dangerouslyUseHTMLString: true
  })
}

const testCurrentTemplate = () => {
  info('测试发送功能开发中...')
}

// 生命周期
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.message-template-panel {
  @apply min-h-full;
}
</style>
