import { computed, reactive, ref } from 'vue'
import type { MessageTemplate } from '../types/template.types'

export function useTemplateEditor() {
  const showTemplateEditor = ref(false)
  const showVariableManager = ref(false)
  const isEditMode = ref(false)
  const saving = ref(false)

  // 当前编辑的模板
  const currentTemplate = reactive<Partial<MessageTemplate>>({
    name: '',
    type: '',
    category: 'business',
    language: 'zh',
    content: '',
    parse_mode: 'Markdown',
    buttons: [],
    variables: [],
    description: '',
    tags: '',
    is_active: true,
    is_default: false,
    version: 1
  })

  // 测试数据
  const testDataJson = ref(`{
  "orderId": "TRX20240328001",
  "packageName": "32,000能量套餐",
  "amount": "1.5",
  "targetAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
}`)

  // 可用变量（根据通知类型动态生成）
  const availableVariables = computed(() => {
    const commonVars = [
      { name: 'orderId', type: 'string', description: '订单号' },
      { name: 'amount', type: 'currency', description: '金额' },
      { name: 'timestamp', type: 'date', description: '时间戳' },
      { name: 'userFirstName', type: 'string', description: '用户名' }
    ]
    
    const typeSpecificVars: Record<string, any[]> = {
      order_created: [
        { name: 'packageName', type: 'string', description: '套餐名称' },
        { name: 'energy', type: 'number', description: '能量数量' },
        { name: 'targetAddress', type: 'string', description: '目标地址' }
      ],
      payment_success: [
        { name: 'txHash', type: 'string', description: '交易哈希' },
        { name: 'paymentMethod', type: 'string', description: '支付方式' }
      ],
      maintenance_notice: [
        { name: 'maintenanceTime', type: 'date', description: '维护时间' },
        { name: 'duration', type: 'string', description: '维护时长' },
        { name: 'affectedFeatures', type: 'string', description: '影响功能' }
      ]
    }
    
    return [...commonVars, ...(typeSpecificVars[currentTemplate.type] || [])]
  })

  const editTemplate = (template: MessageTemplate) => {
    Object.assign(currentTemplate, template)
    isEditMode.value = true
    showTemplateEditor.value = true
  }

  const createTemplate = () => {
    resetTemplate()
    isEditMode.value = false
    showTemplateEditor.value = true
  }

  const duplicateTemplate = (template: MessageTemplate) => {
    Object.assign(currentTemplate, {
      ...template,
      id: undefined,
      name: `${template.name} (副本)`,
      is_default: false,
      version: 1,
      usage_count: 0
    })
    isEditMode.value = false
    showTemplateEditor.value = true
  }

  const resetTemplate = () => {
    Object.assign(currentTemplate, {
      name: '',
      type: '',
      category: 'business',
      language: 'zh',
      content: '',
      parse_mode: 'Markdown',
      buttons: [],
      variables: [],
      description: '',
      tags: '',
      is_active: true,
      is_default: false,
      version: 1
    })
    isEditMode.value = false
  }

  const handleEditorClose = () => {
    showTemplateEditor.value = false
    resetTemplate()
  }

  // 按钮管理
  const addButtonRow = () => {
    if (!currentTemplate.buttons) {
      currentTemplate.buttons = []
    }
    currentTemplate.buttons.push([{ text: '', type: 'callback_data', value: '' }])
  }

  const removeButtonRow = (rowIndex: number) => {
    currentTemplate.buttons?.splice(rowIndex, 1)
  }

  const addButtonToRow = (rowIndex: number) => {
    if (currentTemplate.buttons && currentTemplate.buttons[rowIndex]) {
      currentTemplate.buttons[rowIndex].push({ text: '', type: 'callback_data', value: '' })
    }
  }

  const removeButtonFromRow = (rowIndex: number, btnIndex: number) => {
    if (currentTemplate.buttons && currentTemplate.buttons[rowIndex]) {
      currentTemplate.buttons[rowIndex].splice(btnIndex, 1)
    }
  }

  // 变量管理
  const addVariable = () => {
    if (!currentTemplate.variables) {
      currentTemplate.variables = []
    }
    currentTemplate.variables.push({
      name: '',
      type: 'string',
      description: '',
      required: false
    })
  }

  const removeVariable = (index: number) => {
    currentTemplate.variables?.splice(index, 1)
  }

  const insertVariable = (variableName: string) => {
    const variable = `{{${variableName}}}`
    currentTemplate.content = (currentTemplate.content || '') + variable
  }

  const updateTestDataJson = (value: string) => {
    testDataJson.value = value
  }

  // 预览渲染
  const renderPreview = () => {
    if (!currentTemplate.content) return ''
    
    let content = currentTemplate.content
    
    // 尝试解析测试数据
    try {
      const testData = JSON.parse(testDataJson.value)
      Object.keys(testData).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        content = content.replace(regex, testData[key])
      })
    } catch (error) {
      // 忽略JSON解析错误
    }
    
    // 处理Markdown格式
    if (currentTemplate.parse_mode === 'Markdown') {
      content = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
    }
    
    return content
  }

  return {
    // 状态
    showTemplateEditor,
    showVariableManager,
    isEditMode,
    saving,
    currentTemplate,
    testDataJson,
    availableVariables,
    
    // 方法
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
  }
}
