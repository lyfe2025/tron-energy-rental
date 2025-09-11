import { computed, ref } from 'vue'
import type { ConfigCardProps } from '../../types'

export interface Button {
  id: string
  count: number
  price: number
  isSpecial: boolean
}

export function usePackageConfig(props: ConfigCardProps) {
  // 响应式数据
  const displayTitle = ref('笔数套餐')
  const subtitleTemplate = ref('（24小时不使用，则扣{dailyFee}笔占费）')
  const dailyFee = ref(1)
  const isUnlimited = ref(true)
  const replyMessage = ref('请输入能量接收地址:')
  const showReply = ref(false)
  const currentTime = ref('')
  const imageEnabled = ref(false)
  const imageUrl = ref('')
  const imageAlt = ref('')
  const usageRules = ref<string[]>([])
  const notes = ref<string[]>([])

  // 初始化默认配置
  const initializeConfig = () => {
    console.log('🔧 [TransactionPackage] initializeConfig 被调用')
    console.log('🔧 [TransactionPackage] props.config:', props.config)
    
    if (props.config) {
      // 确保 config 对象存在
      if (!props.config.config) {
        console.log('🔧 [TransactionPackage] 创建空的 config 对象')
        props.config.config = {}
      }
      
      // 确保 usage_rules 数组存在且不为空
      if (!props.config.config.usage_rules || props.config.config.usage_rules.length === 0) {
        console.log('🔧 [TransactionPackage] 设置默认 usage_rules (原数组为空或不存在)')
        props.config.config.usage_rules = [
          '🔺对方有U没U都是扣除一笔转账',
          '🔺转移笔数到其他地址请联系客服',
          '🔺为他人购买，填写他人地址即可'
        ]
      } else {
        console.log('🔧 [TransactionPackage] usage_rules 已存在且有内容:', props.config.config.usage_rules)
      }
      
      // 确保 notes 数组存在且不为空
      if (!props.config.config.notes || props.config.config.notes.length === 0) {
        console.log('🔧 [TransactionPackage] 设置默认 notes (原数组为空或不存在)')
        props.config.config.notes = [
          '⚠️笔数开/关按钮，可查询账单，开/关笔数'
        ]
      } else {
        console.log('🔧 [TransactionPackage] notes 已存在且有内容:', props.config.config.notes)
      }
      
      // 确保 display_texts 存在
      if (!props.config.config.display_texts) {
        console.log('🔧 [TransactionPackage] 设置默认 display_texts')
        props.config.config.display_texts = {
          title: '',
          subtitle_template: '（24小时不使用，则扣{dailyFee}笔占费）',
          address_prompt: '请输入能量接收地址:',
          line_breaks: {
            after_title: 0,
            after_subtitle: 0,
            after_packages: 0,
            before_usage_rules: 0,
            before_notes: 0
          }
        }
      } else {
        console.log('🔧 [TransactionPackage] display_texts 已存在:', props.config.config.display_texts)
        // 确保 line_breaks 存在
        if (!props.config.config.display_texts.line_breaks) {
          props.config.config.display_texts.line_breaks = {
            after_title: 0,
            after_subtitle: 0,
            after_packages: 0,
            before_usage_rules: 0,
            before_notes: 0
          }
        }
      }
      
      console.log('🔧 [TransactionPackage] 初始化完成后的 config:', props.config.config)
    } else {
      console.log('❌ [TransactionPackage] props.config 为空')
    }
  }

  // 初始化方法，从props.config中加载数据
  const initializeFromConfig = () => {
    console.log('📊 [TransactionPackage] initializeFromConfig 被调用')
    console.log('📊 [TransactionPackage] props.config:', props.config)
    
    if (props.config) {
      // 先初始化配置确保默认值存在
      initializeConfig()
      
      // 加载图片配置
      imageEnabled.value = props.config.enable_image || false
      imageUrl.value = props.config.image_url || ''
      imageAlt.value = props.config.image_alt || ''
      
      // 加载其他配置（如果存在）
      if (props.config.config) {
        dailyFee.value = props.config.config.daily_fee || 1
        
        if (props.config.config.display_texts) {
          replyMessage.value = props.config.config.display_texts.address_prompt || '请输入能量接收地址:'
          // 从完整标题中提取显示标题
          if (props.config.config.display_texts.title) {
            const titleText = props.config.config.display_texts.title
            // 移除 🔥 和括号部分，提取核心标题
            const match = titleText.match(/🔥\s*([^🔥]+?)\s*🔥/)
            if (match && match[1]) {
              displayTitle.value = match[1].trim()
            }
          }
          
          // 加载副标题模板
          if (props.config.config.display_texts.subtitle_template) {
            subtitleTemplate.value = props.config.config.display_texts.subtitle_template
          }
          
          // 从副标题中提取每日费用信息（向后兼容）
          if (props.config.config.display_texts.subtitle) {
            const subtitleText = props.config.config.display_texts.subtitle
            const feeMatch = subtitleText.match(/扣(\d+)笔占费/)
            if (feeMatch && feeMatch[1]) {
              dailyFee.value = parseInt(feeMatch[1])
            }
            // 如果没有subtitle_template，从旧的subtitle推断模板
            if (!props.config.config.display_texts.subtitle_template) {
              subtitleTemplate.value = subtitleText.replace(/扣\d+笔占费/, '扣{dailyFee}笔占费')
            }
          }
        }
        
        // 加载套餐数据
        if (props.config.config.packages && Array.isArray(props.config.config.packages)) {
          buttons.value = props.config.config.packages.map((pkg: any, index: number) => ({
            id: (index + 1).toString(),
            count: pkg.transaction_count || 10,
            price: pkg.price || 200,
            isSpecial: index === props.config.config.packages.length - 1 // 最后一个设为特殊按钮
          }))
        }
        
        // 加载使用规则（现在已经确保数组存在）
        console.log('📊 [TransactionPackage] 加载 usage_rules:', props.config.config.usage_rules)
        usageRules.value = [...props.config.config.usage_rules]
        console.log('📊 [TransactionPackage] usageRules.value 设置为:', usageRules.value)
        
        // 加载注意事项（现在已经确保数组存在）
        console.log('📊 [TransactionPackage] 加载 notes:', props.config.config.notes)
        notes.value = [...props.config.config.notes]
        console.log('📊 [TransactionPackage] notes.value 设置为:', notes.value)
      }
    }
  }

  // 根据真实截图配置7个按钮：10笔、20笔、50笔、100笔、200笔、300笔、500笔（最后一个全宽）
  const buttons = ref<Button[]>([
    { id: '1', count: 10, price: 200, isSpecial: false },
    { id: '2', count: 20, price: 380, isSpecial: false },
    { id: '3', count: 50, price: 900, isSpecial: false },
    { id: '4', count: 100, price: 1700, isSpecial: false },
    { id: '5', count: 200, price: 3200, isSpecial: false },
    { id: '6', count: 300, price: 4500, isSpecial: false },
    { id: '7', count: 500, price: 7000, isSpecial: true }
  ])

  // 计算属性
  const regularButtons = computed(() => buttons.value.filter(b => !b.isSpecial))
  const specialButton = computed(() => buttons.value.find(b => b.isSpecial))

  // 业务方法
  const handleToggle = () => {
    props.onToggle('transaction_package')
  }

  const handleSave = () => {
    // 构建配置数据
    if (props.config) {
      // 更新基础配置
      props.config.config.daily_fee = dailyFee.value
      props.config.config.display_texts = {
        title: `🔥 ${displayTitle.value} 🔥（${isUnlimited.value ? '无时间限制' : '有时间限制'}）`,
        subtitle: `（24小时不使用，则扣${dailyFee.value}笔占费）`,
        subtitle_template: subtitleTemplate.value,
        usage_title: '💡 笔数开/关按钮，可查询账单，开/关笔数',
        address_prompt: replyMessage.value,
        line_breaks: props.config.config.display_texts?.line_breaks || {
          after_title: 0,
          after_subtitle: 0,
          after_packages: 0,
          before_usage_rules: 0,
          before_notes: 0
        }
      }
      
      // 更新套餐数据
      props.config.config.packages = buttons.value.map(button => ({
        name: `${button.count}笔套餐`,
        transaction_count: button.count,
        price: button.price,
        currency: 'TRX'
      }))
      
      // 更新使用规则和注意事项
      props.config.config.usage_rules = [...usageRules.value]
      props.config.config.notes = [...notes.value]
      
      // 更新图片配置
      props.config.enable_image = imageEnabled.value
      props.config.image_url = imageUrl.value || null
      props.config.image_alt = imageAlt.value || null
      
      // 更新内嵌键盘配置
      props.config.inline_keyboard_config = {
        enabled: true,
        keyboard_type: 'transaction_count_selection',
        title: `🔥 ${displayTitle.value} 🔥`,
        description: `选择您需要的交易笔数`,
        buttons_per_row: 2,
        buttons: buttons.value.map(button => ({
          id: button.id,
          text: `${button.count}笔`,
          callback_data: `transaction_package_${button.count}`,
          transaction_count: button.count,
          price: button.price,
          description: `${button.count}笔套餐`
        })),
        next_message: replyMessage.value,
        validation: {
          address_required: true,
          min_transaction_count: 1,
          max_transaction_count: 1000
        }
      }
    }
    
    props.onSave('transaction_package')
  }

  const simulateButtonClick = (button: Button) => {
    showReply.value = true
    setTimeout(() => {
      showReply.value = false
    }, 3000)
  }

  const addButton = () => {
    const newId = Date.now().toString()
    buttons.value.push({
      id: newId,
      count: 10,
      price: 200,
      isSpecial: false
    })
  }

  const removeButton = (index: number) => {
    buttons.value.splice(index, 1)
  }

  const applyTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic':
        buttons.value = [
          { id: '1', count: 5, price: 100, isSpecial: false },
          { id: '2', count: 10, price: 190, isSpecial: false },
          { id: '3', count: 20, price: 360, isSpecial: false },
          { id: '4', count: 50, price: 850, isSpecial: true }
        ]
        break
      case 'popular':
        buttons.value = [
          { id: '1', count: 10, price: 200, isSpecial: false },
          { id: '2', count: 20, price: 380, isSpecial: false },
          { id: '3', count: 50, price: 900, isSpecial: false },
          { id: '4', count: 100, price: 1700, isSpecial: false },
          { id: '5', count: 200, price: 3200, isSpecial: false },
          { id: '6', count: 300, price: 4500, isSpecial: false },
          { id: '7', count: 500, price: 7000, isSpecial: true }
        ]
        break
      case 'enterprise':
        buttons.value = [
          { id: '1', count: 100, price: 1700, isSpecial: false },
          { id: '2', count: 200, price: 3200, isSpecial: false },
          { id: '3', count: 500, price: 7000, isSpecial: false },
          { id: '4', count: 1000, price: 13000, isSpecial: false },
          { id: '5', count: 2000, price: 24000, isSpecial: false },
          { id: '6', count: 5000, price: 55000, isSpecial: true }
        ]
        break
    }
  }

  const toggleImageEnabled = () => {
    imageEnabled.value = !imageEnabled.value
    if (!imageEnabled.value) {
      imageUrl.value = ''
      imageAlt.value = ''
    }
  }

  // 图片上传成功处理
  const handleImageUploadSuccess = (data: any) => {
    console.log('图片上传成功:', data)
    imageUrl.value = data.url || data
  }

  // 图片上传错误处理
  const handleImageUploadError = (error: string) => {
    console.error('图片上传失败:', error)
  }

  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // 更新函数
  const updateDisplayTitle = (value: string) => {
    displayTitle.value = value
  }

  const updateSubtitleTemplate = (value: string) => {
    subtitleTemplate.value = value
  }

  const updateDailyFee = (value: number) => {
    dailyFee.value = value
  }

  const updateIsUnlimited = (value: boolean) => {
    isUnlimited.value = value
  }

  const updateReplyMessage = (value: string) => {
    replyMessage.value = value
  }

  const updateImageUrl = (value: string) => {
    imageUrl.value = value
  }

  const updateImageAlt = (value: string) => {
    imageAlt.value = value
  }

  // 使用规则管理
  const addUsageRule = () => {
    usageRules.value.push('')
  }

  const removeUsageRule = (index: number) => {
    usageRules.value.splice(index, 1)
  }

  // 注意事项管理
  const addNote = () => {
    notes.value.push('')
  }

  const removeNote = (index: number) => {
    notes.value.splice(index, 1)
  }

  // 换行配置计算属性
  const lineBreaks = computed(() => {
    return props.config?.config?.display_texts?.line_breaks || {
      after_title: 0,
      after_subtitle: 0,
      after_packages: 0,
      before_usage_rules: 0,
      before_notes: 0
    }
  })

  // 更新换行配置方法
  const updateLineBreak = (field: string, value: number) => {
    if (props.config?.config?.display_texts?.line_breaks) {
      props.config.config.display_texts.line_breaks[field] = value
    }
  }

  // 换行配置预设方法
  const setLineBreakPreset = (presetType: string) => {
    if (!props.config?.config?.display_texts?.line_breaks) return
    
    const presets = {
      compact: {
        after_title: 0,
        after_subtitle: 0,
        after_packages: 0,
        before_usage_rules: 0,
        before_notes: 0
      },
      normal: {
        after_title: 1,
        after_subtitle: 1,
        after_packages: 1,
        before_usage_rules: 1,
        before_notes: 1
      },
      spacious: {
        after_title: 2,
        after_subtitle: 2,
        after_packages: 2,
        before_usage_rules: 2,
        before_notes: 2
      },
      custom: {
        after_title: 1,
        after_subtitle: 1,
        after_packages: 1,
        before_usage_rules: 1,
        before_notes: 1
      }
    }
    
    const preset = presets[presetType] || presets.normal
    Object.assign(props.config.config.display_texts.line_breaks, preset)
  }

  // 生成额外换行字符串
  const generateLineBreaks = (count: number): string => {
    return count > 0 ? '\n'.repeat(count) : ''
  }

  console.log('🎯 [TransactionPackage] return时的响应式变量:')
  console.log('🎯 [TransactionPackage] usageRules.value:', usageRules.value)
  console.log('🎯 [TransactionPackage] notes.value:', notes.value)

  return {
    // 响应式数据
    displayTitle,
    subtitleTemplate,
    dailyFee,
    isUnlimited,
    replyMessage,
    showReply,
    currentTime,
    imageEnabled,
    imageUrl,
    imageAlt,
    buttons,
    usageRules,
    notes,
    lineBreaks,
    
    // 计算属性
    regularButtons,
    specialButton,
    
    // 方法
    handleToggle,
    handleSave,
    simulateButtonClick,
    addButton,
    removeButton,
    applyTemplate,
    toggleImageEnabled,
    handleImageUploadSuccess,
    handleImageUploadError,
    updateTime,
    initializeFromConfig,
    updateDisplayTitle,
    updateSubtitleTemplate,
    updateDailyFee,
    updateIsUnlimited,
    updateReplyMessage,
    updateImageUrl,
    updateImageAlt,
    addUsageRule,
    removeUsageRule,
    addNote,
    removeNote,
    updateLineBreak,
    setLineBreakPreset,
    generateLineBreaks
  }
}
