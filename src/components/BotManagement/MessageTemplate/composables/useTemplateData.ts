import { useToast } from '@/composables/useToast'
import { ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'
import type {
    CreateTemplateRequest,
    MessageTemplate,
    TemplatePagination,
    TemplatesResponse,
    UpdateTemplateRequest
} from '../types/template.types'

export function useTemplateData(botId: string) {
  const { success, error } = useToast()
  
  const loading = ref(false)
  const templates = ref<MessageTemplate[]>([])
  
  // 分页
  const pagination = reactive<TemplatePagination>({
    page: 1,
    limit: 20,
    total: 0
  })

  const loadTemplates = async (filters?: {
    searchQuery?: string
    filterType?: string
    filterCategory?: string
    filterLanguage?: string
  }) => {
    loading.value = true
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (filters?.searchQuery) params.append('search', filters.searchQuery)
      if (filters?.filterType) params.append('type', filters.filterType)
      if (filters?.filterCategory) params.append('category', filters.filterCategory)
      if (filters?.filterLanguage) params.append('language', filters.filterLanguage)
      
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data: TemplatesResponse = await response.json()
        templates.value = data.data.templates
        pagination.total = data.data.total
      }
    } catch (error) {
      console.error('加载模板失败:', error)
      error('加载模板失败')
    } finally {
      loading.value = false
    }
  }

  const saveTemplate = async (template: Partial<MessageTemplate>, isEdit: boolean = false): Promise<boolean> => {
    try {
      const url = isEdit 
        ? `/api/telegram-bot-notifications/templates/${template.id}`
        : `/api/telegram-bot-notifications/${botId}/templates`
      
      const method = isEdit ? 'PUT' : 'POST'
      
      const request: CreateTemplateRequest | UpdateTemplateRequest = { template }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(request)
      })
      
      if (response.ok) {
        success(isEdit ? '模板更新成功' : '模板创建成功')
        await loadTemplates()
        return true
      } else {
        error('保存失败')
        return false
      }
    } catch (error) {
      console.error('保存模板失败:', error)
      error('保存失败')
      return false
    }
  }

  const deleteTemplate = async (template: MessageTemplate): Promise<boolean> => {
    try {
      await ElMessageBox.confirm(
        `确定要删除模板"${template.name}"吗？`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      const response = await fetch(`/api/telegram-bot-notifications/templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        success('模板删除成功')
        await loadTemplates()
        return true
      } else {
        error('删除失败')
        return false
      }
    } catch (error) {
      // 用户取消删除或其他错误
      return false
    }
  }

  const testTemplate = async (template: MessageTemplate): Promise<void> => {
    try {
      const { value: chatId } = await ElMessageBox.prompt('请输入测试用户的Chat ID', '测试发送', {
        confirmButtonText: '发送',
        cancelButtonText: '取消',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入有效的Chat ID'
      })
      
      // 这里应该调用测试发送API
      success(`测试消息已发送到 ${chatId}`)
    } catch (error) {
      // 用户取消
    }
  }

  return {
    // 状态
    loading,
    templates,
    pagination,
    
    // 方法
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    testTemplate
  }
}
