export interface MessageTemplateProps {
  botId: string
}

export interface TemplateButton {
  text: string
  type: 'callback_data' | 'url'
  value: string
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'currency'
  description: string
  required: boolean
}

export interface MessageTemplate {
  id?: string
  name: string
  type: string
  category: string
  language: string
  content: string
  parse_mode: 'Markdown' | 'HTML' | 'text'
  buttons?: TemplateButton[][]
  variables?: TemplateVariable[]
  description?: string
  tags?: string
  is_active: boolean
  is_default: boolean
  version: number
  usage_count?: number
  created_at?: string
  updated_at?: string
}

export interface TemplatePagination {
  page: number
  limit: number
  total: number
}

export interface TemplateFilters {
  searchQuery: string
  filterType: string
  filterCategory: string
  filterLanguage: string
}

export interface TemplatesResponse {
  success: boolean
  data: {
    templates: MessageTemplate[]
    total: number
  }
}

export interface CreateTemplateRequest {
  template: Partial<MessageTemplate>
}

export interface CreateTemplateResponse {
  success: boolean
  data: {
    template: MessageTemplate
  }
}

export interface UpdateTemplateRequest {
  template: Partial<MessageTemplate>
}

export interface UpdateTemplateResponse {
  success: boolean
  data: {
    template: MessageTemplate
  }
}
