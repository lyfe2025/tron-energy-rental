import { computed, ref } from 'vue'
import type { ConfigCardProps } from '../../../types'

export interface Button {
  id: string
  count: number
  price: number
  isSpecial: boolean
}

export function usePackageConfig(props: ConfigCardProps) {
  // 响应式数据
  const displayTitle = ref('笔数套餐')
  const dailyFee = ref(1)
  const isUnlimited = ref(true)
  const replyMessage = ref('请输入能量接收地址:')
  const showReply = ref(false)
  const currentTime = ref('')
  const imageEnabled = ref(false)
  const imageUrl = ref('')
  const imageAlt = ref('')

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
        usage_title: '💡 笔数开/关按钮，可查询账单，开/关笔数',
        address_prompt: replyMessage.value
      }
      
      // 更新套餐数据
      props.config.config.packages = buttons.value.map(button => ({
        name: `${button.count}笔套餐`,
        transaction_count: button.count,
        price: button.price,
        currency: 'TRX'
      }))
      
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

  return {
    // 响应式数据
    displayTitle,
    dailyFee,
    isUnlimited,
    replyMessage,
    showReply,
    currentTime,
    imageEnabled,
    imageUrl,
    imageAlt,
    buttons,
    
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
    updateTime
  }
}
